import {
  createPublicClient,
  formatUnits,
  http,
  parseEventLogs,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';

import { ORVYN_EXCHANGE_ABI, STRATEGY_REGISTRY_V2_ABI } from '@/lib/orvyn/launch-contracts';
import { launchConfig, launchStocks, USDC_DECIMALS } from '@/lib/orvyn/launch';
import { database, databaseConfigured } from './db-core';

const DEFAULT_RPC = 'https://sepolia.base.org';

const STOCK_BY_ADDRESS = new Map(
  launchStocks.map((stock) => [stock.address.toLowerCase(), stock.ticker]),
);

export type LaunchIngestResult = { ok: boolean; written: number; reason?: string };

function client() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? DEFAULT_RPC, { timeout: 8_000 }),
  });
}

async function upsertUser(sql: ReturnType<typeof database>, address: string) {
  await sql`
    insert into users (address)
    values (${address.toLowerCase()})
    on conflict (address) do update set last_seen_at = now()
  `;
}

async function event(
  sql: ReturnType<typeof database>,
  input: {
    kind: string;
    actor: Address;
    subject: string | null;
    txHash: Hex;
    logIndex: number;
    payload: Record<string, unknown>;
  },
) {
  await sql`
    insert into launch.events (kind, actor_address, subject, tx_hash, log_index, payload)
    values (
      ${input.kind},
      ${input.actor.toLowerCase()},
      ${input.subject},
      ${input.txHash},
      ${input.logIndex},
      ${JSON.stringify(input.payload)}
    )
    on conflict (tx_hash, log_index) do nothing
  `;
}

export async function recordTrade(input: {
  trader: Address;
  stock: Address;
  isBuy: boolean;
  usdcAmount: bigint;
  stockAmount: bigint;
  price: bigint;
  txHash: Hex;
  logIndex: number;
}): Promise<boolean> {
  const sql = database();
  const ticker = STOCK_BY_ADDRESS.get(input.stock.toLowerCase()) ?? input.stock;
  const usdc = formatUnits(input.usdcAmount, USDC_DECIMALS);
  const stock = formatUnits(input.stockAmount, 18);
  const price = formatUnits(input.price, 8);

  await upsertUser(sql, input.trader);

  const inserted = (await sql`
    insert into launch.trades (
      trader_address, stock_address, ticker, is_buy, usdc_amount, stock_amount, price, tx_hash, log_index
    )
    values (
      ${input.trader.toLowerCase()},
      ${input.stock.toLowerCase()},
      ${ticker},
      ${input.isBuy},
      ${usdc},
      ${stock},
      ${price},
      ${input.txHash},
      ${input.logIndex}
    )
    on conflict (tx_hash, log_index) do nothing
    returning id
  `) as Array<{ id: string }>;

  await event(sql, {
    kind: 'trade.made',
    actor: input.trader,
    subject: ticker,
    txHash: input.txHash,
    logIndex: input.logIndex,
    payload: { ticker, isBuy: input.isBuy, usdc, stock, price },
  });

  return inserted.length > 0;
}

export async function recordLaunchStrategy(input: {
  id: bigint;
  author: Address;
  name: string;
  payload: string;
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  publishedAt: Date;
}): Promise<boolean> {
  const sql = database();
  await upsertUser(sql, input.author);

  const inserted = (await sql`
    insert into launch.strategies (
      onchain_id, author_address, name, payload, tx_hash, log_index, block_number, published_at
    )
    values (
      ${input.id.toString()},
      ${input.author.toLowerCase()},
      ${input.name},
      ${input.payload},
      ${input.txHash},
      ${input.logIndex},
      ${input.blockNumber.toString()},
      ${input.publishedAt.toISOString()}
    )
    on conflict (onchain_id) do nothing
    returning onchain_id
  `) as Array<{ onchain_id: string }>;

  await event(sql, {
    kind: 'strategy.published',
    actor: input.author,
    subject: input.id.toString(),
    txHash: input.txHash,
    logIndex: input.logIndex,
    payload: { name: input.name },
  });

  return inserted.length > 0;
}

export async function recordFollow(input: {
  follower: Address;
  strategyId: bigint;
  txHash: Hex;
  logIndex: number;
  following: boolean;
}): Promise<boolean> {
  const sql = database();
  await upsertUser(sql, input.follower);

  if (input.following) {
    const inserted = (await sql`
      insert into launch.follows (follower_address, strategy_id, tx_hash, log_index)
      values (
        ${input.follower.toLowerCase()},
        ${input.strategyId.toString()},
        ${input.txHash},
        ${input.logIndex}
      )
      on conflict (follower_address, strategy_id) do nothing
      returning strategy_id
    `) as Array<{ strategy_id: string }>;

    await event(sql, {
      kind: 'strategy.followed',
      actor: input.follower,
      subject: input.strategyId.toString(),
      txHash: input.txHash,
      logIndex: input.logIndex,
      payload: { strategyId: input.strategyId.toString() },
    });

    return inserted.length > 0;
  }

  await sql`
    delete from launch.follows
    where follower_address = ${input.follower.toLowerCase()}
      and strategy_id = ${input.strategyId.toString()}
  `;
  await event(sql, {
    kind: 'strategy.unfollowed',
    actor: input.follower,
    subject: input.strategyId.toString(),
    txHash: input.txHash,
    logIndex: input.logIndex,
    payload: { strategyId: input.strategyId.toString() },
  });

  return true;
}

/** Re-read a receipt and index launch events from the exchange and Registry v2. */
export async function ingestLaunchTransaction(txHash: Hex): Promise<LaunchIngestResult> {
  if (!databaseConfigured()) {
    return { ok: false, written: 0, reason: 'The indexer is not configured.' };
  }

  const publicClient = client();
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, written: 0, reason: 'That transaction was not found.' };
  }
  if (receipt.status !== 'success') {
    return { ok: false, written: 0, reason: 'That transaction reverted.' };
  }

  const registryLogs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === launchConfig.registryV2.toLowerCase(),
  );
  const exchangeLogs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === launchConfig.exchange.toLowerCase(),
  );
  if (registryLogs.length === 0 && exchangeLogs.length === 0) {
    return { ok: true, written: 0 };
  }

  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const publishedAt = new Date(Number(block.timestamp) * 1000);
  let written = 0;

  const published = parseEventLogs({
    abi: STRATEGY_REGISTRY_V2_ABI,
    eventName: 'StrategyPublished',
    logs: registryLogs,
  });
  for (const log of published) {
    const { id, author, name, payload } = log.args;
    if (id === undefined || !author || typeof name !== 'string' || typeof payload !== 'string') {
      continue;
    }
    if (
      await recordLaunchStrategy({
        id,
        author,
        name,
        payload,
        txHash,
        logIndex: log.logIndex,
        blockNumber: receipt.blockNumber,
        publishedAt,
      })
    ) {
      written += 1;
    }
  }

  const followed = parseEventLogs({
    abi: STRATEGY_REGISTRY_V2_ABI,
    eventName: 'Followed',
    logs: registryLogs,
  });
  for (const log of followed) {
    const { id, follower } = log.args;
    if (id === undefined || !follower) continue;
    if (
      await recordFollow({
        follower,
        strategyId: id,
        txHash,
        logIndex: log.logIndex,
        following: true,
      })
    ) {
      written += 1;
    }
  }

  const unfollowed = parseEventLogs({
    abi: STRATEGY_REGISTRY_V2_ABI,
    eventName: 'Unfollowed',
    logs: registryLogs,
  });
  for (const log of unfollowed) {
    const { id, follower } = log.args;
    if (id === undefined || !follower) continue;
    await recordFollow({
      follower,
      strategyId: id,
      txHash,
      logIndex: log.logIndex,
      following: false,
    });
    written += 1;
  }

  const trades = parseEventLogs({
    abi: ORVYN_EXCHANGE_ABI,
    eventName: 'Trade',
    logs: exchangeLogs,
  });
  for (const log of trades) {
    const { trader, stock, isBuy, usdcAmount, stockAmount, price } = log.args;
    if (
      !trader ||
      !stock ||
      isBuy === undefined ||
      usdcAmount === undefined ||
      stockAmount === undefined ||
      price === undefined
    ) {
      continue;
    }
    if (
      await recordTrade({
        trader,
        stock,
        isBuy,
        usdcAmount,
        stockAmount,
        price,
        txHash,
        logIndex: log.logIndex,
      })
    ) {
      written += 1;
    }
  }

  return { ok: true, written };
}
