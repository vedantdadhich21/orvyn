'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useConnection, useSignMessage } from 'wagmi';

import { Chip, Display, Num, Panel, SectionLabel } from '@/components/primitives';
import { isPrivyConfigured } from '@/lib/privy';
import { explorerAddressUrl, strategyRegistryAddress } from '@/lib/orvyn/registry';

type AdminStats = {
  configured: boolean;
  count: number;
  authors: number;
  latest: string | null;
};

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
            <div className="grid gap-3 sm:grid-cols-3">
              <Panel className="p-5">
                <SectionLabel as="h2">Strategies</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">{stats.count}</Num>
              </Panel>
              <Panel className="p-5">
                <SectionLabel as="h2">Authors</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">{stats.authors}</Num>
                <p className="mt-1 text-[10.5px] text-ink-faint">Across the latest 50</p>
              </Panel>
              <Panel className="p-5">
                <SectionLabel as="h2">Latest</SectionLabel>
                <Num className="mt-2 block text-3xl font-semibold">
                  {stats.latest ? stats.latest.slice(0, 10) : 'None'}
                </Num>
              </Panel>
            </div>

            <Panel className="p-5">
              <SectionLabel as="h2">Registry view only</SectionLabel>
              <p className="mt-2 max-w-[54ch] text-[12px] leading-relaxed text-ink-secondary">
                Users, follows, investments and the event timeline arrive with Postgres and the
                exchange. This page will not invent them early.
              </p>
              {strategyRegistryAddress ? (
                <a
                  href={explorerAddressUrl(strategyRegistryAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                  Open the registry
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
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
