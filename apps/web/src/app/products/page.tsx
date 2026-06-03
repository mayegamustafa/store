'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Star, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

function ProductCard({ product }: { product: any }) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className="card group">
      <div className="relative aspect-square bg-slate-100 rounded-t-xl overflow-hidden">
        <Image
          src={product.images?.[0] || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-500 mb-1 truncate">{product.seller?.storeName}</p>
        <h3 className="text-sm font-medium text-slate-800 mb-1 line-clamp-2 leading-snug">{product.name}</h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-slate-600">{product.averageRating?.toFixed(1) || '0.0'}</span>
          <span className="text-xs text-slate-400">({product.reviewCount || 0})</span>
        </div>
        <div>
          <span className="font-bold text-sky-600 text-sm">UGX {Number(product.price).toLocaleString()}</span>
          {product.compareAtPrice && (
            <span className="ml-2 text-xs text-slate-400 line-through">
              UGX {Number(product.compareAtPrice).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const order = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, categoryId, sortBy, order, page, priceMin, priceMax }],
    queryFn: () =>
      productsApi.list({
        search,
        categoryId,
        sortBy,
        order,
        page,
        limit: 24,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const categoryList: any[] = (categories as any)?.data?.data ?? (categories as any)?.data ?? [];

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceMin) params.set('priceMin', priceMin);
    else params.delete('priceMin');
    if (priceMax) params.set('priceMax', priceMax);
    else params.delete('priceMax');
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  };

  const sortOptions = [
    { value: 'createdAt-desc', label: 'Newest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'averageRating-desc', label: 'Top Rated' },
    { value: 'soldCount-desc', label: 'Best Selling' },
  ];

  return (
    <div className="container-app py-6">
      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside
          className={`w-64 flex-shrink-0 space-y-4 ${
            showFilters ? 'block' : 'hidden'
          } lg:block`}
        >
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Categories</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => updateParam('categoryId', '')}
                  className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-slate-100 ${
                    !categoryId ? 'text-sky-600 font-medium' : 'text-slate-700'
                  }`}
                >
                  All Categories
                </button>
              </li>
              {categoryList.map((cat: any) => (
                <li key={cat.id}>
                  <button
                    onClick={() => updateParam('categoryId', cat.id)}
                    className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-slate-100 ${
                      categoryId === cat.id ? 'text-sky-600 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Price Range (UGX)</h3>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min price"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Max price"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={applyPriceFilter}
                className="w-full btn-primary py-2 text-sm rounded-lg"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 text-sm text-slate-700 border rounded-lg px-3 py-1.5 hover:bg-slate-50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
              {search && (
                <p className="text-sm text-slate-600">
                  Results for: <strong>"{search}"</strong>
                </p>
              )}
              <p className="text-sm text-slate-500">{(data as any)?.data?.total ?? (data as any)?.total ?? 0} products</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort:</span>
              <select
                value={`${sortBy}-${order}`}
                onChange={(e) => {
                  const [s, o] = e.target.value.split('-');
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('sortBy', s);
                  params.set('order', o);
                  router.push(`/products?${params.toString()}`);
                }}
                className="text-sm border rounded-lg px-2 py-1.5 bg-white"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filters */}
          {(categoryId || priceMin || priceMax) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categoryId && (
                <span className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs px-2 py-1 rounded-full">
                  {categoryList.find((c: any) => c.id === categoryId)?.name}
                  <button onClick={() => updateParam('categoryId', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {(priceMin || priceMax) && (
                <span className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs px-2 py-1 rounded-full">
                  UGX {priceMin || '0'} - {priceMax || '∞'}
                  <button onClick={() => { setPriceMin(''); setPriceMax(''); applyPriceFilter(); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-slate-200 rounded-xl h-60 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {((data as any)?.data?.data ?? (data as any)?.data ?? []).map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {((data as any)?.data?.data ?? (data as any)?.data ?? []).length === 0 && (
                <div className="text-center py-16">
                  <p className="text-slate-500 text-lg">No products found.</p>
                </div>
              )}
              {/* Pagination */}
              {((data as any)?.data?.totalPages ?? (data as any)?.totalPages ?? 0) > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  {Array.from({ length: (data as any)?.data?.totalPages ?? (data as any)?.totalPages ?? 0 }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateParam('page', String(p))}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === p
                          ? 'bg-sky-500 text-white'
                          : 'bg-white border text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container-app py-8 text-center text-slate-500">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
