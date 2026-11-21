import { describe, expect, test } from 'bun:test';

import {
  clearPublished,
  loadPublished,
  parsePublished,
  parsePublishedList,
  savePublished,
  type PublishedStrategy,
} from './published';

const REGISTRY = '0x4200000000000000000000000000000000000042';
const AUTHOR = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
const HASH = `0x${'ab'.repeat(32)}`;

function record(draftId: string, id = '0'): PublishedStrategy {
  return {
    version: 1,
    draftId,
    chainId: 84532,
    registry: REGISTRY,
    strategyId: id,
    txHash: HASH,
    name: 'AI leaders',
    payload: 'orvyn/1|name=AI leaders|limits=ceiling:40,cash:0,band:5|weights=NVDA:40,CASH:60|book=10000',
    author: AUTHOR,
    at: '2026-11-21T18:00:00.000Z',
  };
}

/** A localStorage-shaped store that lives only for one test. */
function memoryStore(initial = '') {
  let value = initial;
  return {
    getItem() {
      return value;
    },
    setItem(_key: string, next: string) {
      value = next;
    },
    raw() {
      return value;
    },
  };
}

describe('a published strategy receipt', () => {
  test('saves, reads back and survives a round trip', () => {
    const store = memoryStore();
    savePublished(record('draft-1', '7'), store);
    expect(loadPublished('draft-1', store)).toEqual(record('draft-1', '7'));
  });

  test('a second publish of the same draft replaces the first', () => {
    const store = memoryStore();
    savePublished(record('draft-1', '1'), store);
    savePublished({ ...record('draft-1', '2'), txHash: `0x${'cd'.repeat(32)}` }, store);
    expect(loadPublished('draft-1', store)?.strategyId).toBe('2');
    expect(parsePublishedList(store.raw())).toHaveLength(1);
  });

  test('another draft keeps its own receipt', () => {
    const store = memoryStore();
    savePublished(record('draft-1', '1'), store);
    savePublished(record('draft-2', '2'), store);
    expect(loadPublished('draft-1', store)?.strategyId).toBe('1');
    expect(loadPublished('draft-2', store)?.strategyId).toBe('2');
  });

  test('clearing one draft leaves the others alone', () => {
    const store = memoryStore();
    savePublished(record('draft-1'), store);
    savePublished(record('draft-2'), store);
    clearPublished('draft-1', store);
    expect(loadPublished('draft-1', store)).toBeNull();
    expect(loadPublished('draft-2', store)).not.toBeNull();
  });

  test('the store is bounded', () => {
    const store = memoryStore();
    for (let index = 0; index < 25; index += 1) savePublished(record(`draft-${index}`, String(index)), store);
    expect(parsePublishedList(store.raw())).toHaveLength(20);
    expect(loadPublished('draft-0', store)).toBeNull();
  });
});

describe('a receipt that this build cannot trust', () => {
  test('a wrong version, hash, id or address is refused', () => {
    expect(parsePublished({ ...record('draft-1'), version: 2 })).toBeNull();
    expect(parsePublished({ ...record('draft-1'), txHash: '0x1234' })).toBeNull();
    expect(parsePublished({ ...record('draft-1'), strategyId: 'seven' })).toBeNull();
    expect(parsePublished({ ...record('draft-1'), registry: '0x1234' })).toBeNull();
    expect(parsePublished({ ...record('draft-1'), author: 'nobody' })).toBeNull();
  });

  test('a broken payload answers with an empty list', () => {
    expect(parsePublishedList('{not json')).toEqual([]);
    expect(parsePublishedList('{"draftId":"x"}')).toEqual([]);
    expect(parsePublishedList('')).toEqual([]);
  });

  test('one bad record does not hide a good one', () => {
    const raw = JSON.stringify([record('draft-1'), { ...record('draft-2'), txHash: 'nope' }]);
    expect(parsePublishedList(raw).map((item) => item.draftId)).toEqual(['draft-1']);
  });
});
