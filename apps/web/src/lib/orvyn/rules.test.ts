import { describe, expect, test } from 'bun:test';

import { buildUnits } from './engine';
import {
  asPercent,
  checkTargets,
  clampRules,
  DEFAULT_RULES,
  fromPercent,
  needsRebalance,
  type Rules,
} from './rules';

const rules: Rules = { ceilingPct: 30, cashFloorPct: 10, driftBandPct: 5 };
const prices = { NVDA: 100, MSFT: 50, CASH: 1 };

describe('checking a planned allocation', () => {
  test('a forty percent line is over a thirty percent ceiling', () => {
    const breaches = checkTargets({ NVDA: 0.4, MSFT: 0.3, CASH: 0.3 }, rules);
    expect(breaches).toHaveLength(1);
    expect(breaches[0]?.code).toBe('CEILING');
    expect(breaches[0]?.ticker).toBe('NVDA');
    expect(breaches[0]?.message).toBe('NVDA at 40% is over the 30% limit.');
  });

  test('a line exactly at the ceiling is allowed', () => {
    // 0.3 * 100 lands on 30.000000000000004 in binary; the comparator must not
    // turn that into a breach, or the rule is unusable at its own boundary.
    expect(checkTargets(fromPercent({ NVDA: 30, MSFT: 30, CASH: 40 }), rules)).toEqual([]);
  });

  test('cash is exempt from the ceiling', () => {
    expect(checkTargets(fromPercent({ NVDA: 20, MSFT: 20, CASH: 60 }), rules)).toEqual([]);
  });

  test('cash under the floor is a breach', () => {
    const breaches = checkTargets(fromPercent({ NVDA: 30, MSFT: 30, GOOGL: 25, AAPL: 10, CASH: 5 }), rules);
    expect(breaches).toHaveLength(1);
    expect(breaches[0]?.code).toBe('CASH_FLOOR');
    expect(breaches[0]?.message).toBe('Cash is 5%, under the 10% floor.');
  });

  test('cash exactly at the floor passes', () => {
    expect(checkTargets(fromPercent({ NVDA: 30, MSFT: 30, GOOGL: 30, CASH: 10 }), rules)).toEqual([]);
  });

  test('a plan that does not add up is caught', () => {
    const breaches = checkTargets({ NVDA: 0.3, CASH: 0.3 }, rules);
    expect(breaches).toHaveLength(1);
    expect(breaches[0]?.code).toBe('WEIGHT_SUM');
    expect(breaches[0]?.message).toBe('The plan adds up to 60%, not 100%.');
  });

  test('a whole-percent plan that lands on 0.9999999999999999 is still a hundred percent', () => {
    // 0.29 + 0.29 + 0.29 + 0.13 is not 1 in binary. A naive sum check would
    // reject a perfectly valid allocation, so the comparator carries a
    // tolerance rather than comparing floats for equality.
    const plan = fromPercent({ NVDA: 29, MSFT: 29, GOOGL: 29, CASH: 13 });
    const sum = Object.values(plan).reduce((a, b) => a + b, 0);
    expect(sum).not.toBe(1);
    expect(checkTargets(plan, rules)).toEqual([]);
  });
});

describe('deciding whether a rebalance is due', () => {
  const targets = { NVDA: 0.3, MSFT: 0.3, CASH: 0.4 };

  test('a book straight off the plan is not due', () => {
    const units = buildUnits(targets, prices, 10_000);
    const report = needsRebalance(units, prices, targets, rules);
    expect(report.due).toBe(false);
    expect(report.beyondBand).toEqual([]);
  });

  test('a rally in one line puts it past the band', () => {
    const units = buildUnits(targets, prices, 10_000);
    const report = needsRebalance(units, { ...prices, NVDA: 150 }, targets, rules);
    expect(report.due).toBe(true);
    expect(report.beyondBand).toContain('NVDA');
    expect(report.drift.NVDA).toBeGreaterThan(0);
    expect(report.drift.CASH).toBeLessThan(0);
  });

  test('exactly at the band is not yet a rebalance', () => {
    // 55 against a 50 target is five points: the band allows it.
    const units = { NVDA: 55, CASH: 45 };
    const flat = { NVDA: 1, CASH: 1 };
    expect(needsRebalance(units, flat, { NVDA: 0.5, CASH: 0.5 }, rules).due).toBe(false);
    const one = needsRebalance({ NVDA: 56, CASH: 44 }, flat, { NVDA: 0.5, CASH: 0.5 }, rules);
    expect(one.due).toBe(true);
  });

  test('cash falling under the floor is reported as a cash problem', () => {
    const plan = { NVDA: 0.9, CASH: 0.1 };
    const units = buildUnits(plan, prices, 10_000);
    const report = needsRebalance(units, { ...prices, NVDA: 120 }, plan, {
      ...rules,
      ceilingPct: 100,
    });
    expect(report.cashBelowFloor).toBe(true);
    expect(report.due).toBe(true);
  });

  test('a plan that breaks its own ceiling is not sold as fixable', () => {
    const bad = { NVDA: 0.5, CASH: 0.5 };
    const units = buildUnits(bad, prices, 10_000);
    const report = needsRebalance(units, prices, bad, rules);
    // Nothing has moved, so there is nothing to trade back to. The plan is the
    // problem, and checkTargets is the function that says so.
    expect(report.due).toBe(false);
    expect(report.overCeiling).toEqual([]);
    expect(checkTargets(bad, rules)[0]?.code).toBe('CEILING');
  });
});

describe('clamping whatever reaches storage', () => {
  test('missing rules become the defaults', () => {
    expect(clampRules(undefined)).toEqual(DEFAULT_RULES);
    expect(clampRules('nonsense')).toEqual(DEFAULT_RULES);
  });

  test('out of range and broken numbers are pulled back inside', () => {
    expect(clampRules({ ceilingPct: 400, cashFloorPct: -5, driftBandPct: Number.NaN })).toEqual({
      ceilingPct: 100,
      cashFloorPct: 0,
      driftBandPct: DEFAULT_RULES.driftBandPct,
    });
  });

  test('fractional rules are rounded to whole percent', () => {
    expect(clampRules({ ceilingPct: 29.6, cashFloorPct: 10.4, driftBandPct: 4.5 })).toEqual({
      ceilingPct: 30,
      cashFloorPct: 10,
      driftBandPct: 5,
    });
  });
});

describe('crossing between percent and fractions', () => {
  test('round trips without drift', () => {
    expect(asPercent(fromPercent({ NVDA: 40, CASH: 60 }))).toEqual({ NVDA: 40, CASH: 60 });
  });

  test('reports a tenth of a point rather than a long float', () => {
    expect(asPercent({ NVDA: 0.1234 })).toEqual({ NVDA: 12.3 });
  });
});
