import { describe, expect, test } from 'bun:test';

import { createDraft } from './storage';
import { buildStrategy, cleanName, strategyFromDraft, truncateBytes } from './strategy';

const weights = { NVDA: 40, MSFT: 20, GOOGL: 20, CASH: 20 };
const rules = { ceilingPct: 40, cashFloorPct: 10, driftBandPct: 5 };

describe('the strategy that goes onchain', () => {
  test('the demo portfolio produces one readable line', () => {
    const built = buildStrategy({ name: 'AI leaders', tickers: ['NVDA', 'MSFT', 'GOOGL', 'CASH'], weights, rules });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    expect(built.payload).toBe(
      'orvyn/1|name=AI leaders|limits=ceiling:40,cash:10,band:5|weights=NVDA:40,MSFT:20,GOOGL:20,CASH:20|book=10000',
    );
    expect(built.name).toBe('AI leaders');
    expect(built.bytes).toBeLessThan(512);
  });

  test('the weights keep the order the person picked', () => {
    const built = buildStrategy({ name: 'Order', tickers: ['CASH', 'NVDA'], weights: { CASH: 20, NVDA: 80 }, rules });
    expect(built.ok && built.payload).toContain('weights=CASH:20,NVDA:80');
  });

  test('a separator in the name cannot break the line', () => {
    const built = buildStrategy({ name: '  AI | leaders = fund  ', tickers: ['NVDA'], weights: { NVDA: 100 }, rules });
    expect(built.ok && built.name).toBe('AI / leaders / fund');
    expect(built.ok && built.payload.split('|')).toHaveLength(5);
  });

  test('a name past the contract limit is cut at a character boundary', () => {
    const built = buildStrategy({ name: 'é'.repeat(80), tickers: ['NVDA'], weights: { NVDA: 100 }, rules });
    expect(built.ok).toBe(true);
    expect(new TextEncoder().encode(cleanName('é'.repeat(80))).length).toBeLessThanOrEqual(64);
    expect(built.ok && built.name).not.toContain('\\uFFFD');
  });

  test('an incomplete allocation is refused before a wallet is involved', () => {
    const built = buildStrategy({ name: 'Half', tickers: ['NVDA', 'CASH'], weights: { NVDA: 40, CASH: 20 }, rules });
    expect(built).toEqual({ ok: false, reason: 'The weights add up to 60%, not 100%.' });
  });

  test('a fractional or unknown weight is refused', () => {
    expect(buildStrategy({ name: 'A', tickers: ['NVDA'], weights: { NVDA: 99.5 }, rules }).ok).toBe(false);
    expect(buildStrategy({ name: 'A', tickers: ['ENRON'], weights: { ENRON: 100 }, rules }).ok).toBe(false);
  });

  test('a rule outside the published range is refused', () => {
    const built = buildStrategy({
      name: 'A',
      tickers: ['NVDA'],
      weights: { NVDA: 100 },
      rules: { ...rules, ceilingPct: 400 },
    });
    expect(built.ok).toBe(false);
  });

  test('a draft is publishable only once it is complete', () => {
    const draft = createDraft('AI leaders', ['NVDA', 'MSFT', 'GOOGL', 'CASH']);
    expect(strategyFromDraft(draft).ok).toBe(false);

    const complete = { ...draft, weights, rules };
    const built = strategyFromDraft(complete);
    expect(built.ok).toBe(true);
    expect(built.ok && built.payload).toContain('name=AI leaders');
  });
});

describe('cutting a name to a byte budget', () => {
  test('short text is untouched', () => {
    expect(truncateBytes('AI leaders', 64)).toBe('AI leaders');
  });

  test('a multi-byte character is never split in half', () => {
    const cut = truncateBytes('aaaé', 4);
    expect(cut).toBe('aaa');
    expect(new TextEncoder().encode(cut).length).toBe(3);
  });
});
