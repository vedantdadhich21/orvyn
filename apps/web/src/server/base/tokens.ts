import type {Address} from 'viem';

export type VerifiedBaseToken = {
  symbol: string;
  name: string;
  kind: 'native' | 'erc20';
  address: Address | null;
  decimals: number;
  source: string;
  verifiedAt: string;
};

export const VERIFIED_BASE_TOKENS: readonly VerifiedBaseToken[] = [
  {
    symbol: 'ETH',
    name: 'Ether',
    kind: 'native',
    address: null,
    decimals: 18,
    source: 'https://docs.base.org/get-started/connect-to-base',
    verifiedAt: '2026-11-28',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    kind: 'erc20',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    source: 'https://docs.base.org/specifications/reference/base-contracts',
    verifiedAt: '2026-11-28',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    kind: 'erc20',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    source: 'https://docs.base.org/base-chain/network-information/bridges-mainnet',
    verifiedAt: '2026-11-28',
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    kind: 'erc20',
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8,
    source: 'https://www.coinbase.com/blog/coinbase-wrapped-btc-cbbtc-is-now-live',
    verifiedAt: '2026-11-28',
  },
  {
    symbol: 'AERO',
    name: 'Aerodrome',
    kind: 'erc20',
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18,
    source: 'https://docs.base.org/agents/skills/plugins/aerodrome',
    verifiedAt: '2026-11-28',
  },
] as const;

export function verifiedBaseTokens(): VerifiedBaseToken[] {
  return VERIFIED_BASE_TOKENS.map((token) => ({...token}));
}
