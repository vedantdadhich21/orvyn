import {createPublicClient, fallback, http} from 'viem';
import {base} from 'viem/chains';

import {BASE_MAINNET_CONFIG} from '@/lib/base/networks';

const DEFAULT_FALLBACKS = [
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com',
  'https://developer-access-mainnet.base.org',
] as const;

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

/**
 * Read-only fetch with bounded backoff. This client never submits writes, so
 * retrying a read is safe. A timed out write must be handled separately by
 * checking its transaction status before any retry.
 */
export async function resilientReadFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (init?.signal?.aborted) throw init.signal.reason ?? new Error('Request aborted.');
    try {
      const response = await fetch(input, init);
      lastResponse = response;
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`RPC responded with ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) await sleep(180 * 2 ** attempt);
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('RPC request failed.');
}

export function mainnetRpcUrls(): string[] {
  const primary = process.env.BASE_MAINNET_RPC_URL ?? process.env.BASE_RPC_URL ?? BASE_MAINNET_CONFIG.rpcUrl;
  const configured = (process.env.BASE_MAINNET_RPC_FALLBACKS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fallbacks = configured.length > 0 ? configured : [...DEFAULT_FALLBACKS];
  return [...new Set([primary, ...fallbacks])].slice(0, 5);
}

export function mainnetReadClient() {
  const transports = mainnetRpcUrls().map((url) =>
    http(url, {
      timeout: 8_000,
      retryCount: 1,
      retryDelay: 180,
      fetchFn: resilientReadFetch,
    }),
  );

  return createPublicClient({
    chain: base,
    transport: fallback(transports, {retryCount: 1}),
  });
}

export async function mainnetRpcHealth() {
  const started = Date.now();
  try {
    const client = mainnetReadClient();
    const [chainId, blockNumber] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
    return {
      ok: chainId === BASE_MAINNET_CONFIG.chainId,
      chainId,
      blockNumber: blockNumber.toString(),
      latencyMs: Date.now() - started,
      providers: mainnetRpcUrls().length,
    };
  } catch {
    return {
      ok: false,
      chainId: BASE_MAINNET_CONFIG.chainId,
      blockNumber: null,
      latencyMs: Date.now() - started,
      providers: mainnetRpcUrls().length,
    };
  }
}
