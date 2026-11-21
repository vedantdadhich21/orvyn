import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { DitherField } from '@/components/dither-field';
import { Chip, Display, Num, Panel, SectionLabel } from '@/components/primitives';
import {
  explorerAddressUrl,
  isRegistryConfigured,
  strategyRegistryAddress,
} from '@/lib/orvyn/registry';

/**
 * Chapter 1 home. The only action is starting a portfolio; published
 * strategies appear here once the registry is live.
 */
export function HomeScreen() {
  return (
    <div className="space-y-12">
      <header className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[300px] overflow-hidden opacity-70">
          <DitherField ramp="portfolio" intensity={0.55} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/85 to-bg" />
        </div>

        <Chip tone="neutral">Simulated · Base Sepolia</Chip>

        <Display as="h1" className="mt-5 text-4xl sm:text-5xl">
          Portfolios, programmed.
        </Display>

        <p className="mt-4 max-w-[54ch] text-[14px] leading-relaxed text-ink-secondary">
          A normal portfolio is a list of stocks. A programmable one is a list plus the rules it
          follows: a ceiling on any single company, a floor of cash, and the drift that tells you
          when it is time to rebalance.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-[#07130D] shadow-[0_10px_30px_-12px_rgba(43,217,139,0.7)] transition-colors hover:bg-brand/90">
            Build a portfolio
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <span className="text-[11.5px] leading-relaxed text-ink-faint">
            No account. No money. Everything is simulated.
          </span>
        </div>
      </header>

      <section aria-label="How ORVYN works">
        <SectionLabel>How it works</SectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <ConceptCard
            index="01"
            title="Pick the stocks"
            body="Choose the companies you want exposure to. Cash is a line in the portfolio, not an afterthought."
          />
          <ConceptCard
            index="02"
            title="Write the rules"
            body="A ceiling per stock, a minimum cash balance, and the drift that triggers a rebalance."
          />
          <ConceptCard
            index="03"
            title="Publish the strategy"
            body="Targets and rules go onchain. Holdings never do. Anyone can read a strategy and copy it."
          />
        </div>
      </section>

      <section aria-label="Published strategies">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionLabel as="h2">Published strategies</SectionLabel>
          <span className="text-[11px] text-ink-faint">Base Sepolia</span>
        </div>

        {isRegistryConfigured && strategyRegistryAddress ? (
          <Panel className="mt-3 px-6 py-8">
            <p className="text-[13.5px] font-semibold text-ink-secondary">The registry is live</p>
            <p className="mx-auto mt-1.5 max-w-[46ch] text-[11.5px] leading-relaxed text-ink-quaternary">
              A published strategy is one readable line: its name, limits and target weights.
              Holdings never leave the browser.
            </p>
            <a
              href={explorerAddressUrl(strategyRegistryAddress)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
              Open the registry on BaseScan
            </a>
          </Panel>
        ) : (
          <Panel className="mt-3 px-6 py-10 text-center">
            <p className="text-[13.5px] font-semibold text-ink-secondary">Nothing published yet</p>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-[11.5px] leading-relaxed text-ink-quaternary">
              The registry is not configured in this build. Build a portfolio now; publishing
              lands later in Chapter 1.
            </p>
          </Panel>
        )}
      </section>
    </div>
  );
}

function ConceptCard({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <Panel className="p-5">
      <Num className="text-[10.5px] font-medium tracking-[0.14em] text-brand-soft">{index}</Num>
      <h3 className="mt-2 text-[13.5px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-quaternary">{body}</p>
    </Panel>
  );
}
