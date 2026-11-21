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
import type { PortfolioDraft } from './storage';

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
