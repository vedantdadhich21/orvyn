import Link from 'next/link';

/**
 * The trust strip. Every product screen ends with the same four links and the
 * same disclaimer, so a screenshot of any screen carries them.
 *
 * Until the test-token MVP lands, the honest label is simulated value, not
 * test tokens. The wording changes in one place when that ships.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-stroke-hairline pt-5">
      <nav aria-label="Trust and background" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href="/launch"
          className="text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Market
        </Link>
        <Link
          href="/launch/portfolio"
          className="text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Portfolio
        </Link>
        <Link
          href="/proof"
          className="text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Proof
        </Link>
        <Link
          href="/how-it-works"
          className="text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          How it works
        </Link>
        <Link
          href="/changelog"
          className="text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Changelog
        </Link>
        <a
          href="https://github.com/vedantdadhich21/orvyn"
          target="_blank"
          rel="noreferrer"
          className="text-[10.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          Source
        </a>
      </nav>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
        Simulated. No real value. Not investment advice.
      </p>
    </footer>
  );
}
