'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, House, Coins, Plus, type LucideIcon } from 'lucide-react';

import { Chip } from '@/components/primitives';
import { OrvynMark } from '@/components/brand/mark';
import { AuthLink } from '@/components/shell/auth-link';
import { cn } from '@/lib/utils';

/**
 * The primary destinations. Chapter 1 adds Create; the launch adds Market and
 * Portfolio. Secondary pages such as proof and the changelog live inside them
 * and in the footer.
 */
type Destination = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/launch', label: 'Market', icon: Coins },
  { href: '/launch/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/create', label: 'Create', icon: Plus },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/launch') {
    return (
      pathname === '/launch' ||
      pathname.startsWith('/launch/s/') ||
      pathname.startsWith('/launch/publish') ||
      pathname === '/launch/proof'
    );
  }
  if (href === '/launch/portfolio') return pathname === '/launch/portfolio' || pathname === '/mainnet';
  if (href === '/create') {
    return ['/create', '/allocate', '/rules', '/portfolio', '/simulate', '/publish'].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavRail({
  onNavigate,
  mainnet = false,
}: {
  onNavigate?: () => void;
  mainnet?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        {...(onNavigate ? { onClick: onNavigate } : {})}
        className="mb-5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-fill-press">
        <OrvynMark size={22} />
        <span className="text-[13px] font-semibold tracking-[0.16em]">ORVYN</span>
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
                ? 'bg-fill-active text-ink-primary shadow-[inset_2px_0_0_#2BD98B]'
                : 'text-ink-tertiary hover:bg-fill-press hover:text-ink-secondary',
            )}>
            <Icon className={cn('size-4 shrink-0', active && 'text-brand-soft')} aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}

      <div className="mt-2 border-t border-stroke-hairline pt-2">
        <AuthLink {...(onNavigate ? { onNavigate } : {})} />
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <Chip tone="neutral" className="w-full justify-center">
          {mainnet ? 'Read only · Base Mainnet' : 'Simulated · Base Sepolia'}
        </Chip>
        <p className="px-2.5 text-[10.5px] leading-relaxed text-ink-faint">
          {mainnet ? 'No transaction or signature required.' : 'No money moves in Chapter 1.'}
        </p>
      </div>
    </nav>
  );
}
