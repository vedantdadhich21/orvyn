import { describe, expect, test } from 'bun:test';

import { appliedFor, clearApplied, loadApplied, parseApplied, saveApplied } from './applied';

const record = {
  version: 1,
  draftId: 'draft-1',
  scenarioId: 'ai-rally',
  units: { NVDA: 20.5, CASH: 120 },
  at: '2026-11-21T12:00:00.000Z',
};

function memoryStore(seed = '') {
  let value = seed;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    read: () => value,
  };
}

describe('an approved simulation', () => {
  test('round trips through storage', () => {
    const store = memoryStore();
    saveApplied(record, store);
    expect(loadApplied('draft-1', store)).toEqual(record);
  });

  test('a second approval of the same draft replaces the first', () => {
    const store = memoryStore();
    saveApplied(record, store);
    saveApplied({ ...record, scenarioId: 'selloff', units: { NVDA: 21 } }, store);

    const kept = loadApplied('draft-1', store);
    expect(kept?.scenarioId).toBe('selloff');
    expect(store.read().match(/draft-1/g)).toHaveLength(1);
  });

  test('two drafts keep separate approvals', () => {
    const store = memoryStore();
    saveApplied(record, store);
    saveApplied({ ...record, draftId: 'draft-2' }, store);

    expect(loadApplied('draft-1', store)?.units.NVDA).toBe(20.5);
    expect(loadApplied('draft-2', store)?.units.NVDA).toBe(20.5);
  });

  test('clearing one leaves the other alone', () => {
    const store = memoryStore();
    saveApplied(record, store);
    saveApplied({ ...record, draftId: 'draft-2' }, store);
    clearApplied('draft-1', store);

    expect(loadApplied('draft-1', store)).toBeNull();
    expect(loadApplied('draft-2', store)).not.toBeNull();
  });

  test('an approval only applies to the scenario it was read at', () => {
    expect(appliedFor(record, 'ai-rally')).toEqual(record);
    expect(appliedFor(record, 'selloff')).toBeNull();
    expect(appliedFor(null, 'ai-rally')).toBeNull();
  });
});

describe('reading an approval back defensively', () => {
  test('a different version is dropped', () => {
    expect(parseApplied({ ...record, version: 2 })).toBeNull();
  });

  test('a negative or non-numeric holding is dropped', () => {
    expect(parseApplied({ ...record, units: { NVDA: -1 } })).toBeNull();
    expect(parseApplied({ ...record, units: { NVDA: 'lots' } })).toBeNull();
    expect(parseApplied({ ...record, units: { NVDA: Number.NaN } })).toBeNull();
  });

  test('a ticker this build does not know is dropped', () => {
    expect(parseApplied({ ...record, units: { ENRON: 2 } })).toBeNull();
  });

  test('a missing draft id or scenario is dropped', () => {
    expect(parseApplied({ ...record, draftId: '' })).toBeNull();
    expect(parseApplied({ ...record, scenarioId: '' })).toBeNull();
  });

  test('a malformed store reads as empty rather than throwing', () => {
    expect(loadApplied('draft-1', memoryStore('{not json'))).toBeNull();
    expect(loadApplied('draft-1', memoryStore('[]'))).toBeNull();
  });

  test('a store that refuses writes does not throw', () => {
    const store = {
      getItem: () => '',
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => saveApplied(record, store)).not.toThrow();
  });
});
