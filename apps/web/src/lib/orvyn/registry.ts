/**
 * Where the strategy registry lives, and how to link to it.
 *
 * The address is a public deployment fact, so it is a `NEXT_PUBLIC_` value and
 * ships to the browser. It is read once at module load and checked with viem,
 * because a malformed address should turn the publish button off with a clear
 * reason rather than fail halfway through a transaction.
 *
 * Chapter 1 has exactly one registry chain. Publishing elsewhere would put a
 * strategy somewhere this app cannot link to, so the chain is a constant, not
 * a user choice.
 */
import { isAddress, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

export const REGISTRY_CHAIN = baseSepolia;
export const REGISTRY_CHAIN_ID = baseSepolia.id;

const EXPLORER_URL = REGISTRY_CHAIN.blockExplorers?.default.url ?? 'https://sepolia.basescan.org';

/** A trimmed, checksum-safe address, or null. Never throws. */
export function parseRegistryAddress(value: string | undefined | null): Address | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isAddress(trimmed) ? trimmed : null;
}

export const strategyRegistryAddress = parseRegistryAddress(
  process.env.NEXT_PUBLIC_STRATEGY_REGISTRY,
);

export const isRegistryConfigured = strategyRegistryAddress !== null;

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}
