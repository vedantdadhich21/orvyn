import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { explorerAddressUrl, strategyRegistryAddress } from '@/lib/orvyn/registry';
import { readRegistryCount, readStrategies } from '@/lib/orvyn/registry-read';
import { readLaunchMarketProof, readLaunchProof } from '@/server/launch/proof';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proof',
  description:
    'The live counts behind ORVYN: published strategies, their authors and the registry contract.',
};

export default async function ProofPage() {
  const configured = Boolean(strategyRegistryAddress);

  let count = 0;
  let entries = [] as Awaited<ReturnType<typeof readStrategies>>;
  let failed = false;
  let launchProof: Awaited<ReturnType<typeof readLaunchProof>> = null;
  let launchMarket: Awaited<ReturnType<typeof readLaunchMarketProof>> = null;

  if (strategyRegistryAddress) {
    try {
      [count, entries, launchProof, launchMarket] = await Promise.all([
        readRegistryCount({ address: strategyRegistryAddress }),
        readStrategies({ address: strategyRegistryAddress, limit: 50 }),
        readLaunchProof(),
        readLaunchMarketProof(),
      ]);
    } catch {
      failed = true;
    }
  }

  const authors = new Set(entries.map((entry) => entry.author.toLowerCase())).size;
  const latest = entries[0]?.publishedAt ?? null;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Proof</Chip>
          {configured && !failed ? <Chip tone="positive">Live on testnet</Chip> : null}
        </div>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          What is actually onchain
        </Display>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-ink-secondary">
          The strategy counts come from the registry contract. The database counts are built
          from the same onchain events, so anyone can check both.
        </p>
      </div>

      {!configured ? (
        <Panel className="p-6">
          <Chip tone="amber">Registry not deployed</Chip>
          <p className="mt-3 max-w-[54ch] text-[12.5px] leading-relaxed text-ink-secondary">
            This build has no registry address, so there is nothing to count yet. The builder,
            the dashboard and the simulator all work without it. The deploy command is in the
            README.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
            Back to the builder
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : failed ? (
        <Panel className="p-6">
          <Chip tone="amber">Live data unavailable</Chip>
          <p className="mt-3 max-w-[54ch] text-[12.5px] leading-relaxed text-ink-secondary">
            The read RPC did not answer. The contract address is still real; try again in a
            moment.
          </p>
          <Link
            href="/proof"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
            Refresh
          </Link>
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="p-5">
              <SectionLabel as="h2">Strategies</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{count}</Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">Published on the registry</p>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Authors</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{authors}</Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">
                {count > entries.length
                  ? `Across the latest ${entries.length} strategies`
                  : 'Distinct publishing wallets'}
              </p>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Latest publish</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">
                {latest ? latest.slice(0, 10) : 'None'}
              </Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">Newest record onchain</p>
            </Panel>
          </div>

          {launchProof ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <SectionLabel as="h2">From the launch database</SectionLabel>
                <span className="text-[10.5px] text-ink-faint">Backfilled from the registry</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Panel className="p-5">
                  <SectionLabel as="h3">Wallets</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">{launchProof.wallets}</Num>
                  <p className="mt-1 text-[10.5px] text-ink-faint">Known publishing wallets</p>
                </Panel>
                <Panel className="p-5">
                  <SectionLabel as="h3">Investors</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">
                    {launchProof.investors}
                  </Num>
                  <p className="mt-1 text-[10.5px] text-ink-faint">
                    Arrives with the exchange
                  </p>
                </Panel>
                <Panel className="p-5">
                  <SectionLabel as="h3">Events today</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">
                    {launchProof.eventsToday}
                  </Num>
                  <p className="mt-1 text-[10.5px] text-ink-faint">Onchain actions indexed</p>
                </Panel>
              </div>
            </div>
          ) : null}

          {launchMarket ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <SectionLabel as="h2">Launch market</SectionLabel>
                <Link
                  href="/launch/proof"
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
                  Full launch proof
                  <ExternalLink className="size-3" aria-hidden />
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Panel className="p-5">
                  <SectionLabel as="h3">Strategies</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">{launchMarket.strategies}</Num>
                </Panel>
                <Panel className="p-5">
                  <SectionLabel as="h3">Traders</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">{launchMarket.traders}</Num>
                </Panel>
                <Panel className="p-5">
                  <SectionLabel as="h3">Follows</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">{launchMarket.follows}</Num>
                </Panel>
                <Panel className="p-5">
                  <SectionLabel as="h3">Trades</SectionLabel>
                  <Num className="mt-2 block text-3xl font-semibold">{launchMarket.trades}</Num>
                </Panel>
              </div>
            </div>
          ) : null}

          <Panel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel as="h2">The contract</SectionLabel>
                <Num className="mt-2 block break-all text-[11.5px] text-ink-secondary">
                  {strategyRegistryAddress}
                </Num>
                <p className="mt-2 max-w-[52ch] text-[11px] leading-relaxed text-ink-quaternary">
                  No owner, no admin, no upgrade path and no function that moves funds. A
                  record is a name, three limits, target weights and a book size.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {strategyRegistryAddress ? (
                  <a
                    href={explorerAddressUrl(strategyRegistryAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                    BaseScan
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
                <a
                  href="https://github.com/vedantdadhich21/orvyn/blob/main/apps/web/contracts/StrategyRegistry.sol"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                  Source
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionLabel as="h2">Not shown yet</SectionLabel>
            <p className="mt-2 max-w-[54ch] text-[12px] leading-relaxed text-ink-secondary">
              Follows and investments arrive with the exchange. The wallet and event counts
              above come from Postgres, indexed from the same registry events. Nothing here is
              estimated.
            </p>
          </Panel>

          <SandboxNote className="max-w-[58ch]">
            Testnet only. No real value and nothing here is investment advice.
          </SandboxNote>
        </>
      )}
    </div>
  );
}
