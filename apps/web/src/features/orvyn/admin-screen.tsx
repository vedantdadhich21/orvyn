'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useConnection, useSignMessage } from 'wagmi';

import { Chip, Display, Num, Panel, SectionLabel } from '@/components/primitives';
import { isPrivyConfigured } from '@/lib/privy';
import { explorerAddressUrl, explorerTxUrl } from '@/lib/orvyn/registry';

type AdminEvent = {
  id: string;
  kind: string;
  actor: string;
  subject: string | null;
  txHash: string | null;
  createdAt: string;
};

type AdminUser = {
  address: string;
  firstSeenAt: string;
  lastSeenAt: string;
  strategies: number;
};

type AdminStats = {
  configured: boolean;
  registryOnly: boolean;
  registry: string | null;
  users: number;
  strategies: number;
  investors: number;
  eventsToday: number;
  recentEvents: AdminEvent[];
  recentUsers: AdminUser[];
  launch: { strategies: number; traders: number; follows: number; trades: number } | null;
};

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function when(iso: string): string {
  if (!iso) return '—';
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return '—';
  return `${new Date(parsed).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function kindLabel(kind: string): string {
  return kind.replace('.', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function AdminScreen() {
  const { address } = useConnection();
  const { mutateAsync: signMessage, isPending } = useSignMessage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!address) return;
    setError(null);
    try {
      const message = `ORVYN admin\n${new Date().toISOString()}`;
      const signature = await signMessage({ message });
      const response = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, message, signature }),
      });
      const data = (await response.json()) as AdminStats & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'The server refused the signature.');
      setStats(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wallet could not sign.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Admin</Chip>
          <Chip tone="neutral">Signature gated</Chip>
        </div>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Admin
        </Display>
        <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
          A wallet in the admin list signs a short lived message. The server verifies it with
          viem before it reads anything. There is no password and no session cookie.
        </p>
      </div>

      {!address ? (
        <Panel className="p-6">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            No wallet connected
          </Chip>
          <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
            {isPrivyConfigured
              ? 'Sign in with the wallet that is listed in ADMIN_WALLETS, then come back.'
              : 'Wallet sign in is not configured in this deployment. Set the Privy keys, or use a deployment that has them.'}
          </p>
          {isPrivyConfigured ? (
            <Link
              href="/sign-in"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
              Sign in
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}
        </Panel>
      ) : (
        <Panel className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel as="h2">Connected wallet</SectionLabel>
              <Num className="mt-1.5 block text-[12px] break-all text-ink-secondary">
                {address}
              </Num>
            </div>
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60">
              <ShieldCheck className="size-3.5" aria-hidden />
              {isPending ? 'Waiting for the wallet…' : 'Sign the admin message'}
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-amber-bright">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </Panel>
      )}

      {stats ? (
        stats.configured ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={stats.registryOnly ? 'amber' : 'positive'}>
                {stats.registryOnly ? 'Registry fallback' : 'Live from Postgres'}
              </Chip>
              {stats.registryOnly ? (
                <p className="text-[11px] text-ink-faint">
                  The database did not answer, so only registry counts are shown.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Panel className="p-5">
                <SectionLabel as="h2">Wallets</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">{stats.users}</Num>
              </Panel>
              <Panel className="p-5">
                <SectionLabel as="h2">Strategies</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">{stats.strategies}</Num>
              </Panel>
              <Panel className="p-5">
                <SectionLabel as="h2">Investors</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">{stats.investors}</Num>
                <p className="mt-1 text-[10.5px] text-ink-faint">Exchange pending</p>
              </Panel>
              <Panel className="p-5">
                <SectionLabel as="h2">Events today</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">{stats.eventsToday}</Num>
              </Panel>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Panel className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <SectionLabel as="h2">Recent users</SectionLabel>
                  <Num className="text-[10.5px] text-ink-faint">{stats.recentUsers.length}</Num>
                </div>
                {stats.recentUsers.length === 0 ? (
                  <p className="mt-3 text-[11.5px] leading-relaxed text-ink-quaternary">
                    Nothing indexed yet. Publish a strategy to create the first user row.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-stroke-hairline">
                    {stats.recentUsers.map((user) => (
                      <li key={user.address} className="flex items-center justify-between gap-3 py-2.5">
                        <a
                          href={explorerAddressUrl(user.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0">
                          <Num className="block text-[11.5px] text-ink-secondary transition-colors hover:text-ink-primary">
                            {shortAddress(user.address)}
                          </Num>
                          <span className="text-[10px] text-ink-faint">{when(user.lastSeenAt)}</span>
                        </a>
                        <span className="shrink-0 text-[10.5px] text-ink-quaternary">
                          <Num>{user.strategies}</Num> published
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <SectionLabel as="h2">Recent events</SectionLabel>
                  <Num className="text-[10.5px] text-ink-faint">{stats.recentEvents.length}</Num>
                </div>
                {stats.recentEvents.length === 0 ? (
                  <p className="mt-3 text-[11.5px] leading-relaxed text-ink-quaternary">
                    The event feed is empty until the first indexed transaction.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-stroke-hairline">
                    {stats.recentEvents.map((event) => (
                      <li key={event.id} className="flex items-start justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-medium text-ink-secondary">
                            {kindLabel(event.kind)}
                            {event.subject ? (
                              <Num className="text-ink-quaternary"> #{event.subject}</Num>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-[10px] text-ink-faint">
                            <Num>{shortAddress(event.actor)}</Num> · {when(event.createdAt)}
                          </p>
                        </div>
                        {event.txHash ? (
                          <a
                            href={explorerTxUrl(event.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
                            Tx
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {stats.launch ? (
              <Panel className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <SectionLabel as="h2">Launch market</SectionLabel>
                  <Link
                    href="/launch/proof"
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
                    Proof
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Strategies</p>
                    <Num className="mt-1 block text-2xl font-semibold">{stats.launch.strategies}</Num>
                  </div>
                  <div>
                    <p className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Traders</p>
                    <Num className="mt-1 block text-2xl font-semibold">{stats.launch.traders}</Num>
                  </div>
                  <div>
                    <p className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Follows</p>
                    <Num className="mt-1 block text-2xl font-semibold">{stats.launch.follows}</Num>
                  </div>
                  <div>
                    <p className="text-[9.5px] tracking-[0.1em] text-ink-faint uppercase">Trades</p>
                    <Num className="mt-1 block text-2xl font-semibold">{stats.launch.trades}</Num>
                  </div>
                </div>
                <p className="mt-3 text-[10.5px] text-ink-faint">
                  Indexed from the exchange and Registry v2. The demo oracle is not a live feed.
                </p>
              </Panel>
            ) : null}

            <Panel className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <SectionLabel as="h2">The contract</SectionLabel>
                  <p className="mt-2 max-w-[54ch] text-[11.5px] leading-relaxed text-ink-quaternary">
                    Follows and investments appear here when the exchange and the follow
                    contract ship. The user and event views above read from Postgres.
                  </p>
                </div>
                {stats.registry ? (
                  <a
                    href={explorerAddressUrl(stats.registry)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                    Open the registry
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            </Panel>
          </>
        ) : (
          <Panel className="p-6">
            <Chip tone="amber">Registry not deployed</Chip>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-secondary">
              The signature is valid, but this build has no registry address to read.
            </p>
          </Panel>
        )
      ) : null}
    </div>
  );
}
