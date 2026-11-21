/**
 * Number formatting shared by the ORVYN screens.
 *
 * Weights are fractions internally, and people read percentages. Cents appear
 * on money only. Keeping the conversions here means a screen cannot quietly
 * show 0.42 where it meant 42%.
 */

/** A share of the book, from a fraction. One decimal only when needed. */
export function percentOfBook(fraction: number): string {
  const rounded = Math.round(fraction * 1000) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** A signed distance from target, from a fraction. */
export function pointsFromFraction(fraction: number): string {
  const rounded = Math.round(fraction * 1000) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

/** A distance from target with no sign, for a worst-case figure. */
export function pointsMagnitude(fraction: number): string {
  return pointsFromFraction(Math.abs(fraction)).replace(/^\+/, '');
}

/** A unit count, trimmed to four decimals and never negative-zero. */
export function unitAmount(units: number): string {
  if (!Number.isFinite(units)) return '0';
  const rounded = Math.round(units * 10_000) / 10_000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}
