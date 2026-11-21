'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Chip, Display, Num, Panel, SectionLabel, SandboxNote } from '@/components/primitives';
import { Slider } from '@/components/ui/slider';
import { isAllocationComplete, saveDraft, totalWeight } from '@/lib/orvyn/storage';
import { useDraft } from '@/lib/orvyn/use-draft';
import { STOCKS } from '@/lib/orvyn/stocks';
import { cn } from '@/lib/utils';

/**
 * Step two of the builder. Each line gets a weight in whole percent. The
 * weights are only valid at exactly 100, so the total is the gate: it turns
 * red while the allocation is short or long, and Next stays disabled.
 */
export function AllocateScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const draft = useDraft(id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const tickers = draft?.tickers ?? [];
  const weights = draft?.weights ?? {};
  const total = totalWeight(weights, tickers);
  const complete = isAllocationComplete(weights, tickers);

  const setWeight = (ticker: string, value: number) => {
    if (!draft) return;
    saveDraft({
      ...draft,
      weights: { ...draft.weights, [ticker]: value },
      updatedAt: new Date().toISOString(),
    });
  };

  const splitEvenly = () => {
    if (!draft || tickers.length === 0) return;
    const each = Math.floor(100 / tickers.length);
    let remainder = 100 - each * tickers.length;
    const next: Record<string, number> = {};
    for (const ticker of tickers) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      next[ticker] = each + extra;
    }
    saveDraft({ ...draft, weights: next, updatedAt: new Date().toISOString() });
  };

  const confirm = () => {
    if (!draft || !complete) return;
    saveDraft({ ...draft, updatedAt: new Date().toISOString() });
    router.push(`/rules/${draft.id}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Portfolio
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Step 2 · Weights</Chip>
          <SandboxNote>Simulated portfolio</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Set the weights
        </Display>
        <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-secondary">
          {draft ? (
            <>
              Split <span className="font-medium text-ink-primary">{draft.name}</span> across its
              lines. Cash counts towards the total like everything else.
            </>
          ) : (
            'Split this portfolio across its lines. Cash counts towards the total like everything else.'
          )}
        </p>
      </div>

      {!draft && ready ? (
        <Panel className="p-6 text-center">
          <p className="text-[13.5px] font-semibold text-ink-secondary">Draft unavailable</p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[11.5px] leading-relaxed text-ink-quaternary">
            This portfolio was not found in this browser. Start again to create a new draft.
          </p>
          <Link
            href="/create"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
            Back to picking
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : (
        <>
          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <SectionLabel as="h2">Total</SectionLabel>
                <Num
                  className={cn(
                    'mt-1.5 block text-3xl font-semibold',
                    complete ? 'text-brand' : 'text-[#FF6B6B]',
                  )}>
                  {total}%
                </Num>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-[11.5px] text-ink-quaternary">
                  {complete ? 'Ready to continue' : 'Must equal exactly 100%'}
                </p>
                <button
                  type="button"
                  onClick={splitEvenly}
                  disabled={!ready || !draft || tickers.length === 0}
                  className="rounded-lg border border-stroke-raised px-3 py-1.5 text-[11.5px] font-medium text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-40">
                  Split evenly
                </button>
              </div>
            </div>
          </Panel>

          {draft ? (
            <section aria-label="Weights" className="space-y-2.5">
              {tickers.map((ticker) => {
                const stock = STOCKS.find((item) => item.ticker === ticker);
                const value = weights[ticker] ?? 0;
                return (
                  <Panel key={ticker} className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold">{ticker}</div>
                        <div className="truncate text-[11px] text-ink-quaternary">
                          {stock?.name ?? 'Position'}
                        </div>
                      </div>
                      <Num className="text-[15px] font-medium text-ink-primary">{value}%</Num>
                    </div>
                    <Slider
                      aria-label={`Weight for ${ticker}`}
                      className="mt-4"
                      min={0}
                      max={100}
                      step={1}
                      value={[value]}
                      onValueChange={([next]) => setWeight(ticker, next ?? 0)}
                    />
                  </Panel>
                );
              })}
            </section>
          ) : null}

          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <SectionLabel as="h2">Continue</SectionLabel>
                <p className="mt-1.5 max-w-[34ch] text-[11.5px] leading-relaxed text-ink-quaternary">
                  Weights save as you move the sliders.
                </p>
              </div>
              <button
                type="button"
                onClick={confirm}
                disabled={!ready || !complete}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40">
                Next
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
