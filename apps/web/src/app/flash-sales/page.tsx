'use client';

import { useQuery } from '@tanstack/react-query';
import { flashSalesApi, productsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

function Countdown({ endsAt }: { endsAt: string }) {
  const calc = () => {
    const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  });
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="flex items-center gap-1 text-sm font-bold text-white">
      <Clock className="w-4 h-4" />
      {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
    </span>
  );
}

export default function FlashSalesPage() {
  const { data: sale, isLoading: saleLoading } = useQuery({
    queryKey: ['flash-sales', 'active'],
    queryFn: () => flashSalesApi.active().then((r: any) => r.data?.data ?? r.data).catch(() => null),
    staleTime: 60_000,
  });

  // Fallback: load discounted products if no flash sale
  const { data: fallbackProducts, isLoading: fallbackLoading } = useQuery({
    queryKey: ['flash-sale-products'],
    queryFn: () => productsApi.list({ sort: 'sales', limit: 40 }).then((r: any) => r.data?.data ?? r.data?.products ?? []).catch(() => []),
    enabled: !saleLoading && !sale,
    staleTime: 5 * 60_000,
  });

  const isLoading = saleLoading || fallbackLoading;
  const products: any[] = sale?.products?.length ? sale.products : (fallbackProducts ?? []);

  return (
    <div className="container-app py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {sale?.title ?? 'Flash Sales'}
            </h1>
            <p className="text-sm text-slate-500">
              {sale ? 'Limited-time deals — grab them before they expire!' : 'Best-selling products at great prices'}
            </p>
          </div>
        </div>

        {sale?.endsAt && (
          <div className="flex items-center gap-2 bg-accent px-4 py-2 rounded-xl shrink-0">
            <span className="text-xs text-white/80">Ends in</span>
            <Countdown endsAt={sale.endsAt} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-600">No flash sales right now</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Check back soon — deals drop daily!</p>
          <Link href="/products" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p: any) => {
            const discount = p.discountPct ?? (p.originalPrice && p.price
              ? Math.round((1 - p.price / p.originalPrice) * 100)
              : null);
            return (
              <Link
                key={p.id}
                href={`/products/${p.slug ?? p.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-primary/30 transition group"
              >
                <div className="relative aspect-square bg-slate-50">
                  {p.images?.[0] || p.image ? (
                    <Image
                      src={p.images?.[0] ?? p.image}
                      alt={p.name ?? ''}
                      fill
                      className="object-contain p-3"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    </div>
                  )}
                  {discount && discount > 0 && (
                    <span className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      -{discount}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-slate-600 line-clamp-2 mb-1">{p.name}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      KSh {Number(p.price).toLocaleString()}
                    </span>
                    {p.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {Number(p.originalPrice).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {p.stock != null && p.stock < 20 && (
                    <div className="mt-1.5">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Only {p.stock} left</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full">
                        <div
                          className="h-1 bg-accent rounded-full"
                          style={{ width: `${Math.min(100, ((20 - p.stock) / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
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
