'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';

import { Chip, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import {
  explorerAddressUrl,
  strategyRegistryAddress,
  type RegistryEntry,
} from '@/lib/orvyn/registry';
import { formatPrice } from '@/lib/orvyn/stocks';
import { draftFromStrategy } from '@/lib/orvyn/strategy';
import { loadDraft, saveDraft } from '@/lib/orvyn/storage';

type RegistryResponse = {
  configured?: boolean;
  entries?: RegistryEntry[];
  error?: string | null;
};

type LoadState = 'loading' | 'ready';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function dateLabel(publishedAt: string): string {
  const parsed = Date.parse(publishedAt);
  if (!Number.isFinite(parsed)) return 'Unknown date';
  return new Date(parsed).toISOString().slice(0, 10);
}

async function fetchRegistry(): Promise<RegistryResponse> {
  const response = await fetch('/api/registry', { cache: 'no-store' });
  if (!response.ok) throw new Error('bad response');
  return (await response.json()) as RegistryResponse;
}

/**
 * The public gallery. It reads one shaped list from /api/registry and turns a
 * published line back into a normal local draft, so a strategy can be copied
 * without a wallet, an account or a server-side write.
 */
export function RegistryGallery() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>('loading');
  const [configured, setConfigured] = useState(false);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const apply = useCallback((data: RegistryResponse) => {
    setConfigured(Boolean(data.configured));
    setEntries(Array.isArray(data.entries) ? data.entries : []);
    setError(typeof data.error === 'string' ? data.error : null);
    setState('ready');
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchRegistry()
      .then((data) => {
        if (alive) apply(data);
      })
      .catch(() => {
        if (!alive) return;
        setError('The registry could not be read right now. Try again in a moment.');
        setState('ready');
      });
    return () => {
      alive = false;
    };
  }, [apply]);

  const refresh = async () => {
    setState('loading');
    setError(null);
    try {
      apply(await fetchRegistry());
    } catch {
      setError('The registry could not be read right now. Try again in a moment.');
      setState('ready');
    }
  };

  useEffect(() => {
    if (!copiedId) return;
    const timer = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  const copy = (entry: RegistryEntry) => {
    if (!entry.parsed) return;
    const draft = draftFromStrategy(entry.parsed);
    saveDraft(draft);
    if (!loadDraft(draft.id)) {
      setError('This browser blocked local storage, so the copy could not be saved.');
      return;
    }
    setCopiedId(entry.id);
    router.push(`/portfolio/${draft.id}`);
  };

  return (
    <section aria-label="Published strategies" aria-busy={state === 'loading'}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel as="h2">Published strategies</SectionLabel>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-faint">
            {error
              ? 'Unavailable'
              : configured && state === 'ready'
                ? `${entries.length} on Base Sepolia`
                : 'Base Sepolia'}
          </span>
          {configured ? (
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={state === 'loading'}
              aria-label="Refresh published strategies"
              className="grid size-7 place-items-center rounded-md text-ink-tertiary transition-colors hover:bg-fill-press hover:text-ink-secondary disabled:opacity-40">
              <RefreshCw
                className={`size-3.5 ${state === 'loading' ? 'animate-spin' : ''}`}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
      </div>

      {state === 'loading' ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <Panel key={index} className="space-y-3 p-5" aria-hidden>
              <div className="h-3 w-36 animate-pulse rounded-pill bg-fill-active" />
              <div className="h-2.5 w-24 animate-pulse rounded-pill bg-fill-muted" />
              <div className="h-8 w-full animate-pulse rounded-lg bg-fill-muted" />
            </Panel>
          ))}
        </div>
      ) : error ? (
        <Panel className="mt-3 p-5">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            Registry unavailable
          </Chip>
          <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
            <RefreshCw className="size-3.5" aria-hidden />
            Try again
          </button>
        </Panel>
      ) : !configured ? (
        <Panel className="mt-3 px-6 py-10 text-center">
          <p className="text-[13.5px] font-semibold text-ink-secondary">
            Publishing is not live in this deployment
          </p>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[11.5px] leading-relaxed text-ink-quaternary">
            The registry has no deployment address in this build. Everything else works: pick
            the stocks, write the rules and run the rebalance.
          </p>
          <Link
            href="/create"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
            Build a portfolio
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : entries.length === 0 ? (
        <Panel className="mt-3 px-6 py-10 text-center">
          <p className="text-[13.5px] font-semibold text-ink-secondary">Nothing published yet</p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[11.5px] leading-relaxed text-ink-quaternary">
            The registry is live and empty. Publish a strategy and it will appear here for
            anyone to read and copy.
          </p>
          <Link
            href="/create"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
            Build a portfolio
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <StrategyCard
                key={entry.id}
                entry={entry}
                copied={copiedId === entry.id}
                onCopy={() => copy(entry)}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <SandboxNote className="max-w-[52ch]">
              Only the targets and rules were published. Holdings, units and prices stay in the
              author&apos;s browser.
            </SandboxNote>
            {strategyRegistryAddress ? (
              <a
                href={explorerAddressUrl(strategyRegistryAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
                Read the registry
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function StrategyCard({
  entry,
  copied,
  onCopy,
}: {
  entry: RegistryEntry;
  copied: boolean;
  onCopy: () => void;
}) {
  const parsed = entry.parsed;

  return (
    <Panel className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-semibold text-ink-primary">{entry.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-faint">
            <span>
              <Num>#{entry.id}</Num>
            </span>
            <span aria-hidden>·</span>
            <a
              href={explorerAddressUrl(entry.author)}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink-secondary">
              {shortAddress(entry.author)}
            </a>
            <span aria-hidden>·</span>
            <span>{dateLabel(entry.publishedAt)}</span>
          </p>
        </div>
        <Chip tone={parsed ? 'positive' : 'amber'}>
          {parsed ? 'Readable' : 'Unreadable'}
        </Chip>
      </div>

      {parsed ? (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(parsed.weights).map(([ticker, weight]) => (
              <span
                key={ticker}
                className="rounded-pill border border-stroke-raised bg-fill-muted px-2 py-0.5 text-[10px] text-ink-secondary">
                <Num className="font-semibold">{ticker}</Num>{' '}
                <Num className="text-ink-quaternary">{weight}%</Num>
              </span>
            ))}
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-stroke-hairline pt-3">
            <div>
              <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Ceiling</dt>
              <dd className="mt-0.5">
                <Num className="text-[11.5px] text-ink-secondary">{parsed.rules.ceilingPct}%</Num>
              </dd>
            </div>
            <div>
              <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Cash</dt>
              <dd className="mt-0.5">
                <Num className="text-[11.5px] text-ink-secondary">
                  {parsed.rules.cashFloorPct === 0 ? 'Off' : `${parsed.rules.cashFloorPct}%`}
                </Num>
              </dd>
            </div>
            <div>
              <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Band</dt>
              <dd className="mt-0.5">
                <Num className="text-[11.5px] text-ink-secondary">
                  {parsed.rules.driftBandPct} pts
                </Num>
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[10.5px] text-ink-faint">
            Built on a <Num>{formatPrice(parsed.bookUsd)}</Num> simulated book
          </p>

          <details className="mt-2">
            <summary className="cursor-pointer text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
              Read the published line
            </summary>
            <Num className="mt-1.5 block break-all rounded-md bg-fill-subtle p-2 text-[10px] leading-relaxed text-ink-quaternary">
              {entry.payload}
            </Num>
          </details>

          <button
            type="button"
            onClick={onCopy}
            className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
            {copied ? (
              <>
                <Check className="size-3.5 text-positive" aria-hidden />
                Copied to your drafts
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden />
                Copy this strategy
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-[44ch] text-[11.5px] leading-relaxed text-ink-quaternary">
            This line was published in a format this build does not understand. It is still
            onchain and readable below.
          </p>
          <Num className="mt-3 block break-all rounded-md bg-fill-subtle p-2 text-[10px] leading-relaxed text-ink-quaternary">
            {entry.payload}
          </Num>
        </>
      )}
    </Panel>
  );
}
