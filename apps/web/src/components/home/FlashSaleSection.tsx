'use client';
import { useQuery } from '@tanstack/react-query';
import { flashSalesApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useCurrencyStore } from '@/stores/currency.store';

function CountBlock({ v, label }: { v: string; label: string }) {
  return (
    <div className="countdown-block">
      <span className="text-base font-black">{v}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 opacity-70">{label}</span>
    </div>
  );
}

function SaleTimer({ endsAt }: { endsAt?: string }) {
  const [parts, setParts] = useState({ h: '00', m: '00', s: '00' });
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return;
      setParts({
        h: Math.floor(diff / 3_600_000).toString().padStart(2, '0'),
        m: Math.floor((diff % 3_600_000) / 60_000).toString().padStart(2, '0'),
        s: Math.floor((diff % 60_000) / 1_000).toString().padStart(2, '0'),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return (
    <div className="flex items-center gap-1.5">
      <CountBlock v={parts.h} label="hrs" />
      <span className="text-white font-black text-sm mb-1">:</span>
      <CountBlock v={parts.m} label="min" />
      <span className="text-white font-black text-sm mb-1">:</span>
      <CountBlock v={parts.s} label="sec" />
    </div>
  );
}

export function FlashSaleSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['flash-sales'],
    queryFn: () => flashSalesApi.active().then((r: any) => r.data),
  });
  const { format } = useCurrencyStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'l' | 'r') =>
    scrollRef.current?.scrollBy({ left: dir === 'r' ? 300 : -300, behavior: 'smooth' });

  if (isLoading)
    return <div className="h-64 skeleton rounded-2xl" />;
  if (!data?.length) return null;

  const sale = data[0];
  const items: any[] = sale.items ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5
        bg-gradient-to-r from-red-600 via-rose-500 to-red-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-white fill-white" strokeWidth={0} />
            <span className="font-heading font-black text-white text-lg tracking-tight">
              {(sale.title || 'Flash Sale').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2190-\u2BFF\uFE0F]/g, '').trim()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70 font-medium">Ends in</span>
            <SaleTimer endsAt={sale.endsAt} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll('l')}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => scroll('r')}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <Link href="/flash-sales" className="ml-1 text-xs font-bold text-white/90 hover:text-white underline underline-offset-2 transition">
            View All
          </Link>
        </div>
      </div>

      {/* Products */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-5 py-4">
        {items.map((item: any) => {
          const p = item.product;
          const base = Number(p?.basePrice ?? 0);
          const salePrice = Number(item.salePrice ?? base);
          const discount = base > 0 ? Math.round(((base - salePrice) / base) * 100) : 0;
          const sold = item.stockSold ?? item.soldCount ?? 0;
          const total = item.stockLimit ?? item.quantity ?? 100;
          const progress = Math.min(100, Math.round((sold / Math.max(total, 1)) * 100));
          return (
            <Link key={item.id} href={`/products/${p?.slug}`}
              className="shrink-0 w-40 group">
              <div className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden mb-2">
                {p?.images?.[0] ? (
                  <Image src={p.images[0]} alt={p.name} fill
                    sizes="160px"
                    className="object-contain p-2 group-hover:scale-108 transition duration-300" />
                ) : <div className="w-full h-full bg-slate-100" />}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 badge-sale">-{discount}%</span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug mb-1.5 h-8">{p?.name}</p>
              <p className="text-sm font-black text-red-600">{format(salePrice)}</p>
              {base > salePrice && (
                <p className="text-[10px] text-slate-400 line-through">{format(base)}</p>
              )}
              <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{sold} sold</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
