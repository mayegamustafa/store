'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState, Suspense } from 'react';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [sort, setSort] = useState('relevance');

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, sort],
    queryFn: () => productsApi.list({ search: q, sort, limit: 40 }).then((r: any) => r.data ?? []),
    enabled: q.length > 0,
  });

  const products: any[] = Array.isArray(data?.products ?? data)
    ? (data?.products ?? data)
    : [];

  return (
    <div className="container-app py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {q ? `Results for "${q}"` : 'Search Products'}
          </h1>
          {products.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">{products.length} products found</p>
          )}
        </div>
        {q && (
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="relevance">Most Relevant</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="sales">Best Selling</option>
            </select>
          </div>
        )}
      </div>

      {/* No query */}
      {!q && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Search className="w-16 h-16 mb-4 text-slate-200" />
          <p className="text-lg font-semibold text-slate-500">What are you looking for?</p>
          <p className="text-sm mt-1">Type in the search box above to find products</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && q && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Search className="w-16 h-16 mb-4 text-slate-200" />
          <p className="text-lg font-semibold text-slate-600">No results for "{q}"</p>
          <p className="text-sm mt-2">Try different keywords or check spelling</p>
          <Link href="/products" className="mt-6 btn-primary px-6 py-2.5 text-sm rounded-lg">
            Browse All Products
          </Link>
        </div>
      )}

      {/* Results grid */}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p: any) => (
            <Link key={p.id} href={`/products/${p.slug}`}
              className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition group">
              <div className="aspect-square relative bg-slate-50 overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>
                )}
                {p.discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    -{p.discount}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-500 truncate">{p.shop?.storeName || p.category?.name}</p>
                <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 mt-0.5">{p.name}</p>
                <p className="text-primary font-bold text-sm mt-1">UGX {Number(p.basePrice).toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-app py-8"><div className="h-8 w-64 bg-slate-100 animate-pulse rounded-lg" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
