'use client';

import { useQuery } from '@tanstack/react-query';
import { shopsApi, productsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Package, ShoppingBag, BadgeCheck, ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: shop, isLoading: shopLoading, error: shopError } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => shopsApi.bySlug(slug).then((r: any) => r.data),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', shop?.id],
    queryFn: () => productsApi.list({ sellerId: shop.id, limit: 40 }).then((r: any) => r.data),
    enabled: !!shop?.id,
    staleTime: 5 * 60_000,
  });

  const products: any[] = Array.isArray(productsData?.data) ? productsData.data : [];

  if (shopLoading) {
    return (
      <div className="container-app py-16 flex justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-3xl">
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-6 w-48 bg-slate-100 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="container-app py-16 text-center">
        <p className="text-slate-500 text-lg mb-4">Shop not found.</p>
        <Link href="/shops" className="text-primary hover:underline text-sm flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Browse all shops
        </Link>
      </div>
    );
  }

  return (
    <main className="container-app py-8">
      {/* Back */}
      <Link href="/shops" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> All Shops
      </Link>

      {/* Shop Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8">
        {shop.storeLogo ? (
          <Image
            src={shop.storeLogo}
            alt={shop.storeName}
            width={80} height={80}
            className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-9 h-9 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{shop.storeName}</h1>
            {shop.isOfficial && (
              <span className="flex items-center gap-0.5 text-xs text-sky-600 font-medium">
                <BadgeCheck className="w-4 h-4" /> Official
              </span>
            )}
          </div>
          {shop.storeDescription && (
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">{shop.storeDescription}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
            {shop.rating != null && (
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-4 h-4 fill-amber-400" /> {Number(shop.rating).toFixed(1)}
                {shop.reviewCount > 0 && <span className="text-slate-400 font-normal">({shop.reviewCount})</span>}
              </span>
            )}
            {shop.totalOrders > 0 && (
              <span className="flex items-center gap-1 text-slate-500">
                <Package className="w-4 h-4" /> {shop.totalOrders.toLocaleString()} orders
              </span>
            )}
            {shop.storeCategory && (
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {shop.storeCategory.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">
          Products {products.length > 0 && <span className="text-slate-400 font-normal text-base">({products.length})</span>}
        </h2>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-slate-400">No products listed yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
