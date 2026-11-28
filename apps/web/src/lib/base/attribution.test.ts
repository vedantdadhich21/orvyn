import {describe, expect, test} from 'bun:test';
import {Attribution} from 'ox/erc8021';

import {builderDataSuffix, parseBuilderCode, readAttribution} from './attribution';

describe('ERC-8021 Builder Codes', () => {
  test('matches the handoff vector for bc_c4zqoeov', () => {
    expect(builderDataSuffix('bc_c4zqoeov')).toBe(
      '0x62635f63347a716f656f760b0080218021802180218021802180218021',
    );
  });

  test('matches the official schema zero example', () => {
    expect(Attribution.toDataSuffix({codes: ['baseapp']})).toBe(
      '0x62617365617070070080218021802180218021802180218021',
    );
  });

  test('parses official transaction calldata', () => {
    const parsed = readAttribution(
      '0xdddddddd62617365617070070080218021802180218021802180218021',
    );
    expect(parsed).toEqual({codes: ['baseapp'], id: 0});
  });

  test('rejects malformed Builder Codes', () => {
    expect(parseBuilderCode('bc_')).toBeNull();
    expect(parseBuilderCode('bc-bad')).toBeNull();
    expect(parseBuilderCode('bc_valid_123')).toBe('bc_valid_123');
    expect(() => builderDataSuffix('not-a-code')).toThrow('Invalid Base Builder Code.');
  });
});
