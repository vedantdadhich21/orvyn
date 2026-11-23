import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { AllocationRing } from '@/components/orvyn/allocation-ring';
import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { CopyStrategyButton } from '@/features/orvyn/copy-strategy-button';
import { LaunchInvestPanel } from '@/features/orvyn/launch-invest-panel';
import { explorerAddressUrl } from '@/lib/orvyn/registry';
import { readLaunchStrategy, type LaunchStrategy } from '@/server/launch/market';
import { formatPrice } from '@/lib/orvyn/stocks';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

const getStrategy = cache(async (id: string): Promise<LaunchStrategy | null> => {
  if (!/^\d{1,78}$/.test(id)) return null;
  try {
    return await readLaunchStrategy(BigInt(id));
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const strategy = await getStrategy(id);
  if (!strategy) return { title: 'Launch strategy' };

  return {
    title: `${strategy.name} · launch strategy`,
    description: `${strategy.name}, published on the ORVYN testnet registry. Invest a test basket and follow it.`,
    openGraph: {
      title: strategy.name,
      description: 'A published ORVYN launch strategy with a test basket.',
      type: 'article',
      images: [
        {
          url: `/launch/s/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${strategy.name}, a published ORVYN launch strategy`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: strategy.name,
      description: 'A published ORVYN launch strategy with a test basket.',
      images: [`/launch/s/${id}/opengraph-image`],
    },
  };
}

export default async function LaunchStrategyPage({ params }: Props) {
  const { id } = await params;
  const strategy = await getStrategy(id);
  if (!strategy) notFound();

  const parsed = strategy.parsed;
  const ordered = parsed
    ? Object.entries(parsed.weights).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <article className="space-y-8">
      <div>
        <Link
          href="/launch"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          <ArrowLeft className="size-3.5" aria-hidden />
          Market
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Launch strategy</Chip>
          <Chip tone="neutral">
            <Num>#{strategy.id}</Num>
          </Chip>
          <Chip tone="neutral">
            <Num>{strategy.followers}</Num> following
          </Chip>
          <SandboxNote>Test tokens · demo prices</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          {strategy.name}
        </Display>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-tertiary">
          <span>Published by</span>
          <a
            href={explorerAddressUrl(strategy.author)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink-secondary underline-offset-2 transition-colors hover:text-ink-primary hover:underline">
            <Num>{strategy.author.slice(0, 6)}…{strategy.author.slice(-4)}</Num>
          </a>
          <span aria-hidden>·</span>
          <time dateTime={strategy.publishedAt}>{strategy.publishedAt.slice(0, 10)}</time>
        </p>
      </div>

      {parsed ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Panel className="p-5">
              <div className="flex items-start justify-between gap-3">
                <SectionLabel as="h2">Targets</SectionLabel>
                {parsed ? <AllocationRing weights={parsed.weights} size={64} stroke={8} /> : null}
              </div>
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
              <SectionLabel as="h2">Rules</SectionLabel>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Ceiling</dt>
                  <dd className="mt-1">
                    <Num className="text-[12px] font-medium">{parsed.rules.ceilingPct}%</Num>
                  </dd>
                </div>
                <div>
                  <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Cash</dt>
                  <dd className="mt-1">
                    <Num className="text-[12px] font-medium">
                      {parsed.rules.cashFloorPct === 0 ? 'Off' : `${parsed.rules.cashFloorPct}%`}
                    </Num>
                  </dd>
                </div>
                <div>
                  <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Band</dt>
                  <dd className="mt-1">
                    <Num className="text-[12px] font-medium">{parsed.rules.driftBandPct} pts</Num>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-stroke-hairline pt-3 text-[10.5px] text-ink-faint">
                Built on a <Num>{formatPrice(parsed.bookUsd)}</Num> plan
              </p>
            </Panel>
          </div>

          <LaunchInvestPanel strategy={strategy} />

          <Panel className="p-5">
            <SectionLabel as="h2">The published line</SectionLabel>
            <Num className="mt-3 block break-all rounded-lg bg-fill-subtle p-3 text-[11px] leading-relaxed text-ink-secondary">
              {strategy.payload}
            </Num>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <CopyStrategyButton payload={strategy.payload} variant="secondary" />
              <a
                href={explorerAddressUrl(strategy.author)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
                Author
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          </Panel>

          <SandboxNote className="max-w-[58ch]">
            Test tokens, no real value, not investment advice. The exchange mints test stock
            against tUSDC at a demo oracle price. Following is a public signal, not an order.
          </SandboxNote>
        </>
      ) : (
        <Panel className="p-5">
          <Chip tone="amber">Unreadable strategy</Chip>
          <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
            This record was published in a format this build does not understand. The raw line
            is shown exactly as stored.
          </p>
          <Num className="mt-3 block break-all rounded-lg bg-fill-subtle p-3 text-[11px] leading-relaxed text-ink-secondary">
            {strategy.payload}
          </Num>
        </Panel>
      )}
    </article>
  );
}
