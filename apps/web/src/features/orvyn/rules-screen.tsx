'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, TriangleAlert } from 'lucide-react';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { Slider } from '@/components/ui/slider';
import { CASH_TICKER, STOCKS } from '@/lib/orvyn/stocks';
import { checkTargets, fromPercent, RULE_LIMITS, type Rules } from '@/lib/orvyn/rules';
import { saveDraft, totalWeight } from '@/lib/orvyn/storage';
import { useDraft } from '@/lib/orvyn/use-draft';
import { cn } from '@/lib/utils';

/**
 * Step three: the policy a portfolio is held to.
 *
 * Two things happen on this screen. The person sets three numbers, and the
 * code checks the allocation they already made against them. Both use the same
 * functions the dashboard will use, so the sentence on this screen and the
 * badge on the next one can never disagree.
 *
 * The screen is a gate, not a suggestion: a plan that breaks its own rules
 * cannot continue. The fix is either a wider rule or a narrower weight, and the
 * screen says which one it is.
 */
const RULE_FIELDS = [
  {
    key: 'ceilingPct',
    label: 'Single company limit',
    hint: 'No one company may hold more than this share of the book. Cash is exempt.',
    unit: 'of the book',
  },
  {
    key: 'cashFloorPct',
    label: 'Cash floor',
    hint: 'Cash stays at or above this share, whatever the market does to the rest.',
    unit: 'in cash',
  },
  {
    key: 'driftBandPct',
    label: 'Drift band',
    hint: 'A line further than this from its target becomes a rebalance candidate.',
    unit: 'off target',
  },
] as const;

export function RulesScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const draft = useDraft(id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rules = draft?.rules;
  const tickers = draft?.tickers ?? [];
  const weights = draft?.weights ?? {};
  const total = totalWeight(weights, tickers);
  const complete = total === 100;

  // Only a completed plan can be judged. A half-built one reports its own
  // total as the problem instead of inventing ceiling breaches from zeroes.
  const breaches =
    complete && rules ? checkTargets(fromPercent(weights), rules) : [];
  const canContinue = Boolean(draft) && complete && breaches.length === 0;

  const setRule = (key: keyof Rules, value: number) => {
    if (!draft) return;
    saveDraft({
      ...draft,
      rules: { ...draft.rules, [key]: value },
      updatedAt: new Date().toISOString(),
    });
  };

  // Read from the weights, not from the breach list: a half-finished plan has
  // no breaches to list, and a line over the limit should still look over it.
  const overCeiling = new Set(
    tickers.filter(
      (ticker) => ticker !== CASH_TICKER && (weights[ticker] ?? 0) > (rules?.ceilingPct ?? 100),
    ),
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/allocate/${id}`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Weights
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Step 3 · Rules</Chip>
          <SandboxNote>Simulated portfolio</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Set the guardrails
        </Display>
        <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
          {draft ? (
            <>
              Three limits decide when{' '}
              <span className="font-medium text-ink-primary">{draft.name}</span> has left its
              plan. The chat model can suggest them later; this screen is where code has the
              final word.
            </>
          ) : (
            'Three limits decide when a portfolio has left its plan. Code has the final word.'
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
      ) : null}

      {draft && rules ? (
        <>
          <Panel
            className={cn(
              'p-5',
              canContinue ? 'border-positive/20' : 'border-amber/25',
            )}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {canContinue ? (
                    <Chip tone="positive">
                      <Check className="size-3" aria-hidden />
                      Plan passes
                    </Chip>
                  ) : (
                    <Chip tone="amber">
                      <TriangleAlert className="size-3" aria-hidden />
                      {complete
                        ? `${breaches.length} ${breaches.length === 1 ? 'breach' : 'breaches'}`
                        : 'Not allocated'}
                    </Chip>
                  )}
                </div>
                <p className="mt-3 max-w-[46ch] text-[11.5px] leading-relaxed text-ink-quaternary">
                  {!complete
                    ? 'These weights do not add up to 100% yet, so there is nothing to judge against the rules.'
                    : canContinue
                      ? 'Every line sits inside the limits below. This is the policy the dashboard will watch.'
                      : 'A plan that breaks its own policy does not continue. Widen a rule or narrow a weight.'}
                </p>
              </div>
              <div className="text-right">
                <SectionLabel as="h2">Allocated</SectionLabel>
                <Num
                  className={cn(
                    'mt-1.5 block text-2xl font-semibold',
                    complete ? 'text-ink-primary' : 'text-[#FF6B6B]',
                  )}>
                  {total}%
                </Num>
              </div>
            </div>

            {breaches.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-stroke-hairline pt-4">
                {breaches.map((breach) => (
                  <li
                    key={`${breach.code}-${breach.ticker ?? 'plan'}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12px]">
                    <span className="font-medium text-ink-secondary">{breach.message}</span>
                    <Num className="text-[10.5px] text-amber-bright">
                      {breach.actualPct.toFixed(1).replace(/\.0$/, '')}% /{' '}
                      {breach.limitPct}% limit
                    </Num>
                  </li>
                ))}
              </ul>
            ) : null}

            {!complete ? (
              <Link
                href={`/allocate/${id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-amber-bright transition-colors hover:text-amber">
                Adjust the weights
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </Panel>

          <section aria-label="Rules" className="grid gap-3 lg:grid-cols-3">
            {RULE_FIELDS.map((field) => {
              const value = rules[field.key];
              const { min, max } = RULE_LIMITS[field.key];
              const hint =
                field.key === 'cashFloorPct' && value === 0
                  ? 'No floor set. Cash still counts towards the book like any other line.'
                  : field.hint;
              return (
                <Panel key={field.key} className="flex flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[13px] font-semibold leading-snug">{field.label}</h2>
                      <p className="mt-1 text-[10.5px] text-ink-faint">{field.unit}</p>
                    </div>
                    <Num className="shrink-0 text-xl font-semibold text-brand-soft">
                      {value === 0 ? 'Off' : `${value}%`}
                    </Num>
                  </div>

                  <p className="mt-3 min-h-[3.2em] text-[11px] leading-relaxed text-ink-quaternary">
                    {hint}
                  </p>

                  <Slider
                    aria-label={`${field.label}, percent`}
                    className="mt-3"
                    min={min}
                    max={max}
                    step={1}
                    value={[value]}
                    onValueChange={([next]) => setRule(field.key, next ?? min)}
                  />
                  <div className="mt-2 flex justify-between text-[9.5px] text-ink-faint" aria-hidden>
                    <span>{min}%</span>
                    <span>{max}%</span>
                  </div>
                </Panel>
              );
            })}
          </section>

          <Panel className="p-5">
            <SectionLabel as="h2">Lines against the ceiling</SectionLabel>
            <p className="mt-1.5 text-[11px] text-ink-quaternary">
              Each line against the {rules.ceilingPct}% limit. Cash is exempt.
            </p>

            <ul className="mt-4 space-y-2.5">
              {tickers.map((ticker) => {
                const weightPct = weights[ticker] ?? 0;
                const stock = STOCKS.find((item) => item.ticker === ticker);
                const over = overCeiling.has(ticker);
                const cash = ticker === CASH_TICKER;
                return (
                  <li key={ticker} className="flex items-center gap-3">
                    <Num className="w-12 shrink-0 text-[11.5px] font-medium">{ticker}</Num>
                    <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-fill-muted">
                      <div
                        className={cn(
                          'h-full rounded-pill',
                          over
                            ? 'bg-amber'
                            : cash
                              ? 'bg-ink-quaternary'
                              : 'bg-gradient-to-r from-brand-deep to-brand',
                        )}
                        style={{ width: `${Math.min(100, weightPct)}%` }}
                      />
                      {!cash ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-0 w-px bg-ink-tertiary/70"
                          style={{ left: `${rules.ceilingPct}%` }}
                        />
                      ) : null}
                    </div>
                    <Num
                      className={cn(
                        'w-10 shrink-0 text-right text-[11.5px] font-medium',
                        over ? 'text-amber-bright' : 'text-ink-secondary',
                      )}>
                      {weightPct}%
                    </Num>
                    <span className="w-16 shrink-0 truncate text-right text-[10.5px] text-ink-faint">
                      {stock?.name ?? 'Position'}
                    </span>
                  </li>
                );
              })}
            </ul>

            <SandboxNote className="mt-4">
              A simulated portfolio held in this browser. Nothing here is bought or sold.
            </SandboxNote>
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] leading-relaxed text-ink-faint">
              Rules save as you move the sliders.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/portfolio/${id}`)}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40">
              Open the dashboard
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
