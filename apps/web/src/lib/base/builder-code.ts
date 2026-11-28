import {builderDataSuffix, parseBuilderCode} from './attribution';

/** Public because Builder Codes are attribution identifiers, not secrets. */
export function publicBuilderCode(): string | null {
  return parseBuilderCode(process.env.NEXT_PUBLIC_BUILDER_CODE);
}

export function publicBuilderDataSuffix() {
  const code = publicBuilderCode();
  return code ? builderDataSuffix(code) : undefined;
}
