import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { Chip, Display, Num, Panel, SectionLabel } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'What shipped in each ORVYN release, written down instead of promised.',
};

const RELEASES = [
  {
    version: 'v0.1.1',
    title: 'Trust pages and launch scaffold',
    href: 'https://github.com/vedantdadhich21/orvyn/releases/tag/v0.1.1',
    groups: [
      {
        label: 'Public pages',
        items: [
          'A strategy page at /s/<id> with targets, limits, the exact line and a generated share card.',
          'A proof page with live registry counts and the contract address.',
          'How it works and this changelog, linked from the footer on every screen.',
        ],
      },
      {
        label: 'Launch scaffold',
        items: [
          'An admin page gated by a wallet signature, checked on the server with viem.',
          'A paymaster proxy that forwards only the two sponsored call methods.',
          'A Postgres schema and the API shape for users, strategies, follows, investments, trades and events.',
        ],
      },
    ],
  },
  {
    version: 'v0.1.0',
    title: 'Chapter 1',
    href: 'https://github.com/vedantdadhich21/orvyn/releases/tag/v0.1.0',
    groups: [
      {
        label: 'Builder',
        items: [
          'Stock picker, local drafts and allocation sliders that must add up.',
          'A per stock ceiling, a cash floor and a drift band, with sentence input through the same validator.',
          'Drift dashboard with a donut, per line drift and three reproducible scenarios.',
          'Rebalance simulator with trades, before and after, an approval and a reset.',
        ],
      },
      {
        label: 'Registry',
        items: [
          'An ownerless StrategyRegistry with publish, count, get and idsOf.',
          'A publish screen with an exact payload preview and BaseScan links.',
          'A gallery that reads published strategies back and copies one into a local draft.',
        ],
      },
      {
        label: 'Quality',
        items: [
          '132 unit tests, strict typecheck, lint and production build.',
          'Lighthouse accessibility passes on the home page and the drift dashboard.',
          'Keyboard and mobile layouts checked.',
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="space-y-8">
      <div>
        <Chip tone="neutral">Release notes</Chip>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Changelog
        </Display>
        <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
          What shipped, what changed and what is still open. Written down instead of promised.
        </p>
      </div>

      {RELEASES.map((release) => (
        <article key={release.version} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-3">
              <Num className="text-[13px] font-semibold text-brand-soft">{release.version}</Num>
              <h2 className="text-lg font-semibold">{release.title}</h2>
            </div>
            <a
              href={release.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
              Release page
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>

          {release.groups.map((group) => (
            <Panel key={group.label} className="p-5">
              <SectionLabel as="h3">{group.label}</SectionLabel>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-ink-secondary">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-brand/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </article>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
          Back to the builder
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <a
          href="https://github.com/vedantdadhich21/orvyn/commits/main"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Every commit
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}
