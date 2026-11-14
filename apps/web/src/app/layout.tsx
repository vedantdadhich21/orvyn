import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

import './globals.css';

/**
 * Two roles, loaded through `next/font` so they are self-hosted and numbers do
 * not reflow on first paint: Inter for text and titles, JetBrains Mono for every
 * figure the user might compare against another figure.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const description =
  'Build a stock portfolio, write the rules it follows, and see exactly when it drifts. Simulated portfolios; strategies published onchain.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ORVYN — Portfolios, programmed',
    template: '%s · ORVYN',
  },
  description,
  applicationName: 'ORVYN',
  openGraph: {
    title: 'ORVYN — Portfolios, programmed',
    description,
    type: 'website',
    siteName: 'ORVYN',
  },
  twitter: { card: 'summary_large_image', title: 'ORVYN', description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#111214',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // `dark` is unconditional: the product has one theme, and the class is
      // here only so primitives' `dark:` branches resolve.
      className={cn('dark', inter.variable, jetbrainsMono.variable)}
      suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
