import { describe, expect, test } from 'bun:test';

import { buildUnits, type Prices, type Weights } from './engine';
import { applyMoves, SCENARIOS, STARTING_NOTIONAL_USD } from './sim';
import { simulateRebalance } from './simulate';

const prices: Prices = { NVDA: 140, MSFT: 420, GOOGL: 170, CASH: 1 };
const targets: Weights = { NVDA: 0.4, MSFT: 0.2, GOOGL: 0.2, CASH: 0.2 };

function at(scenarioId: string) {
  const scenario = SCENARIOS.find((item) => item.id === scenarioId)!;
  return applyMoves(prices, scenario.moves);
}

describe('a rebalance, planned but not taken', () => {
  test('the AI rally closes to zero drift after approval', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const moved = at('ai-rally');
    const simulation = simulateRebalance({ units, prices: moved, targets });

    expect(simulation.trades.length).toBeGreaterThan(0);
    expect(simulation.worstBefore).toBeGreaterThan(0.01);
    expect(simulation.worstAfter).toBeLessThan(0.001);
  });

  test('the broad selloff closes to zero drift after approval', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const moved = at('selloff');
    const simulation = simulateRebalance({ units, prices: moved, targets });

    expect(simulation.trades.length).toBeGreaterThan(0);
    expect(simulation.worstAfter).toBeLessThan(0.001);
  });

  test('a book already on plan has nothing to approve', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const simulation = simulateRebalance({ units, prices, targets });

    expect(simulation.trades).toEqual([]);
    expect(simulation.worstBefore).toBeLessThan(1e-9);
    expect(simulation.worstAfter).toBeLessThan(1e-9);
  });

  test('a rebalance moves no value in or out of the book', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const simulation = simulateRebalance({ units, prices: at('ai-rally'), targets });

    expect(simulation.valueAfter).toBeCloseTo(simulation.valueBefore, 6);
  });

  test('the sells pay for the buys, to the cent', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const simulation = simulateRebalance({ units, prices: at('ai-rally'), targets });

    expect(simulation.sells).toBeGreaterThan(0);
    expect(simulation.buys).toBeGreaterThan(0);
    expect(Math.abs(simulation.sells - simulation.buys)).toBeLessThan(0.01);
  });

  test('every line in the plan is reported, before and after', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const simulation = simulateRebalance({ units, prices: at('ai-rally'), targets });

    expect(simulation.lines.map((line) => line.ticker)).toEqual(['NVDA', 'MSFT', 'GOOGL', 'CASH']);
    for (const line of simulation.lines) {
      expect(Math.abs(line.after) * 100).toBeLessThan(0.1);
    }
  });

  test('the input book is not edited', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const snapshot = { ...units };
    simulateRebalance({ units, prices: at('ai-rally'), targets });
    expect(units).toEqual(snapshot);
  });

  test('the after weights sum to one when the trades are complete', () => {
    const units = buildUnits(targets, prices, STARTING_NOTIONAL_USD);
    const simulation = simulateRebalance({ units, prices: at('selloff'), targets });

    const total = Object.values(simulation.afterWeights).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 6);
  });
});
