'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

import { DitherField } from '@/components/dither-field';
import { Display } from '@/components/primitives';
import { Button } from '@/components/ui/button';
import { isPrivyConfigured } from '@/lib/privy';
import { useSession } from '@/lib/session';

export function SignInScreen() {
  const router = useRouter();
  const { enterSandbox } = useSession();

  const enter = () => {
    enterSandbox();
    router.push('/');
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <DitherField ramp="signIn" cell={3} speed={0.035} intensity={0.78} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(17,18,20,0.55)_44%,var(--color-bg)_78%)]" />
      </div>

      <section className="specular relative w-full max-w-[430px] overflow-hidden rounded-2xl border border-stroke-raised bg-surface/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="relative grid size-10 place-items-center rounded-full border border-brand/40">
          <span className="size-2 rounded-full bg-brand" />
        </div>
        <Display as="h1" className="mt-7 text-3xl">
          Portfolios, programmed.
        </Display>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
          Build a stock portfolio, write the rules it follows, and see exactly when it drifts.
          Simulated end to end.
        </p>

        <div className="mt-8 space-y-3">
          {isPrivyConfigured ? <PrivySignIn /> : null}
          <Button size="lg" variant={isPrivyConfigured ? 'outline' : 'default'} className="w-full" onClick={enter}>
            Open ORVYN
          </Button>
        </div>

        <p className="mt-5 text-center text-[10.5px] leading-relaxed text-ink-faint">
          Simulated portfolios. Testnet only. No funds move.
        </p>
      </section>
    </main>
  );
}

function PrivySignIn() {
  const router = useRouter();
  const { enterAuthenticated } = useSession();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (!authenticated) return;
    enterAuthenticated();
    router.replace('/');
  }, [authenticated, enterAuthenticated, router]);

  return (
    <Button size="lg" className="w-full" disabled={!ready} onClick={login}>
      {ready ? 'Sign in with Privy' : 'Preparing sign-in…'}
    </Button>
  );
}
