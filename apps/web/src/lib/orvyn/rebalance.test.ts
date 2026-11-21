import { describe, expect, test } from 'bun:test';

import { buildUnits, drift, totalValue } from './engine';
import { applyTrades, rebalanceTrades } from './rebalance';

const prices = { NVDA: 140, MSFT: 420, CASH: 1 };
const targets = { NVDA: 0.4, MSFT: 0.3, CASH: 0.3 };

/** The biggest distance any line sits from its target, as a fraction. */
function worstDrift(units: { [ticker: string]: number }, at: typeof prices) {
  return Math.max(...Object.values(drift(units, at, targets)).map(Math.abs));
}

describe('the trades a rebalance would need', () => {
  test('a book on plan needs no trades', () => {
    expect(rebalanceTrades(buildUnits(targets, prices, 10_000), prices, targets)).toEqual([]);
  });

  test('a rally in one line produces a sell in that line and buys in the others', () => {
    const units = buildUnits(targets, prices, 10_000);
    const moved = { ...prices, NVDA: 200 };
    const trades = rebalanceTrades(units, moved, targets);

    expect(trades.find((trade) => trade.ticker === 'NVDA')?.side).toBe('sell');
    expect(trades.find((trade) => trade.ticker === 'MSFT')?.side).toBe('buy');
    expect(trades.find((trade) => trade.ticker === 'CASH')?.side).toBe('buy');
  });

  test('applying the list puts the book back on target', () => {
    const units = buildUnits(targets, prices, 10_000);
    const moved = { ...prices, NVDA: 200 };
    const before = totalValue(units, moved);

    const after = applyTrades(units, rebalanceTrades(units, moved, targets));

    expect(worstDrift(after, moved)).toBeLessThan(0.001);
    // No cash enters or leaves a rebalance: the sells pay for the buys.
    expect(totalValue(after, moved)).toBeCloseTo(before, 6);
  });

  test('a falling line is bought back up, and the sale funds it', () => {
    const units = buildUnits(targets, prices, 10_000);
    const moved = { ...prices, NVDA: 90 };
    const trades = rebalanceTrades(units, moved, targets);

    expect(trades.find((trade) => trade.ticker === 'NVDA')?.side).toBe('buy');
    expect(trades.find((trade) => trade.ticker === 'MSFT')?.side).toBe('sell');

    const after = applyTrades(units, trades);
    expect(worstDrift(after, moved)).toBeLessThan(0.001);
  });

  test('nothing is sold that is not held', () => {
    const units = buildUnits(targets, prices, 10_000);
    const moved = { ...prices, NVDA: 400 };

    for (const trade of rebalanceTrades(units, moved, targets)) {
      if (trade.side === 'sell') expect(trade.units).toBeLessThanOrEqual(units[trade.ticker] ?? 0);
    }
  });

  test('sells come first and the larger trade leads within a side', () => {
    const units = buildUnits(targets, prices, 10_000);
    const trades = rebalanceTrades(units, { ...prices, NVDA: 200 }, targets);

    const lastSell = trades.findLastIndex((trade) => trade.side === 'sell');
    const firstBuy = trades.findIndex((trade) => trade.side === 'buy');
    expect(lastSell).toBeLessThan(firstBuy);

    const buys = trades.filter((trade) => trade.side === 'buy');
    for (let index = 1; index < buys.length; index += 1) {
      expect(buys[index - 1]!.notional).toBeGreaterThanOrEqual(buys[index]!.notional);
    }
  });

  test('a holding with no target is sold in full', () => {
    const units = { NVDA: 10, TSLA: 5, CASH: 0 };
    const at = { NVDA: 100, TSLA: 200, CASH: 1 };
    const trades = rebalanceTrades(units, at, { NVDA: 1 });

    const exit = trades.find((trade) => trade.ticker === 'TSLA');
    expect(exit?.side).toBe('sell');
    expect(exit?.units).toBe(5);
    expect(applyTrades(units, trades).TSLA).toBe(0);
  });

  test('a trade under the dust threshold is left out', () => {
    const base = buildUnits(targets, prices, 10_000);
    const units = { ...base, NVDA: (base.NVDA ?? 0) + 0.001 };

    expect(rebalanceTrades(units, prices, targets)).toEqual([]);
    expect(rebalanceTrades(units, prices, targets, { minNotional: 0 }).length).toBeGreaterThan(0);
  });

  test('a ticker without a price is skipped rather than valued at zero', () => {
    expect(rebalanceTrades({ XYZ: 5 }, {}, { XYZ: 1 })).toEqual([]);
  });
});

describe('applying a trade list', () => {
  test('the book is copied, not edited in place', () => {
    const units = { NVDA: 4, CASH: 100 };
    const after = applyTrades(units, [
      { ticker: 'NVDA', side: 'sell', units: 1, price: 140, notional: 140 },
    ]);

    expect(after.NVDA).toBe(3);
    expect(units.NVDA).toBe(4);
  });

  test('a sell never turns into a negative holding', () => {
    const after = applyTrades(
      { NVDA: 1 },
      [{ ticker: 'NVDA', side: 'sell', units: 5, price: 140, notional: 700 }],
    );
    expect(after.NVDA).toBe(0);
  });

  test('a ticker that appears only in the trades is created at the right size', () => {
    const after = applyTrades({}, [{ ticker: 'MSFT', side: 'buy', units: 2, price: 420, notional: 840 }]);
    expect(after.MSFT).toBe(2);
  });
});
