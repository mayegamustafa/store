'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { bannersApi } from '@/lib/api';

// Mid-page banners — fetched from public settings endpoint OR fallback
const FALLBACK_DOUBLE = [
  {
    id: 'a',
    title: 'Mega Sale',
    subtitle: 'Up to 70% off selected items',
    buttonText: 'Shop Now',
    buttonUrl: '/products',
    bgColor: 'bg-rose-600',
  },
  {
    id: 'b',
    title: 'New Arrivals',
    subtitle: 'Fresh products every day',
    buttonText: 'Explore',
    buttonUrl: '/products?sort=newest',
    bgColor: 'bg-violet-700',
  },
];

const FALLBACK_SINGLE = {
  id: 's1',
  badgeText: 'Limited Offer',
  title: 'Get 20% off your first order',
  subtitle: 'New customers enjoy an exclusive discount on any order over UGX 50,000.',
  buttonText: 'Register & Save',
  buttonUrl: '/auth/register',
  bgColor: 'bg-zinc-900',
};

export function MidBannersDouble({ placement = 'home_middle' }: { placement?: string }) {
  const { data } = useQuery({
    queryKey: ['banners-mid', placement],
    queryFn: () =>
      bannersApi.getMidBanners(placement)
        .then((r: any) => r.data?.data ?? r.data ?? [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const banners = Array.isArray(data) && data.length >= 2 ? data.slice(0, 2) : FALLBACK_DOUBLE;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {banners.map((b: any) => {
        const bg = b.bgColor?.startsWith('bg-') ? b.bgColor : 'bg-zinc-800';
        const buttonUrl = b.buttonUrl || b.targetUrl || '#';
        const hasImage = !!b.image;
        return (
          <Link
            key={b.id}
            href={buttonUrl}
            className={`relative flex items-center justify-between rounded-2xl p-6 overflow-hidden text-white hover:brightness-110 transition group ${hasImage ? 'bg-zinc-900' : bg}`}
          >
            {hasImage && (
              <>
                {/* Show the uploaded picture prominently … */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${b.image})` }}
                />
                {/* … with a dark scrim on the text side so copy stays legible. */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
              </>
            )}
            <div className="relative z-10">
              {b.badgeText && (
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-white/70">{b.badgeText}</p>
              )}
              <p className="text-2xl font-bold mb-1 drop-shadow-sm">{b.title}</p>
              {b.subtitle && <p className="text-sm text-white/80 mb-4 drop-shadow-sm">{b.subtitle}</p>}
              {b.buttonText && (
                <span className="inline-block bg-white text-slate-900 text-xs font-semibold px-4 py-1.5 rounded-lg group-hover:bg-slate-100 transition">
                  {b.buttonText}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Single full-width mid banner — fetched from admin (placement: home_single)
export function MidBannerSingle() {
  const { data } = useQuery({
    queryKey: ['banners-single'],
    queryFn: () =>
      bannersApi.getSingleBanner()
        .then((r: any) => {
          const list = r.data?.data ?? r.data ?? [];
          return Array.isArray(list) && list.length > 0 ? list[0] : null;
        })
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const b: any = data ?? FALLBACK_SINGLE;
  const bg = b.bgColor?.startsWith('bg-') ? b.bgColor : 'bg-zinc-900';
  const buttonUrl = b.buttonUrl || b.targetUrl || '#';
  const hasImage = !!b.image;

  return (
    <div className={`relative rounded-2xl p-8 overflow-hidden text-white ${hasImage ? 'bg-zinc-900' : bg}`}>
      {/* Uploaded picture shown at full strength, with a scrim for legibility */}
      {hasImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${b.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        </>
      )}
      <div className="relative z-10 max-w-lg">
        {b.badgeText && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-white/60">{b.badgeText}</p>
        )}
        <h2 className="text-3xl md:text-4xl font-bold mb-3 leading-tight drop-shadow-sm">{b.title}</h2>
        {b.subtitle && <p className="text-white/80 mb-6 drop-shadow-sm">{b.subtitle}</p>}
        {b.buttonText && (
          <Link
            href={buttonUrl}
            className="inline-block bg-white text-slate-900 font-semibold px-7 py-3 rounded-xl hover:bg-slate-100 transition"
          >
            {b.buttonText}
          </Link>
        )}
      </div>
      {/* Decorative circle when no image */}
      {!hasImage && (
        <div className="absolute right-0 top-0 bottom-0 w-72 items-center justify-center opacity-5 hidden md:flex">
          <div className="w-64 h-64 rounded-full border-[32px] border-white" />
        </div>
      )}
    </div>
  );
}

