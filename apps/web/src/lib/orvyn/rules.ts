/**
 * The rules layer: policy, not arithmetic.
 *
 * The engine answers "what is this portfolio worth". This file answers a
 * different question: "is that portfolio allowed to look like this". Three
 * numbers decide it — a ceiling on any single company, a floor under cash, and
 * a band of drift that is tolerated before a rebalance is due.
 *
 * Units are deliberate and split in one place only. Weights are fractions that
 * sum to 1, because that is what the engine works in. Rules are whole percent,
 * because that is what the person setting them types. `fromPercent` and
 * `asPercent` are the only crossing points, so no screen has to remember which
 * side of the line it is on.
 */
import { CASH_TICKER } from './stocks';
import { percentOfBook } from './format';
import { currentWeights, drift as engineDrift, type Prices, type Units, type Weights } from './engine';

export type Rules = {
  /** No single company may weigh more than this, in percent of the book. */
  ceilingPct: number;
  /** Cash must stay at or above this, in percent of the book. */
  cashFloorPct: number;
  /** How far a line may sit from its target before a rebalance is due. */
  driftBandPct: number;
};

export const DEFAULT_RULES: Rules = {
  ceilingPct: 30,
  // Off by default. A portfolio without a cash line would otherwise be
  // stopped at the rules step by a limit nobody chose. Raising the floor is
  // one slider, and the card explains what it does.
  cashFloorPct: 0,
  driftBandPct: 5,
};

export const RULE_LIMITS: Record<keyof Rules, { min: number; max: number }> = {
  ceilingPct: { min: 5, max: 100 },
  cashFloorPct: { min: 0, max: 80 },
  driftBandPct: { min: 1, max: 50 },
};

/** One comparator's worth of tolerance: 0.3 * 100 is 30.000000000000004. */
const EPS = 1e-6;

export type BreachCode = 'CEILING' | 'CASH_FLOOR' | 'WEIGHT_SUM';

export type Breach = {
  code: BreachCode;
  /** Present for every breach that belongs to one line. */
  ticker?: string;
  actualPct: number;
  limitPct: number;
  /** Written for the screen, not for a log. */
  message: string;
};

export type RebalanceReport = {
  due: boolean;
  /** live minus target, per ticker, as fractions. */
  drift: Weights;
  /** Lines sitting further from target than the band allows. */
  beyondBand: string[];
  /** Lines over the ceiling that a rebalance could actually fix. */
  overCeiling: string[];
  cashBelowFloor: boolean;
};

/** Whole numbers with one decimal only when it earns its place. */
function pctText(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function fromPercent(weights: Record<string, number>): Weights {
  return Object.fromEntries(Object.entries(weights).map(([ticker, value]) => [ticker, value / 100]));
}

export function asPercent(weights: Weights): Record<string, number> {
  return Object.fromEntries(
    Object.entries(weights).map(([ticker, value]) => [ticker, Math.round(value * 1000) / 10]),
  );
}

/**
 * Anything that reaches storage is clamped rather than rejected. A draft from
 * an older build has no rules at all, and a hand-edited one can contain
 * anything; neither should be able to produce an unrenderable screen.
 */
export function clampRules(input: unknown): Rules {
  const source: Partial<Record<keyof Rules, unknown>> =
    typeof input === 'object' && input !== null ? (input as Partial<Record<keyof Rules, unknown>>) : {};

  const pick = (key: keyof Rules): number => {
    const raw = source[key];
    const { min, max } = RULE_LIMITS[key];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : DEFAULT_RULES[key];
    return Math.min(max, Math.max(min, Math.round(value)));
  };

  return {
    ceilingPct: pick('ceilingPct'),
    cashFloorPct: pick('cashFloorPct'),
    driftBandPct: pick('driftBandPct'),
  };
}

/**
 * Check a planned allocation against the rules. This is the gate the rules
 * screen uses: a plan that breaks its own policy never reaches the dashboard.
 */
export function checkTargets(targets: Weights, rules: Rules): Breach[] {
  const breaches: Breach[] = [];

  const totalPct = Object.values(targets).reduce((sum, weight) => sum + weight, 0) * 100;
  if (Math.abs(totalPct - 100) > EPS) {
    breaches.push({
      code: 'WEIGHT_SUM',
      actualPct: totalPct,
      limitPct: 100,
      message: `The plan adds up to ${pctText(totalPct)}%, not 100%.`,
    });
  }

  for (const [ticker, weight] of Object.entries(targets)) {
    const actualPct = weight * 100;
    // Cash is the floor's business, not the ceiling's.
    if (ticker === CASH_TICKER) continue;
    if (actualPct > rules.ceilingPct + EPS) {
      breaches.push({
        code: 'CEILING',
        ticker,
        actualPct,
        limitPct: rules.ceilingPct,
        message: `${ticker} at ${pctText(actualPct)}% is over the ${pctText(rules.ceilingPct)}% limit.`,
      });
    }
  }

  const cashPct = (targets[CASH_TICKER] ?? 0) * 100;
  if (cashPct < rules.cashFloorPct - EPS) {
    breaches.push({
      code: 'CASH_FLOOR',
      ticker: CASH_TICKER,
      actualPct: cashPct,
      limitPct: rules.cashFloorPct,
      message: `Cash is ${pctText(cashPct)}%, under the ${pctText(rules.cashFloorPct)}% floor.`,
    });
  }

  return breaches;
}

/**
 * The badge. A line counts as drifting when it is further than the band from
 * its target. Policy breaches are reported separately and only when a
 * rebalance could fix them: a plan that is itself over the ceiling cannot be
 * solved by trading back to it, and saying otherwise would be a lie the button
 * could not keep.
 */
export function needsRebalance(
  units: Units,
  prices: Prices,
  targets: Weights,
  rules: Rules,
): RebalanceReport {
  const live = currentWeights(units, prices);
  const drift = engineDrift(units, prices, targets);

  const beyondBand = Object.keys(targets).filter(
    (ticker) => Math.abs(drift[ticker] ?? 0) * 100 > rules.driftBandPct + EPS,
  );

  const overCeiling = Object.keys(live).filter((ticker) => {
    if (ticker === CASH_TICKER) return false;
    const livePct = (live[ticker] ?? 0) * 100;
    const targetPct = (targets[ticker] ?? 0) * 100;
    return livePct > rules.ceilingPct + EPS && targetPct <= rules.ceilingPct + EPS;
  });

  const liveCash = (live[CASH_TICKER] ?? 0) * 100;
  const targetCash = (targets[CASH_TICKER] ?? 0) * 100;
  const cashBelowFloor = liveCash < rules.cashFloorPct - EPS && targetCash >= rules.cashFloorPct - EPS;

  return {
    due: beyondBand.length > 0 || overCeiling.length > 0 || cashBelowFloor,
    drift,
    beyondBand,
    overCeiling,
    cashBelowFloor,
  };
}

/**
 * The badge's reasons, in the product's own words. Shared so the dashboard
 * and the simulate screen cannot explain the same report differently.
 */
export function rebalanceReasons(
  report: RebalanceReport,
  weights: Weights,
  rules: Rules,
): string[] {
  const reasons: string[] = [];

  for (const ticker of report.beyondBand) {
    const moved = Math.abs((report.drift[ticker] ?? 0) * 100).toFixed(1);
    reasons.push(
      `${ticker} sits ${moved} points from target, past the ${rules.driftBandPct} point band.`,
    );
  }
  for (const ticker of report.overCeiling) {
    reasons.push(
      `${ticker} is ${percentOfBook(weights[ticker] ?? 0)} of the book, over the ${rules.ceilingPct}% ceiling.`,
    );
  }
  if (report.cashBelowFloor) {
    reasons.push(
      `Cash is ${percentOfBook(weights[CASH_TICKER] ?? 0)} of the book, under the ${rules.cashFloorPct}% floor.`,
    );
  }

  return reasons;
}
