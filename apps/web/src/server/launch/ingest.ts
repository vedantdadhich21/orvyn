import {
  createPublicClient,
  http,
  parseEventLogs,
  type Address,
  type Hex,
} from 'viem';

import { REGISTRY_CHAIN, strategyRegistryAddress } from '@/lib/orvyn/registry';
import { STRATEGY_REGISTRY_ABI } from '@/lib/orvyn/strategy-registry';
import { database, databaseConfigured } from './db-core';

const DEFAULT_RPC = 'https://sepolia.base.org';

export type StrategyRecord = {
  id: bigint;
  author: Address;
  name: string;
  payload: string;
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  publishedAt: Date;
};

export type IngestResult = {
  ok: boolean;
  written: number;
  reason?: string;
};

function rpcClient() {
  return createPublicClient({
    chain: REGISTRY_CHAIN,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? DEFAULT_RPC, { timeout: 8_000 }),
  });
}

/**
 * One event, one set of rows. Idempotent on the onchain id and on
 * (tx_hash, log_index), so a retry never duplicates a strategy or an event.
 */
export async function recordStrategy(record: StrategyRecord): Promise<boolean> {
  const sql = database();
  const author = record.author.toLowerCase();

  await sql`
    insert into users (address)
    values (${author})
    on conflict (address) do update set last_seen_at = now()
  `;

  const inserted = (await sql`
    insert into strategies (
      onchain_id, author_address, name, payload, tx_hash, log_index, block_number, published_at
    )
    values (
      ${record.id.toString()},
      ${author},
      ${record.name},
      ${record.payload},
      ${record.txHash},
      ${record.logIndex},
      ${record.blockNumber.toString()},
      ${record.publishedAt.toISOString()}
    )
    on conflict (onchain_id) do nothing
    returning onchain_id
  `) as Array<{ onchain_id: string }>;

  await sql`
    insert into events (kind, actor_address, subject, tx_hash, log_index, payload)
    values (
      'strategy.published',
      ${author},
      ${record.id.toString()},
      ${record.txHash},
      ${record.logIndex},
      ${JSON.stringify({ name: record.name })}
    )
    on conflict (tx_hash, log_index) do nothing
  `;

  return inserted.length > 0;
}

/**
 * Re-read a transaction from the chain. The browser only supplies the hash; the
 * server decides what the transaction actually contained. Only events from the
 * configured registry are written.
 */
export async function ingestTransaction(txHash: Hex): Promise<IngestResult> {
  if (!databaseConfigured()) {
    return { ok: false, written: 0, reason: 'The indexer is not configured.' };
  }
  const registryAddress = strategyRegistryAddress;
  if (!registryAddress) {
    return { ok: false, written: 0, reason: 'The registry is not configured.' };
  }

  const publicClient = rpcClient();

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, written: 0, reason: 'That transaction was not found.' };
  }

  if (receipt.status !== 'success') {
    return { ok: false, written: 0, reason: 'That transaction reverted.' };
  }

  const logs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === registryAddress.toLowerCase(),
  );
  if (logs.length === 0) return { ok: true, written: 0 };

  let events;
  try {
    events = parseEventLogs({
      abi: STRATEGY_REGISTRY_ABI,
      eventName: 'StrategyPublished',
      logs,
    });
  } catch {
    return { ok: false, written: 0, reason: 'That transaction has no readable ORVYN event.' };
  }

  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const publishedAt = new Date(Number(block.timestamp) * 1000);

  let written = 0;
  for (const event of events) {
    const { id, author, name, payload } = event.args;
    if (id === undefined || !author || typeof name !== 'string' || typeof payload !== 'string') {
      continue;
    }

    const inserted = await recordStrategy({
      id,
      author,
      name,
      payload,
      txHash,
      logIndex: event.logIndex,
      blockNumber: receipt.blockNumber,
      publishedAt,
    });
    if (inserted) written += 1;
  }

  return { ok: true, written };
}
