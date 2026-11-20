/**
 * Simulated market moves.
 *
 * The dashboard has to be able to show what a rule is for. Prices that never
 * move make drift a story about nothing, so three named scenarios stand in for
 * a market: the plan as it was built, a run in the AI names, and a broad
 * selloff. Every move is a fixed fraction, so the same scenario always
 * produces the same picture and any figure on screen can be reproduced by
 * hand.
 *
 * This is simulation, not data. Nothing here fetches, and cash never moves —
 * a dollar is a dollar.
 */
import type { Prices } from './engine';
import { CASH_TICKER } from './stocks';

/** The notional a draft is simulated with. Never real, never deposited. */
export const STARTING_NOTIONAL_USD = 10_000;

export type Scenario = {
  id: string;
  label: string;
  detail: string;
  /** Fractional move per ticker, e.g. 0.24 is a 24 percent rise. */
  moves: Record<string, number>;
};

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'at-plan',
    label: 'At plan',
    detail: 'The prices this book was built at.',
    moves: {},
  },
  {
    id: 'ai-rally',
    label: 'AI rally',
    detail: 'The chip names run and the book tilts with them.',
    moves: { NVDA: 0.24, MSFT: 0.07, GOOGL: 0.03, AMZN: 0.02, AAPL: 0.01, TSLA: 0.11 },
  },
  {
    id: 'selloff',
    label: 'Broad selloff',
    detail: 'Every line falls at once, and the book tilts.',
    moves: { NVDA: -0.18, MSFT: -0.06, GOOGL: -0.09, AMZN: -0.07, AAPL: -0.05, TSLA: -0.22 },
  },
];

export function scenarioById(id: string): Scenario {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? SCENARIOS[0]!;
}

/**
 * Apply a scenario to a price map. Quoted to the cent, floored at a penny,
 * and returned as a new object so the plan's own prices stay untouched.
 */
export function applyMoves(prices: Prices, moves: Record<string, number>): Prices {
  return Object.fromEntries(
    Object.entries(prices).map(([ticker, price]) => {
      const move = ticker === CASH_TICKER ? 0 : (moves[ticker] ?? 0);
      if (move === 0) return [ticker, price];
      return [ticker, Math.max(0.01, Math.round(price * (1 + move) * 100) / 100)];
    }),
  );
}
