/**
 * Copy existing exchange and Registry v2 events into the launch Postgres
 * schema. Run after the contracts are deployed, and again after a manual test.
 *
 *   bun run scripts/backfill-launch.ts
 */
import { readFileSync } from 'node:fs';

import { createPublicClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';

import { ingestLaunchTransaction } from '../src/server/launch/ingest-launch';
import { launchConfig } from '../src/lib/orvyn/launch';

const deployment = JSON.parse(
  readFileSync(new URL('../deployments/base-sepolia-launch.json', import.meta.url), 'utf8'),
) as { transactions: { testUSD: Hex } };

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org', {
    timeout: 8_000,
  }),
});

const first = await client.getTransactionReceipt({ hash: deployment.transactions.testUSD });
const latest = await client.getBlockNumber();
const hashes = new Set<Hex>();

for (let start = first.blockNumber; start <= latest; start += BigInt(200)) {
  const end = start + BigInt(199) > latest ? latest : start + BigInt(199);
  const logs = await client.getLogs({
    address: [launchConfig.exchange, launchConfig.registryV2],
    fromBlock: start,
    toBlock: end,
  });
  for (const log of logs) hashes.add(log.transactionHash);
}

let written = 0;
for (const hash of hashes) {
  const result = await ingestLaunchTransaction(hash);
  written += result.written;
}

console.log({ transactions: hashes.size, written });
