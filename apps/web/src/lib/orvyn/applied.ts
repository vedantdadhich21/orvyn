/**
 * The book a simulation was approved at.
 *
 * An approval is a decision made in this browser, not an order. It is kept
 * next to the drafts so the dashboard can read the same book the simulate
 * screen just showed, and so a refresh does not silently undo it. One record
 * per draft: a second approval replaces the first.
 *
 * Only simulated units are stored. Prices are re-read, because a price is an
 * observation and a holding is a decision.
 */
import { STOCKS } from './stocks';
import type { Units } from './engine';

const KEY = 'orvyn:applied:v1';
const VERSION = 1;
const MAX_RECORDS = 20;
const KNOWN = new Set(STOCKS.map((stock) => stock.ticker));

export type AppliedSimulation = {
  version: number;
  draftId: string;
  /** The scenario the approval belongs to. A different scenario starts over. */
  scenarioId: string;
  units: Units;
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

/** Accept only an approval this build can render. */
export function parseApplied(value: unknown): AppliedSimulation | null {
  if (!isRecord(value)) return null;
  if (value.version !== VERSION) return null;
  if (typeof value.draftId !== 'string' || value.draftId.length === 0 || value.draftId.length > 128) {
    return null;
  }
  if (typeof value.scenarioId !== 'string' || value.scenarioId.length === 0) return null;
  if (!isRecord(value.units)) return null;

  const units: Units = {};
  for (const [ticker, amount] of Object.entries(value.units)) {
    if (!KNOWN.has(ticker)) return null;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
    units[ticker] = amount;
  }

  return {
    version: VERSION,
    draftId: value.draftId,
    scenarioId: value.scenarioId,
    units,
    at: typeof value.at === 'string' ? value.at : '',
  };
}

export function parseAppliedList(raw: string): AppliedSimulation[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseApplied).filter((item): item is AppliedSimulation => item !== null);
  } catch {
    return [];
  }
}

export function readAppliedRaw(store?: StorageLike): string {
  const target = store ?? browserStorage();
  if (!target) return '';
  try {
    return target.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function loadApplied(draftId: string, store?: StorageLike): AppliedSimulation | null {
  return parseAppliedList(readAppliedRaw(store)).find((item) => item.draftId === draftId) ?? null;
}

/** One record per draft, newest first, bounded like the drafts themselves. */
export function saveApplied(record: AppliedSimulation, store?: StorageLike): void {
  const target = store ?? browserStorage();
  if (!target) return;
  const kept = parseAppliedList(readAppliedRaw(target)).filter((item) => item.draftId !== record.draftId);
  try {
    target.setItem(KEY, JSON.stringify([record, ...kept].slice(0, MAX_RECORDS)));
  } catch {
    // A full store must not break the screen. The approval still holds for
    // this session; the dashboard simply will not see it after a refresh.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('orvyn:applied'));
}

export function clearApplied(draftId: string, store?: StorageLike): void {
  const target = store ?? browserStorage();
  if (!target) return;
  const kept = parseAppliedList(readAppliedRaw(target)).filter((item) => item.draftId !== draftId);
  try {
    target.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Same reasoning as save: the screen recovers, the store stays as it was.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('orvyn:applied'));
}

/** Approval is tied to the scenario it was read at. */
export function appliedFor(
  record: AppliedSimulation | null,
  scenarioId: string,
): AppliedSimulation | null {
  if (!record) return null;
  return record.scenarioId === scenarioId ? record : null;
}
