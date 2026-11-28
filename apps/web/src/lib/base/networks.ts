import {base, baseSepolia} from 'viem/chains';

export const BASE_MAINNET_CHAIN = base;
export const BASE_SEPOLIA_CHAIN = baseSepolia;

export const BASE_MAINNET_CONFIG = {
  chainId: base.id,
  name: 'Base Mainnet',
  rpcUrl: base.rpcUrls.default.http[0],
  explorerUrl: base.blockExplorers.default.url,
} as const;

export const BASE_SEPOLIA_CONFIG = {
  chainId: baseSepolia.id,
  name: baseSepolia.name,
  rpcUrl: baseSepolia.rpcUrls.default.http[0],
  explorerUrl: baseSepolia.blockExplorers.default.url,
} as const;
