'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { NavRail } from '@/components/shell/nav-rail';
import { AuthLink } from '@/components/shell/auth-link';
import { SiteFooter } from '@/components/shell/site-footer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/**
 * The application shell: a persistent rail on the left, a readable content
 * column, and an optional context rail that only appears when there is room
 * for it.
 *
 * On narrow screens the rail becomes a sheet. Focus trapping and restoration
 * come from Radix rather than being hand-rolled.
 */
export function AppShell({
  children,
  context,
}: {
  children: React.ReactNode;
  context?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const mainnet = pathname === '/mainnet';

  /**
   * The sheet belongs to the narrow layout. If a menu was open while the
   * window grew past `lg`, the trigger disappears with the header but the
   * modal would stay put, covering a page that no longer needs it. Close it
   * as soon as the permanent rail takes over.
   */
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 960px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener('change', closeOnDesktop);
    window.addEventListener('resize', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('resize', closeOnDesktop);
    };
  }, []);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[228px] shrink-0 border-r border-stroke-hairline bg-surface-sunken min-[960px]:block">
        <NavRail mainnet={mainnet} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Narrow-screen header. Hidden once the rail is permanent. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stroke-hairline bg-bg/85 px-4 py-3 backdrop-blur-xl min-[960px]:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="isolate border-stroke-raised p-0 shadow-[18px_0_48px_rgba(0,0,0,0.7)]"
              style={{ backgroundColor: '#0C0E12', width: 228, maxWidth: 228 }}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <NavRail onNavigate={() => setOpen(false)} mainnet={mainnet} />
            </SheetContent>
          </Sheet>
          <span className="text-[13px] font-semibold tracking-[0.18em]">ORVYN</span>
          <div className="ml-auto flex items-center gap-2">
            <AuthLink variant="header" />
            <span className="rounded-pill border border-stroke-raised bg-fill-muted px-2 py-0.5 text-[10.5px] font-semibold text-ink-tertiary">
              {mainnet ? 'Read only' : 'Simulated'}
            </span>
          </div>
        </header>

        <div className="flex min-w-0 flex-1">
          <main className="relative isolate min-w-0 flex-1">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-40 right-[-8%] h-[520px] w-[520px] rounded-full bg-brand/[0.055] blur-[120px]" />
              <div className="absolute top-[38%] left-[-12%] h-[420px] w-[420px] rounded-full bg-brand-deep/[0.05] blur-[120px]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:34px_34px] opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_18%,transparent_76%)]" />
            </div>
            <div className="mx-auto w-full max-w-[860px] px-5 py-8 sm:px-8 min-[960px]:py-12">
              {children}
              <SiteFooter mainnet={mainnet} />
            </div>
          </main>

          {context ? (
            <aside className="sticky top-0 hidden h-dvh w-[300px] shrink-0 overflow-y-auto border-l border-stroke-hairline px-5 py-12 2xl:block">
              {context}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
