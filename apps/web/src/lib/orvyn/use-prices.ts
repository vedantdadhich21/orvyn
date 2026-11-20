'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Prices } from './engine';
import { STOCKS } from './stocks';

/**
 * The dashboard's price read. It asks the adapter at `/api/prices` — the one
 * seam a real feed will sit behind — and falls back to the same demo reference
 * values if that call fails. The page stays usable either way; what changes is
 * the sentence under it.
 *
 * This is the only fetch on the dashboard. A scenario is arithmetic on these
 * prices, not another request, so switching scenarios is instant and free.
 */

const REFERENCE: Prices = Object.fromEntries(STOCKS.map((stock) => [stock.ticker, stock.priceUsd]));

function readPrices(input: unknown): Prices {
  const prices = { ...REFERENCE };
  if (typeof input !== 'object' || input === null) return prices;
  for (const [ticker, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) prices[ticker] = value;
  }
  return prices;
}

export type PriceRead = {
  /** Null while the first answer is still in flight. */
  prices: Prices | null;
  /** Set when the adapter did not answer and reference values are in use. */
  notice: string | null;
  retry: () => void;
};

export function usePrices(): PriceRead {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    // Every state write here happens after an await, so the effect body itself
    // only starts the request and returns its cancellation.
    const load = async () => {
      try {
        const response = await fetch('/api/prices', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Prices answered ${response.status}`);
        const body: unknown = await response.json();
        setPrices(readPrices(body));
        setNotice(null);
      } catch {
        // An aborted request is a navigation, not a failure. Only a real
        // error earns the notice.
        if (controller.signal.aborted) return;
        setPrices(REFERENCE);
        setNotice('The price endpoint did not answer, so reference values are shown.');
      }
    };

    void load();

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { prices, notice, retry };
}
