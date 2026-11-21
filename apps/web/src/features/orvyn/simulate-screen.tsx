'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, TriangleAlert } from 'lucide-react';

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
import { clearApplied, saveApplied } from '@/lib/orvyn/applied';
import { readBook } from '@/lib/orvyn/book';
import { percentOfBook, pointsFromFraction, pointsMagnitude, unitAmount } from '@/lib/orvyn/format';
import { fromPercent, rebalanceReasons } from '@/lib/orvyn/rules';
import { DEFAULT_MIN_NOTIONAL, type Trade } from '@/lib/orvyn/rebalance';
import { scenarioById, SCENARIOS } from '@/lib/orvyn/sim';
import { simulateRebalance } from '@/lib/orvyn/simulate';
import { CASH_TICKER, STOCKS, formatPrice } from '@/lib/orvyn/stocks';
import { totalWeight } from '@/lib/orvyn/storage';
import { useApplied } from '@/lib/orvyn/use-applied';
import { useDraft } from '@/lib/orvyn/use-draft';
import { usePrices } from '@/lib/orvyn/use-prices';
import { cn } from '@/lib/utils';
import { ScenarioControl } from './scenario-control';

/**
 * The simulate screen: the trade list, the book on either side of it, and a
 * decision the person can undo.
 *
 * Everything numeric comes from `simulateRebalance`, which the test holds to
 * zero drift after approval. The only thing this screen adds is the order of
 * the story — list, before, after, decide — and the two storage calls that
 * make an approval survive a refresh.
 */

const stockName = (ticker: string) =>
  STOCKS.find((stock) => stock.ticker === ticker)?.name ?? 'Position';

export function SimulateScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const draft = useDraft(id);
  const { prices, notice, retry } = usePrices();
  const applied = useApplied(id);
  // An approval names the scenario it was read at, so returning to either
  // screen lands on that scenario instead of a blank plan.
  const [chosenScenario, setChosenScenario] = useState<string | null>(null);
  const requested = search.get('scenario');
  const fromUrl = requested && SCENARIOS.some((item) => item.id === requested) ? requested : null;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const tickers = useMemo(() => draft?.tickers ?? [], [draft]);
  const complete = totalWeight(draft?.weights ?? {}, tickers) === 100;
  const rules = draft?.rules;
  const scenario = scenarioById(
    chosenScenario ?? fromUrl ?? applied?.scenarioId ?? SCENARIOS[0]?.id ?? 'at-plan',
  );
  const approved = applied && applied.scenarioId === scenario.id ? applied : null;

  const base = useMemo(() => {
    if (!draft || !rules || !prices || !complete) return null;
    return readBook({
      targets: fromPercent(draft.weights),
      prices,
      rules,
      moves: scenario.moves,
    });
  }, [draft, rules, prices, complete, scenario]);

  /** After an approval the held book is read, not rebuilt. */
  const approvedBook = useMemo(() => {
    if (!base || !rules || !approved || !prices) return null;
    return readBook({
      targets: base.targets,
      prices,
      rules,
      moves: scenario.moves,
      held: approved.units,
    });
  }, [base, rules, prices, scenario, approved]);

  const simulation = useMemo(() => {
    if (!base || approved) return null;
    return simulateRebalance({ units: base.units, prices: base.prices, targets: base.targets });
  }, [base, approved]);

  const ordered = useMemo(() => {
    const planned = tickers;
    const fromTrades = simulation?.trades.map((trade) => trade.ticker) ?? [];
    const all = [...new Set([...planned, ...fromTrades])];
    return [
      ...all.filter((ticker) => ticker !== CASH_TICKER),
      ...all.filter((ticker) => ticker === CASH_TICKER),
    ];
  }, [tickers, simulation]);

  /** Choosing a scenario is a navigation, so a refresh and a share keep it. */
  const chooseScenario = (next: string) => {
    setChosenScenario(next);
    router.replace(`/simulate/${id}?scenario=${next}`, { scroll: false });
  };

  const approve = () => {
    if (!draft || !simulation) return;
    saveApplied({
      version: 1,
      draftId: id,
      scenarioId: scenario.id,
      units: simulation.afterUnits,
      at: new Date().toISOString(),
    });
  };

  const reset = () => {
    // Keep looking at the scenario that was just undone, rather than jumping
    // back to the plan and losing the thread.
    setChosenScenario(scenario.id);
    clearApplied(id);
  };

  const valueParts = formatPrice(base?.value ?? 0).split('.');

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/portfolio/${id}`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Dashboard
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Dry run</Chip>
          <Chip tone="neutral">Nothing is sent</Chip>
          <SandboxNote>Reference prices, not live quotes</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Run the rebalance
        </Display>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-ink-secondary">
          The trades the rules call for, the book on the other side of them, and a decision you
          can undo. Nothing here reaches a brokerage or a wallet.
        </p>
      </div>

      {draft && !complete ? (
        <Panel className="p-6">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            Weights incomplete
          </Chip>
          <p className="mt-3 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-secondary">
            Set the weights to exactly 100% before a rebalance can be planned.
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

      {base && rules && approvedBook && approved ? (
        <>
          <Panel className="border-positive/25 p-5 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <Chip tone="positive">
                  <Check className="size-3" aria-hidden />
                  Simulation applied
                </Chip>
                <p className="mt-3 max-w-[54ch] text-[12.5px] leading-relaxed text-ink-secondary">
                  The book below is the approved trade list under the {scenario.label}{' '}
                  scenario. It lives in this browser. Nothing was sent anywhere.
                </p>
                {approvedBook.report.due ? (
                  <p className="mt-2 max-w-[54ch] text-[12px] leading-relaxed text-amber-bright">
                    Prices have moved since the approval, so the book is off plan again. Reset it
                    to plan another rebalance.
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/portfolio/${id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
                    Open the dashboard
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                  <Link
                    href={`/publish/${id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                    Publish the strategy
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                    <RotateCcw className="size-3.5" aria-hidden />
                    Reset the simulation
                  </button>
                </div>
              </div>

              <div>
                <SectionLabel as="h2">Worst drift now</SectionLabel>
                <Num
                  className={cn(
                    'mt-1.5 block text-2xl font-semibold',
                    approvedBook.report.due ? 'text-amber-bright' : 'text-positive',
                  )}>
                  {pointsMagnitude(worstDrift(approvedBook.report.drift, base.targets))} pts
                </Num>
                <p className="mt-1 text-[10.5px] text-ink-faint">Zero is on plan.</p>
                <div className="mt-4">
                  <ScenarioControl scenario={scenario} onChange={chooseScenario} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionLabel as="h2">The book after approval</SectionLabel>
            <p className="mt-1.5 text-[11px] text-ink-quaternary">
              Held units against the plan, at the prices the scenario set.
            </p>
            <div className="-mx-5 mt-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <caption className="sr-only">
                  Each line after approval: target weight, current weight and drift
                </caption>
                <thead>
                  <tr className="border-b border-stroke-hairline text-[10px] tracking-[0.11em] text-ink-faint uppercase">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Line
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">
                      Target
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">
                      Now
                    </th>
                    <th scope="col" className="py-2 text-right font-semibold">
                      Drift
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((ticker) => {
                    const drift = approvedBook.report.drift[ticker] ?? 0;
                    return (
                      <tr key={ticker} className="border-b border-stroke-hairline/60 last:border-0">
                        <LineCell ticker={ticker} />
                        <td className="py-2.5 pr-3 text-right">
                          <Num className="text-[12px] text-ink-secondary">
                            {percentOfBook(base.targets[ticker] ?? 0)}
                          </Num>
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <Num className="text-[12px]">
                            {percentOfBook(approvedBook.weights[ticker] ?? 0)}
                          </Num>
                        </td>
                        <td className="py-2.5 text-right">
                          <Num
                            className={cn(
                              'text-[12px] font-medium',
                              Math.abs(drift) * 100 > rules.driftBandPct
                                ? 'text-amber-bright'
                                : 'text-positive',
                            )}>
                            {pointsFromFraction(drift)} pts
                          </Num>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <SandboxNote className="max-w-[56ch]">
            A simulated portfolio held in this browser. No orders, no brokerage, no custody.
          </SandboxNote>
        </>
      ) : null}

      {base && rules && simulation ? (
        <>
          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <SectionLabel as="h2">The book now</SectionLabel>
                <Balance
                  whole={`${valueParts[0]}.`}
                  cents={valueParts[1] ?? '00'}
                  className="mt-2 text-4xl"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {base.report.due ? (
                    <Chip tone="amber">
                      <PulseDot />
                      Rebalance due
                    </Chip>
                  ) : (
                    <Chip tone="positive">
                      <Check className="size-3" aria-hidden />
                      Within band
                    </Chip>
                  )}
                  <span className="text-[11px] text-ink-faint">
                    worst drift <Num>{pointsMagnitude(simulation.worstBefore)} pts</Num>
                  </span>
                </div>

                {base.report.due ? (
                  <ul className="mt-3 space-y-1.5">
                    {rebalanceReasons(base.report, base.weights, rules).map((reason) => (
                      <li
                        key={reason}
                        className="max-w-[54ch] text-[12px] leading-relaxed text-ink-secondary">
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="w-full sm:w-[320px]">
                <ScenarioControl scenario={scenario} onChange={chooseScenario} />
              </div>
            </div>
          </Panel>

          {!base.report.due ? (
            <Panel className="p-6">
              <Chip tone="positive">
                <Check className="size-3" aria-hidden />
                No trade is owed
              </Chip>
              <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
                Every line is inside its band, the ceiling and the cash floor at these prices. The
                rules do not ask for a trade, so there is nothing to approve.
              </p>
              <Link
                href={`/portfolio/${id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                Back to the dashboard
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Panel>
          ) : simulation.trades.length === 0 ? (
            <Panel className="p-6">
              <Chip tone="amber">
                <TriangleAlert className="size-3" aria-hidden />
                No trade above the dust threshold
              </Chip>
              <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
                The rules call for a rebalance, but every order would be under{' '}
                {formatPrice(DEFAULT_MIN_NOTIONAL)}. A trade that small is noise on a simulated
                book, so it is left out.
              </p>
            </Panel>
          ) : (
            <>
              <TradePanel simulation={simulation} scenarioLabel={scenario.label} />

              <Panel className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <SectionLabel as="h2">Before and after</SectionLabel>
                    <p className="mt-1.5 text-[11px] text-ink-quaternary">
                      Distance from each target, in points of the book.
                    </p>
                  </div>
                  <Chip tone="positive">
                    <Check className="size-3" aria-hidden />
                    Zero drift after
                  </Chip>
                </div>

                <div className="-mx-5 mt-4 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[480px] border-collapse text-left">
                    <caption className="sr-only">
                      Drift before and after the simulated trades, per line
                    </caption>
                    <thead>
                      <tr className="border-b border-stroke-hairline text-[10px] tracking-[0.11em] text-ink-faint uppercase">
                        <th scope="col" className="py-2 pr-3 font-semibold">
                          Line
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">
                          Before
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">
                          After
                        </th>
                        <th scope="col" className="py-2 text-right font-semibold">
                          Band
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.lines.map((line) => (
                        <tr
                          key={line.ticker}
                          className="border-b border-stroke-hairline/60 last:border-0">
                          <LineCell ticker={line.ticker} />
                          <td className="py-2.5 pr-3 text-right">
                            <Num className="text-[12px] text-ink-secondary">
                              {pointsFromFraction(line.before)} pts
                            </Num>
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <Num className="text-[12px] font-medium text-positive">
                              {pointsFromFraction(line.after)} pts
                            </Num>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="text-[10.5px] text-ink-faint">
                              {Math.abs(line.after) * 100 > rules.driftBandPct
                                ? 'Outside'
                                : 'Inside'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-stroke-hairline text-[11.5px]">
                        <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink-quaternary">
                          Worst drift
                        </th>
                        <td className="py-2.5 pr-3 text-right">
                          <Num className="text-ink-secondary">
                            {pointsMagnitude(simulation.worstBefore)} pts
                          </Num>
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <Num className="font-semibold text-positive">
                            {pointsMagnitude(simulation.worstAfter)} pts
                          </Num>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Panel>

              <Panel className="p-5">
                <SectionLabel as="h2">The decision</SectionLabel>
                <p className="mt-1.5 max-w-[58ch] text-[12px] leading-relaxed text-ink-secondary">
                  Approving updates this simulated book on this device and nothing else. There is
                  no order, no brokerage and no wallet in this step.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={approve}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
                    <Check className="size-4" aria-hidden />
                    Approve this simulation
                  </button>
                  <Link
                    href={`/portfolio/${id}`}
                    className="text-[12px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
                    Leave it as it is
                  </Link>
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-ink-faint">
                  You can reset it on the next screen. The draft and its rules are unchanged.
                </p>
              </Panel>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <SandboxNote className="max-w-[56ch]">
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

/** The little two-column figure used by every table on this screen. */
function LineCell({ ticker }: { ticker: string }) {
  return (
    <td className="py-2.5 pr-3">
      <span className="flex items-baseline gap-2">
        <Num className="text-[12.5px] font-medium">{ticker}</Num>
        <span className="truncate text-[11px] text-ink-quaternary">{stockName(ticker)}</span>
      </span>
    </td>
  );
}

function worstDrift(drift: Record<string, number>, targets: Record<string, number>): number {
  return Object.keys(targets).reduce((worst, ticker) => Math.max(worst, Math.abs(drift[ticker] ?? 0)), 0);
}

function TradePanel({
  simulation,
  scenarioLabel,
}: {
  simulation: {
    trades: Trade[];
    sells: number;
    buys: number;
    valueBefore: number;
  };
  scenarioLabel: string;
}) {
  const residual = simulation.sells - simulation.buys;

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel as="h2">The trade list</SectionLabel>
          <p className="mt-1.5 max-w-[54ch] text-[11px] leading-relaxed text-ink-quaternary">
            What returns the book to plan under the {scenarioLabel} scenario. Sells come
            first, because they pay for the buys.
          </p>
        </div>
        <Chip tone="amber">
          <PulseDot />
          {simulation.trades.length} {simulation.trades.length === 1 ? 'trade' : 'trades'}
        </Chip>
      </div>

      <div className="-mx-5 mt-4 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">
            Simulated buys and sells that return the portfolio to its target weights
          </caption>
          <thead>
            <tr className="border-b border-stroke-hairline text-[10px] tracking-[0.11em] text-ink-faint uppercase">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Side
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                Line
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Units
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Price
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                Notional
              </th>
            </tr>
          </thead>
          <tbody>
            {simulation.trades.map((trade) => (
              <tr key={trade.ticker} className="border-b border-stroke-hairline/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      'inline-flex rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold',
                      trade.side === 'sell'
                        ? 'border-amber/25 bg-amber/10 text-amber-bright'
                        : 'border-positive/25 bg-positive/10 text-positive',
                    )}>
                    {trade.side === 'sell' ? 'Sell' : 'Buy'}
                  </span>
                </td>
                <LineCell ticker={trade.ticker} />
                <td className="py-2.5 pr-3 text-right">
                  <Num className="text-[12px]">{unitAmount(trade.units)}</Num>
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <Num className="text-[12px] text-ink-secondary">{formatPrice(trade.price)}</Num>
                </td>
                <td className="py-2.5 text-right">
                  <Num className="text-[12px] font-medium">{formatPrice(trade.notional)}</Num>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stroke-hairline text-[11.5px]">
              <th scope="row" colSpan={4} className="py-2.5 pr-3 text-left font-medium text-ink-quaternary">
                Sold
              </th>
              <td className="py-2.5 text-right">
                <Num className="text-ink-secondary">{formatPrice(simulation.sells)}</Num>
              </td>
            </tr>
            <tr className="text-[11.5px]">
              <th scope="row" colSpan={4} className="py-1 pr-3 text-left font-medium text-ink-quaternary">
                Bought
              </th>
              <td className="py-1 text-right">
                <Num className="text-ink-secondary">{formatPrice(simulation.buys)}</Num>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-faint">
        {Math.abs(residual) < 0.005
          ? 'The sells and the buys are the same size: no new money enters the book.'
          : `${formatPrice(Math.abs(residual))} ${residual > 0 ? 'stays in cash' : 'comes from cash'} after rounding, because a trade under ${formatPrice(DEFAULT_MIN_NOTIONAL)} is dropped.`}
      </p>
    </Panel>
  );
}
