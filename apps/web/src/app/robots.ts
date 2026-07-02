/**
 * Next.js 14 metadata route — generates /robots.txt.
 *
 * Buyer-private paths are disallowed (account/cart/checkout/orders) so we
 * don't burn crawler budget on user-state pages. Public catalog routes
 * (products, category, shops, blog, etc.) remain crawlable.
 */
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shop.saktech.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account/',
          '/auth/',
          '/cart',
          '/checkout',
          '/orders',
          '/orders/',
          '/messages',
          '/notifications',
          '/wishlist',
          '/tracking',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
