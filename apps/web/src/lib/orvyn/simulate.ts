/**
 * A rebalance, planned but not taken.
 *
 * The dashboard says a rebalance is due. This takes the book as it stands,
 * works out the trades that would put it back on plan, and computes what the
 * book would look like afterwards — all before anything is approved. The
 * numbers here are the ones the simulate screen reads, and the ones its test
 * holds to zero drift, so the screen has nothing to prove on its own.
 *
 * Pure arithmetic. There is no account, no order and no counterparty in this
 * file.
 */
import { currentWeights, drift, totalValue, type Prices, type Units, type Weights } from './engine';
import { applyTrades, rebalanceTrades, type Trade } from './rebalance';

export type LineChange = {
  ticker: string;
  /** Live minus target, as a fraction, before the trades. */
  before: number;
  after: number;
};

export type Simulation = {
  trades: Trade[];
  units: Units;
  afterUnits: Units;
  prices: Prices;
  targets: Weights;
  beforeWeights: Weights;
  afterWeights: Weights;
  /** One row per line in the plan, in the order the plan lists them. */
  lines: LineChange[];
  /** The biggest absolute distance from target, as a fraction. */
  worstBefore: number;
  worstAfter: number;
  valueBefore: number;
  valueAfter: number;
  /** USD raised by sells and spent on buys. Both are positive. */
  sells: number;
  buys: number;
};

/**
 * Read the trades and the book on either side of them. `afterUnits` is what
 * an approval would leave in place; nothing outside this object is changed.
 */
export function simulateRebalance(input: {
  units: Units;
  prices: Prices;
  targets: Weights;
  minNotional?: number;
}): Simulation {
  const { units, prices, targets } = input;
  const trades = rebalanceTrades(units, prices, targets, {
    ...(input.minNotional !== undefined ? { minNotional: input.minNotional } : {}),
  });
  const afterUnits = applyTrades(units, trades);

  const beforeWeights = currentWeights(units, prices);
  const afterWeights = currentWeights(afterUnits, prices);
  const beforeDrift = drift(units, prices, targets);
  const afterDrift = drift(afterUnits, prices, targets);

  const tickers = [...Object.keys(targets), ...Object.keys(units).filter((ticker) => !(ticker in targets))];

  return {
    trades,
    units,
    afterUnits,
    prices,
    targets,
    beforeWeights,
    afterWeights,
    lines: tickers.map((ticker) => ({
      ticker,
      before: beforeDrift[ticker] ?? 0,
      after: afterDrift[ticker] ?? 0,
    })),
    worstBefore: tickers.reduce((worst, ticker) => Math.max(worst, Math.abs(beforeDrift[ticker] ?? 0)), 0),
    worstAfter: tickers.reduce((worst, ticker) => Math.max(worst, Math.abs(afterDrift[ticker] ?? 0)), 0),
    valueBefore: totalValue(units, prices),
    valueAfter: totalValue(afterUnits, prices),
    sells: trades
      .filter((trade) => trade.side === 'sell')
      .reduce((sum, trade) => sum + trade.notional, 0),
    buys: trades
      .filter((trade) => trade.side === 'buy')
      .reduce((sum, trade) => sum + trade.notional, 0),
  };
}
