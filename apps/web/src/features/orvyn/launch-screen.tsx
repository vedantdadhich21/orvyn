'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, TriangleAlert } from 'lucide-react';
import {
  formatUnits,
  parseUnits,
  type Address,
  type Hash,
} from 'viem';
import {
  useConnection,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';

import { AllocationRing } from '@/components/orvyn/allocation-ring';
import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import {
  ORVYN_EXCHANGE_ABI,
  TEST_STOCK_ABI,
  TEST_USD_ABI,
} from '@/lib/orvyn/launch-contracts';
import {
  FAUCET_COOLDOWN_SECONDS,
  launchConfig,
  launchStocks,
  stockByTicker,
  USDC_DECIMALS,
} from '@/lib/orvyn/launch';
import type { LaunchStrategy, MarketPrice } from '@/server/launch/market';
import { formatPrice } from '@/lib/orvyn/stocks';
import { cn } from '@/lib/utils';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

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

export function LaunchScreen({
  strategies,
  prices,
  error,
}: {
  strategies: LaunchStrategy[];
  prices: MarketPrice[];
  error: string | null;
}) {
  const { address, chain } = useConnection();
  const { mutateAsync: switchChain } = useSwitchChain();
  const { mutateAsync: write } = useWriteContract();
  const publicClient = usePublicClient({ chainId: launchConfig.chainId });

  const [sort, setSort] = useState<'newest' | 'followed'>('newest');
  const [ticker, setTicker] = useState<string>(launchStocks[0]?.ticker ?? 'NVDA');
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const wrongChain = Boolean(chain && chain.id !== launchConfig.chainId);
  const enabled = Boolean(address) && !wrongChain;

  const usdc = useReadContract({
    address: launchConfig.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: Boolean(address) },
  });

  const lastClaim = useReadContract({
    address: launchConfig.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'lastClaim',
    args: [address as Address],
    query: { enabled: Boolean(address) },
  });

  const stockBalances = useReadContracts({
    contracts: launchStocks.map((stock) => ({
      address: stock.address,
      abi: TEST_STOCK_ABI,
      functionName: 'balanceOf' as const,
      args: [address as Address],
    })),
    query: { enabled: Boolean(address) },
  });

  const usdcBalance = (usdc.data as bigint | undefined) ?? BigInt(0);
  const balanceOf = (index: number): bigint => {
    const row = stockBalances.data?.[index];
    return row?.status === 'success' ? ((row.result as bigint | undefined) ?? BigInt(0)) : BigInt(0);
  };

  const holdings = launchStocks.map((stock, index) => {
    const units = balanceOf(index);
    const price = prices.find((item) => item.ticker === stock.ticker)?.priceUsd ?? stock.priceUsd;
    return { ...stock, units, price, value: Number(formatUnits(units, 18)) * price };
  });

  const stockValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const cashValue = Number(formatUnits(usdcBalance, USDC_DECIMALS));
  const totalValue = stockValue + cashValue;

  const selected = stockByTicker[ticker] ?? launchStocks[0];

  const refresh = async () => {
    await Promise.all([usdc.refetch(), lastClaim.refetch(), stockBalances.refetch()]);
  };

  const switchToBase = async () => {
    setTxError(null);
    try {
      await switchChain({ chainId: launchConfig.chainId });
    } catch (cause) {
      setTxError(errorLine(cause));
    }
  };

  const claim = async () => {
    if (!address || !enabled) return;
    setBusy(true);
    setTxError(null);
    setStatus('Claiming 1,000 tUSDC…');
    try {
      const hash = await write({
        address: launchConfig.testUSD,
        abi: TEST_USD_ABI,
        functionName: 'claim',
        chainId: launchConfig.chainId,
      });
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt && receipt.status !== 'success') throw new Error('The faucet transaction reverted.');
      recordTransaction(hash);
      await refresh();
      setStatus('1,000 tUSDC claimed');
    } catch (cause) {
      setTxError(errorLine(cause));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (!address || !enabled || !selected || !publicClient) return;
    setBusy(true);
    setTxError(null);
    setStatus(`Preparing ${selected.ticker}…`);
    try {
      const usdcAmount = parseUnits(amount || '0', USDC_DECIMALS);
      if (usdcAmount <= BigInt(0)) throw new Error('Enter an amount above zero.');

      const allowance = (await publicClient.readContract({
        address: launchConfig.testUSD,
        abi: TEST_USD_ABI,
        functionName: 'allowance',
        args: [address, launchConfig.exchange],
      })) as bigint;

      if (allowance < usdcAmount) {
        setStatus('Approving tUSDC…');
        const approveHash = await write({
          address: launchConfig.testUSD,
          abi: TEST_USD_ABI,
          functionName: 'approve',
          args: [launchConfig.exchange, usdcAmount],
          chainId: launchConfig.chainId,
        });
        const approved = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approved.status !== 'success') throw new Error('The approval reverted.');
        recordTransaction(approveHash);
      }

      const preview = (await publicClient.readContract({
        address: launchConfig.exchange,
        abi: ORVYN_EXCHANGE_ABI,
        functionName: 'previewBuy',
        args: [selected.address, usdcAmount],
      })) as bigint;
      if (preview === BigInt(0)) throw new Error('The oracle returned no stock for that amount.');
      const minOut = (preview * BigInt(99)) / BigInt(100);

      setStatus(`Buying ${selected.ticker}…`);
      const hash = await write({
        address: launchConfig.exchange,
        abi: ORVYN_EXCHANGE_ABI,
        functionName: 'buy',
        args: [selected.address, usdcAmount, minOut],
        chainId: launchConfig.chainId,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The buy reverted.');
      recordTransaction(hash);
      await refresh();
      setStatus(`Bought ${formatUnits(preview, 18)} ${selected.ticker}`);
    } catch (cause) {
      setTxError(errorLine(cause));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);
  const lastClaimAt = Number((lastClaim.data as bigint | undefined) ?? BigInt(0));
  const cooldownLeft = lastClaimAt > 0 ? lastClaimAt + FAUCET_COOLDOWN_SECONDS - now : 0;
  const cooldown = cooldownLeft > 0;

  const orderedStrategies = useMemo(
    () =>
      sort === 'followed'
        ? [...strategies].sort((a, b) => b.followers - a.followers)
        : strategies,
    [sort, strategies],
  );

  const orderedPrices = useMemo(
    () => launchStocks.map((stock) => prices.find((item) => item.ticker === stock.ticker) ?? {
      ticker: stock.ticker,
      name: stock.name,
      address: stock.address,
      priceUsd: stock.priceUsd,
      updatedAt: '',
    }),
    [prices],
  );

  return (
    <div className="space-y-8">
      <div className="relative">
        <ScreenField ramp="portfolio" height={280} intensity={0.5} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,#111214_0%,rgba(17,18,20,0.92)_30%,rgba(17,18,20,0.55)_58%,rgba(17,18,20,0.12)_82%,transparent_100%)]"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Testnet market</Chip>
          <Chip tone="amber">Demo oracle</Chip>
          <SandboxNote>Test tokens · no real value</SandboxNote>
        </div>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Trade the testnet market
        </Display>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-ink-secondary">
          Claim test USD, buy the seven test stocks, and follow a published strategy. Prices
          come from a demo oracle, not a live market feed. Nothing here moves real money.
        </p>
        <Link
          href="/launch/proof"
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          See the live counts
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Panel className="p-4">
          <span className="text-[9.5px] font-semibold tracking-[0.11em] text-ink-faint uppercase">
            Stocks
          </span>
          <Num className="mt-1 block text-xl font-semibold">{launchStocks.length}</Num>
          <span className="text-[10px] text-ink-faint">On the market</span>
        </Panel>
        <Panel className="p-4">
          <span className="text-[9.5px] font-semibold tracking-[0.11em] text-ink-faint uppercase">
            Strategies
          </span>
          <Num className="mt-1 block text-xl font-semibold">{strategies.length}</Num>
          <span className="text-[10px] text-ink-faint">On registry v2</span>
        </Panel>
        <Panel className="p-4">
          <span className="text-[9.5px] font-semibold tracking-[0.11em] text-ink-faint uppercase">
            Oracle
          </span>
          <span className="mt-1 block text-xl font-semibold text-brand-soft">Demo</span>
          <span className="text-[10px] text-ink-faint">Eight decimal feed</span>
        </Panel>
      </div>

      {error ? (
        <Panel className="p-5">
          <Chip tone="amber">
            <TriangleAlert className="size-3" aria-hidden />
            Market read failed
          </Chip>
          <p className="mt-3 max-w-[54ch] text-[12px] leading-relaxed text-ink-secondary">
            {error}
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionLabel as="h2">Your test wallet</SectionLabel>
              {address ? (
                <Num className="mt-2 block text-[11.5px] text-ink-secondary">
                  {shortAddress(address)}
                </Num>
              ) : (
                <p className="mt-2 text-[12px] text-ink-tertiary">
                  Sign in to claim, buy and follow.
                </p>
              )}
            </div>
            {!address ? (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
                Sign in
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : wrongChain ? (
              <button
                type="button"
                onClick={() => void switchToBase()}
                className="rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
                Switch to Base Sepolia
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void claim()}
                disabled={busy || cooldown}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">
                <Check className="size-3.5" aria-hidden />
                {cooldown ? `Faucet ready in ${Math.ceil(cooldownLeft / 3600)}h` : 'Claim 1,000 tUSDC'}
              </button>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-stroke-hairline pt-4">
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">tUSDC</dt>
              <dd className="mt-1">
                <Num className="text-[15px] font-semibold">{formatUnits(usdcBalance, USDC_DECIMALS)}</Num>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">Positions</dt>
              <dd className="mt-1">
                <Num className="text-[15px] font-semibold">{formatPrice(totalValue)}</Num>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel className="p-5">
          <SectionLabel as="h2">Portfolio</SectionLabel>
          <p className="mt-1.5 text-[11px] text-ink-quaternary">
            Test tUSDC plus the stocks held in this wallet, at demo prices.
          </p>
          <ul className="mt-3 space-y-2">
            {holdings.filter((holding) => holding.units > BigInt(0)).length === 0 ? (
              <li className="text-[11.5px] text-ink-faint">No stock positions yet.</li>
            ) : (
              holdings
                .filter((holding) => holding.units > BigInt(0))
                .map((holding) => (
                  <li key={holding.ticker} className="flex items-center justify-between gap-3">
                    <span className="text-[11.5px] text-ink-secondary">
                      <Num className="font-semibold">{holding.ticker}</Num>{' '}
                      {formatUnits(holding.units, 18)}
                    </span>
                    <Num className="text-[11px] text-ink-tertiary">{formatPrice(holding.value)}</Num>
                  </li>
                ))
            )}
          </ul>
          <Link
            href="/launch/portfolio"
            className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
            Open the full portfolio
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </Panel>
      </div>

      <section aria-label="Test stock market">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionLabel as="h2">The market</SectionLabel>
          <span className="text-[11px] text-ink-faint">Demo oracle prices</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {orderedPrices.map((stock) => (
            <Panel key={stock.ticker} className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand/[0.08] text-[10px] font-semibold tracking-[0.08em] text-brand-soft">
                {stock.ticker.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <Num className="text-[13px] font-semibold">{stock.ticker}</Num>
                  <span className="truncate text-[11px] text-ink-quaternary">{stock.name}</span>
                </p>
                <p className="mt-1">
                  <Num className="text-[15px] font-semibold">{formatPrice(stock.priceUsd)}</Num>
                  <span className="ml-2 text-[10px] text-ink-faint">
                    {stock.updatedAt ? stock.updatedAt.slice(0, 16).replace('T', ' ') : 'demo'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTicker(stock.ticker);
                  setStatus(null);
                  setTxError(null);
                }}
                className={cn(
                  'shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  ticker === stock.ticker
                    ? 'border-brand/50 bg-brand/10 text-brand-soft'
                    : 'border-stroke-raised text-ink-secondary hover:border-brand/40 hover:text-ink-primary',
                )}>
                {ticker === stock.ticker ? 'Selected' : 'Buy'}
              </button>
            </Panel>
          ))}
        </div>

        <Panel className="mt-3 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <SectionLabel as="h2">Buy {selected?.ticker ?? 'a stock'}</SectionLabel>
              <p className="mt-1.5 text-[11px] text-ink-quaternary">
                Spend tUSDC. The exchange mints the test stock at the oracle price.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <label className="text-[10px] tracking-[0.11em] text-ink-faint uppercase">
                tUSDC
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="mt-1 block h-9 w-28 rounded-lg border border-stroke-raised bg-surface-sunken px-3 text-[12px] text-ink-primary outline-none focus:border-brand/60"
                />
              </label>
              <button
                type="button"
                onClick={() => void buy()}
                disabled={busy || !enabled || !selected}
                className="h-9 rounded-lg bg-brand px-4 text-[12px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? 'Working…' : 'Buy'}
              </button>
            </div>
          </div>

          {status ? <p className="mt-3 text-[11px] text-amber-bright">{status}</p> : null}
          {txError ? (
            <p role="alert" className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-amber-bright">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
              {txError}
            </p>
          ) : null}

          {!address ? (
            <p className="mt-3 text-[11px] text-ink-faint">
              <Link href="/sign-in" className="underline underline-offset-2 hover:text-ink-secondary">
                Sign in
              </Link>{' '}
              to use the faucet and the market.
            </p>
          ) : null}
        </Panel>
      </section>

      <section aria-label="Published launch strategies">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionLabel as="h2">Published strategies</SectionLabel>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSort('newest')}
                className={cn('rounded-pill px-2 py-0.5 text-[10px] font-semibold', sort === 'newest' ? 'bg-fill-active text-ink-primary' : 'text-ink-faint')}>
                Newest
              </button>
              <button
                type="button"
                onClick={() => setSort('followed')}
                className={cn('rounded-pill px-2 py-0.5 text-[10px] font-semibold', sort === 'followed' ? 'bg-fill-active text-ink-primary' : 'text-ink-faint')}>
                Most followed
              </button>
            </div>
            <Link
              href="/create"
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
              Publish one
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>

        {strategies.length === 0 ? (
          <Panel className="mt-3 px-6 py-10 text-center">
            <p className="text-[13px] font-semibold text-ink-secondary">No strategies yet</p>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-[11.5px] leading-relaxed text-ink-quaternary">
              The registry is live and empty. Publish a strategy and it will appear here.
            </p>
          </Panel>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {orderedStrategies.map((strategy) => (
              <Panel key={strategy.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13.5px] font-semibold">{strategy.name}</h3>
                    <p className="mt-1 text-[10.5px] text-ink-faint">
                      <Num>#{strategy.id}</Num> · v2 · {shortAddress(strategy.author)} ·{' '}
                      <Num>{strategy.followers}</Num> following
                    </p>
                  </div>
                  {strategy.parsed ? (
                    <AllocationRing weights={strategy.parsed.weights} size={46} stroke={6} />
                  ) : (
                    <Chip tone="neutral">v2</Chip>
                  )}
                </div>

                {strategy.parsed ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(strategy.parsed.weights).map(([ticker, weight]) => (
                      <span
                        key={ticker}
                        className="rounded-pill border border-stroke-raised bg-fill-muted px-2 py-0.5 text-[10px] text-ink-secondary">
                        <Num className="font-semibold">{ticker}</Num>{' '}
                        <Num className="text-ink-quaternary">{weight}%</Num>
                      </span>
                    ))}
                  </div>
                ) : null}

                <Link
                  href={`/launch/s/${strategy.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                  Open and invest
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </Panel>
            ))}
            <Panel className="flex flex-col justify-center border-dashed p-5">
              <p className="text-[13px] font-semibold text-ink-secondary">Publish your own</p>
              <p className="mt-1.5 max-w-[34ch] text-[11.5px] leading-relaxed text-ink-quaternary">
                Build a plan, set the limits, and write it to registry v2. The line is public;
                the holdings stay in your browser.
              </p>
              <Link
                href="/create"
                className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary">
                Start a portfolio
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </Panel>
          </div>
        )}
      </section>

      <SandboxNote className="max-w-[60ch]">
        Test tokens, no real value, not investment advice. The oracle is a demo feed; live
        mainnet prices are a week two task. Following a strategy is a public signal, not an
        order.
      </SandboxNote>
    </div>
  );
}
