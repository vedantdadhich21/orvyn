'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatUnits, type Address } from 'viem';
import { useConnection, useReadContract, useReadContracts } from 'wagmi';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { TEST_STOCK_ABI, TEST_USD_ABI } from '@/lib/orvyn/launch-contracts';
import { launchConfig, launchStocks, USDC_DECIMALS } from '@/lib/orvyn/launch';
import type { MarketPrice } from '@/server/launch/market';
import { formatPrice } from '@/lib/orvyn/stocks';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function LaunchPortfolioScreen({ prices }: { prices: MarketPrice[] }) {
  const { address } = useConnection();

  const usdc = useReadContract({
    address: launchConfig.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'balanceOf',
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
  const cash = Number(formatUnits(usdcBalance, USDC_DECIMALS));

  const positions = launchStocks.map((stock, index) => {
    const row = stockBalances.data?.[index];
    const units = row?.status === 'success' ? ((row.result as bigint | undefined) ?? BigInt(0)) : BigInt(0);
    const price = prices.find((item) => item.ticker === stock.ticker)?.priceUsd ?? stock.priceUsd;
    return {
      ...stock,
      units,
      price,
      value: Number(formatUnits(units, 18)) * price,
    };
  });

  const invested = positions.reduce((sum, position) => sum + position.value, 0);
  const total = invested + cash;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Portfolio</Chip>
          <Chip tone="amber">Demo prices</Chip>
          <SandboxNote>Test tokens · no real value</SandboxNote>
        </div>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Your test portfolio
        </Display>
        <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
          tUSDC and the test stocks held by this wallet, valued at the demo oracle price.
          There is no profit or loss history yet.
        </p>
      </div>

      {!address ? (
        <Panel className="p-6">
          <p className="text-[12.5px] text-ink-secondary">Sign in to see your test balances.</p>
          <Link
            href="/sign-in"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#07130D]">
            Sign in
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="p-5">
              <SectionLabel as="h2">Total</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{formatPrice(total)}</Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">At demo prices</p>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">tUSDC</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{formatPrice(cash)}</Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">Liquid test cash</p>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Stocks</SectionLabel>
              <Num className="mt-2 block text-3xl font-semibold">{formatPrice(invested)}</Num>
              <p className="mt-1 text-[10.5px] text-ink-faint">At demo prices</p>
            </Panel>
          </div>

          <Panel className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionLabel as="h2">Positions</SectionLabel>
              <Num className="text-[10.5px] text-ink-faint">{shortAddress(address)}</Num>
            </div>
            <div className="-mx-5 mt-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-stroke-hairline text-[10px] tracking-[0.11em] text-ink-faint uppercase">
                    <th scope="col" className="py-2 pr-3 font-semibold">Line</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Units</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Price</th>
                    <th scope="col" className="py-2 text-right font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.ticker} className="border-b border-stroke-hairline/60 last:border-0">
                      <td className="py-2.5 pr-3">
                        <Num className="text-[12px] font-medium">{position.ticker}</Num>
                        <span className="ml-2 text-[10.5px] text-ink-quaternary">{position.name}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <Num className="text-[11.5px] text-ink-secondary">
                          {formatUnits(position.units, 18)}
                        </Num>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <Num className="text-[11.5px] text-ink-tertiary">
                          {formatPrice(position.price)}
                        </Num>
                      </td>
                      <td className="py-2.5 text-right">
                        <Num className="text-[11.5px] font-medium">
                          {formatPrice(position.value)}
                        </Num>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10.5px] text-ink-faint">
              Empty rows are stocks you do not hold yet.
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
        Test tokens, no real value, not investment advice. Prices are demo oracle values, not
        live market data.
      </SandboxNote>
    </div>
  );
}
