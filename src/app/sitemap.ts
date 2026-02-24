import { MetadataRoute } from 'next';

const BASE_URL = 'https://coinpayportal.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '/',
    '/login',
    '/register',
    '/pricing',
    '/wallet',
    '/dashboard',
    '/terms',
    '/privacy',
    '/security',
    '/features',
    '/api',
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '/' ? 1 : 0.8,
  }));
}
