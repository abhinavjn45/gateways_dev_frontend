import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/', 
        '/admin/', 
        '/api/', 
        '/portal/', 
        '/_next/',
      ],
    },
    sitemap: 'https://gateways.christuniversity.in/sitemap.xml',
  };
}
