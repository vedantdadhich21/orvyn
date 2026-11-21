/**
 * The receipt left in this browser by a publish.
 *
 * A published strategy lives onchain forever, but the app still needs to find
 * its own record again: which transaction, which id, what was written, and by
 * which address. That is kept next to the drafts, one record per draft, so a
 * refresh shows the link instead of offering a second copy of the same
 * strategy.
 *
 * This is a local receipt, not a source of truth. The transaction hash and the
 * registry address are what a person can check on BaseScan.
 */
import { isAddress } from 'viem';

const KEY = 'orvyn:published:v1';
const VERSION = 1;
const MAX_RECORDS = 20;
const HASH = /^0x[0-9a-fA-F]{64}$/;

export type PublishedStrategy = {
  version: number;
  draftId: string;
  chainId: number;
  registry: string;
  /** Registry ids are uint256, so they are kept as a decimal string. */
  strategyId: string;
  txHash: string;
  name: string;
  payload: string;
  author: string;
  at: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accept only a receipt this build can render. Returns null for anything else. */
export function parsePublished(value: unknown): PublishedStrategy | null {
  if (!isRecord(value)) return null;
  if (value.version !== VERSION) return null;
  if (typeof value.draftId !== 'string' || value.draftId.length === 0 || value.draftId.length > 128) {
    return null;
  }
  if (typeof value.chainId !== 'number' || !Number.isInteger(value.chainId) || value.chainId <= 0) {
    return null;
  }
  if (typeof value.registry !== 'string' || !isAddress(value.registry)) return null;
  if (typeof value.strategyId !== 'string' || !/^\d{1,78}$/.test(value.strategyId)) return null;
  if (typeof value.txHash !== 'string' || !HASH.test(value.txHash)) return null;
  if (typeof value.name !== 'string' || value.name.length === 0 || value.name.length > 64) return null;
  if (typeof value.payload !== 'string' || value.payload.length === 0 || value.payload.length > 512) {
    return null;
  }
  if (typeof value.author !== 'string' || !isAddress(value.author)) return null;

  return {
    version: VERSION,
    draftId: value.draftId,
    chainId: value.chainId,
    registry: value.registry,
    strategyId: value.strategyId,
    txHash: value.txHash,
    name: value.name,
    payload: value.payload,
    author: value.author,
    at: typeof value.at === 'string' ? value.at : '',
  };
}

export function parsePublishedList(raw: string): PublishedStrategy[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parsePublished).filter((item): item is PublishedStrategy => item !== null);
  } catch {
    return [];
  }
}

export function readPublishedRaw(store?: StorageLike): string {
  const target = store ?? browserStorage();
  if (!target) return '';
  try {
    return target.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function loadPublished(draftId: string, store?: StorageLike): PublishedStrategy | null {
  return parsePublishedList(readPublishedRaw(store)).find((item) => item.draftId === draftId) ?? null;
}

/** One receipt per draft, newest first, bounded like the drafts themselves. */
export function savePublished(record: PublishedStrategy, store?: StorageLike): void {
  const target = store ?? browserStorage();
  if (!target) return;
  const kept = parsePublishedList(readPublishedRaw(target)).filter(
    (item) => item.draftId !== record.draftId,
  );
  try {
    target.setItem(KEY, JSON.stringify([record, ...kept].slice(0, MAX_RECORDS)));
  } catch {
    // A full store must not turn a confirmed transaction into an error on
    // screen. The hash is still shown for this session; the next save retries.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('orvyn:published'));
}

export function clearPublished(draftId: string, store?: StorageLike): void {
  const target = store ?? browserStorage();
  if (!target) return;
  const kept = parsePublishedList(readPublishedRaw(target)).filter((item) => item.draftId !== draftId);
  try {
    target.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Same reasoning as save.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('orvyn:published'));
}
