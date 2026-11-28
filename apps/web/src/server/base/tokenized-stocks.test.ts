import {describe, expect, test} from 'bun:test';

import {normalizeTokenizedStock, tokenizedStockForTicker} from './tokenized-stocks';

const sample = {
  contract_address: '0xb20000000000000000000006f910a0e7BBD3c168',
  symbol: 'AMDc',
  name: 'Advanced Micro Devices, Inc.',
  decimals: 8,
  multiplier: 1,
  nav_price: 210.5,
  nav_price_updated_at: '2026-11-28T12:00:00Z',
};

describe('tokenized stock metadata', () => {
  test('normalizes official API fields', () => {
    expect(normalizeTokenizedStock(sample)).toMatchObject({
      contractAddress: sample.contract_address,
      symbol: 'AMDc',
      decimals: 8,
      multiplier: 1,
      navPrice: 210.5,
    });
  });

  test('allows missing NAV data but never invents it', () => {
    const token = normalizeTokenizedStock({...sample, nav_price: undefined, nav_price_updated_at: undefined});
    expect(token?.navPrice).toBeNull();
    expect(token?.navPriceUpdatedAt).toBeNull();
  });

  test('rejects invalid addresses and decimals', () => {
    expect(normalizeTokenizedStock({...sample, contract_address: '0x123'})).toBeNull();
    expect(normalizeTokenizedStock({...sample, decimals: 1.5})).toBeNull();
  });

  test('maps an ORVYN ticker to the Coinbase symbol', () => {
    const token = normalizeTokenizedStock(sample);
    expect(token).not.toBeNull();
    expect(tokenizedStockForTicker([token!], 'AMD')).toBe(token);
  });
});
