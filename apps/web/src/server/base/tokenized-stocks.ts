import {isAddress, type Address} from 'viem';

import {resilientReadFetch} from './rpc';

const API_URL = 'https://api.coinbase.com/v1/tokenized-stocks';
const CACHE_MS = 5 * 60 * 1000;
const MAX_PAGES = 20;

export type TokenizedStock = {
  contractAddress: Address;
  symbol: string;
  name: string;
  decimals: number;
  multiplier: number;
  navPrice: number | null;
  navPriceUpdatedAt: string | null;
  iconUrl: string | null;
  isin: string | null;
  totalSupply: number | null;
};

type ApiToken = {
  contract_address?: unknown;
  symbol?: unknown;
  name?: unknown;
  decimals?: unknown;
  multiplier?: unknown;
  nav_price?: unknown;
  nav_price_updated_at?: unknown;
  icon_url?: unknown;
  isin?: unknown;
  total_supply?: unknown;
};

type ApiPage = {
  tokens?: unknown;
  next_page_token?: unknown;
};

let cache: {expiresAt: number; tokens: TokenizedStock[]} | null = null;

export function normalizeTokenizedStock(value: unknown): TokenizedStock | null {
  if (!value || typeof value !== 'object') return null;
  const token = value as ApiToken;
  if (
    typeof token.contract_address !== 'string' ||
    !isAddress(token.contract_address) ||
    typeof token.symbol !== 'string' ||
    typeof token.name !== 'string' ||
    typeof token.decimals !== 'number' ||
    !Number.isInteger(token.decimals) ||
    token.decimals < 0 ||
    token.decimals > 36 ||
    typeof token.multiplier !== 'number' ||
    !Number.isFinite(token.multiplier) ||
    token.multiplier <= 0
  ) {
    return null;
  }

  return {
    contractAddress: token.contract_address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    multiplier: token.multiplier,
    navPrice:
      typeof token.nav_price === 'number' && Number.isFinite(token.nav_price)
        ? token.nav_price
        : null,
    navPriceUpdatedAt:
      typeof token.nav_price_updated_at === 'string' ? token.nav_price_updated_at : null,
    iconUrl: typeof token.icon_url === 'string' ? token.icon_url : null,
    isin: typeof token.isin === 'string' ? token.isin : null,
    totalSupply:
      typeof token.total_supply === 'number' && Number.isFinite(token.total_supply)
        ? token.total_supply
        : null,
  };
}

async function fetchPage(pageToken?: string): Promise<{tokens: TokenizedStock[]; next?: string}> {
  const url = new URL(API_URL);
  url.searchParams.set('page_size', '500');
  url.searchParams.set('include_zero_supply', 'false');
  if (pageToken) url.searchParams.set('page_token', pageToken);

  const response = await resilientReadFetch(url, {
    headers: {accept: 'application/json'},
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Tokenized Stocks API returned ${response.status}.`);
  const body = (await response.json()) as ApiPage;
  const tokens = Array.isArray(body.tokens)
    ? body.tokens.map(normalizeTokenizedStock).filter((token): token is TokenizedStock => token !== null)
    : [];
  const next = typeof body.next_page_token === 'string' ? body.next_page_token : undefined;
  return {tokens, ...(next ? {next} : {})};
}

export async function listTokenizedStocks(): Promise<TokenizedStock[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.tokens.map((token) => ({...token}));

  const tokens: TokenizedStock[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(pageToken);
    tokens.push(...result.tokens);
    if (!result.next) break;
    pageToken = result.next;
  }

  cache = {expiresAt: Date.now() + CACHE_MS, tokens};
  return tokens.map((token) => ({...token}));
}

export function tokenizedStockForTicker(tokens: TokenizedStock[], ticker: string): TokenizedStock | null {
  const target = ticker.toUpperCase();
  return (
    tokens.find((token) => token.symbol.toUpperCase() === target) ??
    tokens.find((token) => token.symbol.toUpperCase() === `${target}C`) ??
    null
  );
}
