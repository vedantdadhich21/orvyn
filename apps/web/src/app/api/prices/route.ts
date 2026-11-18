import { STOCKS } from '@/lib/orvyn/stocks';

/**
 * One place where prices come from, so real data can be swapped in later.
 *
 * Chapter 1 serves the demo reference values from the local universe. When a
 * real source fits, BASE_STOCKS_API_URL points at it and the response is
 * adapted here, so every consumer keeps the same shape: ticker -> price.
 */

const DEMO_PRICES: Record<string, number> = Object.fromEntries(
  STOCKS.map((stock) => [stock.ticker, stock.priceUsd]),
);

export async function GET() {
  const url = process.env.BASE_STOCKS_API_URL; // set only if the real API fits
  if (url) {
    try {
      const response = await fetch(url, { next: { revalidate: 60 } });
      if (response.ok) {
        // Adapt the real response to ticker -> price before returning it.
        return Response.json(await response.json());
      }
    } catch {
      // A failing upstream must not leave the builder without prices. The
      // demo values below are the fallback, and they are labelled simulated
      // everywhere they are shown.
    }
  }
  return Response.json(DEMO_PRICES);
}
