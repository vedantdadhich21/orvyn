import {describe, expect, test} from 'bun:test';
import {isAddress} from 'viem';

import {VERIFIED_BASE_TOKENS} from './tokens';

describe('verified Base token metadata', () => {
  test('contains only verified addresses and integer decimals', () => {
    for (const token of VERIFIED_BASE_TOKENS) {
      expect(Number.isInteger(token.decimals)).toBe(true);
      expect(token.decimals).toBeGreaterThanOrEqual(0);
      expect(token.source.startsWith('https://')).toBe(true);
      if (token.kind === 'erc20') expect(isAddress(token.address ?? '')).toBe(true);
    }
  });

  test('uses native USDC on Base', () => {
    const usdc = VERIFIED_BASE_TOKENS.find((token) => token.symbol === 'USDC');
    expect(usdc?.address).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(usdc?.decimals).toBe(6);
  });
});
