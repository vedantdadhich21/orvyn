/**
 * One canonical origin for metadata, share images, the sitemap and robots.
 *
 * Vercel exposes the stable production domain at build time. NEXT_PUBLIC_APP_URL
 * wins when it is set, so a custom domain can replace the Vercel one without a
 * code change.
 */
export function siteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return new URL('http://localhost:3000');
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
