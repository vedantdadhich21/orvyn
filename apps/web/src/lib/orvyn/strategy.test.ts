import { describe, expect, test } from 'bun:test';

import { createDraft } from './storage';
import {
  buildStrategy,
  cleanName,
  draftFromStrategy,
  parseStrategyPayload,
  strategyFromDraft,
  truncateBytes,
} from './strategy';

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

describe('reading a strategy that came back from the registry', () => {
  test('a published line parses back to the same plan', () => {
    const built = buildStrategy({
      name: 'Future of AI',
      tickers: ['NVDA', 'MSFT', 'GOOGL', 'CASH'],
      weights,
      rules,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    expect(parseStrategyPayload(built.payload)).toEqual({
      name: 'Future of AI',
      rules,
      weights,
      bookUsd: 10000,
    });
  });

  test('a copied plan becomes an editable local draft', () => {
    const parsed = parseStrategyPayload(
      'orvyn/1|name=Future of AI|limits=ceiling:40,cash:5,band:4|weights=NVDA:40,MSFT:20,GOOGL:20,CASH:20|book=25000',
    );
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    const draft = draftFromStrategy(parsed);
    expect(draft.name).toBe('Future of AI');
    expect(draft.tickers).toEqual(['NVDA', 'MSFT', 'GOOGL', 'CASH']);
    expect(draft.weights).toEqual(parsed.weights);
    expect(draft.rules).toEqual(parsed.rules);
    expect(draft.id).toBeTruthy();
  });

  test('a different version or a missing field is refused', () => {
    const line = 'orvyn/1|name=A|limits=ceiling:40,cash:0,band:5|weights=NVDA:100|book=10000';
    expect(parseStrategyPayload(line)).not.toBeNull();
    expect(parseStrategyPayload(line.replace('orvyn/1', 'orvyn/2'))).toBeNull();
    expect(parseStrategyPayload(line.replace('book=10000', ''))).toBeNull();
    expect(parseStrategyPayload(line.replace('|book=10000', ''))).toBeNull();
  });

  test('weights must be known, unique, whole and exactly 100', () => {
    const base = 'orvyn/1|name=A|limits=ceiling:40,cash:0,band:5|weights=';
    expect(parseStrategyPayload(`${base}NVDA:60,MSFT:40|book=10000`)).not.toBeNull();
    expect(parseStrategyPayload(`${base}ENRON:100|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}NVDA:50,NVDA:50|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}NVDA:99.5,MSFT:0.5|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}NVDA:60,MSFT:30|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}NVDA:101,MSFT:-1|book=10000`)).toBeNull();
  });

  test('limits and the book are checked, not clamped', () => {
    const base = 'orvyn/1|name=A|limits=';
    expect(parseStrategyPayload(`${base}ceiling:40,cash:0,band:5|weights=NVDA:100|book=10000`)).not.toBeNull();
    expect(parseStrategyPayload(`${base}ceiling:4,cash:0,band:5|weights=NVDA:100|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}ceiling:40,cash:81,band:5|weights=NVDA:100|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}ceiling:40,cash:0,band:0|weights=NVDA:100|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}ceiling:40,cash:0|weights=NVDA:100|book=10000`)).toBeNull();
    expect(parseStrategyPayload(`${base}ceiling:40,cash:0,band:5|weights=NVDA:100|book=0`)).toBeNull();
  });

  test('an empty name or an over-long name is refused', () => {
    expect(
      parseStrategyPayload('orvyn/1|name=|limits=ceiling:40,cash:0,band:5|weights=NVDA:100|book=10000'),
    ).toBeNull();
    expect(
      parseStrategyPayload(
        `orvyn/1|name=${'a'.repeat(65)}|limits=ceiling:40,cash:0,band:5|weights=NVDA:100|book=10000`,
      ),
    ).toBeNull();
  });
});
