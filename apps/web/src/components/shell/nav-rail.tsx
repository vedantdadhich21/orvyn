'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Plus, type LucideIcon } from 'lucide-react';

import { Chip } from '@/components/primitives';
import { cn } from '@/lib/utils';

/**
 * Two destinations, because Chapter 1 has two. The rest of the journey lives
 * inside a portfolio rather than in the rail.
 */
type Destination = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/create', label: 'Create', icon: Plus },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function NavRail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        {...(onNavigate ? { onClick: onNavigate } : {})}
        className="mb-5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-fill-press">
        {/* Orbit ring, not a stock arrow. */}
        <span
          aria-hidden
          className="relative grid size-7 place-items-center rounded-full border border-brand/40">
          <span className="size-1.5 rounded-full bg-brand" />
        </span>
        <span className="text-[13px] font-semibold tracking-[0.22em]">ORVYN</span>
      </Link>

      {DESTINATIONS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            {...(active ? { 'aria-current': 'page' as const } : {})}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
              active
                ? 'bg-fill-active text-ink-primary'
                : 'text-ink-tertiary hover:bg-fill-press hover:text-ink-secondary',
            )}>
            <Icon className={cn('size-4 shrink-0', active && 'text-brand-soft')} aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}

      <div className="mt-auto space-y-2 pt-4">
        <Chip tone="neutral" className="w-full justify-center">
          Simulated · Base Sepolia
        </Chip>
        <p className="px-2.5 text-[10.5px] leading-relaxed text-ink-faint">
          No money moves in Chapter 1.
        </p>
      </div>
    </nav>
  );
}
