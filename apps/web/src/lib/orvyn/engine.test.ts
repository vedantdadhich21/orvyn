import { describe, expect, test } from 'bun:test';

import { buildUnits, currentWeights, drift, totalValue } from './engine';

const prices = { NVDA: 100, CASH: 1 };
const targets = { NVDA: 0.9, CASH: 0.1 };

describe('the portfolio engine', () => {
  test('builds units that are worth exactly the deposited amount', () => {
    const units = buildUnits(targets, prices, 10_000);
    expect(units.NVDA).toBe(90);
    expect(units.CASH).toBe(1000);
    expect(totalValue(units, prices)).toBe(10_000);
  });

  test('starts exactly on target', () => {
    const units = buildUnits(targets, prices, 10_000);
    expect(currentWeights(units, prices).NVDA).toBeCloseTo(0.9);
    expect(currentWeights(units, prices).CASH).toBeCloseTo(0.1);
  });

  test('a price jump creates drift in both directions', () => {
    const units = buildUnits(targets, prices, 10_000);
    const moved = drift(units, { NVDA: 150, CASH: 1 }, targets);
    expect(moved.NVDA).toBeGreaterThan(0.02);
    expect(moved.CASH).toBeLessThan(-0.02);
    // The book is closed: overweight here is underweight elsewhere.
    expect(Object.values(moved).reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
  });

  test('a zero-value book reports zero weights instead of dividing by zero', () => {
    const weights = currentWeights({ NVDA: 90 }, { NVDA: 0 });
    expect(weights.NVDA).toBe(0);
  });

  test('a missing price builds no units rather than Infinity', () => {
    const units = buildUnits({ NVDA: 0.9 }, {}, 10_000);
    expect(units.NVDA).toBe(0);
  });
});
