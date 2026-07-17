'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { brandsApi } from '@/lib/api';

interface Brand {
  id: string;
  name: string;
  monogram?: string | null;
  logo?: string | null;
  circleBg?: string | null;
  circleText?: string | null;
  href?: string | null;
}

export function BrandsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'l' | 'r') =>
    scrollRef.current?.scrollBy({ left: dir === 'r' ? 300 : -300, behavior: 'smooth' });

  const { data } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list().then((r: any) => r.data ?? []),
    staleTime: 10 * 60_000,
  });

  const brands: Brand[] = Array.isArray(data) ? data : [];
  if (brands.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card px-5 py-4 relative group/brands">
      <div className="section-header mb-4">
        <span className="section-accent" />
        <h2 className="section-title">Top Brands</h2>
        <Link href="/brands" className="section-link ml-auto">View All</Link>
      </div>
      <button onClick={() => scroll('l')}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-card flex items-center justify-center opacity-0 group-hover/brands:opacity-100 transition-all">
        <ChevronLeft className="w-4 h-4 text-slate-600" />
      </button>
      <button onClick={() => scroll('r')}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-card flex items-center justify-center opacity-0 group-hover/brands:opacity-100 transition-all">
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </button>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={b.href || `/products?brand=${encodeURIComponent(b.name)}`}
            className="shrink-0 w-28 h-14 border border-slate-100 rounded-xl flex items-center justify-center gap-2 bg-white hover:border-primary/30 hover:shadow-card transition-all group px-3"
          >
            {b.logo ? (
              // Real uploaded logo (admin → Brands) always wins; falls back to
              // the coloured monogram if the image fails to load.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logo}
                alt={b.name}
                className="w-8 h-8 object-contain shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className={`w-8 h-8 rounded-lg ${b.circleBg || 'bg-slate-700'} flex items-center justify-center shrink-0`}>
                <span className={`text-[10px] font-black tracking-wide ${b.circleText || 'text-white'}`}>
                  {b.monogram || b.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700 group-hover:text-primary transition truncate">{b.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
