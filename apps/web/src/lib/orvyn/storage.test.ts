import { describe, expect, test } from 'bun:test';

import { createDraft, loadDraft, parseDraft, saveDraft, type PortfolioDraft } from './storage';
import { DEFAULT_RULES } from './rules';

/** The smallest thing that behaves like localStorage for these functions. */
function memoryStore(seed: string | null = null) {
  let value = seed;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

describe('a draft remembers its rules', () => {
  test('a new draft starts on the defaults', () => {
    expect(createDraft('Mega caps', ['NVDA', 'MSFT']).rules).toEqual(DEFAULT_RULES);
  });

  test('rules survive a save and a reload', () => {
    const store = memoryStore();
    const draft = createDraft('Mega caps', ['NVDA', 'MSFT']);
    const rules = { ceilingPct: 25, cashFloorPct: 15, driftBandPct: 3 };
    saveDraft({ ...draft, rules }, store);
    expect(loadDraft(draft.id, store)?.rules).toEqual(rules);
  });

  test('a draft written before rules existed keeps its data and gets defaults', () => {
    const older = {
      version: 1,
      id: 'draft-older',
      name: 'Older draft',
      tickers: ['NVDA', 'CASH'],
      weights: { NVDA: 90, CASH: 10 },
      updatedAt: '2026-11-01T00:00:00.000Z',
    };
    const parsed = parseDraft(older);
    expect(parsed?.weights.NVDA).toBe(90);
    expect(parsed?.rules).toEqual(DEFAULT_RULES);
  });

  test('hand-edited rules are clamped on the way in, not rendered raw', () => {
    const parsed: PortfolioDraft | null = parseDraft({
      version: 1,
      id: 'draft-edited',
      name: 'Edited',
      tickers: ['NVDA'],
      weights: { NVDA: 100 },
      rules: { ceilingPct: 900, cashFloorPct: -40, driftBandPct: 'soon' },
      updatedAt: '',
    });
    expect(parsed?.rules).toEqual({ ceilingPct: 100, cashFloorPct: 0, driftBandPct: 5 });
  });
});
