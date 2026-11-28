'use client';

import {useState} from 'react';
import {isAddress} from 'viem';

import {Chip, Display, Num, Panel, SandboxNote, SectionLabel} from '@/components/primitives';
import type {MainnetBalances} from '@/server/base/balances';

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const compactUnits = (units: string) => {
  if (!units.includes('.')) return units;
  return units.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
};

export function MainnetReaderScreen({enabled}: {enabled: boolean}) {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<MainnetBalances | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async () => {
    setError(null);
    setData(null);
    if (!isAddress(address)) {
      setError('Enter a valid EVM address.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/base/balances?address=${encodeURIComponent(address)}`, {
        cache: 'no-store',
      });
      const body = (await response.json()) as MainnetBalances & {error?: string};
      if (!response.ok) throw new Error(body.error ?? 'Mainnet read failed.');
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mainnet read failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Base Mainnet</Chip>
          <Chip tone="positive">Read only</Chip>
          <SandboxNote>No transaction required</SandboxNote>
        </div>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Mainnet portfolio reader
        </Display>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-ink-secondary">
          Paste any Base address to read native and verified token balances. Tokenized stock
          reference data comes from Coinbase. Nothing on this screen signs or sends a transaction.
        </p>
      </div>

      {!enabled ? (
        <Panel className="p-6">
          <Chip tone="amber">Reads disabled</Chip>
          <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-secondary">
            Mainnet reads are off for this deployment. Enable <Num>MAINNET_READS_ENABLED</Num> on
            the server to turn this reader on. Mainnet writes remain unavailable.
          </p>
        </Panel>
      ) : (
        <Panel className="p-5 sm:p-6">
          <SectionLabel as="h2">Wallet address</SectionLabel>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-lg border border-stroke-raised bg-surface-sunken px-3 font-mono text-[13px] text-ink-primary outline-none placeholder:text-ink-faint focus:border-brand/60"
            />
            <button
              type="button"
              onClick={() => void read()}
              disabled={loading}
              className="h-11 rounded-lg bg-brand px-5 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Reading…' : 'Read balances'}
            </button>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
            Wallet connection is optional. Reads use the server RPC pool and do not consume gas.
          </p>
          {error ? <p role="alert" className="mt-3 text-[12px] text-amber-bright">{error}</p> : null}
        </Panel>
      )}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="p-5">
              <SectionLabel as="h2">Network</SectionLabel>
              <Num className="mt-2 block text-xl font-semibold">{data.network.name}</Num>
              <span className="text-[10.5px] text-ink-faint">Chain {data.network.chainId}</span>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Block</SectionLabel>
              <Num className="mt-2 block text-xl font-semibold">{data.blockNumber}</Num>
              <span className="text-[10.5px] text-ink-faint">Latest read block</span>
            </Panel>
            <Panel className="p-5">
              <SectionLabel as="h2">Address</SectionLabel>
              <Num className="mt-2 block text-xl font-semibold">{shortAddress(data.address)}</Num>
              <a
                href={`${data.network.explorerUrl}/address/${data.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10.5px] text-ink-tertiary underline underline-offset-2 hover:text-ink-secondary">
                Open BaseScan
              </a>
            </Panel>
          </div>

          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionLabel as="h2">Verified balances</SectionLabel>
              <span className="text-[10.5px] text-ink-faint">Decimals checked onchain</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-stroke-hairline text-[10px] tracking-[0.1em] text-ink-faint uppercase">
                    <th className="py-2 pr-3 font-semibold">Asset</th>
                    <th className="py-2 pr-3 text-right font-semibold">Balance</th>
                    <th className="py-2 pr-3 text-right font-semibold">Decimals</th>
                    <th className="py-2 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.balances.map((balance) => (
                    <tr key={balance.symbol} className="border-b border-stroke-hairline/60 last:border-0">
                      <td className="py-3 pr-3">
                        <Num className="block text-[13px] font-semibold">{balance.symbol}</Num>
                        <span className="text-[10.5px] text-ink-faint">{balance.name}</span>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Num className="text-[13px] text-ink-primary">{compactUnits(balance.units)}</Num>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Num className="text-[12px] text-ink-tertiary">{balance.decimals}</Num>
                      </td>
                      <td className="py-3 text-right">
                        <Chip tone={balance.verified ? 'positive' : 'amber'}>
                          {balance.verified ? 'Verified' : 'Mismatch'}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionLabel as="h2">Tokenized stocks</SectionLabel>
              <span className="text-[10.5px] text-ink-faint">Coinbase reference metadata</span>
            </div>
            {data.tokenizedStocks.length === 0 ? (
              <p className="mt-4 text-[12px] text-ink-tertiary">
                No matching Coinbase tokenized stock metadata is available right now.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-stroke-hairline text-[10px] tracking-[0.1em] text-ink-faint uppercase">
                      <th className="py-2 pr-3 font-semibold">Stock</th>
                      <th className="py-2 pr-3 text-right font-semibold">Token units</th>
                      <th className="py-2 pr-3 text-right font-semibold">Share equivalent</th>
                      <th className="py-2 pr-3 text-right font-semibold">NAV value</th>
                      <th className="py-2 text-right font-semibold">Price status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tokenizedStocks.map((position) => (
                      <tr key={position.address} className="border-b border-stroke-hairline/60 last:border-0">
                        <td className="py-3 pr-3">
                          <Num className="block text-[13px] font-semibold">{position.ticker}</Num>
                          <span className="text-[10.5px] text-ink-faint">{position.name}</span>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <Num className="text-[12.5px] text-ink-secondary">{compactUnits(position.units)}</Num>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <Num className="text-[12.5px] text-ink-secondary">
                            {position.shareEquivalent ? compactUnits(position.shareEquivalent) : '—'}
                          </Num>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <Num className="text-[12.5px] text-ink-primary">
                            {position.valueUsd === null ? '—' : `$${position.valueUsd.toFixed(2)}`}
                          </Num>
                        </td>
                        <td className="py-3 text-right">
                          <Chip tone={position.navStale ? 'amber' : 'positive'}>
                            {position.navStale ? 'Delayed' : 'Reference'}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 max-w-[70ch] text-[10.5px] leading-relaxed text-ink-faint">
              NAV is a total return reference value, not a live bid or execution price. Multipliers
              can change after corporate actions. Share equivalents use balanceOfUI when available.
            </p>
          </Panel>

          {data.warnings.length > 0 ? (
            <Panel className="border-amber/25 p-5">
              <Chip tone="amber">Read warnings</Chip>
              <ul className="mt-3 space-y-1.5 text-[11.5px] leading-relaxed text-ink-secondary">
                {data.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </Panel>
          ) : null}

          <Panel className="p-5">
            <SectionLabel as="h2">Metadata sources</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10.5px] text-ink-tertiary">
              {[...new Set(data.balances.map((balance) => balance.source))].map((source) => (
                <a key={source} href={source} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink-secondary">
                  {new URL(source).hostname}
                </a>
              ))}
              <a href="https://api.coinbase.com/v1/tokenized-stocks" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink-secondary">
                Coinbase Tokenized Stocks API
              </a>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
