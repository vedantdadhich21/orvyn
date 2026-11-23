import { cn } from '@/lib/utils';

export const ALLOCATION_COLOURS = [
  '#2BD98B',
  '#1E8F63',
  '#6FE7B4',
  '#4ADE8B',
  '#8FF0C6',
  '#37B98A',
] as const;

export const CASH_COLOUR = 'rgba(242,243,245,0.22)';

/**
 * A compact allocation ring for a published strategy or a portfolio. Segments
 * are the real weights; cash uses the neutral colour, exactly like the
 * dashboard donut.
 */
export function AllocationRing({
  weights,
  size = 48,
  stroke = 6,
  className,
}: {
  weights: Record<string, number>;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('-rotate-90 shrink-0', className)}
      aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {entries.map(([ticker, weight], index) => {
        const dash = (weight / 100) * circumference;
        const gap = Math.min(2, dash * 0.2);
        const segment = (
          <circle
            key={ticker}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ticker === 'CASH' ? CASH_COLOUR : ALLOCATION_COLOURS[index % ALLOCATION_COLOURS.length]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, dash - gap)} ${circumference}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return segment;
      })}
    </svg>
  );
}
