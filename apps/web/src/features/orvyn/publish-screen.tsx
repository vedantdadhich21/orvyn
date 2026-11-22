'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import { useConnection, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { isPrivyConfigured } from '@/lib/privy';
import { publishBlocker, publishErrorMessage, publishedIdFromLogs } from '@/lib/orvyn/publish';
import {
  REGISTRY_CHAIN,
  REGISTRY_CHAIN_ID,
  explorerAddressUrl,
  explorerTxUrl,
  isRegistryConfigured,
  strategyRegistryAddress,
} from '@/lib/orvyn/registry';
import { savePublished } from '@/lib/orvyn/published';
import { STRATEGY_REGISTRY_ABI } from '@/lib/orvyn/strategy-registry';
import { strategyFromDraft } from '@/lib/orvyn/strategy';
import { totalWeight } from '@/lib/orvyn/storage';
import { useDraft } from '@/lib/orvyn/use-draft';
import { usePublished } from '@/lib/orvyn/use-published';

/**
 * Publish one strategy to the registry.
 *
 * The payload is shown before a wallet is involved, because it is exactly what
 * will be public forever. The transaction is signed by the connected wallet;
 * this app never holds a key and never pays gas for anyone.
 */

type Stage = 'idle' | 'wallet' | 'confirming' | 'done' | 'error';

type PublishResult = { hash: `0x${string}`; strategyId: bigint | null };

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PublishScreen() {
  const { id } = useParams<{ id: string }>();
  const draft = useDraft(id);
  const published = usePublished(id);
  const [ready, setReady] = useState(false);

  const { address, chain } = useConnection();
  const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
  const { mutateAsync: writeContract, isPending: sending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: REGISTRY_CHAIN_ID });

  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [copied, setCopied] = useState<'payload' | 'hash' | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const complete = draft ? totalWeight(draft.weights, draft.tickers) === 100 : false;
  const preview = draft && complete ? strategyFromDraft(draft) : null;
  const chainId = chain?.id ?? null;
  const blocker = publishBlocker({
    configured: isRegistryConfigured,
    complete,
    hasWallet: Boolean(address),
    chainId,
  });

  const busy = stage === 'wallet' || stage === 'confirming' || sending || switching;
  const shown: {
    hash: `0x${string}`;
    strategyId: bigint | null;
    author: string;
    name: string;
  } | null = result
    ? { ...result, author: address ?? '', name: preview?.ok ? preview.name : (draft?.name ?? '') }
    : published
      ? {
          hash: published.txHash as `0x${string}`,
          strategyId: BigInt(published.strategyId),
          author: published.author,
          name: published.name,
        }
      : null;
  const changedSincePublish =
    published !== null && preview?.ok === true && preview.payload !== published.payload;

  const copy = async (value: string, which: 'payload' | 'hash') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
    } catch {
      setError('The browser blocked clipboard access. Select the line and copy it by hand.');
    }
  };

  const publish = async () => {
    if (!draft || !preview?.ok || !strategyRegistryAddress || !address || !publicClient) return;

    setError(null);
    setStage('wallet');
    try {
      const hash = await writeContract({
        abi: STRATEGY_REGISTRY_ABI,
        address: strategyRegistryAddress,
        functionName: 'publish',
        args: [preview.name, preview.payload],
        chainId: REGISTRY_CHAIN_ID,
      });

      setStage('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('The transaction was included but it reverted.');
      }

      const strategyId = publishedIdFromLogs(receipt.logs, strategyRegistryAddress);
      if (strategyId !== null) {
        savePublished({
          version: 1,
          draftId: id,
          chainId: REGISTRY_CHAIN_ID,
          registry: strategyRegistryAddress,
          strategyId: strategyId.toString(),
          txHash: hash,
          name: preview.name,
          payload: preview.payload,
          author: address,
          at: new Date().toISOString(),
        });
      }

      // The indexer re-reads the receipt. A failed write must not hide a
      // transaction that already confirmed.
      void fetch('/api/tx', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ txHash: hash }),
      }).catch(() => undefined);

      setResult({ hash, strategyId });
      setStage('done');
    } catch (cause) {
      setError(publishErrorMessage(cause));
      setStage('error');
    }
  };

  const switchNetwork = async () => {
    setError(null);
    try {
      await switchChain({ chainId: REGISTRY_CHAIN_ID });
    } catch (cause) {
      setError(publishErrorMessage(cause));
    }
  };

  const stageLabel =
    stage === 'wallet' ? 'Waiting for the wallet…' : stage === 'confirming' ? 'Confirming on Base Sepolia…' : null;

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
          <Chip tone="neutral">Onchain record</Chip>
          <Chip tone="neutral">Base Sepolia</Chip>
          <SandboxNote>Gas is testnet ETH</SandboxNote>
        </div>

        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Publish the strategy
        </Display>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-ink-secondary">
          The name, the targets and the rules go to a public registry. Holdings, units, prices and
          your address book stay in this browser. Publishing is a signature, not an order.
        </p>
      </div>

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

      {draft && !complete ? (
        <Panel className="p-6">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            Weights incomplete
          </Chip>
          <p className="mt-3 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-secondary">
            A strategy is only publishable at exactly 100%. Set the weights first and come back.
          </p>
          <Link
            href={`/allocate/${id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
            Set the weights
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : null}

      {preview?.ok ? (
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionLabel as="h2">What will be written</SectionLabel>
              <p className="mt-1.5 max-w-[54ch] text-[11.5px] leading-relaxed text-ink-quaternary">
                One readable line. Anyone can rebuild the plan from it, and BaseScan shows it as
                text rather than a blob.
              </p>
            </div>
            <Chip tone="neutral">
              <Num>{preview.bytes}</Num> / 512 bytes
            </Chip>
          </div>

          <div className="mt-4 rounded-lg border border-stroke-hairline bg-fill-muted p-4">
            <Num className="block break-all text-[11.5px] leading-relaxed text-ink-secondary">
              {preview.payload}
            </Num>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => copy(preview.payload, 'payload')}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-tertiary transition-colors hover:text-ink-secondary">
              {copied === 'payload' ? (
                <>
                  <Check className="size-3.5" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden /> Copy the line
                </>
              )}
            </button>
            <span className="text-[10.5px] text-ink-faint">
              The name is kept under 64 bytes and the line under 512; the contract enforces both.
            </span>
          </div>

          <dl className="mt-5 grid gap-3 border-t border-stroke-hairline pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Ceiling</dt>
              <dd className="mt-1">
                <Num className="text-[13px] font-medium">{draft?.rules.ceilingPct}%</Num>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Cash floor</dt>
              <dd className="mt-1">
                <Num className="text-[13px] font-medium">
                  {draft?.rules.cashFloorPct === 0 ? 'Off' : `${draft?.rules.cashFloorPct}%`}
                </Num>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Drift band</dt>
              <dd className="mt-1">
                <Num className="text-[13px] font-medium">{draft?.rules.driftBandPct} pts</Num>
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {draft?.tickers.map((ticker) => (
              <span
                key={ticker}
                className="rounded-pill border border-stroke-raised bg-fill-muted px-2.5 py-1 text-[10.5px] text-ink-secondary">
                <Num className="font-semibold">{ticker}</Num>{' '}
                <Num className="text-ink-quaternary">{draft.weights[ticker] ?? 0}%</Num>
              </span>
            ))}
          </div>
        </Panel>
      ) : null}

      {shown ? (
        <Panel className="border-positive/25 p-5 sm:p-6">
          <Chip tone="positive">
            <Check className="size-3" aria-hidden />
            Published
          </Chip>

          <Display as="h2" className="mt-3 text-2xl">
            {shown.strategyId !== null ? `Strategy #${shown.strategyId.toString()}` : 'On the registry'}
          </Display>
          <p className="mt-2 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-secondary">
            The transaction is confirmed on {REGISTRY_CHAIN.name}. The record is public, it can
            never be edited, and it does not move any money.
          </p>

          <dl className="mt-5 grid gap-4 border-t border-stroke-hairline pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Author</dt>
              <dd className="mt-1">
                <Num className="text-[12px] break-all text-ink-secondary">
                  {shown.author ?? address ?? '—'}
                </Num>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Name</dt>
              <dd className="mt-1 text-[12px] text-ink-secondary">{shown.name || '—'}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={explorerTxUrl(shown.hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
              View the transaction
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
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
            <button
              type="button"
              onClick={() => copy(shown.hash, 'hash')}
              className="inline-flex items-center gap-1.5 px-2 text-[11.5px] font-semibold text-ink-tertiary transition-colors hover:text-ink-secondary">
              {copied === 'hash' ? (
                <>
                  <Check className="size-3.5" aria-hidden /> Hash copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden /> Copy the hash
                </>
              )}
            </button>
          </div>

          <p className="mt-4 max-w-[56ch] text-[10.5px] leading-relaxed text-ink-faint">
            A later edit to the draft does not change this record. Publishing again creates a new
            one; the old one stays onchain.
          </p>
        </Panel>
      ) : null}

      {changedSincePublish ? (
        <Panel className="p-5">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            The draft has changed
          </Chip>
          <p className="mt-3 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-secondary">
            This draft no longer matches the published line. Publishing now writes a new strategy
            next to the old one; nothing is overwritten.
          </p>
        </Panel>
      ) : null}

      {preview?.ok && (!shown || changedSincePublish) ? (
        <Panel className="p-5 sm:p-6">
          <SectionLabel as="h2">The signature</SectionLabel>

          {blocker === 'not-configured' ? (
            <>
              <p className="mt-2 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-secondary">
                This build has no registry address, so the publish button is off. The line above is
                exact and ready; a deployment with{' '}
                <Num className="text-[11.5px] text-ink-tertiary">NEXT_PUBLIC_STRATEGY_REGISTRY</Num>{' '}
                set will publish it.
              </p>
              <p className="mt-3 max-w-[56ch] text-[11px] leading-relaxed text-ink-faint">
                Nothing was sent. The draft and its approval are untouched.
              </p>
            </>
          ) : null}

          {blocker === 'no-wallet' ? (
            <>
              <p className="mt-2 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-secondary">
                {isPrivyConfigured
                  ? 'Publishing needs a wallet. Sign in and the embedded wallet will be used; the key stays with you.'
                  : 'Wallet sign-in is not configured in this deployment, so publishing is off. The payload above can be published by any wallet on Base Sepolia.'}
              </p>
              {isPrivyConfigured ? (
                <Link
                  href="/sign-in"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
                  Sign in to connect a wallet
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </>
          ) : null}

          {blocker === 'wrong-chain' ? (
            <>
              <p className="mt-2 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-secondary">
                The wallet is on {chain?.name ?? 'another network'}. The registry is on{' '}
                {REGISTRY_CHAIN.name}; switching asks the wallet for one confirmation.
              </p>
              <button
                type="button"
                onClick={switchNetwork}
                disabled={switching}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60">
                {switching ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                Switch to {REGISTRY_CHAIN.name}
              </button>
            </>
          ) : null}

          {blocker === 'ready' || blocker === 'wrong-chain' ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy || blocker !== 'ready'}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {stageLabel ?? (changedSincePublish ? 'Publish this version' : 'Publish to Base Sepolia')}
                </button>
                <span className="text-[11px] text-ink-faint">
                  Signed by{' '}
                  <Num className="text-ink-tertiary">
                    {address ? shortAddress(address) : 'your wallet'}
                  </Num>
                  . Gas is paid in testnet ETH.
                </span>
              </div>
            </div>
          ) : null}

          {stage === 'error' && error ? (
            <p
              role="alert"
              className="mt-4 flex max-w-[56ch] items-start gap-2 text-[11.5px] leading-relaxed text-amber-bright">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          {stage !== 'error' && error ? (
            <p className="mt-3 max-w-[56ch] text-[11px] leading-relaxed text-ink-faint">{error}</p>
          ) : null}
        </Panel>
      ) : null}

      <SandboxNote className="max-w-[60ch]">
        A simulated strategy on a testnet registry. No money moves, no custody, no brokerage and
        nothing here is investment advice.
      </SandboxNote>
    </div>
  );
}
