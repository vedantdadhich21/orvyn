'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { Chip, Display, Num, Panel, SectionLabel } from '@/components/primitives';
import { createDraft, saveDraft, type PortfolioDraft } from '@/lib/orvyn/storage';
import { useLatestDraft } from '@/lib/orvyn/use-draft';
import { CASH_TICKER, STOCKS, formatPrice, type Stock } from '@/lib/orvyn/stocks';
import { cn } from '@/lib/utils';

/**
 * Step one of the builder: name the portfolio and choose the lines. Edits are
 * written straight to a local draft, so a refresh never drops them. Weights
 * are a separate step, so the action here moves on to allocation rather than
 * pretending the portfolio is complete.
 */
export function CreateScreen() {
  const router = useRouter();
  const draft = useLatestDraft();
  const tickers = draft?.tickers ?? [];

  const write = (next: PortfolioDraft) =>
    saveDraft({ ...next, updatedAt: new Date().toISOString() });

  const setName = (name: string) => write({ ...(draft ?? createDraft('', [])), name });

  const toggle = (ticker: string) => {
    const base = draft ?? createDraft('', []);
    const next = tickers.includes(ticker)
      ? tickers.filter((item) => item !== ticker)
      : [...tickers, ticker];
    const weights = { ...base.weights };
    for (const item of next) if (weights[item] === undefined) weights[item] = 0;
    for (const item of Object.keys(weights)) if (!next.includes(item)) delete weights[item];
    write({ ...base, tickers: next, weights });
  };

  const canContinue = Boolean(draft && draft.name.trim() && tickers.length > 0);

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
          <span className="text-[11px] text-ink-faint">
            {draft ? 'Saved locally' : 'Nothing saved yet'}
          </span>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Pick your stocks
        </Display>
        <p className="mt-2 max-w-[50ch] text-[13px] leading-relaxed text-ink-secondary">
          Choose what belongs in this portfolio. Cash is a line too — the rules will set how much
          of it you keep.
        </p>
      </div>

      <Panel className="p-5">
        <label htmlFor="portfolio-name" className="text-[11px] font-semibold text-ink-secondary">
          Portfolio name
        </label>
        <input
          id="portfolio-name"
          type="text"
          value={draft?.name ?? ''}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder="Core holdings"
          autoComplete="off"
          className="mt-2 h-10 w-full rounded-lg border border-stroke-raised bg-surface-sunken px-3 text-[13px] text-ink-primary outline-none placeholder:text-ink-faint focus:border-brand/60"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-quaternary">
          Saved in this browser. Nothing is uploaded and no account is needed.
        </p>
      </Panel>

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
                selected={tickers.includes(stock.ticker)}
                onToggle={() => toggle(stock.ticker)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Selection">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionLabel as="h2">Selected</SectionLabel>
              <p className="mt-1.5 text-[12.5px] text-ink-secondary">
                {tickers.length === 0 ? (
                  'Nothing chosen yet.'
                ) : (
                  <>
                    <Num className="font-medium text-ink-primary">{tickers.length}</Num> picked
                    <span className="text-ink-quaternary"> · {tickers.join(', ')}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="max-w-[28ch] text-right text-[11px] leading-relaxed text-ink-faint">
                {canContinue
                  ? 'Next, the weights. Cash counts towards the total.'
                  : draft?.name.trim()
                    ? 'Pick at least one line to continue.'
                    : 'Give the portfolio a name to continue.'}
              </p>
              <button
                type="button"
                onClick={() => draft && router.push(`/allocate/${draft.id}`)}
                disabled={!canContinue}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40">
                Set weights
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            </div>
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
