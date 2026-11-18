import { STOCKS } from './stocks';

/**
 * Local drafts for the simulated builder. Nothing here leaves the browser:
 * there is no account, no network call and no custody. A draft is a name, a
 * selection, and (once weights have been set) a map of percentages.
 *
 * Reads are defensive because localStorage is user-editable and survives
 * deployments. A malformed or stale entry is dropped rather than rendered.
 */

const KEY = 'orvyn:drafts:v1';
const VERSION = 1;
const MAX_DRAFTS = 20;
const KNOWN = new Set(STOCKS.map((stock) => stock.ticker));

export type PortfolioDraft = {
  version: number;
  id: string;
  name: string;
  tickers: string[];
  weights: Record<string, number>;
  updatedAt: string;
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

/** Accept only drafts this version can render. Returns null for anything else. */
export function parseDraft(value: unknown): PortfolioDraft | null {
  if (!isRecord(value)) return null;
  if (value.version !== VERSION) return null;
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 128) return null;
  if (typeof value.name !== 'string' || value.name.length > 80) return null;
  if (!Array.isArray(value.tickers) || value.tickers.length > STOCKS.length) return null;

  const tickers: string[] = [];
  for (const item of value.tickers) {
    if (typeof item !== 'string' || !KNOWN.has(item) || tickers.includes(item)) return null;
    tickers.push(item);
  }

  const rawWeights = isRecord(value.weights) ? value.weights : {};
  const weights: Record<string, number> = {};
  for (const ticker of tickers) {
    const weight = rawWeights[ticker];
    weights[ticker] =
      typeof weight === 'number' && Number.isInteger(weight) && weight >= 0 && weight <= 100
        ? weight
        : 0;
  }

  return {
    version: VERSION,
    id: value.id,
    // Kept exactly as typed. A trailing space is mid typing, and this value
    // is read back after every keystroke, so trimming here would delete the
    // space the user just pressed. Blank names are rejected where it matters,
    // at the continue gate.
    name: value.name,
    tickers,
    weights,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  };
}

export function parseDrafts(raw: string): PortfolioDraft[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseDraft).filter((draft): draft is PortfolioDraft => draft !== null);
  } catch {
    return [];
  }
}

/** The raw snapshot, so React can tell whether the store actually changed. */
export function readDraftsRaw(store?: StorageLike): string {
  const target = store ?? browserStorage();
  if (!target) return '';
  try {
    return target.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function readDrafts(store?: StorageLike): PortfolioDraft[] {
  return parseDrafts(readDraftsRaw(store));
}

export function loadDraft(id: string, store?: StorageLike): PortfolioDraft | null {
  return readDrafts(store).find((draft) => draft.id === id) ?? null;
}

export function loadLatestDraft(store?: StorageLike): PortfolioDraft | null {
  return readDrafts(store)[0] ?? null;
}

/** Upsert by id, newest first, with a bound on how many drafts are kept. */
export function saveDraft(draft: PortfolioDraft, store?: StorageLike): void {
  const target = store ?? browserStorage();
  if (!target) return;
  const drafts = [draft, ...readDrafts(target).filter((item) => item.id !== draft.id)];
  try {
    target.setItem(KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
  } catch {
    // A full or disabled store must not break the builder. The draft remains
    // in memory for this session; the next save will try again.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('orvyn:drafts'));
  }
}

export function createDraft(name: string, tickers: string[]): PortfolioDraft {
  const cleanTickers = [...new Set(tickers)].filter((ticker) => KNOWN.has(ticker));
  const weights: Record<string, number> = {};
  for (const ticker of cleanTickers) weights[ticker] = 0;

  const uuid = globalThis.crypto?.randomUUID?.();
  return {
    version: VERSION,
    id: uuid ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: name.trim().slice(0, 80),
    tickers: cleanTickers,
    weights,
    updatedAt: new Date().toISOString(),
  };
}

export function totalWeight(weights: Record<string, number>, tickers: string[]): number {
  return tickers.reduce((sum, ticker) => sum + (weights[ticker] ?? 0), 0);
}

/** The allocation is only valid at exactly 100, never at "about" 100. */
export function isAllocationComplete(weights: Record<string, number>, tickers: string[]): boolean {
  return totalWeight(weights, tickers) === 100;
}
