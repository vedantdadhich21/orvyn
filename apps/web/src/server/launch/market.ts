import 'server-only';

import { createPublicClient, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

import {
  PRICE_ORACLE_ABI,
  STRATEGY_REGISTRY_V2_ABI,
} from '@/lib/orvyn/launch-contracts';
import { launchConfig, launchStocks } from '@/lib/orvyn/launch';
import { parseStrategyPayload, type ParsedStrategy } from '@/lib/orvyn/strategy';

const DEFAULT_RPC = 'https://sepolia.base.org';
const DEFAULT_LIMIT = 24;

export type LaunchStrategy = {
  id: string;
  author: string;
  name: string;
  payload: string;
  publishedAt: string;
  followers: number;
  parsed: ParsedStrategy | null;
};

export type MarketPrice = {
  ticker: string;
  name: string;
  address: Address;
  priceUsd: number;
  updatedAt: string;
};

type RawStrategy = {
  author: Address;
  name: string;
  payload: string;
  publishedAt: bigint;
};

function launchClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? DEFAULT_RPC, { timeout: 8_000 }),
  });
}

function toStrategy(id: bigint, record: RawStrategy, followers: number): LaunchStrategy {
  return {
    id: id.toString(),
    author: record.author,
    name: record.name,
    payload: record.payload,
    publishedAt: new Date(Number(record.publishedAt) * 1000).toISOString(),
    followers,
    parsed: parseStrategyPayload(record.payload),
  };
}

/** Newest first, with a follower count per strategy. */
export async function readLaunchStrategies(limit = DEFAULT_LIMIT): Promise<LaunchStrategy[]> {
  const client = launchClient();
  const count = await client.readContract({
    address: launchConfig.registryV2,
    abi: STRATEGY_REGISTRY_V2_ABI,
    functionName: 'count',
  });

  const total = Number(count);
  if (!Number.isSafeInteger(total) || total <= 0) return [];

  const cap = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const start = Math.max(0, total - cap);
  const ids = Array.from({ length: total - start }, (_, index) => BigInt(start + index));

  const rows = await Promise.all(
    ids.map(async (id): Promise<LaunchStrategy | null> => {
      try {
        const [record, followers] = await Promise.all([
          client.readContract({
            address: launchConfig.registryV2,
            abi: STRATEGY_REGISTRY_V2_ABI,
            functionName: 'get',
            args: [id],
          }) as Promise<RawStrategy>,
          client.readContract({
            address: launchConfig.registryV2,
            abi: STRATEGY_REGISTRY_V2_ABI,
            functionName: 'followersOf',
            args: [id],
          }) as Promise<readonly Address[]>,
        ]);
        return toStrategy(id, record, followers.length);
      } catch {
        return null;
      }
    }),
  );

  return rows.filter((row): row is LaunchStrategy => row !== null).reverse();
}

export async function readLaunchStrategy(id: bigint): Promise<LaunchStrategy | null> {
  const client = launchClient();
  try {
    const [record, followers] = await Promise.all([
      client.readContract({
        address: launchConfig.registryV2,
        abi: STRATEGY_REGISTRY_V2_ABI,
        functionName: 'get',
        args: [id],
      }) as Promise<RawStrategy>,
      client.readContract({
        address: launchConfig.registryV2,
        abi: STRATEGY_REGISTRY_V2_ABI,
        functionName: 'followersOf',
        args: [id],
      }) as Promise<readonly Address[]>,
    ]);
    return toStrategy(id, record, followers.length);
  } catch {
    return null;
  }
}

/** Oracle prices and their timestamp. Demo feed, not a Chainlink feed. */
export async function readMarketPrices(): Promise<MarketPrice[]> {
  const client = launchClient();

  return Promise.all(
    launchStocks.map(async (stock) => {
      try {
        const [price, updatedAt] = await Promise.all([
          client.readContract({
            address: launchConfig.oracle,
            abi: PRICE_ORACLE_ABI,
            functionName: 'price',
            args: [stock.address],
          }) as Promise<bigint>,
          client.readContract({
            address: launchConfig.oracle,
            abi: PRICE_ORACLE_ABI,
            functionName: 'updatedAt',
            args: [stock.address],
          }) as Promise<bigint>,
        ]);

        return {
          ticker: stock.ticker,
          name: stock.name,
          address: stock.address,
          priceUsd: Number(price) / 100_000_000,
          updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
        };
      } catch {
        return {
          ticker: stock.ticker,
          name: stock.name,
          address: stock.address,
          priceUsd: stock.priceUsd,
          updatedAt: '',
        };
      }
    }),
  );
}
