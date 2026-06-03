'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrencyStore } from '@/stores/currency.store';

interface Props {
  category: string;   // slug
  label: string;      // display name
  discount?: string;  // e.g. "Up to 60% off"
  accent?: string;    // full tailwind bg class, e.g. "bg-sky-600"
  sort?: string;
}

function ProductCard({ p }: { p: any }) {
  const { format } = useCurrencyStore();
  const base = Number(p.basePrice ?? p.price ?? 0);
  const compare = Number(p.comparePrice ?? 0);
  const pct = compare > base ? Math.round(((compare - base) / compare) * 100) : 0;
  const rating = Number(p.rating ?? 0);
  return (
    <Link href={`/products/${p.slug}`} className="flex-shrink-0 w-40 group">
      {/* Image container */}
      <div className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden mb-2.5">
        {p.images?.[0] ? (
          <Image
            src={p.images[0]}
            alt={p.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="text-slate-300 text-3xl font-light">—</span>
          </div>
        )}
        {/* Discount badge - noon yellow style */}
        {pct > 0 && (
          <span className="absolute top-2 left-2 bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded">
            -{pct}%
          </span>
        )}
        {/* Free delivery badge */}
        <span className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          Free delivery
        </span>
      </div>
      {/* Product info */}
      <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug mb-1.5 h-8">{p.name}</p>
      {/* Stars */}
      {rating > 0 && (
        <div className="flex items-center gap-0.5 mb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-2.5 h-2.5 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
            />
          ))}
          {p.reviewCount > 0 && (
            <span className="text-[10px] text-slate-400 ml-0.5">({p.reviewCount})</span>
          )}
        </div>
      )}
      {/* Price */}
      <p className="text-sm font-black text-slate-900">{format(base)}</p>
      {compare > base && (
        <p className="text-[10px] text-slate-400 line-through">{format(compare)}</p>
      )}
    </Link>
  );
}

export function CategoryDealsSection({
  category,
  label,
  discount = 'Up to 50% off',
  accent = 'bg-zinc-900',
  sort = 'discount',
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cat-deals', category],
    queryFn: () =>
      productsApi
        .list({ category, limit: 16, sort })
        .then((r: any) => r.data?.data ?? r.data ?? []),
  });

  const items: any[] = Array.isArray(data) ? data : [];

  const scroll = (dir: 'l' | 'r') => {
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: dir === 'r' ? 290 : -290, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      {/* Noon-style header: colored left accent bar + title row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {/* Colored accent bar */}
          <div className={`w-[3px] h-7 rounded-sm ${accent}`} />
          <div>
            <h2 className="text-base font-bold text-slate-900">{label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{discount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll('l')} className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition">
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button onClick={() => scroll('r')} className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition">
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <Link href={`/category/${category}`} className={`ml-1 ${accent} text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition flex items-center gap-1`}>
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Products horizontal scroll */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-5 py-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-36 h-52 bg-slate-100 rounded-xl animate-pulse" />
            ))
          : items.length > 0
          ? items.map((p: any) => <ProductCard key={p.id} p={p} />)
          : (
            <p className="text-sm text-slate-400 py-8 w-full text-center">No products found.</p>
          )}
      </div>
    </div>
  );
}
