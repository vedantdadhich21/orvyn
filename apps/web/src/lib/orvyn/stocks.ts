export type Stock = {
  ticker: string;
  name: string;
  theme: string;
  /** Demo reference value in USD. Not live market data. */
  priceUsd: number;
  /** Demo daily move, as a percentage. Not live market data. */
  changePct: number;
};

/**
 * The Chapter 1 universe. Every value here is a demo reference value used for
 * simulation; nothing in this file is fetched or traded.
 */
export const STOCKS: readonly Stock[] = [
  { ticker: 'NVDA', name: 'NVIDIA', theme: 'AI', priceUsd: 140, changePct: 2.4 },
  { ticker: 'MSFT', name: 'Microsoft', theme: 'AI', priceUsd: 420, changePct: 0.8 },
  { ticker: 'GOOGL', name: 'Alphabet', theme: 'AI', priceUsd: 170, changePct: -0.4 },
  { ticker: 'AMZN', name: 'Amazon', theme: 'Cloud', priceUsd: 190, changePct: 1.1 },
  { ticker: 'AAPL', name: 'Apple', theme: 'Devices', priceUsd: 230, changePct: -0.3 },
  { ticker: 'TSLA', name: 'Tesla', theme: 'Robotics', priceUsd: 250, changePct: 4.1 },
  { ticker: 'CASH', name: 'Cash', theme: 'Cash', priceUsd: 1, changePct: 0 },
];

export const CASH_TICKER = 'CASH';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatPrice(value: number): string {
  return usd.format(value);
}
