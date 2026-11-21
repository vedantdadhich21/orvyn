'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, TriangleAlert } from 'lucide-react';

import {
  Balance,
  Chip,
  Display,
  Num,
  Panel,
  PulseDot,
  SandboxNote,
  SectionLabel,
} from '@/components/primitives';
import { appliedFor } from '@/lib/orvyn/applied';
import { readBook } from '@/lib/orvyn/book';
import { percentOfBook, pointsFromFraction } from '@/lib/orvyn/format';
import { CASH_TICKER, STOCKS, formatPrice } from '@/lib/orvyn/stocks';
import { fromPercent, rebalanceReasons, type RebalanceReport, type Rules } from '@/lib/orvyn/rules';
import { scenarioById, SCENARIOS, STARTING_NOTIONAL_USD } from '@/lib/orvyn/sim';
import { totalWeight } from '@/lib/orvyn/storage';
import { useApplied } from '@/lib/orvyn/use-applied';
import { useDraft } from '@/lib/orvyn/use-draft';
import { usePrices } from '@/lib/orvyn/use-prices';
import { cn } from '@/lib/utils';
import { ScenarioControl } from './scenario-control';

/**
 * The drift dashboard. One book, one set of prices, one scenario dial.
 *
 * Everything on the page is derived by `readBook` from the draft, the prices
 * and the chosen scenario, so the donut, the bars, the badge and the value
 * cannot disagree. The screen itself only draws.
 */

const SLICE_COLOURS = ['#2BD98B', '#1E8F63', '#6FE7B4', '#17684A', '#5AD5C0', '#37B98A', '#2FA37A'];
const CASH_COLOUR = 'rgba(242,243,245,0.28)';

const DONUT_SIZE = 172;
const DONUT_STROKE = 18;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DONUT_GAP = 3;

export function DashboardScreen() {
  const { id } = useParams<{ id: string }>();
  const draft = useDraft(id);
  const { prices, notice, retry } = usePrices();
  const applied = useApplied(id);
  // An approval names the scenario it was read at, so returning to either
  // screen lands on that scenario instead of a blank plan.
  const [chosenScenario, setChosenScenario] = useState<string | null>(null);
  // The draft lives in localStorage, so the server has no way to know it. A
  // tick of patience keeps the first paint from flashing an error that is only
  // true for the server's half of the page.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const tickers = useMemo(() => draft?.tickers ?? [], [draft]);
  const weights = draft?.weights ?? {};
  const complete = totalWeight(weights, tickers) === 100;
  const rules = draft?.rules;
  const scenario = scenarioById(chosenScenario ?? applied?.scenarioId ?? SCENARIOS[0]?.id ?? 'at-plan');
  const approved = appliedFor(applied, scenario.id);

  /** Stocks first, cash last, so the neutral slice closes the ring. */
  const ordered = useMemo(
    () => [...tickers.filter((ticker) => ticker !== CASH_TICKER), ...tickers.filter((ticker) => ticker === CASH_TICKER)],
    [tickers],
  );

  const book = useMemo(() => {
    if (!draft || !rules || !prices || !complete) return null;
    return readBook({
      targets: fromPercent(draft.weights),
      prices,
      rules,
      moves: scenario.moves,
      ...(approved ? { held: approved.units } : {}),
    });
  }, [draft, rules, prices, complete, scenario, approved]);

  const valueParts = formatPrice(book?.value ?? 0).split('.');

  const colourFor = (ticker: string) => {
    if (ticker === CASH_TICKER) return CASH_COLOUR;
    const index = ordered.filter((item) => item !== CASH_TICKER).indexOf(ticker);
    return SLICE_COLOURS[index % SLICE_COLOURS.length] as string;
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/rules/${id}`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Rules
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Simulated book</Chip>
          {approved ? (
            <Chip tone="positive">
              <Check className="size-3" aria-hidden />
              Rebalanced
            </Chip>
          ) : null}
          <SandboxNote>Reference prices, not live quotes</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          {draft?.name ?? 'Drift'}
        </Display>
        <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
          What the book is worth, where each line has moved, and whether the rules say it has
          drifted too far. Nothing here sends an order.
        </p>

        {draft && complete ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={`/simulate/${id}?scenario=${scenario.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[11.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
              Run the rebalance
              <ArrowRight className="size-3" aria-hidden />
            </Link>
            <Link
              href={`/publish/${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
              Publish the strategy
              <ArrowRight className="size-3" aria-hidden />
            </Link>
            <span className="text-[10.5px] text-ink-faint">A dry run. Nothing is sent.</span>
          </div>
        ) : null}
      </div>

      {draft && !complete ? (
        <Panel className="p-6">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            Weights incomplete
          </Chip>
          <p className="mt-3 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-secondary">
            Set the weights to exactly 100% before the dashboard can read the book.
          </p>
          <Link
            href={`/allocate/${id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
            Set the weights
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : null}

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

      {draft && complete && !prices ? (
        <Panel className="space-y-4 p-6" aria-busy>
          <div className="h-2.5 w-24 animate-pulse rounded-pill bg-fill-active" />
          <div className="h-10 w-56 animate-pulse rounded-lg bg-fill-active" />
          <div className="h-2 w-full animate-pulse rounded-pill bg-fill-muted" />
          <SandboxNote className="pt-1">Reading reference prices…</SandboxNote>
        </Panel>
      ) : null}

      {book && rules && prices ? (
        <>
          {notice ? (
            <p className="flex flex-wrap items-center gap-2 text-[11px] text-amber-bright">
              {notice}
              <button
                type="button"
                onClick={retry}
                className="font-semibold underline underline-offset-2 hover:text-amber">
                Try again
              </button>
            </p>
          ) : null}

          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <SectionLabel as="h2">Book value</SectionLabel>
                <Balance
                  whole={`${valueParts[0]}.`}
                  cents={valueParts[1] ?? '00'}
                  className="mt-2 text-4xl sm:text-5xl"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ChangeChip value={book.value - STARTING_NOTIONAL_USD} />
                  <span className="text-[11px] text-ink-faint">
                    against the {formatPrice(STARTING_NOTIONAL_USD)} the plan was built with
                  </span>
                </div>
              </div>

              <div className="w-full sm:w-[340px]">
                <ScenarioControl scenario={scenario} onChange={setChosenScenario} />
              </div>
            </div>
          </Panel>

          <RebalancePanel
            report={book.report}
            weights={book.weights}
            rules={rules}
            draftId={id}
            scenarioId={scenario.id}
            simulated={approved !== null}
          />

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel className="p-5">
              <SectionLabel as="h2">Where the book sits</SectionLabel>
              <p className="mt-1.5 text-[11px] text-ink-quaternary">
                Live weights after the move, not the weights that were set.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-6">
                <Donut ordered={ordered} weights={book.weights} colourFor={colourFor} />

                <ul className="min-w-[180px] flex-1 space-y-2">
                  {ordered.map((ticker) => {
                    const stock = STOCKS.find((item) => item.ticker === ticker);
                    return (
                      <li key={ticker} className="flex items-center gap-2.5 text-[11.5px]">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-[2px]"
                          style={{ background: colourFor(ticker) }}
                        />
                        <Num className="w-12 shrink-0 font-medium">{ticker}</Num>
                        <span className="min-w-0 flex-1 truncate text-ink-quaternary">
                          {stock?.name ?? 'Position'}
                        </span>
                        <Num className="shrink-0 text-ink-secondary">
                          {percentOfBook(book.weights[ticker] ?? 0)}
                        </Num>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <SectionLabel as="h2">Drift from target</SectionLabel>
                  <p className="mt-1.5 text-[11px] text-ink-quaternary">
                    Live weight against the plan, with the allowed band shaded.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ink-faint" aria-hidden>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-4 rounded-pill bg-brand" />
                    Live
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-px bg-ink-primary" />
                    Target
                  </span>
                </div>
              </div>

              <ul className="mt-4 space-y-3.5">
                {ordered.map((ticker) => {
                  const live = book.weights[ticker] ?? 0;
                  const target = book.targets[ticker] ?? 0;
                  const delta = book.report.drift[ticker] ?? 0;
                  const beyond = book.report.beyondBand.includes(ticker);
                  const band = rules.driftBandPct / 100;
                  const bandStart = Math.max(0, target - band) * 100;
                  const bandEnd = Math.min(1, target + band) * 100;
                  const cash = ticker === CASH_TICKER;

                  return (
                    <li key={ticker}>
                      <div className="flex items-baseline justify-between gap-3">
                        <Num className="text-[12px] font-medium">{ticker}</Num>
                        <Num
                          className={cn(
                            'text-[11px] font-medium',
                            beyond ? 'text-amber-bright' : 'text-ink-faint',
                          )}>
                          {pointsFromFraction(delta)} pts
                        </Num>
                      </div>

                      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-pill bg-fill-muted">
                        <span
                          aria-hidden
                          className="absolute inset-y-0 bg-white/[0.12]"
                          style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
                        />
                        <span
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-pill',
                            beyond
                              ? 'bg-amber'
                              : cash
                                ? 'bg-ink-quaternary'
                                : 'bg-gradient-to-r from-brand-deep to-brand',
                          )}
                          style={{ width: `${Math.min(100, live * 100)}%` }}
                        />
                        <span
                          aria-hidden
                          className="absolute inset-y-0 w-px bg-ink-primary"
                          style={{ left: `${Math.min(100, target * 100)}%` }}
                        />
                      </div>

                      <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
                        <span>
                          <Num>{percentOfBook(live)}</Num> live
                        </span>
                        <span>
                          target <Num>{percentOfBook(target)}</Num>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <SandboxNote className="max-w-[52ch]">
              A simulated portfolio held in this browser. No orders, no brokerage, no custody.
            </SandboxNote>
            <Link
              href={`/rules/${id}`}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
              Edit the rules
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** The change since the plan, coloured only when it has a direction. */
function ChangeChip({ value }: { value: number }) {
  if (Math.abs(value) < 0.005) {
    return <Chip tone="neutral">At the plan</Chip>;
  }
  const up = value > 0;
  return (
    <Chip tone={up ? 'positive' : 'amber'}>
      {up ? '+' : '−'}
      {formatPrice(Math.abs(value))}
    </Chip>
  );
}

function Donut({
  ordered,
  weights,
  colourFor,
}: {
  ordered: string[];
  weights: Record<string, number>;
  colourFor: (ticker: string) => string;
}) {
  const shares = ordered.map((ticker) => Math.max(0, weights[ticker] ?? 0));
  const segments = ordered.map((ticker, index) => {
    const offset = shares.slice(0, index).reduce((sum, value) => sum + value, 0);
    const length = (shares[index] ?? 0) * DONUT_CIRCUMFERENCE;
    return {
      ticker,
      offset: offset * DONUT_CIRCUMFERENCE,
      drawn: Math.max(0, length - DONUT_GAP),
      colour: colourFor(ticker),
    };
  });

  const label = ordered
    .map((ticker) => `${ticker} ${percentOfBook(weights[ticker] ?? 0)}`)
    .join(', ');

  return (
    <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
      <svg
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        role="img"
        aria-label={`Live weights: ${label}`}>
        <circle
          cx={DONUT_SIZE / 2}
          cy={DONUT_SIZE / 2}
          r={DONUT_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={DONUT_STROKE}
        />
        <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
          {segments.map((segment) =>
            segment.drawn <= 0 ? null : (
              <circle
                key={segment.ticker}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={DONUT_RADIUS}
                fill="none"
                stroke={segment.colour}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${segment.drawn} ${DONUT_CIRCUMFERENCE - segment.drawn}`}
                strokeDashoffset={-segment.offset}
              />
            ),
          )}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <Num className="text-xl font-semibold">{ordered.length}</Num>
        <span className="text-[10px] tracking-[0.08em] text-ink-faint uppercase">
          {ordered.length === 1 ? 'line' : 'lines'}
        </span>
      </div>
    </div>
  );
}

function RebalancePanel({
  report,
  weights,
  rules,
  draftId,
  scenarioId,
  simulated,
}: {
  report: RebalanceReport;
  weights: Record<string, number>;
  rules: Rules;
  draftId: string;
  scenarioId: string;
  simulated: boolean;
}) {
  const reasons = rebalanceReasons(report, weights, rules);

  return (
    <Panel className={cn('p-5', report.due ? 'border-amber/25' : 'border-positive/20')}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <Chip tone={report.due ? 'amber' : 'positive'}>
            {report.due ? (
              <PulseDot />
            ) : (
              <Check className="size-3" aria-hidden />
            )}
            {report.due ? 'Rebalance due' : 'Within band'}
          </Chip>

          {reasons.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {reasons.map((reason) => (
                <li key={reason} className="text-[12px] leading-relaxed text-ink-secondary">
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 max-w-[46ch] text-[12px] leading-relaxed text-ink-secondary">
              {simulated
                ? 'This is the approved simulation at these prices. Nothing was sent anywhere.'
                : 'Every line is inside its band, the ceiling and the cash floor at these prices. No trade is owed.'}
            </p>
          )}

          {report.due || simulated ? (
            <Link
              href={`/simulate/${draftId}?scenario=${scenarioId}`}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-soft transition-colors hover:text-brand">
              {simulated ? 'Open the simulation' : 'See the trades'}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>

        <dl className="flex shrink-0 gap-5">
          <div>
            <dt className="text-[10px] text-ink-faint">Ceiling</dt>
            <dd>
              <Num className="text-[12px] font-medium">{rules.ceilingPct}%</Num>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-ink-faint">Cash floor</dt>
            <dd>
              <Num className="text-[12px] font-medium">
                {rules.cashFloorPct === 0 ? 'Off' : `${rules.cashFloorPct}%`}
              </Num>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-ink-faint">Band</dt>
            <dd>
              <Num className="text-[12px] font-medium">{rules.driftBandPct} pts</Num>
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}
