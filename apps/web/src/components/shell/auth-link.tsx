'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';

/**
 * One auth entry point for the shell. Signed out, it goes to the sign in
 * screen. Signed in, it goes to the wallet and reads `Account`.
 *
 * The label is deliberately neutral when Privy is not configured: the sign in
 * screen still opens the sandbox, so the link is never a dead end.
 */
export function AuthLink({
  variant = 'nav',
  onNavigate,
  className,
}: {
  variant?: 'nav' | 'header' | 'inline';
  onNavigate?: () => void;
  className?: string;
}) {
  const { mode } = useSession();
  const signedIn = mode === 'authenticated';

  const styles =
    variant === 'nav'
      ? 'rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-ink-tertiary hover:bg-fill-press hover:text-ink-secondary'
      : variant === 'header'
        ? 'rounded-pill border border-stroke-raised bg-fill-muted px-2.5 py-1 text-[10.5px] font-semibold text-ink-secondary hover:border-brand/40 hover:text-ink-primary'
        : 'text-[11.5px] font-medium text-ink-tertiary hover:text-ink-secondary';

  return (
    <Link
      href={signedIn ? '/wallet' : '/sign-in'}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={cn(
        'inline-flex items-center gap-2 transition-colors',
        styles,
        className,
      )}>
      {variant === 'nav' ? <UserRound className="size-4 shrink-0" aria-hidden /> : null}
      {signedIn ? 'Account' : 'Sign in'}
    </Link>
  );
}
