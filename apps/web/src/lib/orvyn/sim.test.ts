import { describe, expect, test } from 'bun:test';

import { applyMoves, scenarioById, SCENARIOS, STARTING_NOTIONAL_USD } from './sim';
import { readBook } from './book';
import type { Rules } from './rules';

const prices = { NVDA: 140, MSFT: 420, CASH: 1 };
const rules: Rules = { ceilingPct: 30, cashFloorPct: 10, driftBandPct: 5 };

describe('simulated market moves', () => {
  test('the plan scenario changes nothing at all', () => {
    expect(applyMoves(prices, {})).toEqual(prices);
  });

  test('a move is applied as a fraction of the price', () => {
    expect(applyMoves(prices, { NVDA: 0.25 }).NVDA).toBe(175);
  });

  test('cash never moves, whatever the scenario says', () => {
    expect(applyMoves(prices, { CASH: 0.5 }).CASH).toBe(1);
  });

  test('a price is floored at a penny rather than going to zero', () => {
    expect(applyMoves({ NVDA: 0.02 }, { NVDA: -0.9 }).NVDA).toBe(0.01);
  });

  test('a ticker with no move is passed through untouched', () => {
    expect(applyMoves(prices, { NVDA: 0.2 }).MSFT).toBe(420);
  });

  test('an unknown scenario id falls back to the first', () => {
    expect(scenarioById('does-not-exist').id).toBe(SCENARIOS[0]?.id);
  });

  test('every named scenario is unique and starts from the plan', () => {
    const ids = SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SCENARIOS[0]?.moves).toEqual({});
  });
});

describe('reading the book for the dashboard', () => {
  const targets = { NVDA: 0.3, MSFT: 0.3, CASH: 0.4 };

  test('at plan the book is worth exactly its notional and owes no trade', () => {
    const book = readBook({ targets, prices, rules });
    expect(book.value).toBe(STARTING_NOTIONAL_USD);
    expect(book.weights.NVDA).toBeCloseTo(0.3, 10);
    expect(book.report.due).toBe(false);
  });

  test('an AI rally lifts the value and tilts the book', () => {
    const book = readBook({ targets, prices, rules, moves: scenarioById('ai-rally').moves });
    expect(book.value).toBeGreaterThan(STARTING_NOTIONAL_USD);
    expect(book.weights.NVDA).toBeGreaterThan(0.3);
    expect(book.report.due).toBe(true);
    const sum = Object.values(book.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  test('an AI rally can push a line over its own ceiling', () => {
    const book = readBook({ targets, prices, rules, moves: scenarioById('ai-rally').moves });
    expect(book.report.overCeiling).toContain('NVDA');
  });

  test('a selloff leaves cash carrying more of the book', () => {
    const book = readBook({ targets, prices, rules, moves: scenarioById('selloff').moves });
    expect(book.value).toBeLessThan(STARTING_NOTIONAL_USD);
    expect(book.weights.CASH).toBeGreaterThan(0.4);
    expect(book.report.due).toBe(true);
  });

  test('the notional is the caller’s to set', () => {
    const book = readBook({ targets, prices, rules, amount: 2_500 });
    expect(book.value).toBe(2_500);
  });
});
