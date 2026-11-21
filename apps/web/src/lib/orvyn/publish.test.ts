import { describe, expect, test } from 'bun:test';
import { encodeAbiParameters, encodeEventTopics, type Log } from 'viem';

import { publishBlocker, publishErrorMessage, publishedIdFromLogs } from './publish';
import { STRATEGY_REGISTRY_ABI } from './strategy-registry';

const REGISTRY = '0x4200000000000000000000000000000000000042';
const AUTHOR = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
const HASH = `0x${'ab'.repeat(32)}` as const;

function strategyLog(id: bigint, address = REGISTRY): Log {
  return {
    address,
    topics: encodeEventTopics({
      abi: STRATEGY_REGISTRY_ABI,
      eventName: 'StrategyPublished',
      args: { id, author: AUTHOR },
    }) as Log['topics'],
    data: encodeAbiParameters(
      [{ type: 'string' }, { type: 'string' }],
      ['Future of AI', 'orvyn/1|name=Future of AI'],
    ),
    blockHash: HASH,
    blockNumber: 1n,
    logIndex: 0,
    transactionHash: HASH,
    transactionIndex: 0,
    removed: false,
  };
}

describe('may this draft be published', () => {
  const ready = { configured: true, complete: true, hasWallet: true, chainId: 84532 };

  test('a configured registry, a complete draft, a wallet on Base Sepolia', () => {
    expect(publishBlocker(ready)).toBe('ready');
  });

  test('the first fixable reason wins', () => {
    expect(publishBlocker({ ...ready, configured: false, complete: false })).toBe('not-configured');
    expect(publishBlocker({ ...ready, complete: false, hasWallet: false })).toBe('incomplete');
    expect(publishBlocker({ ...ready, hasWallet: false, chainId: null })).toBe('no-wallet');
    expect(publishBlocker({ ...ready, chainId: 1 })).toBe('wrong-chain');
  });
});

describe('reading the published id from the receipt', () => {
  test('a strategy event from our registry gives its id', () => {
    expect(publishedIdFromLogs([strategyLog(7n)], REGISTRY)).toBe(7n);
  });

  test('an event from another contract is ignored', () => {
    const other = '0x0000000000000000000000000000000000000001';
    expect(publishedIdFromLogs([strategyLog(7n, other)], REGISTRY)).toBeNull();
  });

  test('no matching event answers null instead of throwing', () => {
    expect(publishedIdFromLogs([], REGISTRY)).toBeNull();
    expect(
      publishedIdFromLogs([{ ...strategyLog(1n), topics: [] as unknown as Log['topics'] }], REGISTRY),
    ).toBeNull();
  });
});

describe('turning a wallet failure into a sentence', () => {
  test('a cancelled signature says nothing was published', () => {
    expect(
      publishErrorMessage({
        name: 'TransactionExecutionError',
        cause: { name: 'UserRejectedRequestError', shortMessage: 'User rejected the request.' },
      }),
    ).toBe('The wallet cancelled the transaction. Nothing was published.');
  });

  test('a revert names the limit that was hit', () => {
    expect(publishErrorMessage({ data: { errorName: 'NameTooLong' } })).toContain('longer');
    expect(publishErrorMessage({ message: 'reverted with custom error EmptyName' })).toContain(
      'empty strategy name',
    );
  });

  test('an empty wallet is told how to fix it', () => {
    expect(
      publishErrorMessage({
        shortMessage: 'Insufficient funds for gas * price + value',
      }),
    ).toContain('Base Sepolia ETH');
  });

  test('a wallet on the wrong chain is told to switch', () => {
    expect(
      publishErrorMessage({ shortMessage: 'Chain 1 does not match the target chain.' }),
    ).toContain('Base Sepolia');
  });

  test('an unknown failure is still readable and bounded', () => {
    const message = publishErrorMessage(new Error('socket closed\nsecond line'));
    expect(message).toBe('socket closed');
    expect(publishErrorMessage(null)).toBe(
      'The transaction could not be published. Nothing was written.',
    );
  });
});
