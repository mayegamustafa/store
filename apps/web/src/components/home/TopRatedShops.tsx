'use client';
import { useQuery } from '@tanstack/react-query';
import { sellersApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ShieldCheck } from 'lucide-react';

export function TopRatedShops() {
  const { data, isLoading } = useQuery({
    queryKey: ['top-shops'],
    queryFn: () => sellersApi?.topRated?.().then((r: any) => r.data ?? []).catch(() => []) ?? Promise.resolve([]),
  });

  if (isLoading)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 space-y-3 border border-slate-100 shadow-card">
            <div className="w-14 h-14 skeleton rounded-full mx-auto" />
            <div className="h-3 skeleton w-3/4 mx-auto" />
            <div className="h-3 skeleton w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    );

  const shops: any[] = Array.isArray(data) ? data.slice(0, 6) : [];
  if (!shops.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {shops.map((s: any) => (
        <Link key={s.id} href={`/shops/${s.storeSlug}`}
          className="card card-hover flex flex-col items-center text-center p-4 group">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-100 mb-3 border-2 border-white shadow-card group-hover:shadow-card-md transition">
            {s.storeLogo ? (
              <Image src={s.storeLogo} alt={s.storeName} fill sizes="56px" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-xl font-black text-primary">{(s.storeName || 'S')[0]}</span>
              </div>
            )}
            {s.isOfficial && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <ShieldCheck className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-primary transition-colors">{s.storeName}</p>
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-slate-500 font-semibold">{Number(s.rating ?? 0).toFixed(1)}</span>
          </div>
          <p className="text-[10px] text-slate-400">{s.productCount ?? 0} products</p>
        </Link>
      ))}
    </div>
  );
}
