import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://gateways.christuniversity.in';
  
  // Public routes, explicitly avoiding dashboard/auth pages
  const routes = [
    '',
    '/about',
    '/contact',
    '/events',
    '/faq',
    '/gallery',
    '/guidelines',
    '/leaderboard',
    '/privacy',
    '/schedule',
    '/sponsors',
    '/terms',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }));
}
