'use client';

import { useQuery } from '@tanstack/react-query';
import { bannersApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

interface AdBannerProps {
  /** Banner placement — e.g. 'product_detail_side', 'category_top', 'home_middle' */
  placement: string;
  /** Tailwind class for container height, e.g. 'h-24' or 'h-36' */
  className?: string;
  /** Display style: 'full' = full-width image banner, 'inline' = text + image card */
  variant?: 'full' | 'inline' | 'card';
}

export default function AdBanner({ placement, className = '', variant = 'full' }: AdBannerProps) {
  const { data } = useQuery({
    queryKey: ['banners', placement],
    queryFn: () => bannersApi.list(placement).then((r: any) => {
      const list = r.data?.data ?? r.data ?? [];
      return Array.isArray(list) ? list : [];
    }),
    staleTime: 5 * 60 * 1000,
  });

  const banners: any[] = Array.isArray(data) ? data.filter((b: any) => b.isActive !== false) : [];
  if (banners.length === 0) return null;

  const ad = banners[Math.floor(Math.random() * banners.length)];

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    ad.targetUrl || ad.buttonUrl ? (
      <Link href={ad.targetUrl ?? ad.buttonUrl} target="_blank" rel="noopener sponsored" className="block">
        {children}
      </Link>
    ) : (
      <div>{children}</div>
    );

  if (variant === 'card') {
    return (
      <div className={`rounded-xl overflow-hidden border border-slate-100 shadow-sm ${className}`}>
        <Wrapper>
          <div
            className="relative flex items-center gap-4 p-4"
            style={{ background: ad.bgColor?.startsWith('#') ? ad.bgColor : undefined }}
          >
            {!ad.bgColor?.startsWith('#') && (
              <div className={`absolute inset-0 bg-gradient-to-r ${ad.bgColor ?? 'from-sky-500 to-indigo-500'}`} />
            )}
            {ad.image && (
              <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden z-10">
                <Image src={ad.image} alt={ad.title ?? 'Ad'} fill className="object-cover" />
              </div>
            )}
            <div className="relative z-10 flex-1 min-w-0">
              {ad.badgeText && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-full mb-1 inline-block">
                  {ad.badgeText}
                </span>
              )}
              <p className="text-white font-bold text-sm leading-tight truncate">{ad.title}</p>
              {ad.subtitle && <p className="text-white/80 text-xs mt-0.5 truncate">{ad.subtitle}</p>}
              {ad.buttonText && (
                <span className="mt-2 inline-block text-xs bg-white text-sky-700 font-semibold px-3 py-1 rounded-full">
                  {ad.buttonText}
                </span>
              )}
            </div>
            <span className="absolute top-1 right-2 text-[9px] text-white/50 z-10">Ad</span>
          </div>
        </Wrapper>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`rounded-xl overflow-hidden border border-dashed border-sky-200 bg-sky-50 ${className}`}>
        <Wrapper>
          <div className="flex items-center gap-3 px-4 py-3 relative">
            {ad.image && (
              <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden">
                <Image src={ad.image} alt={ad.title ?? 'Ad'} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{ad.title}</p>
              {ad.subtitle && <p className="text-slate-500 text-xs truncate">{ad.subtitle}</p>}
            </div>
            {ad.buttonText && (
              <span className="shrink-0 text-xs bg-sky-600 text-white px-3 py-1.5 rounded-lg font-medium">{ad.buttonText}</span>
            )}
            <span className="absolute top-1 right-2 text-[9px] text-slate-300">Ad</span>
          </div>
        </Wrapper>
      </div>
    );
  }

  // variant === 'full'
  return (
    <div className={`rounded-xl overflow-hidden relative ${className}`}>
      <Wrapper>
        <div
          className="relative w-full h-full flex items-center justify-between px-6 py-5"
          style={{ background: ad.bgColor?.startsWith('#') ? ad.bgColor : undefined }}
        >
          {!ad.bgColor?.startsWith('#') && (
            <div className={`absolute inset-0 bg-gradient-to-r ${ad.bgColor ?? 'from-sky-500 to-indigo-600'}`} />
          )}
          {ad.image && (
            <div className="absolute inset-0">
              <Image src={ad.image} alt="" fill className="object-cover opacity-20" />
            </div>
          )}
          <div className="relative z-10">
            {ad.badgeText && (
              <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full mb-2 inline-block">
                {ad.badgeText}
              </span>
            )}
            <p className="text-white font-bold text-lg leading-tight">{ad.title}</p>
            {ad.subtitle && <p className="text-white/80 text-sm mt-1">{ad.subtitle}</p>}
            {ad.buttonText && (
              <span className="mt-3 inline-block bg-white text-sky-700 font-bold px-5 py-2 rounded-xl text-sm shadow">
                {ad.buttonText}
              </span>
            )}
          </div>
          <span className="relative z-10 text-[10px] text-white/40 self-start">Sponsored</span>
        </div>
      </Wrapper>
    </div>
  );
}
