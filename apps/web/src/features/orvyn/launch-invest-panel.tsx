'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, TriangleAlert } from 'lucide-react';
import { formatUnits, parseUnits, type Address, type Hash } from 'viem';
import {
  useConnection,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';

import { Chip, Num, Panel, SectionLabel } from '@/components/primitives';
import {
  ORVYN_EXCHANGE_ABI,
  STRATEGY_REGISTRY_V2_ABI,
  TEST_USD_ABI,
} from '@/lib/orvyn/launch-contracts';
import {
  launchConfig,
  stockByTicker,
  USDC_DECIMALS,
} from '@/lib/orvyn/launch';
import type { LaunchStrategy } from '@/server/launch/market';
import { formatPrice } from '@/lib/orvyn/stocks';

function errorLine(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.split('\n')[0]?.slice(0, 180) ?? 'The transaction did not go through.';
}

function recordTransaction(hash: Hash) {
  void fetch('/api/tx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txHash: hash }),
  }).catch(() => undefined);
}

export function LaunchInvestPanel({ strategy }: { strategy: LaunchStrategy }) {
  const { address, chain } = useConnection();
  const { mutateAsync: switchChain } = useSwitchChain();
  const { mutateAsync: write } = useWriteContract();
  const publicClient = usePublicClient({ chainId: launchConfig.chainId });

  const [amount, setAmount] = useState('300');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const strategyId = BigInt(strategy.id);
  const wrongChain = Boolean(chain && chain.id !== launchConfig.chainId);
  const enabled = Boolean(address) && !wrongChain && Boolean(strategy.parsed);
  const isAuthor = address
    ? address.toLowerCase() === strategy.author.toLowerCase()
    : false;

  const usdc = useReadContract({
    address: launchConfig.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: Boolean(address) },
  });

  const following = useReadContract({
    address: launchConfig.registryV2,
    abi: STRATEGY_REGISTRY_V2_ABI,
    functionName: 'isFollowing',
    args: [strategyId, address as Address],
    query: { enabled: Boolean(address) },
  });

  const followers = useReadContract({
    address: launchConfig.registryV2,
    abi: STRATEGY_REGISTRY_V2_ABI,
    functionName: 'followersOf',
    args: [strategyId],
  });

  const usdcBalance = (usdc.data as bigint | undefined) ?? BigInt(0);
  const isFollowing = Boolean(following.data);
  const followerCount = (followers.data as readonly Address[] | undefined)?.length ?? strategy.followers;

  const basket = useMemo(() => {
    const weights = strategy.parsed?.weights ?? {};
    return Object.entries(weights)
      .filter(([ticker, weight]) => ticker !== 'CASH' && weight > 0)
      .map(([ticker, weight]) => ({ ticker, weight }));
  }, [strategy.parsed]);

  const amountNumber = Number(amount);
  const breakdown = basket.map((line) => ({
    ...line,
    usdc: Number.isFinite(amountNumber) ? (amountNumber * line.weight) / 100 : 0,
    price: stockByTicker[line.ticker]?.priceUsd ?? 0,
  }));

  const switchToBase = async () => {
    setError(null);
    try {
      await switchChain({ chainId: launchConfig.chainId });
    } catch (cause) {
      setError(errorLine(cause));
    }
  };

  const toggleFollow = async () => {
    if (!address || !enabled || isAuthor) return;
    setBusy(true);
    setError(null);
    setStatus(isFollowing ? 'Unfollowing…' : 'Following…');
    try {
      const hash = await write({
        address: launchConfig.registryV2,
        abi: STRATEGY_REGISTRY_V2_ABI,
        functionName: isFollowing ? 'unfollow' : 'follow',
        args: [strategyId],
        chainId: launchConfig.chainId,
      });
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt && receipt.status !== 'success') throw new Error('The follow transaction reverted.');
      recordTransaction(hash);
      await Promise.all([following.refetch(), followers.refetch()]);
      setStatus(isFollowing ? 'Unfollowed' : 'Following');
    } catch (cause) {
      setError(errorLine(cause));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const invest = async () => {
    if (!address || !enabled || !publicClient || !strategy.parsed) return;
    setBusy(true);
    setError(null);
    setStatus('Checking the basket…');
    try {
      const total = parseUnits(amount || '0', USDC_DECIMALS);
      if (total <= BigInt(0)) throw new Error('Enter an amount above zero.');
      if (usdcBalance < total) {
        throw new Error('Not enough tUSDC. Claim from the market faucet first.');
      }

      const allowance = (await publicClient.readContract({
        address: launchConfig.testUSD,
        abi: TEST_USD_ABI,
        functionName: 'allowance',
        args: [address, launchConfig.exchange],
      })) as bigint;

      if (allowance < total) {
        setStatus('Approving tUSDC…');
        const approveHash = await write({
          address: launchConfig.testUSD,
          abi: TEST_USD_ABI,
          functionName: 'approve',
          args: [launchConfig.exchange, total],
          chainId: launchConfig.chainId,
        });
        const approved = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approved.status !== 'success') throw new Error('The approval reverted.');
        recordTransaction(approveHash);
      }

      for (const line of breakdown) {
        const stock = stockByTicker[line.ticker];
        if (!stock) continue;
        const usdcForLine = (total * BigInt(line.weight)) / BigInt(100);
        if (usdcForLine === BigInt(0)) continue;

        const preview = (await publicClient.readContract({
          address: launchConfig.exchange,
          abi: ORVYN_EXCHANGE_ABI,
          functionName: 'previewBuy',
          args: [stock.address, usdcForLine],
        })) as bigint;
        if (preview === BigInt(0)) throw new Error(`The oracle returned no ${line.ticker}.`);
        const minOut = (preview * BigInt(99)) / BigInt(100);

        setStatus(`Buying ${line.ticker}…`);
        const hash = await write({
          address: launchConfig.exchange,
          abi: ORVYN_EXCHANGE_ABI,
          functionName: 'buy',
          args: [stock.address, usdcForLine, minOut],
          chainId: launchConfig.chainId,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error(`${line.ticker} buy reverted.`);
        recordTransaction(hash);
      }

      if (!isFollowing && !isAuthor) {
        setStatus('Following the strategy…');
        const hash = await write({
          address: launchConfig.registryV2,
          abi: STRATEGY_REGISTRY_V2_ABI,
          functionName: 'follow',
          args: [strategyId],
          chainId: launchConfig.chainId,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error('The follow reverted.');
        recordTransaction(hash);
      }

      await Promise.all([usdc.refetch(), following.refetch(), followers.refetch()]);
      setStatus(isAuthor ? 'Basket bought' : 'Basket bought and strategy followed');
    } catch (cause) {
      setError(errorLine(cause));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionLabel as="h2">Invest in this strategy</SectionLabel>
          <p className="mt-1.5 max-w-[54ch] text-[11.5px] leading-relaxed text-ink-quaternary">
            The amount is split by the target weights. The cash line stays as tUSDC. Each line
            is one test transaction, then the strategy is followed.
          </p>
        </div>
        <Chip tone={isFollowing ? 'positive' : 'neutral'}>
          {isFollowing ? 'Following' : `${followerCount} following`}
        </Chip>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">
          tUSDC
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            className="mt-1 block h-10 w-32 rounded-lg border border-stroke-raised bg-surface-sunken px-3 text-[13px] text-ink-primary outline-none focus:border-brand/60"
          />
        </label>
        <button
          type="button"
          onClick={() => void invest()}
          disabled={busy || !enabled}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">
          <Check className="size-3.5" aria-hidden />
          {busy ? 'Working…' : isAuthor ? 'Invest in your basket' : 'Invest and follow'}
        </button>
        <button
          type="button"
          onClick={() => void toggleFollow()}
          disabled={busy || !enabled || isAuthor}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-stroke-raised px-4 text-[12px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50">
          {isAuthor ? 'Author' : isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      </div>

      {isAuthor ? (
        <p className="mt-2 text-[10.5px] text-ink-faint">
          You authored this strategy. The follow step is skipped; another wallet can follow it.
        </p>
      ) : null}

      <div className="mt-4 rounded-lg border border-stroke-hairline bg-fill-subtle p-3">
        <ul className="space-y-1.5">
          {breakdown.map((line) => (
            <li key={line.ticker} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-ink-secondary">
                <Num className="font-semibold">{line.ticker}</Num> {line.weight}%
              </span>
              <Num className="text-ink-tertiary">
                {line.usdc > 0 ? `${line.usdc.toFixed(2)} tUSDC` : '—'}
              </Num>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-stroke-hairline pt-2 text-[10.5px] text-ink-faint">
          You hold <Num>{formatUnits(usdcBalance, USDC_DECIMALS)}</Num> tUSDC. The cash line
          stays unspent. Gas is paid in test ETH.
        </p>
      </div>

      {!address ? (
        <p className="mt-3 text-[11px] text-ink-faint">
          <Link href="/sign-in" className="underline underline-offset-2 hover:text-ink-secondary">
            Sign in
          </Link>{' '}
          to invest, or{' '}
          <Link href="/launch" className="underline underline-offset-2 hover:text-ink-secondary">
            claim tUSDC
          </Link>{' '}
          from the market faucet.
        </p>
      ) : wrongChain ? (
        <button
          type="button"
          onClick={() => void switchToBase()}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D]">
          Switch to Base Sepolia
        </button>
      ) : null}

      {status ? <p className="mt-3 text-[11px] text-amber-bright">{status}</p> : null}
      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-amber-bright">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/launch"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Back to the market
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        <span className="text-[10.5px] text-ink-faint">
          Basket value at demo prices: <Num>{formatPrice(breakdown.reduce((sum, line) => sum + line.usdc, 0))}</Num>
        </span>
      </div>
    </Panel>
  );
}
