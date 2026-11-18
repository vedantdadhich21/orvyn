/**
 * The portfolio engine: the small amount of maths that makes ORVYN's numbers
 * trustworthy. Everything here is pure and tested, so any figure the product
 * shows can be traced back to a function with a green test behind it.
 *
 * Weights are fractions that sum to 1. Units are simulated holdings denominated
 * in tokens. Prices are per-token reference values in USD. Nothing here trades,
 * fetches or stores; the engine is arithmetic only.
 */

export type Prices = Record<string, number>;
export type Units = Record<string, number>;
export type Weights = Record<string, number>;

/** Turn a cash amount into simulated units at the target weights. */
export function buildUnits(targets: Weights, prices: Prices, amount: number): Units {
  return Object.fromEntries(
    Object.entries(targets).map(([ticker, weight]) => {
      const price = prices[ticker];
      return [ticker, price ? (weight * amount) / price : 0];
    }),
  );
}

/** The cash value of a set of units at the given prices. */
export function totalValue(units: Units, prices: Prices): number {
  return Object.entries(units).reduce(
    (sum, [ticker, units_]) => sum + units_ * (prices[ticker] ?? 0),
    0,
  );
}

/** Each ticker's share of the book as a fraction of its total value. */
export function currentWeights(units: Units, prices: Prices): Weights {
  const total = totalValue(units, prices);
  return Object.fromEntries(
    Object.entries(units).map(([ticker, units_]) => [
      ticker,
      total ? (units_ * (prices[ticker] ?? 0)) / total : 0,
    ]),
  );
}

/**
 * How far each ticker sits from its target. Positive is overweight, negative
 * is underweight. Zero is on plan.
 */
export function drift(units: Units, prices: Prices, targets: Weights): Weights {
  const weights = currentWeights(units, prices);
  return Object.fromEntries(
    Object.keys(targets).map((ticker) => [
      ticker,
      (weights[ticker] ?? 0) - (targets[ticker] ?? 0),
    ]),
  );
}
