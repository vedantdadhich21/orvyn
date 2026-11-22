import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { CopyStrategyButton } from '@/features/orvyn/copy-strategy-button';
import { explorerAddressUrl, strategyRegistryAddress } from '@/lib/orvyn/registry';
import { readStrategy } from '@/lib/orvyn/registry-read';
import { formatPrice } from '@/lib/orvyn/stocks';
import type { RegistryEntry } from '@/lib/orvyn/registry';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

/** One read per request, shared by metadata and the page. */
const getEntry = cache(async (id: string): Promise<RegistryEntry | null> => {
  if (!strategyRegistryAddress || !/^\d{1,78}$/.test(id)) return null;
  try {
    return await readStrategy({ address: strategyRegistryAddress, id: BigInt(id) });
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) return { title: 'Published strategy' };

  const top = entry.parsed
    ? Object.entries(entry.parsed.weights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([ticker, weight]) => `${ticker} ${weight}`)
        .join(' · ')
    : entry.payload;

  return {
    title: `${entry.name} · published strategy`,
    description: `${entry.name}${top ? ` · ${top}` : ''}. Published on the ORVYN testnet registry.`,
    openGraph: {
      title: entry.name,
      description: 'A published ORVYN strategy: targets, limits and the exact line.',
      type: 'article',
      images: [
        {
          url: `/s/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${entry.name}, a published ORVYN strategy`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.name,
      description: 'A published ORVYN strategy: targets, limits and the exact line.',
      images: [`/s/${id}/opengraph-image`],
    },
  };
}

export default async function PublishedStrategyPage({ params }: Props) {
  const { id } = await params;

  if (!strategyRegistryAddress) {
    return (
      <div className="space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Home
        </Link>

        <div>
          <Chip tone="neutral">Published strategy</Chip>
          <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
            Nothing at this link yet
          </Display>
          <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
            This build has no registry deployment, so there is no onchain strategy to read.
            The builder, the dashboard and the simulator still work.
          </p>
        </div>

        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
          Build a portfolio
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  const entry = await getEntry(id);
  if (!entry) notFound();

  const parsed = entry.parsed;
  const ordered = parsed
    ? Object.entries(parsed.weights).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <article className="space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Home
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Published strategy</Chip>
          <Chip tone="neutral">
            <Num>#{entry.id}</Num>
          </Chip>
          <SandboxNote>Testnet · no real value</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          {entry.name}
        </Display>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-tertiary">
          <span>Published by</span>
          <a
            href={explorerAddressUrl(entry.author)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink-secondary underline-offset-2 transition-colors hover:text-ink-primary hover:underline">
            <Num>{entry.author.slice(0, 6)}…{entry.author.slice(-4)}</Num>
          </a>
          <span aria-hidden>·</span>
          <time dateTime={entry.publishedAt}>{entry.publishedAt.slice(0, 10)}</time>
        </p>
      </div>

      {parsed ? (
        <>
          <Panel className="p-5 sm:p-6">
            <SectionLabel as="h2">Targets</SectionLabel>
            <ul className="mt-3 space-y-3">
              {ordered.map(([ticker, weight]) => (
                <li key={ticker}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Num className="text-[12.5px] font-semibold">{ticker}</Num>
                    <Num className="text-[12px] text-ink-secondary">{weight}%</Num>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-fill-muted">
                    <div
                      className={cn('h-full rounded-pill', ticker === 'CASH' ? 'bg-white/25' : 'bg-brand')}
                      style={{ width: `${Math.min(100, Math.max(0, weight))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <SectionLabel as="h2">The rules it carries</SectionLabel>
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Ceiling</dt>
                <dd className="mt-1">
                  <Num className="text-[13px] font-medium">{parsed.rules.ceilingPct}%</Num>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Cash floor</dt>
                <dd className="mt-1">
                  <Num className="text-[13px] font-medium">
                    {parsed.rules.cashFloorPct === 0 ? 'Off' : `${parsed.rules.cashFloorPct}%`}
                  </Num>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Drift band</dt>
                <dd className="mt-1">
                  <Num className="text-[13px] font-medium">{parsed.rules.driftBandPct} pts</Num>
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-stroke-hairline pt-3 text-[10.5px] text-ink-faint">
              Built on a <Num>{formatPrice(parsed.bookUsd)}</Num> simulated book
            </p>
          </Panel>

          <Panel className="p-5">
            <SectionLabel as="h2">The published line</SectionLabel>
            <p className="mt-1.5 text-[11px] text-ink-quaternary">
              This is exactly what the contract stores. Holdings are not in it.
            </p>
            <Num className="mt-3 block break-all rounded-lg bg-fill-subtle p-3 text-[11px] leading-relaxed text-ink-secondary">
              {entry.payload}
            </Num>
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <CopyStrategyButton payload={entry.payload} />
            {strategyRegistryAddress ? (
              <a
                href={explorerAddressUrl(strategyRegistryAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-4 py-2 text-[12px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                View the registry
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </div>

          <SandboxNote className="max-w-[58ch]">
            Copying creates a local draft with the same targets and rules. Simulated,
            testnet only. No real value and nothing here is investment advice.
          </SandboxNote>
        </>
      ) : (
        <Panel className="p-5">
          <Chip tone="amber">Unreadable line</Chip>
          <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
            This record was published in a format this build does not understand. It is still
            onchain and shown exactly as stored.
          </p>
          <Num className="mt-3 block break-all rounded-lg bg-fill-subtle p-3 text-[11px] leading-relaxed text-ink-secondary">
            {entry.payload}
          </Num>
        </Panel>
      )}
    </article>
  );
}
