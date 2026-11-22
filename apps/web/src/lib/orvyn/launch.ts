import type { Address } from 'viem';

import deployment from '../../../deployments/base-sepolia-launch.json';

/**
 * The deployed launch suite. The JSON record is the source of truth; the public
 * env values exist only to point a preview at a different deployment.
 */
const address = (value: string | undefined, fallback: string): Address =>
  ((value && value.trim()) || fallback) as Address;

export const launchConfig = {
  testUSD: address(process.env.NEXT_PUBLIC_LAUNCH_TUSD, deployment.contracts.testUSD),
  exchange: address(process.env.NEXT_PUBLIC_LAUNCH_EXCHANGE, deployment.contracts.exchange),
  registryV2: address(process.env.NEXT_PUBLIC_LAUNCH_REGISTRY_V2, deployment.contracts.registryV2),
  oracle: deployment.contracts.priceOracle as Address,
  explorer: deployment.explorer,
  chainId: deployment.chainId,
} as const;

export type LaunchStock = {
  ticker: string;
  name: string;
  address: Address;
  priceUsd: number;
};

export const launchStocks: LaunchStock[] = Object.entries(deployment.stocks).map(
  ([ticker, stock]) => ({
    ticker,
    name: stock.name,
    address: stock.address as Address,
    priceUsd: stock.priceUsd,
  }),
);

export const stockByTicker: Record<string, LaunchStock> = Object.fromEntries(
  launchStocks.map((stock) => [stock.ticker, stock]),
);

export const USDC_DECIMALS = 6;
export const STOCK_DECIMALS = 18;
export const PRICE_DECIMALS = 8;
export const FAUCET_AMOUNT = BigInt(1_000) * BigInt(1_000_000);
export const FAUCET_COOLDOWN_SECONDS = 24 * 60 * 60;
