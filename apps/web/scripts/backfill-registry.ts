/**
 * Copy every StrategyPublished event into Postgres.
 *
 * Run from apps/web with the launch DATABASE_URL in .env.local:
 *
 *   bun run scripts/backfill-registry.ts
 *
 * Idempotent: a second run writes zero new strategies. The public RPC limits
 * eth_getLogs to 200 blocks, so the scan is chunked.
 */
import { readFileSync } from 'node:fs';

import { createPublicClient, http, parseAbiItem } from 'viem';

import { REGISTRY_CHAIN, strategyRegistryAddress } from '../src/lib/orvyn/registry';
import { databaseConfigured } from '../src/server/launch/db-core';
import { recordStrategy } from '../src/server/launch/ingest';

type Deployment = { address: string; blockNumber: string };

const deployment = JSON.parse(
  readFileSync(new URL('../deployments/base-sepolia.json', import.meta.url), 'utf8'),
) as Deployment;

if (!databaseConfigured()) throw new Error('DATABASE_URL is not configured.');
if (!strategyRegistryAddress) throw new Error('The registry address is not configured.');

const client = createPublicClient({
  chain: REGISTRY_CHAIN,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org', {
    timeout: 8_000,
  }),
});

const event = parseAbiItem(
  'event StrategyPublished(uint256 indexed id, address indexed author, string name, string payload)',
);

const latest = await client.getBlockNumber();
const from = BigInt(deployment.blockNumber);
const logs = [];

for (let start = from; start <= latest; start += BigInt(200)) {
  const end = start + BigInt(199) > latest ? latest : start + BigInt(199);
  const chunk = await client.getLogs({
    address: deployment.address as `0x${string}`,
    event,
    fromBlock: start,
    toBlock: end,
  });
  logs.push(...chunk);
}

const timestamps = new Map<bigint, Date>();
let written = 0;

for (const log of logs) {
  const { id, author, name, payload } = log.args;
  if (id === undefined || !author || typeof name !== 'string' || typeof payload !== 'string') {
    continue;
  }

  let publishedAt = timestamps.get(log.blockNumber);
  if (!publishedAt) {
    const block = await client.getBlock({ blockNumber: log.blockNumber });
    publishedAt = new Date(Number(block.timestamp) * 1000);
    timestamps.set(log.blockNumber, publishedAt);
  }

  const inserted = await recordStrategy({
    id,
    author,
    name,
    payload,
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
    publishedAt,
  });
  if (inserted) written += 1;
}

console.log({ events: logs.length, written, skipped: logs.length - written, latest: latest.toString() });
