import {Attribution} from 'ox/erc8021';
import type {Hex} from 'viem';

const BUILDER_CODE = /^bc_[A-Za-z0-9_]+$/;

export function parseBuilderCode(value: string | undefined | null): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim();
  return BUILDER_CODE.test(code) ? code : null;
}

export function builderDataSuffix(code: string): Hex {
  const valid = parseBuilderCode(code);
  if (!valid) throw new Error('Invalid Base Builder Code.');
  return Attribution.toDataSuffix({codes: [valid]}) as Hex;
}

export function readAttribution(data: Hex) {
  return Attribution.fromData(data);
}
