'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, productsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Home, ChevronRight, PackageOpen, Cpu, Shirt, ShoppingCart, Heart, Dumbbell, Car, BookOpen, ShoppingBag } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  electronics: Cpu, fashion: Shirt, 'home-living': Home, 'food-grocery': ShoppingCart,
  'health-beauty': Heart, 'baby-kids': Star, sports: Dumbbell, automotive: Car, books: BookOpen,
};

const BANNER_MAP: Record<string, string> = {
  electronics:    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&auto=format&fit=crop&q=80',
  fashion:        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&auto=format&fit=crop&q=80',
  'home-living':  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&auto=format&fit=crop&q=80',
  'food-grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&auto=format&fit=crop&q=80',
  'health-beauty':'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&auto=format&fit=crop&q=80',
  'baby-kids':    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&auto=format&fit=crop&q=80',
  sports:         'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1400&auto=format&fit=crop&q=80',
  automotive:     'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1400&auto=format&fit=crop&q=80',
  books:          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1400&auto=format&fit=crop&q=80',
  gaming:         'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1400&auto=format&fit=crop&q=80',
  garden:         'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1400&auto=format&fit=crop&q=80',
  computing:      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1400&auto=format&fit=crop&q=80',
  phones:         'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1400&auto=format&fit=crop&q=80',
};
const BANNER_DEFAULT = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&auto=format&fit=crop&q=80';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Top Rated', value: 'rating' },
  { label: 'Best Sellers', value: 'bestseller' },
];

function ProductCard({ product }: { product: any }) {
  const discount = product.comparePrice && product.basePrice
    ? Math.round(((Number(product.comparePrice) - Number(product.basePrice)) / Number(product.comparePrice)) * 100)
    : 0;
  const price = product.basePrice ?? product.price;

  return (
    <Link href={`/products/${product.slug}`} className="group bg-white rounded-xl border border-slate-100 hover:shadow-md hover:border-sky-200 transition-all overflow-hidden">
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        <Image
          src={product.thumbnailUrl || product.images?.[0] || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-400 mb-1 truncate">{product.seller?.storeName}</p>
        <h3 className="text-sm font-medium text-slate-800 mb-1 line-clamp-2 leading-snug">{product.name}</h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-slate-600">{product.rating?.toFixed(1) || '0.0'}</span>
          <span className="text-xs text-slate-400">({product.reviewCount || 0})</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="font-bold text-sky-600 text-sm">UGX {Number(price).toLocaleString()}</span>
          {product.comparePrice && (
            <span className="text-xs text-slate-400 line-through">UGX {Number(product.comparePrice).toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');

  // Fetch category info
  const { data: catData } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesApi.get(slug).then((r) => r.data),
    enabled: !!slug,
  });

  // Fetch all categories for sidebar
  const { data: allCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  // Fetch products for this category
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-category', slug, page, sortBy],
    queryFn: () => productsApi.list({ categoryId: catData?.id, page, limit: 24, sortBy }).then((r) => r.data),
    enabled: !!catData?.id,
  });

  const products = productsData?.data || [];
  const meta = productsData?.meta || {};
  const category = catData;

  if (!category && !isLoading) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Category Not Found</h1>
        <Link href="/" className="text-sky-600 hover:underline">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Hero banner */}
      {(() => {
        const bannerImg = category?.bannerImage || category?.image || BANNER_MAP[slug as string] || BANNER_DEFAULT;
        const I = ICON_MAP[slug as string] || ShoppingBag;
        return (
          <div className="relative h-52 md:h-64 overflow-hidden">
            {/* Background image */}
            <img
              src={bannerImg}
              alt={category?.name || String(slug)}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            {/* Content */}
            <div className="relative z-10 flex flex-col justify-end h-full container-app pb-8">
              <nav className="flex items-center gap-1.5 text-sm text-white/70 mb-3">
                <Link href="/" className="hover:text-white flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" /> Home
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/categories" className="hover:text-white">Categories</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-white font-medium">{category?.name || slug}</span>
              </nav>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                  <I className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow">{category?.name || slug}</h1>
                  {category?.description && (
                    <p className="text-white/80 mt-1 text-sm max-w-lg">{category.description}</p>
                  )}
                  <p className="text-white/60 text-sm mt-1">{meta.total || 0} products available</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="container-app py-6">
        <div className="flex gap-6">
          {/* Sidebar — Other categories */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <h3 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b bg-slate-50">All Categories</h3>
              <ul>
                {(allCats || []).map((cat: any) => (
                  <li key={cat.id}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                        cat.slug === slug
                          ? 'bg-sky-50 text-sky-700 font-semibold border-r-2 border-sky-500'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {(() => { const I = ICON_MAP[cat.slug] || ShoppingBag; return <I className="w-4 h-4 shrink-0" />; })()}
                      <span className="truncate">{cat.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-slate-100 px-4 py-2.5">
              <p className="text-sm text-slate-500">
                {isLoading ? 'Loading…' : `${meta.total || 0} products`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:block">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Subcategories */}
            {category?.children?.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {category.children.map((sub: any) => (
                  <Link key={sub.id} href={`/category/${sub.slug}`}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700 transition-colors">
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Product grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-slate-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded" />
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                  {(() => { const I = ICON_MAP[slug as string] || PackageOpen; return <I className="w-8 h-8 text-sky-400" />; })()}
                </div>
                <p className="text-slate-500 font-medium mb-2">No products yet in {category?.name}</p>
                <p className="text-sm text-slate-400">Check back soon or explore other categories</p>
                <Link href="/" className="mt-4 inline-block text-sky-600 text-sm hover:underline">Browse all categories →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition-colors">← Prev</button>
                <span className="px-4 py-2 text-sm text-slate-600">{page} / {meta.totalPages}</span>
                <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition-colors">Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
