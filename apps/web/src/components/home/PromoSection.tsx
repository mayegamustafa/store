'use client';
import Link from 'next/link';
import { ArrowRight, Zap, Store, Smartphone, Shirt } from 'lucide-react';

const PROMOS = [
  {
    title: 'Flash Deals',
    subtitle: 'Limited time · Up to 70% off',
    href: '/flash-sales',
    bg: 'from-red-500 to-red-600',
    Icon: Zap,
    cta: 'Shop Now',
  },
  {
    title: 'Electronics',
    subtitle: 'Phones, laptops & more',
    href: '/category/electronics',
    bg: 'from-sky-500 to-blue-600',
    Icon: Smartphone,
    cta: 'Explore',
  },
  {
    title: 'Fashion',
    subtitle: 'New arrivals every week',
    href: '/category/fashion',
    bg: 'from-pink-500 to-rose-600',
    Icon: Shirt,
    cta: 'Browse',
  },
  {
    title: 'Sell & Earn',
    subtitle: 'Open your store free',
    href: '/seller/register',
    bg: 'from-emerald-500 to-teal-600',
    Icon: Store,
    cta: 'Start Today',
  },
];

export function PromoSection() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {PROMOS.map(({ title, subtitle, href, bg, Icon, cta }) => (
        <Link key={title} href={href}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bg}
            p-5 text-white group transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover`}>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-heading font-bold text-sm leading-tight mb-1">{title}</p>
            <p className="text-xs text-white/80 leading-snug mb-3">{subtitle}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:gap-2 transition-all">
              {cta} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
