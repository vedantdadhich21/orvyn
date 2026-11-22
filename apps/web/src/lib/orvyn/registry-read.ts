/**
 * Read published strategies from Base Sepolia.
 *
 * This runs on the server only. The public registry address and a read RPC are
 * enough; no key, no signer and no write path live here. The gallery gets one
 * shaped list and never talks to an RPC directly.
 */
import { createPublicClient, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

import type { RegistryEntry } from './registry';
import { parseStrategyPayload } from './strategy';
import { STRATEGY_REGISTRY_ABI } from './strategy-registry';

const DEFAULT_RPC = 'https://sepolia.base.org';
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;

export type ReadStrategiesOptions = {
  address: Address;
  rpcUrl?: string;
  limit?: number;
};

/**
 * Newest first. A fixed read timeout keeps a dead RPC from turning the home
 * page into a hanging request; one malformed record is skipped, not fatal.
 */
export async function readStrategies(options: ReadStrategiesOptions): Promise<RegistryEntry[]> {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(options.rpcUrl ?? process.env.BASE_SEPOLIA_RPC_URL ?? DEFAULT_RPC, {
      timeout: 8_000,
    }),
  });

  const count = await client.readContract({
    address: options.address,
    abi: STRATEGY_REGISTRY_ABI,
    functionName: 'count',
  });

  const total = Number(count);
  if (!Number.isSafeInteger(total) || total <= 0) return [];

  const limit = Math.min(Math.max(Math.trunc(options.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const start = Math.max(0, total - limit);
  const ids = Array.from({ length: total - start }, (_, index) => BigInt(start + index));

  const records = await Promise.all(
    ids.map(async (id): Promise<RegistryEntry | null> => {
      try {
        const record = await client.readContract({
          address: options.address,
          abi: STRATEGY_REGISTRY_ABI,
          functionName: 'get',
          args: [id],
        });

        return {
          id: id.toString(),
          author: record.author,
          name: record.name,
          payload: record.payload,
          publishedAt: new Date(Number(record.publishedAt) * 1000).toISOString(),
          parsed: parseStrategyPayload(record.payload),
        };
      } catch {
        return null;
      }
    }),
  );

  return records.filter((record): record is RegistryEntry => record !== null).reverse();
}
