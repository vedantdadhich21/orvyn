/**
 * The states between a finished draft and a published strategy.
 *
 * The screen asks these functions one question at a time — may I publish, what
 * went wrong, which id came back — so the rules are testable without a wallet,
 * a chain or a browser.
 */
import { parseEventLogs, type Log } from 'viem';

import { REGISTRY_CHAIN_ID } from './registry';
import { STRATEGY_REGISTRY_ABI } from './strategy-registry';

export type PublishBlocker =
  | 'not-configured'
  | 'incomplete'
  | 'no-wallet'
  | 'wrong-chain'
  | 'ready';

/**
 * The first reason publishing cannot start, in the order a person can fix
 * them: the build itself, the draft, the wallet, then the network.
 */
export function publishBlocker(input: {
  configured: boolean;
  complete: boolean;
  hasWallet: boolean;
  chainId: number | null;
}): PublishBlocker {
  if (!input.configured) return 'not-configured';
  if (!input.complete) return 'incomplete';
  if (!input.hasWallet) return 'no-wallet';
  if (input.chainId !== REGISTRY_CHAIN_ID) return 'wrong-chain';
  return 'ready';
}

type ErrorLike = {
  name?: unknown;
  code?: unknown;
  shortMessage?: unknown;
  message?: unknown;
  details?: unknown;
  cause?: unknown;
  data?: unknown;
};

/** viem nests the useful error several `cause` levels down. */
function errorChain(error: unknown): ErrorLike[] {
  const found: ErrorLike[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (typeof current !== 'object' || current === null) break;
    const item = current as ErrorLike;
    found.push(item);
    current = item.cause;
  }
  return found;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const REVERTS: Record<string, string> = {
  EmptyName: 'The registry refused an empty strategy name.',
  NameTooLong: 'The name is longer than the registry allows. Shorten it and try again.',
  EmptyPayload: 'The registry refused an empty strategy.',
  PayloadTooLong: 'The strategy is longer than the registry allows.',
};

function revertReason(chain: ErrorLike[]): string | null {
  for (const item of chain) {
    if (typeof item.data !== 'object' || item.data === null) continue;
    const name = (item.data as { errorName?: unknown }).errorName;
    if (typeof name === 'string' && REVERTS[name]) return REVERTS[name] ?? null;
  }
  for (const item of chain) {
    for (const line of [text(item.shortMessage), text(item.message)]) {
      const match = line.match(/\b(EmptyName|NameTooLong|EmptyPayload|PayloadTooLong)\b/);
      if (match?.[1]) return REVERTS[match[1]] ?? null;
    }
  }
  return null;
}

/** One sentence a person can act on, never a raw RPC dump. */
export function publishErrorMessage(cause: unknown): string {
  const chain = errorChain(cause);
  const all = chain.map((item) => `${text(item.name)} ${text(item.shortMessage)} ${text(item.message)}`).join(' ');

  if (
    chain.some((item) => item.name === 'UserRejectedRequestError') ||
    /user rejected|rejected the request|user denied|denied transaction/i.test(all)
  ) {
    return 'The wallet cancelled the transaction. Nothing was published.';
  }

  const revert = revertReason(chain);
  if (revert) return revert;

  if (/insufficient funds|exceeds the balance|gas required exceeds/i.test(all)) {
    return 'This wallet has no Base Sepolia ETH for gas. Fund it from a faucet and try again.';
  }

  if (/chain .*not configured|unsupported chain|does not match the target chain|wrong chain/i.test(all)) {
    return 'The wallet is on another network. Switch it to Base Sepolia and try again.';
  }

  const short = chain.map((item) => text(item.shortMessage)).find(Boolean);
  if (short) return short.split('\n')[0]?.slice(0, 180) ?? short;

  const message = chain.map((item) => text(item.message)).find(Boolean);
  if (message) return message.split('\n')[0]?.slice(0, 180) ?? message;

  return 'The transaction could not be published. Nothing was written.';
}

/**
 * The registry returns the new id in `StrategyPublished`. Read it from the
 * receipt rather than guessing from `count() - 1`, which could belong to
 * somebody else's transaction in the same block.
 */
export function publishedIdFromLogs(logs: readonly Log[], registry: string): bigint | null {
  const ours = logs.filter((log) => log.address.toLowerCase() === registry.toLowerCase());
  if (ours.length === 0) return null;

  try {
    const events = parseEventLogs({
      abi: STRATEGY_REGISTRY_ABI,
      eventName: 'StrategyPublished',
      logs: ours,
    });
    return events[0]?.args.id ?? null;
  } catch {
    return null;
  }
}
