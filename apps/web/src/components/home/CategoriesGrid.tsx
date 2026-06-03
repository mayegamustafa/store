'use client';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api';
import Link from 'next/link';
import { useRef } from 'react';
import {
  ChevronLeft, ChevronRight,
  Cpu, Shirt, Home, ShoppingCart, HeartPulse, Baby, Dumbbell, Car,
  BookOpen, Wrench, Sofa, Smartphone, Flower2, Gamepad2, ArrowRight, Grid2X2,
} from 'lucide-react';

const STYLE_MAP: Record<string, { bg: string; icon: React.ElementType; color: string; ring: string }> = {
  electronics:     { bg: 'bg-sky-50',     icon: Cpu,          color: 'text-sky-600',     ring: 'ring-sky-200' },
  fashion:         { bg: 'bg-pink-50',    icon: Shirt,        color: 'text-pink-600',    ring: 'ring-pink-200' },
  'home-living':   { bg: 'bg-amber-50',   icon: Sofa,         color: 'text-amber-600',   ring: 'ring-amber-200' },
  'home-kitchen':  { bg: 'bg-orange-50',  icon: Home,         color: 'text-orange-600',  ring: 'ring-orange-200' },
  'food-grocery':  { bg: 'bg-green-50',   icon: ShoppingCart, color: 'text-green-600',   ring: 'ring-green-200' },
  'health-beauty': { bg: 'bg-rose-50',    icon: HeartPulse,   color: 'text-rose-600',    ring: 'ring-rose-200' },
  'baby-kids':     { bg: 'bg-yellow-50',  icon: Baby,         color: 'text-yellow-600',  ring: 'ring-yellow-200' },
  sports:          { bg: 'bg-lime-50',    icon: Dumbbell,     color: 'text-lime-600',    ring: 'ring-lime-200' },
  automotive:      { bg: 'bg-slate-100',  icon: Car,          color: 'text-slate-600',   ring: 'ring-slate-200' },
  books:           { bg: 'bg-purple-50',  icon: BookOpen,     color: 'text-purple-600',  ring: 'ring-purple-200' },
  flowers:         { bg: 'bg-fuchsia-50', icon: Flower2,      color: 'text-fuchsia-600', ring: 'ring-fuchsia-200' },
  tools:           { bg: 'bg-slate-100',   icon: Wrench,       color: 'text-slate-600',    ring: 'ring-slate-200' },
  phones:          { bg: 'bg-indigo-50',  icon: Smartphone,   color: 'text-indigo-600',  ring: 'ring-indigo-200' },
  gaming:          { bg: 'bg-violet-50',  icon: Gamepad2,     color: 'text-violet-600',  ring: 'ring-violet-200' },
};

const FALLBACK_CATS = [
  { id: '1', name: 'Electronics',   slug: 'electronics' },
  { id: '2', name: 'Fashion',       slug: 'fashion' },
  { id: '3', name: 'Home & Living', slug: 'home-living' },
  { id: '4', name: 'Health',        slug: 'health-beauty' },
  { id: '5', name: 'Food & Grocery',slug: 'food-grocery' },
  { id: '6', name: 'Sports',        slug: 'sports' },
  { id: '7', name: 'Baby & Kids',   slug: 'baby-kids' },
  { id: '8', name: 'Books',         slug: 'books' },
  { id: '9', name: 'Automotive',    slug: 'automotive' },
  { id: '10', name: 'Tools',        slug: 'tools' },
];

export function CategoriesGrid() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data ?? []),
  });

  const cats: any[] = Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATS;
  const scroll = (dir: 'l' | 'r') =>
    scrollRef.current?.scrollBy({ left: dir === 'r' ? 300 : -300, behavior: 'smooth' });

  if (isLoading) {
    return (
      <div className="flex gap-5 overflow-hidden">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="shrink-0 flex flex-col items-center gap-2.5">
            <div className="w-16 h-16 skeleton rounded-2xl" />
            <div className="w-14 h-3 skeleton" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative group/catscroll">
      <button onClick={() => scroll('l')}
        className="absolute -left-3 top-7 z-10 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-card flex items-center justify-center opacity-0 group-hover/catscroll:opacity-100 transition-all hover:shadow-card-md">
        <ChevronLeft className="w-4 h-4 text-slate-600" />
      </button>
      <button onClick={() => scroll('r')}
        className="absolute -right-3 top-7 z-10 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-card flex items-center justify-center opacity-0 group-hover/catscroll:opacity-100 transition-all hover:shadow-card-md">
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </button>
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto scrollbar-hide pb-1">
        {cats.map((cat: any) => {
          const style = STYLE_MAP[cat.slug] ?? { bg: 'bg-slate-100', icon: Grid2X2, color: 'text-slate-600', ring: 'ring-slate-200' };
          const Icon = style.icon;
          return (
            <Link key={cat.id} href={`/category/${cat.slug}`}
              className="shrink-0 flex flex-col items-center gap-2.5 group">
              <div className={`w-16 h-16 rounded-2xl ${style.bg} flex items-center justify-center
                transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 ${style.ring}`}>
                <Icon className={`w-7 h-7 ${style.color}`} strokeWidth={1.75} />
              </div>
              <span className="text-[11px] font-semibold text-center text-slate-600 leading-tight max-w-[72px] group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </Link>
          );
        })}
        <Link href="/categories" className="shrink-0 flex flex-col items-center gap-2.5 group">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 group-hover:text-primary transition-colors">View All</span>
        </Link>
      </div>
    </div>
  );
}
