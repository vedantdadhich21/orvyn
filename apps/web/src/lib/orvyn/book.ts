/**
 * The dashboard's one derivation: plan plus prices plus a market move, turned
 * into the numbers a person reads.
 *
 * Kept out of the screen so it can be tested without a browser. The screen's
 * job is then only to draw what this returns, which is the part that is hard
 * to get wrong and easy to see.
 */
import { buildUnits, currentWeights, totalValue, type Prices, type Units, type Weights } from './engine';
import { needsRebalance, type RebalanceReport, type Rules } from './rules';
import { applyMoves, STARTING_NOTIONAL_USD } from './sim';

export type Book = {
  units: Units;
  /** Prices after the scenario, which is what the value is struck at. */
  prices: Prices;
  targets: Weights;
  value: number;
  weights: Weights;
  report: RebalanceReport;
};

export function readBook(input: {
  targets: Weights;
  /** The plan's own prices. Units are bought here, once. */
  prices: Prices;
  rules: Rules;
  moves?: Record<string, number>;
  amount?: number;
}): Book {
  const units = buildUnits(input.targets, input.prices, input.amount ?? STARTING_NOTIONAL_USD);
  const prices = applyMoves(input.prices, input.moves ?? {});

  return {
    units,
    prices,
    targets: input.targets,
    value: totalValue(units, prices),
    weights: currentWeights(units, prices),
    report: needsRebalance(units, prices, input.targets, input.rules),
  };
}
