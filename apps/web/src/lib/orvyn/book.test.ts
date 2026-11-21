import { describe, expect, test } from 'bun:test';

import { readBook } from './book';
import { buildUnits } from './engine';
import { applyMoves, SCENARIOS, STARTING_NOTIONAL_USD } from './sim';
import { simulateRebalance } from './simulate';

const prices = { NVDA: 140, MSFT: 420, GOOGL: 170, CASH: 1 };
const targets = { NVDA: 0.4, MSFT: 0.2, GOOGL: 0.2, CASH: 0.2 };
const rules = { ceilingPct: 40, cashFloorPct: 10, driftBandPct: 5 };

function worst(report: { drift: Record<string, number> }) {
  return Math.max(...Object.values(report.drift).map(Math.abs));
}

describe('reading the book on the dashboard', () => {
  test('a fresh plan sits exactly on target', () => {
    const book = readBook({ targets, prices, rules });
    expect(book.value).toBe(STARTING_NOTIONAL_USD);
    expect(worst(book.report)).toBeLessThan(1e-9);
  });

  test('a scenario moves the value and can call for a rebalance', () => {
    const book = readBook({
      targets,
      prices,
      rules: { ...rules, ceilingPct: 40 },
      moves: SCENARIOS[1]!.moves,
    });
    expect(book.value).toBeGreaterThan(STARTING_NOTIONAL_USD);
    expect(book.report.due).toBe(true);
  });

  test('held units replace the freshly built plan', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const moved = { ...prices, NVDA: 200 };
    const simulation = simulateRebalance({ units, prices: moved, targets });

    const book = readBook({
      targets,
      prices: { ...prices },
      rules,
      moves: { NVDA: (200 - 140) / 140 },
      held: simulation.afterUnits,
    });

    expect(book.units).toEqual(simulation.afterUnits);
    expect(worst(book.report)).toBeLessThan(0.001);
  });

  test('the approved book is still valued at the scenario prices', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const moved = applyMoves(prices, SCENARIOS[1]!.moves);
    const simulation = simulateRebalance({ units, prices: moved, targets });
    const before = readBook({ targets, prices, rules, moves: SCENARIOS[1]!.moves });

    const book = readBook({
      targets,
      prices,
      rules,
      moves: SCENARIOS[1]!.moves,
      held: simulation.afterUnits,
    });

    expect(book.value).toBeCloseTo(before.value, 6);
  });
});
