import 'server-only';

import {formatUnits, isAddress, parseAbi, type Address} from 'viem';

import {BASE_MAINNET_CONFIG} from '@/lib/base/networks';
import {mainnetReadClient} from './rpc';
import {verifiedBaseTokens, type VerifiedBaseToken} from './tokens';
import {listTokenizedStocks, tokenizedStockForTicker, type TokenizedStock} from './tokenized-stocks';

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

const B20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function balanceOfUI(address account) view returns (uint256)',
]);

const ORVYN_TICKERS = ['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'AAPL', 'TSLA', 'META'] as const;
const NAV_MAX_AGE_MS = 72 * 60 * 60 * 1000;
type MainnetReadClient = ReturnType<typeof mainnetReadClient>;

export type BaseBalance = {
  symbol: string;
  name: string;
  kind: 'native' | 'erc20';
  address: Address | null;
  decimals: number;
  expectedDecimals: number;
  raw: string;
  units: string;
  verified: boolean;
  source: string;
};

export type TokenizedStockPosition = {
  ticker: string;
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  raw: string;
  units: string;
  shareEquivalent: string | null;
  multiplier: number;
  navPrice: number | null;
  navPriceUpdatedAt: string | null;
  navStale: boolean;
  valueUsd: number | null;
  source: string;
};

export type MainnetBalances = {
  network: typeof BASE_MAINNET_CONFIG;
  address: Address;
  blockNumber: string;
  readAt: string;
  balances: BaseBalance[];
  tokenizedStocks: TokenizedStockPosition[];
  warnings: string[];
};

async function readCoreToken(
  client: MainnetReadClient,
  address: Address,
  token: VerifiedBaseToken,
): Promise<BaseBalance> {
  if (token.kind === 'native') {
    const raw = await client.getBalance({address});
    return {
      symbol: token.symbol,
      name: token.name,
      kind: token.kind,
      address: null,
      decimals: token.decimals,
      expectedDecimals: token.decimals,
      raw: raw.toString(),
      units: formatUnits(raw, token.decimals),
      verified: true,
      source: token.source,
    };
  }

  if (!token.address) throw new Error(`${token.symbol} has no contract address.`);
  const [raw, onchainDecimals] = await Promise.all([
    client.readContract({address: token.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [address]}),
    client.readContract({address: token.address, abi: ERC20_ABI, functionName: 'decimals'}),
  ]);
  const verified = onchainDecimals === token.decimals;
  return {
    symbol: token.symbol,
    name: token.name,
    kind: token.kind,
    address: token.address,
    decimals: onchainDecimals,
    expectedDecimals: token.decimals,
    raw: raw.toString(),
    units: formatUnits(raw, onchainDecimals),
    verified,
    source: token.source,
  };
}

function navIsStale(token: TokenizedStock): boolean {
  if (!token.navPriceUpdatedAt) return true;
  const updated = Date.parse(token.navPriceUpdatedAt);
  return !Number.isFinite(updated) || Date.now() - updated > NAV_MAX_AGE_MS;
}

async function readTokenizedPosition(
  client: MainnetReadClient,
  address: Address,
  ticker: string,
  token: TokenizedStock,
): Promise<TokenizedStockPosition> {
  const raw = await client.readContract({
    address: token.contractAddress,
    abi: B20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  const units = formatUnits(raw, token.decimals);

  let shareEquivalent: string | null = null;
  if (raw > BigInt(0)) {
    try {
      const uiRaw = await client.readContract({
        address: token.contractAddress,
        abi: B20_ABI,
        functionName: 'balanceOfUI',
        args: [address],
      });
      shareEquivalent = formatUnits(uiRaw, token.decimals);
    } catch {
      shareEquivalent = null;
    }
  } else {
    shareEquivalent = '0';
  }

  const numericUnits = Number(units);
  const valueUsd =
    token.navPrice !== null && Number.isFinite(numericUnits)
      ? numericUnits * token.navPrice
      : null;

  return {
    ticker,
    symbol: token.symbol,
    name: token.name,
    address: token.contractAddress,
    decimals: token.decimals,
    raw: raw.toString(),
    units,
    shareEquivalent,
    multiplier: token.multiplier,
    navPrice: token.navPrice,
    navPriceUpdatedAt: token.navPriceUpdatedAt,
    navStale: navIsStale(token),
    valueUsd,
    source: 'https://api.coinbase.com/v1/tokenized-stocks',
  };
}

export async function readMainnetBalances(address: Address): Promise<MainnetBalances> {
  if (!isAddress(address)) throw new Error('Invalid EVM address.');
  const client = mainnetReadClient();
  const blockNumber = await client.getBlockNumber();
  const warnings: string[] = [];

  const balances = await Promise.all(verifiedBaseTokens().map((token) => readCoreToken(client, address, token)));
  for (const balance of balances) {
    if (!balance.verified) {
      warnings.push(`${balance.symbol} decimals differ from the verified metadata.`);
    }
  }

  let tokenizedStocks: TokenizedStockPosition[] = [];
  try {
    const metadata = await listTokenizedStocks();
    const positions = await Promise.all(
      ORVYN_TICKERS.map(async (ticker) => {
        const token = tokenizedStockForTicker(metadata, ticker);
        return token ? readTokenizedPosition(client, address, ticker, token) : null;
      }),
    );
    tokenizedStocks = positions.filter((position): position is TokenizedStockPosition => position !== null);
    if (tokenizedStocks.some((position) => position.navStale)) {
      warnings.push('Some tokenized stock NAV values are delayed or missing.');
    }
  } catch {
    warnings.push('Tokenized stock metadata is temporarily unavailable.');
  }

  return {
    network: BASE_MAINNET_CONFIG,
    address,
    blockNumber: blockNumber.toString(),
    readAt: new Date().toISOString(),
    balances,
    tokenizedStocks,
    warnings,
  };
}
