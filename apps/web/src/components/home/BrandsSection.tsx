'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BRANDS = [
  { name: 'Samsung',  slug: 'samsung',  monogram: 'SA', color: 'bg-blue-600' },
  { name: 'Apple',    slug: 'apple',    monogram: 'AP', color: 'bg-slate-800' },
  { name: 'Nike',     slug: 'nike',     monogram: 'NK', color: 'bg-orange-500' },
  { name: 'Adidas',   slug: 'adidas',   monogram: 'AD', color: 'bg-zinc-900' },
  { name: 'Sony',     slug: 'sony',     monogram: 'SN', color: 'bg-slate-700' },
  { name: 'LG',       slug: 'lg',       monogram: 'LG', color: 'bg-red-600' },
  { name: 'HP',       slug: 'hp',       monogram: 'HP', color: 'bg-indigo-600' },
  { name: 'Lenovo',   slug: 'lenovo',   monogram: 'LV', color: 'bg-red-700' },
  { name: 'Dell',     slug: 'dell',     monogram: 'DL', color: 'bg-blue-700' },
  { name: 'Xiaomi',   slug: 'xiaomi',   monogram: 'XI', color: 'bg-orange-600' },
  { name: 'Huawei',   slug: 'huawei',   monogram: 'HW', color: 'bg-rose-600' },
  { name: 'Hisense',  slug: 'hisense',  monogram: 'HS', color: 'bg-sky-600' },
];

export function BrandsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'l' | 'r') =>
    scrollRef.current?.scrollBy({ left: dir === 'r' ? 300 : -300, behavior: 'smooth' });

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
        {BRANDS.map((b) => (
          <Link key={b.slug} href={`/products?brand=${b.slug}`}
            className="shrink-0 w-28 h-14 border border-slate-100 rounded-xl flex items-center justify-center gap-2 bg-white hover:border-primary/30 hover:shadow-card transition-all group px-3">
            <div className={`w-8 h-8 rounded-lg ${b.color} flex items-center justify-center shrink-0`}>
              <span className="text-[10px] font-black text-white tracking-wide">{b.monogram}</span>
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-primary transition truncate">{b.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
