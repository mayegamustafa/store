'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { bannersApi, categoriesApi } from '@/lib/api';
import {
  ChevronLeft, ChevronRight,
  Cpu, Shirt, Home, ShoppingCart, Heart, Dumbbell, Car,
  BookOpen, ShoppingBag, Baby, Flower2, Wrench, Sofa, Smartphone,
  Store, Truck, Wallet,
  type LucideIcon,
} from 'lucide-react';

interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  buttonText?: string;
  buttonUrl?: string;
  button2Text?: string;
  button2Url?: string;
  image?: string;
  bgColor?: string;
  textAlign?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  electronics: Cpu,
  fashion: Shirt,
  'home-living': Home,
  'home-kitchen': Home,
  'food-grocery': ShoppingCart,
  'health-beauty': Heart,
  'health-care': Heart,
  'baby-kids': Baby,
  sports: Dumbbell,
  automotive: Car,
  books: BookOpen,
  flowers: Flower2,
  tools: Wrench,
  furniture: Sofa,
  phones: Smartphone,
};

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: 'f1',
    badgeText: 'Welcome to TotalStore',
    title: "Africa's #1\nOnline Marketplace",
    subtitle: 'Shop millions of products. Pay with MTN MoMo or Airtel Money.',
    buttonText: 'Shop Now',
    buttonUrl: '/products',
    button2Text: 'Become a Seller',
    button2Url: '/seller/register',
    bgColor: 'bg-zinc-900',
    textAlign: 'center',
  },
  {
    id: 'f2',
    badgeText: 'Flash Sale',
    title: 'Up to 60% Off\nElectronics',
    subtitle: 'Phones, TVs, laptops & more — limited time only.',
    buttonText: 'Shop Electronics',
    buttonUrl: '/category/electronics',
    bgColor: 'bg-sky-800',
    textAlign: 'left',
  },
  {
    id: 'f3',
    badgeText: 'New Arrivals',
    title: 'Fresh Styles\nEvery Day',
    subtitle: 'Discover the latest fashion, beauty & home picks.',
    buttonText: 'Browse Now',
    buttonUrl: '/products?sort=newest',
    bgColor: 'bg-rose-800',
    textAlign: 'left',
  },
  {
    id: 'f4',
    badgeText: 'Sell with Us',
    title: 'Reach 10,000+\nBuyers Today',
    subtitle: 'Open your store in minutes. Free to list, easy to sell.',
    buttonText: 'Start Selling',
    buttonUrl: '/seller/register',
    button2Text: 'Learn More',
    button2Url: '/about',
    bgColor: 'bg-emerald-800',
    textAlign: 'left',
  },
];

const SIDE_PROMOS: { label: string; sub: string; href: string; gradient: string; iconBg: string; Icon: LucideIcon }[] = [
  {
    label: 'Become a Seller',
    sub: 'Sell to 10,000+ buyers',
    href: '/seller/register',
    gradient: 'from-slate-800 to-slate-900',
    iconBg: 'bg-white/10',
    Icon: Store,
  },
  {
    label: 'Free Delivery',
    sub: 'Orders above UGX 100k',
    href: '/products',
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-white/15',
    Icon: Truck,
  },
  {
    label: 'Pay with MoMo',
    sub: 'MTN & Airtel Money',
    href: '/payment-methods',
    gradient: 'from-sky-500 to-blue-600',
    iconBg: 'bg-white/15',
    Icon: Wallet,
  },
];

function Countdown({ endsAt }: { endsAt?: string }) {
  const [t, setT] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setT('00:00:00'); return; }
      const h = Math.floor(diff / 3_600_000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3_600_000) / 60_000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60_000) / 1_000).toString().padStart(2, '0');
      setT(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!t) return null;
  return (
    <div className="flex gap-1">
      {t.split(':').map((v, i) => (
        <span key={i} className="bg-red-600 text-white text-xs font-mono font-bold px-1.5 py-0.5 rounded">
          {v}
        </span>
      ))}
    </div>
  );
}

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: slidesRaw, isLoading: slidesLoading } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: () => bannersApi.getHeroSlides().then((r: any) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
  });

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data ?? []),
  });

  const slides: HeroSlide[] =
    Array.isArray(slidesRaw) && slidesRaw.length > 0 ? slidesRaw : FALLBACK_SLIDES;
  const total = slides.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total]);

  const restart = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) timerRef.current = setInterval(next, 5000);
  };

  // Never flash the hardcoded fallback while the admin-configured slides are
  // still loading — show a quiet skeleton instead. Fallbacks appear only when
  // the fetch resolved and the admin has no hero slides configured.
  if (slidesLoading) {
    return (
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1500px]">
          <div className="h-[340px] md:h-[420px] bg-zinc-200 animate-pulse" />
        </div>
      </section>
    );
  }

  const slide = slides[current];
  const bg = slide.bgColor ?? 'bg-zinc-900';
  const align = slide.textAlign || 'center';
  const alignClass = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
  const btnAlign = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  const categoryList: any[] = Array.isArray(cats) ? cats.slice(0, 12) : [];

  return (
    <div className="flex gap-0 bg-white">
      {/* ── Left: Category sidebar ─────────────────────────── */}
      <div className="hidden lg:block w-56 flex-shrink-0 bg-white border-r border-slate-100 self-stretch">
        <div className="py-1.5">
          {categoryList.length > 0
            ? categoryList.map((cat: any) => {
                const Icon = ICON_MAP[cat.slug] || ShoppingBag;
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-primary/5 hover:text-primary transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-primary/8 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary" />
                    </span>
                    <span className="flex-1 truncate font-medium text-[13px]">{cat.name}</span>
                    <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-primary/60 flex-shrink-0" />
                  </Link>
                );
              })
            : Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg animate-pulse flex-shrink-0" />
                  <div className="h-3 bg-slate-100 rounded flex-1 animate-pulse" />
                </div>
              ))}
        </div>
      </div>

      {/* ── Center: Slideshow ──────────────────────────────── */}
      <div className={`relative flex-1 h-[280px] md:h-[360px] overflow-hidden ${bg}`}>
        {slide.image && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        <div className={`absolute inset-0 flex flex-col ${alignClass} justify-center text-white px-8 md:px-14`}>
          {slide.badgeText && (
            <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white/80 bg-white/20 rounded-full px-3 py-1 w-fit">
              {slide.badgeText}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight drop-shadow-lg whitespace-pre-line">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-base md:text-lg text-white/90 mb-5 max-w-md drop-shadow">
              {slide.subtitle}
            </p>
          )}
          {(slide.buttonText || slide.button2Text) && (
            <div className={`flex gap-3 flex-wrap ${btnAlign}`}>
              {slide.buttonText && (
                <Link
                  href={slide.buttonUrl || '#'}
                  className="bg-accent hover:bg-accent/90 text-slate-900 font-bold px-7 py-2.5 rounded-lg transition shadow-lg text-sm"
                >
                  {slide.buttonText}
                </Link>
              )}
              {slide.button2Text && (
                <Link
                  href={slide.button2Url || '#'}
                  className="border-2 border-white text-white px-7 py-2.5 rounded-lg font-semibold text-sm hover:bg-white/10 transition"
                >
                  {slide.button2Text}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Arrows */}
        {total > 1 && (
          <>
            <button
              onClick={() => { prev(); restart(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { next(); restart(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); restart(); }}
                  className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Right: Promo cards ─────────────────────────────── */}
      <div className="hidden md:flex flex-col w-48 flex-shrink-0">
        {SIDE_PROMOS.map((p, i) => (
          <Link
            key={i}
            href={p.href}
            className={`bg-gradient-to-br ${p.gradient} text-white flex-1 flex flex-col items-center justify-center text-center px-3 py-4 hover:brightness-110 active:brightness-95 transition-all duration-200 group`}
          >
            <div className={`${p.iconBg} rounded-xl w-11 h-11 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200`}>
              <p.Icon className="w-5 h-5" />
            </div>
            <p className="text-[13px] font-bold leading-tight">{p.label}</p>
            <p className="text-[11px] opacity-75 mt-0.5 leading-snug">{p.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { Countdown };
