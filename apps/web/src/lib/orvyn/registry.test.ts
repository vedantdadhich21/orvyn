import { describe, expect, test } from 'bun:test';

import {
  REGISTRY_CHAIN_ID,
  explorerAddressUrl,
  explorerTxUrl,
  parseRegistryAddress,
} from './registry';

describe('the registry address', () => {
  test('a lowercase or checksummed address is accepted', () => {
    expect(parseRegistryAddress('0x4200000000000000000000000000000000000042')).toBe(
      '0x4200000000000000000000000000000000000042',
    );
    expect(parseRegistryAddress('  0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed  ')).toBe(
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    );
  });

  test('a missing, short or mistyped address is refused', () => {
    expect(parseRegistryAddress(undefined)).toBeNull();
    expect(parseRegistryAddress('')).toBeNull();
    expect(parseRegistryAddress('   ')).toBeNull();
    expect(parseRegistryAddress('0x1234')).toBeNull();
    expect(parseRegistryAddress('not an address')).toBeNull();
  });

  test('the chain is Base Sepolia in this chapter', () => {
    expect(REGISTRY_CHAIN_ID).toBe(84532);
  });
});

describe('BaseScan links', () => {
  test('an address and a transaction point at the explorer', () => {
    const address = '0x4200000000000000000000000000000000000042';
    const hash = `0x${'ab'.repeat(32)}`;
    expect(explorerAddressUrl(address)).toBe(`https://sepolia.basescan.org/address/${address}`);
    expect(explorerTxUrl(hash)).toBe(`https://sepolia.basescan.org/tx/${hash}`);
  });
});
