'use client';
import Link from 'next/link';
import { Phone, Mail, MapPin, Send, Facebook, Twitter, Instagram, Youtube, MessageCircle, Flame, Smartphone } from 'lucide-react';
import { useSettings } from '@/contexts/settings';
import { useAppConfig } from '@/lib/app-config';
import { useState } from 'react';
import { newsletterApi, categoriesApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

function NewsletterBar() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await newsletterApi.subscribe(email);
      setStatus('success'); setMsg("You're subscribed!"); setEmail('');
    } catch (err: any) {
      const raw = err?.response?.data?.message ?? '';
      const m = Array.isArray(raw) ? raw.join(' ') : String(raw);
      if (m.toLowerCase().includes('already')) { setStatus('success'); setMsg("Already subscribed!"); }
      else { setStatus('error'); setMsg('Something went wrong.'); }
    }
  }
  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary rounded-2xl p-6 md:p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="text-white text-center md:text-left">
        <p className="font-heading font-bold text-lg mb-1">Get exclusive deals in your inbox</p>
        <p className="text-sm text-white/75">Flash sales, new arrivals & promo codes straight to you.</p>
      </div>
      {status === 'success' ? (
        <p className="text-white font-semibold text-sm">✓ {msg}</p>
      ) : (
        <form onSubmit={handle} className="flex gap-2 w-full max-w-sm shrink-0">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
            className="flex-1 bg-white/15 border border-white/30 text-white placeholder-white/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white/25 transition" />
          <button type="submit" disabled={status === 'loading'}
            className="bg-white text-primary hover:bg-slate-100 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition disabled:opacity-60 shrink-0">
            <Send className="w-4 h-4" />
            {status === 'loading' ? '…' : 'Subscribe'}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Static link sections ────────────────────────────────────────────────────
const STATIC_SECTIONS = [
  { heading: 'Buyer', links: [
    { label: 'My Account',  href: '/account' },
    { label: 'My Orders',   href: '/account/orders' },
    { label: 'Track Order', href: '/tracking' },
    { label: 'Wishlist',    href: '/wishlist' },
    { label: 'Returns',     href: '/returns' },
  ]},
  { heading: 'Seller', links: [
    { label: 'Sell on TotalStore', href: '/seller/register' },
    { label: 'Seller Dashboard',   href: '/seller' },
    { label: 'Seller FAQ',         href: '/seller/faq' },
    { label: 'Seller Policies',    href: '/seller/policies' },
  ]},
  { heading: 'Company', links: [
    { label: 'About Us',       href: '/about' },
    { label: 'Careers',        href: '/careers' },
    { label: 'Blog',           href: '/blog' },
    { label: 'Contact Us',     href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use',   href: '/terms' },
  ]},
];

export function Footer() {
  const settings = useSettings();
  const appConfig = useAppConfig();
  const siteName  = settings.SITE_NAME  || 'TotalStore';
  const logoUrl   = settings.SITE_LOGO_URL || '/logo.png';
  const tagline   = settings.SITE_TAGLINE || 'Your trusted marketplace for electronics, fashion, groceries & more — delivered across Africa.';
  const phone    = settings.SITE_PHONE   || '+256 700 000 000';
  const email    = settings.SITE_EMAIL   || 'support@totalstore.ug';
  const address  = settings.SITE_ADDRESS || 'Kampala, Uganda';
  const year     = new Date().getFullYear();
  const copyright = (settings.FOOTER_COPYRIGHT || `© {year} ${siteName}. All rights reserved.`).replace(/{year}/g, String(year));

  // Social links — only shown when set in admin settings
  const socials = [
    { Icon: Facebook,      key: 'SOCIAL_FACEBOOK',  label: 'Facebook',  color: 'hover:bg-blue-600/20 hover:text-blue-400' },
    { Icon: Instagram,     key: 'SOCIAL_INSTAGRAM', label: 'Instagram', color: 'hover:bg-pink-600/20 hover:text-pink-400' },
    { Icon: Twitter,       key: 'SOCIAL_TWITTER',   label: 'Twitter',   color: 'hover:bg-sky-500/20  hover:text-sky-400'  },
    { Icon: Youtube,       key: 'SOCIAL_YOUTUBE',   label: 'YouTube',   color: 'hover:bg-red-600/20  hover:text-red-400'  },
    { Icon: MessageCircle, key: 'SOCIAL_WHATSAPP',  label: 'WhatsApp',  color: 'hover:bg-green-600/20 hover:text-green-400' },
  ].filter(s => !!settings[s.key]);

  // Dynamic category list for "Shop" column
  const { data: catData } = useQuery({
    queryKey: ['footer-categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data ?? []).catch(() => []),
    staleTime: 10 * 60_000,
  });
  const topCats: any[] = Array.isArray(catData) && catData.length > 0
    ? catData.slice(0, 6)
    : [
        { name: 'Electronics',     slug: 'electronics'   },
        { name: 'Fashion',         slug: 'fashion'       },
        { name: 'Home & Living',   slug: 'home-living'   },
        { name: 'Health & Beauty', slug: 'health-beauty' },
        { name: 'Food & Grocery',  slug: 'food-grocery'  },
        { name: 'Baby & Kids',     slug: 'baby-kids'     },
      ];

  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="container-app pt-14 pb-8">
        <NewsletterBar />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">

          {/* Brand / contact column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex mb-5">
              <img
                src={logoUrl}
                alt={siteName}
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-xs">{tagline}</p>
            <div className="space-y-2 text-sm mb-6">
              <a href={`tel:${phone.replace(/\s/g,'')}`}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4 shrink-0 text-primary/80" /> {phone}
              </a>
              <a href={`mailto:${email}`}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4 shrink-0 text-primary/80" /> {email}
              </a>
              {address && (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4 shrink-0 text-primary/80" /> {address}
                </div>
              )}
            </div>
            {socials.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {socials.map(({ Icon, key, label, color }) => (
                  <a key={key} href={settings[key]} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className={`w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center transition-all ${color}`}>
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop — dynamic categories */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {topCats.map((c: any) => (
                <li key={c.slug || c.id}>
                  <Link href={`/category/${c.slug}`}
                    className="text-sm text-slate-400 hover:text-white transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/flash-sales"
                  className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  <Flame className="w-3.5 h-3.5" /> Flash Sales
                </Link>
              </li>
            </ul>
          </div>

          {/* Static sections: Buyer / Seller / Company */}
          {STATIC_SECTIONS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-white font-bold text-sm mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Get the App */}
        <div className="border-t border-slate-800 pt-8 pb-6 mb-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="text-white font-bold text-sm mb-1">Get the TotalStore Apps</h4>
              <p className="text-xs text-slate-400">Download our free Android apps</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={appConfig.apps.buyer.downloadUrl}
                className="inline-flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-5 py-3 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-400 shrink-0" fill="currentColor">
                  <path d="M17.523 2.236l-2.037 3.527a9.04 9.04 0 00-3.486-.69 9.04 9.04 0 00-3.486.69L6.477 2.236a.472.472 0 00-.644-.173.472.472 0 00-.173.644l2.008 3.476A8.956 8.956 0 003 13.073h18a8.956 8.956 0 00-4.668-6.89l2.008-3.476a.472.472 0 00-.173-.644.472.472 0 00-.644.173zM8.527 10.6a.95.95 0 11.001-1.9.95.95 0 01-.001 1.9zm6.946 0a.95.95 0 11.001-1.9.95.95 0 01-.001 1.9zM3 14.027v6.5c0 1.1.672 2 1.5 2s1.5-.9 1.5-2v-6.5H3zm18 0v6.5c0 1.1-.672 2-1.5 2s-1.5-.9-1.5-2v-6.5h3zm-14 0v8.5c0 .828.672 1.5 1.5 1.5h1v-10H7zm5 0v10h1c.828 0 1.5-.672 1.5-1.5v-8.5h-2.5zm-2 0v10h2v-10h-2z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 leading-none uppercase tracking-wider">Download</p>
                  <p className="text-white font-semibold text-sm leading-tight group-hover:text-green-400 transition-colors">Buyer App</p>
                </div>
              </a>
              <a
                href={appConfig.apps.seller.downloadUrl}
                className="inline-flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-5 py-3 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-400 shrink-0" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 leading-none uppercase tracking-wider">Download</p>
                  <p className="text-white font-semibold text-sm leading-tight group-hover:text-blue-400 transition-colors">Seller App</p>
                </div>
              </a>
              <a
                href={appConfig.apps.rider.downloadUrl}
                className="inline-flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-5 py-3 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-orange-400 shrink-0" fill="currentColor">
                  <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 leading-none uppercase tracking-wider">Download</p>
                  <p className="text-white font-semibold text-sm leading-tight group-hover:text-orange-400 transition-colors">Rider App</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{copyright}</p>
          <div className="flex gap-4">
            {['Privacy', 'Terms', 'Cookies'].map(t => (
              <Link key={t} href={`/${t.toLowerCase()}`}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">{t}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

