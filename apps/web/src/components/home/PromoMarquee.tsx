'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { bannersApi } from '@/lib/api';
import { Sparkles, Tag, Truck, Percent, Gift, Clock } from 'lucide-react';

// Non-intrusive, continuously-scrolling promotions strip. Admin-controlled via
// banners with placement "promo_strip"; falls back to a curated set so the row
// is never empty. Pauses on hover so shoppers can read / click.

const ICONS = [Sparkles, Tag, Truck, Percent, Gift, Clock];

const FALLBACK: PromoItem[] = [
  { id: 'f1', title: 'Free delivery', subtitle: 'On orders over UGX 150,000', buttonUrl: '/products' },
  { id: 'f2', title: 'Flash deals daily', subtitle: 'Up to 70% off', buttonUrl: '/products?sort=discount' },
  { id: 'f3', title: 'New arrivals', subtitle: 'Fresh stock every day', buttonUrl: '/products?sort=newest' },
  { id: 'f4', title: 'Pay on delivery', subtitle: 'Cash or Mobile Money', buttonUrl: '/products' },
  { id: 'f5', title: 'Verified sellers', subtitle: 'Shop with confidence', buttonUrl: '/shops' },
];

interface PromoItem {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  buttonUrl?: string;
  targetUrl?: string;
  image?: string;
}

function PromoCard({ item, i }: { item: PromoItem; i: number }) {
  const Icon = ICONS[i % ICONS.length];
  const href = item.buttonUrl || item.targetUrl || '/products';
  return (
    <Link
      href={href}
      className="flex items-center gap-3 flex-shrink-0 w-64 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md hover:border-sky-200 transition"
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>}
      </div>
    </Link>
  );
}

export function PromoMarquee() {
  const { data } = useQuery({
    queryKey: ['banners-promo-strip'],
    queryFn: () =>
      bannersApi
        .getMidBanners('promo_strip')
        .then((r: any) => r.data?.data ?? r.data ?? [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const items: PromoItem[] = Array.isArray(data) && data.length > 0 ? data : FALLBACK;
  // Duplicate the list so the translateX(-50%) loop is seamless.
  const track = [...items, ...items];

  return (
    <section aria-label="Promotions" className="group relative overflow-hidden">
      {/* Soft edge fades so cards slide in/out gracefully */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 z-10 bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-slate-50 to-transparent" />
      <div className="flex gap-3 w-max animate-marquee group-hover:[animation-play-state:paused]">
        {track.map((item, i) => (
          <PromoCard key={`${item.id}-${i}`} item={item} i={i} />
        ))}
      </div>
    </section>
  );
}
