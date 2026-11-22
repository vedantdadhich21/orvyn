/**
 * Read published strategies from Base Sepolia.
 *
 * This runs on the server only. The public registry address and a read RPC are
 * enough; no key, no signer and no write path live here. The gallery, the
 * public strategy page and the proof page all get one shaped record and never
 * talk to an RPC directly.
 */
import { createPublicClient, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

import type { RegistryEntry } from './registry';
import { parseStrategyPayload } from './strategy';
import { STRATEGY_REGISTRY_ABI } from './strategy-registry';

const DEFAULT_RPC = 'https://sepolia.base.org';
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;

type RegistryRecord = {
  author: Address;
  name: string;
  payload: string;
  publishedAt: bigint;
};

export type ReadStrategiesOptions = {
  address: Address;
  rpcUrl?: string;
  limit?: number;
};

function registryClient(rpcUrl?: string) {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl ?? process.env.BASE_SEPOLIA_RPC_URL ?? DEFAULT_RPC, {
      timeout: 8_000,
    }),
  });
}

function toEntry(id: bigint, record: RegistryRecord): RegistryEntry {
  return {
    id: id.toString(),
    author: record.author,
    name: record.name,
    payload: record.payload,
    publishedAt: new Date(Number(record.publishedAt) * 1000).toISOString(),
    parsed: parseStrategyPayload(record.payload),
  };
}

/** How many strategies exist, without reading all of them. */
export async function readRegistryCount(options: {
  address: Address;
  rpcUrl?: string;
}): Promise<number> {
  const client = registryClient(options.rpcUrl);
  const count = await client.readContract({
    address: options.address,
    abi: STRATEGY_REGISTRY_ABI,
    functionName: 'count',
  });
  const total = Number(count);
  return Number.isSafeInteger(total) && total > 0 ? total : 0;
}

/**
 * Newest first. A fixed read timeout keeps a dead RPC from turning the home
 * page into a hanging request; one malformed record is skipped, not fatal.
 */
export async function readStrategies(options: ReadStrategiesOptions): Promise<RegistryEntry[]> {
  const client = registryClient(options.rpcUrl);

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
        return toEntry(id, record);
      } catch {
        return null;
      }
    }),
  );

  return records.filter((record): record is RegistryEntry => record !== null).reverse();
}

/** One strategy by id. Null for an unknown id or an unreadable registry. */
export async function readStrategy(options: {
  address: Address;
  id: bigint;
  rpcUrl?: string;
}): Promise<RegistryEntry | null> {
  const client = registryClient(options.rpcUrl);
  try {
    const record = await client.readContract({
      address: options.address,
      abi: STRATEGY_REGISTRY_ABI,
      functionName: 'get',
      args: [options.id],
    });
    return toEntry(options.id, record);
  } catch {
    return null;
  }
}
