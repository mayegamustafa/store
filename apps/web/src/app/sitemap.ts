/**
 * Next.js 14 metadata route — generates /sitemap.xml.
 *
 * Sources:
 *   - Static top-level pages (home, about, contact, etc.)
 *   - Approved products via backend list endpoint (paginated server-side; we
 *     pull up to 5000 to keep the response under Next's sitemap entry limit).
 *   - Active categories via backend list endpoint.
 *
 * The fetches are cached (revalidate=600s) so this isn't hit on every search-
 * bot request — backend stays cheap.
 */
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://totalstoreug.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://totalstoreug.com/api/v1';

const STATIC_PATHS: { path: string; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/products', changeFrequency: 'daily', priority: 0.9 },
  { path: '/flash-sales', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/shops', changeFrequency: 'daily', priority: 0.7 },
  { path: '/brands', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/careers', changeFrequency: 'weekly', priority: 0.3 },
];

async function fetchProducts(): Promise<Array<{ slug: string; updatedAt?: string }>> {
  try {
    const res = await fetch(`${API_URL}/products?status=APPROVED&limit=5000`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = (json?.data?.items ?? json?.items ?? json?.data ?? json) as any[];
    if (!Array.isArray(items)) return [];
    return items
      .map((p) => ({ slug: p?.slug as string, updatedAt: p?.updatedAt as string | undefined }))
      .filter((p) => !!p.slug);
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<Array<{ slug: string; updatedAt?: string }>> {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const items = (json?.data ?? json) as any[];
    if (!Array.isArray(items)) return [];
    return items
      .map((c) => ({ slug: c?.slug as string, updatedAt: c?.updatedAt as string | undefined }))
      .filter((c) => !!c.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: p.updatedAt ?? now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: c.updatedAt ?? now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
