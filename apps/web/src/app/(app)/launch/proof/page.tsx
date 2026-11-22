import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { launchConfig } from '@/lib/orvyn/launch';
import { explorerAddressUrl } from '@/lib/orvyn/registry';
import { readLaunchMarketProof } from '@/server/launch/proof';
import { readLaunchStrategies } from '@/server/launch/market';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Launch proof',
  description: 'Live testnet counts for the ORVYN launch market: strategies, traders, follows and trades.',
};

const CONTRACTS = [
  ['Registry v2', launchConfig.registryV2],
  ['Exchange', launchConfig.exchange],
  ['tUSDC', launchConfig.testUSD],
  ['Oracle', launchConfig.oracle],
] as const;

export default async function LaunchProofPage() {
  let strategies = 0;
  let proof = null;
  let failed = false;

  try {
    const [entries, market] = await Promise.all([
      readLaunchStrategies(50),
      readLaunchMarketProof(),
    ]);
    strategies = entries.length;
    proof = market;
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Launch proof</Chip>
          {!failed && proof ? <Chip tone="positive">Live on testnet</Chip> : null}
          <Chip tone="amber">Demo oracle</Chip>
        </div>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          The launch market, counted
        </Display>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-ink-secondary">
          These numbers come from the launch contracts and Postgres. Anyone can read the same
          registry, exchange and token addresses on BaseScan.
        </p>
      </div>

      {failed || !proof ? (
        <Panel className="p-6">
          <Chip tone="amber">Live data unavailable</Chip>
          <p className="mt-3 max-w-[54ch] text-[12.5px] leading-relaxed text-ink-secondary">
            The launch contracts or the indexer did not answer. The addresses below are still
            the deployed ones.
          </p>
          <Link
            href="/launch/proof"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stroke-raised px-4 py-2 text-[12px] font-semibold text-ink-secondary">
            Refresh
          </Link>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Panel className="p-5">
              <SectionLabel as="h2">Strategies</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{proof.strategies}</Num>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Traders</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{proof.traders}</Num>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Follows</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{proof.follows}</Num>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Trades</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{proof.trades}</Num>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Today</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{proof.tradesToday}</Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">Trades indexed</p>
            </Panel>
          </div>

          <Panel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <SectionLabel as="h2">Contracts</SectionLabel>
                <p className="mt-2 max-w-[54ch] text-[11.5px] leading-relaxed text-ink-quaternary">
                  Registry v2, the exchange and the test token. The oracle is a demo feed with
                  eight decimals, not a Chainlink feed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CONTRACTS.map(([label, address]) => (
                  <a
                    key={label}
                    href={explorerAddressUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3 py-1.5 text-[10.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                    {label}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ))}
              </div>
            </div>
            <dl className="mt-4 grid gap-2 border-t border-stroke-hairline pt-3 sm:grid-cols-3">
              <div>
                <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Strategies on chain</dt>
                <dd className="mt-1">
                  <Num className="text-[12px] text-ink-secondary">{strategies}</Num>
                </dd>
              </div>
              <div>
                <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Latest publish</dt>
                <dd className="mt-1">
                  <Num className="text-[12px] text-ink-secondary">
                    {proof.latest ? proof.latest.slice(0, 10) : 'None'}
                  </Num>
                </dd>
              </div>
              <div>
                <dt className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Indexed in</dt>
                <dd className="mt-1">
                  <Num className="text-[12px] text-ink-secondary">launch schema</Num>
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel className="p-5">
            <SectionLabel as="h2">Not shown yet</SectionLabel>
            <p className="mt-2 max-w-[54ch] text-[12px] leading-relaxed text-ink-secondary">
              Live mainnet prices, the real token link out and a mainnet deployment. The
              oracle is a demo feed and every token here is a test token.
            </p>
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/launch"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D]">
              Back to the market
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </>
      )}

      <SandboxNote className="max-w-[58ch]">
        Testnet only. No real value and nothing here is investment advice.
      </SandboxNote>
    </div>
  );
}
