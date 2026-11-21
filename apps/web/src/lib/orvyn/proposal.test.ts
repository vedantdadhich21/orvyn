import { describe, expect, test } from 'bun:test';

import { DEFAULT_RULES, type Rules } from './rules';
import { describeRules, parseRuleSentence, validateProposal } from './proposal';

const base: Rules = { ceilingPct: 40, cashFloorPct: 20, driftBandPct: 5 };

describe('reading a sentence into limits', () => {
  test('the test sentence fills all three rules', () => {
    const { proposal } = parseRuleSentence(
      'No stock above 35%, keep at least 15% in cash, and rebalance when anything drifts more than 4 points.',
    );
    expect(proposal).toEqual({ ceilingPct: 35, cashFloorPct: 15, driftBandPct: 4 });
  });

  test('a sentence about one limit leaves the others alone', () => {
    const { proposal } = parseRuleSentence('Keep at least 20 percent cash.');
    expect(proposal).toEqual({ cashFloorPct: 20 });
  });

  test('the words the product uses all reach the right rule', () => {
    expect(parseRuleSentence('Cap any name at 25').proposal).toEqual({ ceilingPct: 25 });
    expect(parseRuleSentence('rebalance at 6 points').proposal).toEqual({ driftBandPct: 6 });
    expect(parseRuleSentence('ceiling 30').proposal).toEqual({ ceilingPct: 30 });
    expect(parseRuleSentence('cash floor 12').proposal).toEqual({ cashFloorPct: 12 });
  });

  test('a decimal is rounded to a whole percent before it is checked', () => {
    expect(parseRuleSentence('no company above 29.6%').proposal).toEqual({ ceilingPct: 30 });
  });

  test('a clause with no number is reported, not guessed at', () => {
    const { proposal, unread } = parseRuleSentence('Make it feel safer, and no stock above 30%');
    expect(proposal).toEqual({ ceilingPct: 30 });
    expect(unread).toEqual(['Make it feel safer']);
  });

  test('a sentence with no limits at all reads as empty', () => {
    const { proposal, unread } = parseRuleSentence('Do whatever the market wants.');
    expect(proposal).toEqual({});
    expect(unread).toHaveLength(1);
  });

  test('the first mention of a limit wins', () => {
    expect(parseRuleSentence('No stock above 30%, actually no stock above 45%').proposal).toEqual({
      ceilingPct: 30,
    });
  });
});

describe('checking an answer before it becomes policy', () => {
  test('unmentioned limits keep their current value', () => {
    const check = validateProposal({ cashFloorPct: 10 }, base);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.rules).toEqual({ ...base, cashFloorPct: 10 });
  });

  test('a full, in-range answer replaces the policy', () => {
    const check = validateProposal({ ceilingPct: 30, cashFloorPct: 0, driftBandPct: 2 }, base);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.rules).toEqual({ ceilingPct: 30, cashFloorPct: 0, driftBandPct: 2 });
  });

  test('the boundaries of every rule are allowed', () => {
    expect(validateProposal({ ceilingPct: 5, cashFloorPct: 0, driftBandPct: 1 }, base).ok).toBe(true);
    expect(validateProposal({ ceilingPct: 100, cashFloorPct: 80, driftBandPct: 50 }, base).ok).toBe(
      true,
    );
  });

  test('a bad answer is caught whole, with every problem named', () => {
    const check = validateProposal({ ceilingPct: 400, cashFloorPct: 'lots' }, base);
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.problems).toEqual([
      'The single company limit must be between 5 and 100, not 400.',
      'The cash floor must be a whole number.',
    ]);
  });

  test('a key this build does not have is refused rather than dropped', () => {
    const check = validateProposal({ maxStockPct: 30 }, base);
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.problems[0]).toContain('"maxStockPct"');
  });

  test('a fractional answer is refused, not rounded', () => {
    const check = validateProposal({ driftBandPct: 4.5 }, base);
    expect(check.ok).toBe(false);
  });

  test('an empty answer is not a policy', () => {
    expect(validateProposal({}, base).ok).toBe(false);
    expect(validateProposal(null, base).ok).toBe(false);
    expect(validateProposal([], base).ok).toBe(false);
    expect(validateProposal('ceiling 30', base).ok).toBe(false);
  });

  test('the defaults are a valid policy to start from', () => {
    const check = validateProposal({ ceilingPct: DEFAULT_RULES.ceilingPct }, DEFAULT_RULES);
    expect(check.ok).toBe(true);
  });
});

describe('describing a policy back to the person', () => {
  test('names each limit once, and says when cash is unconstrained', () => {
    expect(describeRules({ ceilingPct: 30, cashFloorPct: 0, driftBandPct: 5 })).toBe(
      '30% single company limit, no cash floor, 5 point drift band',
    );
    expect(describeRules({ ceilingPct: 30, cashFloorPct: 10, driftBandPct: 5 })).toBe(
      '30% single company limit, 10% cash floor, 5 point drift band',
    );
  });
});
