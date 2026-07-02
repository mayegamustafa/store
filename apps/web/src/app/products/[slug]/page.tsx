/**
 * Server-rendered metadata wrapper for product detail.
 *
 * The interactive page (useState/useQuery/useParams) lives in
 * `./ProductPageView.tsx`. This file's job is purely SEO:
 *   - generateMetadata: per-product title/description/openGraph
 *   - Inline Product + BreadcrumbList JSON-LD
 *   - canonical URL
 *
 * Best-effort: if the product can't be fetched (404, network), we degrade
 * to the site default metadata and render the client (which itself renders
 * "product not found" UI). Don't throw — keeping users on the page is the
 * goal.
 */
import type { Metadata } from 'next';
import ProductPageView from './ProductPageView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shop.saktech.org';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shop.saktech.org/api/v1';

type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
  images?: string[];
  thumbnailUrl?: string | null;
  basePrice?: number | string;
  currency?: string;
  stock?: number;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  sku?: string | null;
  category?: { name?: string; slug?: string } | null;
  seller?: { storeName?: string; storeSlug?: string } | null;
};

async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(slug)}`, {
      // Re-validate every 5 minutes — product titles/prices change rarely.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Backend wraps payload variously; unwrap defensively.
    return (json?.data ?? json) as Product;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) {
    return { title: 'Product', alternates: { canonical: `/products/${params.slug}` } };
  }
  const title = product.metaTitle?.trim() || product.name;
  const desc =
    product.metaDesc?.trim() ||
    (product.description ? product.description.replace(/\s+/g, ' ').slice(0, 160) : undefined);
  const image = product.thumbnailUrl || product.images?.[0];
  return {
    title,
    description: desc,
    keywords: product.tags?.length ? product.tags : undefined,
    alternates: { canonical: `/products/${product.slug || params.slug}` },
    openGraph: {
      title,
      description: desc,
      type: 'website',
      url: `${SITE_URL}/products/${product.slug || params.slug}`,
      siteName: 'TotalStore',
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}

function jsonLd(product: Product, slug: string) {
  const url = `${SITE_URL}/products/${product.slug || slug}`;
  const price = Number(product.basePrice ?? 0);
  const inStock = (product.stock ?? 0) > 0;
  const productLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.images?.length ? product.images : (product.thumbnailUrl ? [product.thumbnailUrl] : undefined),
    sku: product.sku ?? undefined,
    brand: product.seller?.storeName
      ? { '@type': 'Brand', name: product.seller.storeName }
      : undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: product.currency || 'UGX',
      price: price > 0 ? price.toFixed(2) : undefined,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  if ((product.reviewCount ?? 0) > 0 && product.rating) {
    productLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      ...(product.category?.slug
        ? [{
            '@type': 'ListItem',
            position: 2,
            name: product.category.name,
            item: `${SITE_URL}/category/${product.category.slug}`,
          }]
        : []),
      { '@type': 'ListItem', position: product.category?.slug ? 3 : 2, name: product.name, item: url },
    ],
  };
  return { productLd, breadcrumbLd };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const product = await fetchProduct(params.slug);
  const lds = product ? jsonLd(product, params.slug) : null;
  return (
    <>
      {lds && (
        <>
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(lds.productLd) }}
          />
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(lds.breadcrumbLd) }}
          />
        </>
      )}
      <ProductPageView />
    </>
  );
}
