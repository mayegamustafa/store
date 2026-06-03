'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Store, Star, Search } from 'lucide-react';

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'General', value: 'GENERAL' },
  { label: 'Supermarket', value: 'SUPERMARKET' },
  { label: 'Food & Restaurant', value: 'FOOD_RESTAURANT' },
  { label: 'Bakery', value: 'BAKERY' },
  { label: 'Pharmacy', value: 'PHARMACY' },
  { label: 'Electronics', value: 'ELECTRONICS' },
  { label: 'Fashion', value: 'FASHION' },
  { label: 'Beauty', value: 'BEAUTY' },
  { label: 'Hardware', value: 'HARDWARE' },
];

export default function ShopsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['shops', category, debouncedSearch],
    queryFn: () =>
      shopsApi
        .list({ page: 1, limit: 40, storeCategory: category || undefined, search: debouncedSearch || undefined } as any)
        .then((r: any) => {
          const payload = r.data ?? r;
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload?.shops)) return payload.shops;
          return [];
        })
        .catch(() => []),
    staleTime: 5 * 60_000,
  });

  const shops: any[] = Array.isArray(data) ? data : [];

  return (
    <div className="container-app py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Store className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Shops</h1>
          <p className="text-sm text-slate-500">Browse official stores and merchants</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search shops..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              category === cat.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-24">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-600">No shops found</h2>
          <p className="text-sm text-slate-500 mt-1">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shops.map((shop: any) => {
            const name = shop.storeName ?? shop.name ?? 'Shop';
            const logo = shop.storeLogo ?? shop.logo;
            const banner = shop.storeBanner ?? shop.banner;
            const slug = shop.storeSlug ?? shop.slug ?? shop.id;
            const description = shop.storeDescription ?? shop.description;
            return (
              <Link
                key={shop.id}
                href={`/shops/${slug}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-primary/30 transition group"
              >
                <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 relative">
                  {banner && (
                    <Image src={banner} alt="" fill className="object-cover" />
                  )}
                  <div className="absolute -bottom-6 left-4">
                    <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md bg-white overflow-hidden">
                      {logo ? (
                        <Image src={logo} alt={name} width={48} height={48} className="object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-sm">
                          {name[0]?.toUpperCase() ?? 'S'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-8 pb-4 px-4">
                  <h3 className="font-semibold text-slate-900 text-sm group-hover:text-primary transition line-clamp-1">
                    {name}
                  </h3>
                  {shop.rating != null && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-slate-600">{Number(shop.rating).toFixed(1)}</span>
                      {shop.totalReviews && (
                        <span className="text-xs text-slate-400">({shop.totalReviews})</span>
                      )}
                    </div>
                  )}
                  {description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
