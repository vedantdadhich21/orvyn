/**
 * What gets published onchain, and what deliberately does not.
 *
 * A strategy on the registry is a name, three limits, the target weights and
 * the book size the simulation used. No holdings, no units, no prices, no
 * address book: enough for another person to rebuild the plan, and nothing
 * that could be mistaken for a position.
 *
 * The format is one readable line rather than JSON, because BaseScan shows a
 * string in the transaction input and a person should be able to read it
 * there. Versioned with `orvyn/1`, so a later format can never be mistaken
 * for this one.
 */
import { RULE_LIMITS, type Rules } from './rules';
import { STARTING_NOTIONAL_USD } from './sim';
import { STOCKS } from './stocks';
import { createDraft, type PortfolioDraft } from './storage';

const KNOWN = new Set(STOCKS.map((stock) => stock.ticker));

export const STRATEGY_VERSION = 'orvyn/1';
export const MAX_PUBLISHED_NAME_BYTES = 64;
export const MAX_PUBLISHED_PAYLOAD_BYTES = 512;

export type StrategyPayload =
  | { ok: true; name: string; payload: string; bytes: number }
  | { ok: false; reason: string };

/** Cut at a character boundary, never inside a multi-byte code point. */
export function truncateBytes(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= maxBytes) return text;

  let kept = '';
  let used = 0;
  for (const character of text) {
    const size = encoder.encode(character).length;
    if (used + size > maxBytes) break;
    kept += character;
    used += size;
  }
  return kept;
}

/** A name is display text, so the separators become spaces rather than noise. */
export function cleanName(name: string): string {
  return truncateBytes(name.replace(/\s+/g, ' ').replace(/[|=]/g, '/').trim(), MAX_PUBLISHED_NAME_BYTES);
}

/**
 * Build the exact string the publish transaction carries. Everything is
 * checked before a wallet is ever involved: a strategy that does not add up
 * to 100 is refused here, not left for the contract's size checks to catch.
 */
export function buildStrategy(input: {
  name: string;
  tickers: string[];
  weights: Record<string, number>;
  rules: Rules;
  bookUsd?: number;
}): StrategyPayload {
  const name = cleanName(input.name);
  if (!name) return { ok: false, reason: 'The strategy needs a name.' };

  const tickers = [...new Set(input.tickers)];
  if (tickers.length === 0) return { ok: false, reason: 'The strategy has no lines.' };

  let total = 0;
  const weightParts: string[] = [];
  for (const ticker of tickers) {
    if (!KNOWN.has(ticker)) return { ok: false, reason: `${ticker} is not a line this build knows.` };
    const weight = input.weights[ticker];
    if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < 0 || weight > 100) {
      return { ok: false, reason: `${ticker} needs a whole percentage.` };
    }
    total += weight;
    weightParts.push(`${ticker}:${weight}`);
  }
  if (total !== 100) {
    return { ok: false, reason: `The weights add up to ${total}%, not 100%.` };
  }

  for (const key of ['ceilingPct', 'cashFloorPct', 'driftBandPct'] as const) {
    const value = input.rules[key];
    const { min, max } = RULE_LIMITS[key];
    if (!Number.isInteger(value) || value < min || value > max) {
      return { ok: false, reason: `${key} is outside the range this build publishes.` };
    }
  }

  const book = Math.round(input.bookUsd ?? STARTING_NOTIONAL_USD);
  const payload = [
    STRATEGY_VERSION,
    `name=${name}`,
    `limits=ceiling:${input.rules.ceilingPct},cash:${input.rules.cashFloorPct},band:${input.rules.driftBandPct}`,
    `weights=${weightParts.join(',')}`,
    `book=${book}`,
  ].join('|');

  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > MAX_PUBLISHED_PAYLOAD_BYTES) {
    return { ok: false, reason: `The strategy is ${bytes} bytes; the registry allows ${MAX_PUBLISHED_PAYLOAD_BYTES}.` };
  }

  return { ok: true, name, payload, bytes };
}

/** A draft is publishable only when its allocation is complete and valid. */
export function strategyFromDraft(draft: PortfolioDraft): StrategyPayload {
  return buildStrategy({
    name: draft.name,
    tickers: draft.tickers,
    weights: draft.weights,
    rules: draft.rules,
  });
}

export type ParsedStrategy = {
  name: string;
  rules: Rules;
  weights: Record<string, number>;
  bookUsd: number;
};

const WHOLE = /^\d+$/;

/**
 * Read the line that was written onchain.
 *
 * This is deliberately strict: a payload either has the version, the three
 * limits, a set of known whole weights that add to 100 and a positive book, or
 * it is not a strategy this build understands. Reading never clamps or repairs
 * a number, because a copied strategy must be the one its author published.
 */
export function parseStrategyPayload(payload: string): ParsedStrategy | null {
  if (typeof payload !== 'string' || payload.length === 0) return null;

  const parts = payload.split('|');
  if (parts.length !== 5) return null;
  const [version, namePart, limitsPart, weightsPart, bookPart] = parts;
  if (version !== STRATEGY_VERSION) return null;

  if (!namePart?.startsWith('name=')) return null;
  const name = namePart.slice('name='.length);
  if (!name || new TextEncoder().encode(name).length > MAX_PUBLISHED_NAME_BYTES) return null;

  if (!limitsPart?.startsWith('limits=')) return null;
  const limits = new Map<string, number>();
  for (const pair of limitsPart.slice('limits='.length).split(',')) {
    const [key, raw, extra] = pair.split(':');
    if (!key || raw === undefined || extra !== undefined || limits.has(key)) return null;
    if (!WHOLE.test(raw)) return null;
    limits.set(key, Number(raw));
  }
  if (limits.size !== 3) return null;

  const ceiling = limits.get('ceiling');
  const cash = limits.get('cash');
  const band = limits.get('band');
  if (ceiling === undefined || cash === undefined || band === undefined) return null;

  const rules: Rules = { ceilingPct: ceiling, cashFloorPct: cash, driftBandPct: band };
  for (const key of ['ceilingPct', 'cashFloorPct', 'driftBandPct'] as const) {
    const { min, max } = RULE_LIMITS[key];
    if (rules[key] < min || rules[key] > max) return null;
  }

  if (!weightsPart?.startsWith('weights=')) return null;
  const weights: Record<string, number> = {};
  let total = 0;
  for (const pair of weightsPart.slice('weights='.length).split(',')) {
    const [ticker, raw, extra] = pair.split(':');
    if (!ticker || raw === undefined || extra !== undefined) return null;
    if (!KNOWN.has(ticker) || weights[ticker] !== undefined) return null;
    if (!WHOLE.test(raw)) return null;
    const value = Number(raw);
    if (value > 100) return null;
    weights[ticker] = value;
    total += value;
  }
  if (total !== 100 || Object.keys(weights).length === 0) return null;

  if (!bookPart?.startsWith('book=')) return null;
  const rawBook = bookPart.slice('book='.length);
  if (!WHOLE.test(rawBook)) return null;
  const bookUsd = Number(rawBook);
  if (!Number.isSafeInteger(bookUsd) || bookUsd <= 0) return null;

  return { name, rules, weights, bookUsd };
}

/** A local, editable copy of somebody else's published strategy. */
export function draftFromStrategy(strategy: ParsedStrategy): PortfolioDraft {
  const draft = createDraft(strategy.name, Object.keys(strategy.weights));
  return {
    ...draft,
    weights: { ...strategy.weights },
    rules: { ...strategy.rules },
    updatedAt: new Date().toISOString(),
  };
}
