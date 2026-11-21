import { describe, expect, test } from 'bun:test';

import { percentOfBook, pointsFromFraction, pointsMagnitude, unitAmount } from './format';

describe('the numbers people read', () => {
  test('a weight becomes a percentage without a trailing zero', () => {
    expect(percentOfBook(0.42)).toBe('42%');
    expect(percentOfBook(0.425)).toBe('42.5%');
    expect(percentOfBook(0)).toBe('0%');
  });

  test('a drift keeps its sign and one decimal', () => {
    expect(pointsFromFraction(0.052)).toBe('+5.2');
    expect(pointsFromFraction(-0.001)).toBe('-0.1');
    expect(pointsFromFraction(-0.00001)).toBe('0.0');
    expect(pointsFromFraction(0)).toBe('0.0');
  });

  test('a worst-case distance carries no sign', () => {
    expect(pointsMagnitude(-0.044)).toBe('4.4');
    expect(pointsMagnitude(0.0044)).toBe('0.4');
  });

  test('a unit count is trimmed, never negative zero', () => {
    expect(unitAmount(2.857142)).toBe('2.8571');
    expect(unitAmount(232)).toBe('232');
    expect(unitAmount(-0)).toBe('0');
  });

  test('a broken number reads as zero rather than NaN on screen', () => {
    expect(unitAmount(Number.NaN)).toBe('0');
    expect(unitAmount(Number.POSITIVE_INFINITY)).toBe('0');
  });
});
