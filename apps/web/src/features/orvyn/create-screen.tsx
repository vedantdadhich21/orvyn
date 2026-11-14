'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';

import { Chip, Display, Num, Panel, SectionLabel } from '@/components/primitives';
import { CASH_TICKER, STOCKS, formatPrice, type Stock } from '@/lib/orvyn/stocks';
import { cn } from '@/lib/utils';

/**
 * Step one of the builder: choose the lines. Weights are a separate step, so
 * there is deliberately no continue button here yet — a disabled control that
 * cannot go anywhere is worse than a sentence that says what comes next.
 */
export function CreateScreen() {
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (ticker: string) =>
    setPicked((current) =>
      current.includes(ticker) ? current.filter((item) => item !== ticker) : [...current, ticker],
    );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Home
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Step 1 · Pick</Chip>
          <span className="text-[11px] text-ink-faint">Nothing is saved yet</span>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Pick your stocks
        </Display>
        <p className="mt-2 max-w-[50ch] text-[13px] leading-relaxed text-ink-secondary">
          Choose what belongs in this portfolio. Cash is a line too — the rules will set how much
          of it you keep.
        </p>
      </div>

      <section aria-label="Stock universe">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel as="h2">Demo universe</SectionLabel>
          <span className="text-[10.5px] text-ink-faint">Simulated prices</span>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {STOCKS.map((stock) => (
            <li key={stock.ticker}>
              <StockCard
                stock={stock}
                selected={picked.includes(stock.ticker)}
                onToggle={() => toggle(stock.ticker)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Selection">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel as="h2">Selected</SectionLabel>
              <p className="mt-1.5 text-[12.5px] text-ink-secondary">
                {picked.length === 0 ? (
                  'Nothing chosen yet.'
                ) : (
                  <>
                    <Num className="font-medium text-ink-primary">{picked.length}</Num> picked
                    <span className="text-ink-quaternary"> · {picked.join(', ')}</span>
                  </>
                )}
              </p>
            </div>
            <p className="max-w-[28ch] text-[11px] leading-relaxed text-ink-faint">
              Next: set the weights. They have to add up to 100%.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StockCard({
  stock,
  selected,
  onToggle,
}: {
  stock: Stock;
  selected: boolean;
  onToggle: () => void;
}) {
  const cash = stock.ticker === CASH_TICKER;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'flex h-full w-full flex-col gap-4 rounded-xl border p-4 text-left transition-colors',
        selected
          ? 'border-brand/60 bg-brand/[0.07]'
          : 'border-stroke-hairline bg-surface hover:border-stroke-raised hover:bg-fill-subtle',
      )}>
      <span className="flex w-full items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold">{stock.ticker}</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-quaternary">
            {stock.name}
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
            selected
              ? 'border-brand bg-brand text-[#07130D]'
              : 'border-stroke-raised text-transparent',
          )}>
          <Check className="size-3" strokeWidth={3} />
        </span>
      </span>

      <span className="flex w-full items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-[0.1em] text-ink-faint uppercase">
          {stock.theme}
        </span>
        {cash ? (
          <span className="text-[11.5px] text-ink-faint">1 unit</span>
        ) : (
          <span className="text-right">
            <Num className="block text-[12.5px] font-medium">{formatPrice(stock.priceUsd)}</Num>
            <Num
              className={cn(
                'block text-[10.5px]',
                stock.changePct > 0
                  ? 'text-positive'
                  : stock.changePct < 0
                    ? 'text-ink-quaternary'
                    : 'text-ink-faint',
              )}>
              {stock.changePct > 0 ? '+' : ''}
              {stock.changePct.toFixed(1)}%
            </Num>
          </span>
        )}
      </span>
    </button>
  );
}
