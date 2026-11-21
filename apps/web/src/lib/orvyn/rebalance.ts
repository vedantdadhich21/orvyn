/**
 * The trades a rebalance would need.
 *
 * Given what is held, today's prices and the plan, this returns the smallest
 * set of buys and sells that puts every line back on target. It is pure: it
 * does not place anything, and it cannot see a brokerage. The screen that
 * eventually asks for approval reads this function's output; the decision to
 * trade is not made here.
 *
 * Two constraints keep the list honest. Nothing is sold that is not held, and
 * a trade smaller than the dust threshold is dropped rather than shown — a
 * twelve cent order is noise, and its absence leaves drift so small that the
 * next read still calls the book on plan.
 */
import { totalValue, type Prices, type Units, type Weights } from './engine';

export type TradeSide = 'buy' | 'sell';

export type Trade = {
  ticker: string;
  side: TradeSide;
  /** Always positive. The side says which way it goes. */
  units: number;
  price: number;
  notional: number;
};

/** Below this, a trade is noise on a simulated book. */
export const DEFAULT_MIN_NOTIONAL = 1;

export type RebalanceOptions = {
  /** USD. Trades at or under this are dropped. */
  minNotional?: number;
};

/**
 * Sells first, then buys, largest first within each side — the order a
 * settlement table reads in. A holding with no target is sold in full.
 */
export function rebalanceTrades(
  units: Units,
  prices: Prices,
  targets: Weights,
  options: RebalanceOptions = {},
): Trade[] {
  const minNotional = options.minNotional ?? DEFAULT_MIN_NOTIONAL;
  const value = totalValue(units, prices);
  if (value <= 0) return [];

  const trades: Trade[] = [];
  const tickers = new Set([...Object.keys(targets), ...Object.keys(units)]);

  for (const ticker of tickers) {
    const price = prices[ticker];
    if (!price || price <= 0) continue;

    const held = units[ticker] ?? 0;
    const wanted = ((targets[ticker] ?? 0) * value) / price;
    // A sell can only remove what is there. A plan that asks for more would
    // otherwise invent units out of nothing.
    const delta = wanted >= held ? wanted - held : Math.max(wanted - held, -held);
    const notional = Math.abs(delta) * price;

    if (notional < minNotional) continue;

    trades.push({
      ticker,
      side: delta > 0 ? 'buy' : 'sell',
      units: Math.abs(delta),
      price,
      notional,
    });
  }

  return trades.sort((a, b) => {
    if (a.side !== b.side) return a.side === 'sell' ? -1 : 1;
    return b.notional - a.notional;
  });
}

/** Apply a trade list to a copy of the book. The input is left untouched. */
export function applyTrades(units: Units, trades: readonly Trade[]): Units {
  const next: Units = { ...units };

  for (const trade of trades) {
    const held = next[trade.ticker] ?? 0;
    const moved = trade.side === 'buy' ? held + trade.units : held - trade.units;
    // Floor at zero rather than trusting the caller's arithmetic. A negative
    // holding is not a position, and it would make every later weight a lie.
    next[trade.ticker] = Math.max(0, moved);
  }

  return next;
}
