import { ImageResponse } from 'next/og';

import { strategyRegistryAddress } from '@/lib/orvyn/registry';
import { readStrategy } from '@/lib/orvyn/registry-read';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A published ORVYN strategy';

/**
 * Generated per request, not at build time: the registry address is runtime
 * configuration and the record is read from the chain.
 */
export const dynamic = 'force-dynamic';

/**
 * The card X shows for a shared strategy link. It uses the same record the page
 * uses: name, top three targets and the exact line. No holdings, no prices.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let entry = null;
  if (strategyRegistryAddress && /^\d{1,78}$/.test(id)) {
    try {
      entry = await readStrategy({ address: strategyRegistryAddress, id: BigInt(id) });
    } catch {
      entry = null;
    }
  }

  const name = entry?.name ?? 'Published strategy';
  const parsed = entry?.parsed ?? null;
  const top = parsed
    ? Object.entries(parsed.weights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];
  const line = entry?.payload ?? 'This strategy is not in the registry.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#111214',
          color: '#F5F6F7',
          padding: '58px 64px',
          fontFamily: 'sans-serif',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              border: '6px solid #2BD98B',
              marginRight: 16,
            }}
          />
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 5 }}>ORVYN</div>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 18,
              color: 'rgba(242,243,245,0.55)',
              letterSpacing: 1,
            }}>
            Published strategy
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <div
            style={{
              fontSize: name.length > 26 ? 52 : 64,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}>
            {name}
          </div>

          {top.length > 0 ? (
            <div style={{ display: 'flex', marginTop: 28 }}>
              {top.map(([ticker, weight]) => (
                <div
                  key={ticker}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '10px 20px',
                    marginRight: 12,
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 999,
                    fontSize: 22,
                  }}>
                  <span style={{ fontWeight: 700 }}>{ticker}</span>
                  <span style={{ marginLeft: 10, color: 'rgba(242,243,245,0.6)' }}>{weight}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <div
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 16,
              color: 'rgba(242,243,245,0.52)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {line}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 14,
              fontSize: 16,
              color: 'rgba(242,243,245,0.42)',
            }}>
            <span>Testnet. No real value. Not investment advice.</span>
            <span>Portfolios, programmed.</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
