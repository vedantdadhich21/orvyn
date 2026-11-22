import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

/**
 * The public routes only. A strategy page is added when someone publishes one;
 * there is no point listing ids that do not exist yet.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: 'daily' | 'weekly' | 'monthly';
  }> = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/create', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/proof', priority: 0.7, changeFrequency: 'daily' },
    { path: '/how-it-works', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/changelog', priority: 0.5, changeFrequency: 'weekly' },
  ];

  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
