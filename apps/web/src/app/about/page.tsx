'use client';

import { useSettings } from '@/contexts/settings';
import Link from 'next/link';
import { Shield, Truck, RefreshCw, HeadphonesIcon, Star, Users, ShoppingBag, MapPin, Mail, Phone } from 'lucide-react';

const STATS = [
  { icon: Users, label: 'Happy Customers', value: '50,000+' },
  { icon: ShoppingBag, label: 'Products Listed', value: '200,000+' },
  { icon: Star, label: 'Verified Sellers', value: '5,000+' },
  { icon: Truck, label: 'Orders Delivered', value: '1M+' },
];

const VALUES = [
  {
    icon: Shield,
    title: 'Secure Shopping',
    desc: 'Every transaction is protected. Buy with confidence knowing your payments and data are secured.',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'We partner with reliable riders to get your orders to you quickly, even same-day in major cities.',
  },
  {
    icon: RefreshCw,
    title: 'Easy Returns',
    desc: 'Not satisfied? Our hassle-free return policy means you can shop without worry.',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    desc: 'Our customer support team is always ready to help you with any questions or concerns.',
  },
];

const DEFAULT_TEAM = [
  { name: 'CEO & Co-Founder', initials: 'TK', color: 'from-sky-400 to-sky-600' },
  { name: 'CTO & Co-Founder', initials: 'AM', color: 'from-purple-400 to-purple-600' },
  { name: 'Head of Operations', initials: 'JN', color: 'from-emerald-400 to-emerald-600' },
  { name: 'Head of Marketing', initials: 'SR', color: 'from-amber-400 to-amber-600' },
];

export default function AboutPage() {
  const settings = useSettings();
  const siteName = settings.SITE_NAME || 'TotalStore';
  const tagline = settings.SITE_TAGLINE || "Africa's #1 Online Marketplace";
  const siteAddress = settings.SITE_ADDRESS || 'Kampala, Uganda';
  const sitePhone = settings.SITE_PHONE || '+256 700 000 000';
  const siteEmail = settings.SITE_EMAIL || 'support@totalstore.ug';

  // Parse CMS content from settings if available
  const teamMembers = (() => {
    try { return settings.PAGE_ABOUT_TEAM_JSON ? JSON.parse(settings.PAGE_ABOUT_TEAM_JSON) : DEFAULT_TEAM; }
    catch { return DEFAULT_TEAM; }
  })();
  const missionText = settings.PAGE_ABOUT_MISSION || `Make commerce simple, affordable, and accessible for every African.`;
  const storyText = settings.PAGE_ABOUT_STORY || '';

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-700 via-sky-800 to-sky-900 text-white py-20">
        <div className="container-app text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-4">{siteName}</h1>
          <p className="text-xl text-sky-200 mb-8">{tagline}</p>
          <p className="text-sky-100 text-base leading-relaxed">
            We are Africa's fastest-growing online marketplace — connecting buyers, sellers, and riders
            in one seamless platform. From electronics to fashion, groceries to gadgets, we've got you covered.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-slate-50">
        <div className="container-app">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm">
                <Icon className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                <p className="text-3xl font-extrabold text-slate-900 mb-1">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="container-app max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-4">
            At <strong>{siteName}</strong>, our mission is simple: <em>{missionText}</em>
          </p>
          <p className="text-base text-slate-500 leading-relaxed">
            We believe that every business, no matter how small or large, deserves access to a powerful
            platform that helps them reach more customers. And every buyer deserves a safe, convenient,
            and affordable way to get what they need — delivered right to their door.
          </p>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-slate-50">
        <div className="container-app">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Why Choose {siteName}?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm hover:shadow-md hover:border-sky-200 transition-all">
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-sky-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container-app max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Our Story</h2>
          <div className="prose prose-gray max-w-none text-slate-600 leading-relaxed space-y-4">
            {storyText ? (
              <div dangerouslySetInnerHTML={{ __html: storyText }} />
            ) : (
              <>
                <p>
                  {siteName} was founded with a vision to transform commerce in Africa. We saw that buyers
                  struggled to find quality products at fair prices, while sellers lacked the digital tools
                  to reach more customers efficiently.
                </p>
                <p>
                  We built a platform that brings everyone together — buyers, sellers, and delivery riders —
                  in one connected ecosystem. Today, we serve hundreds of thousands of customers across Africa,
                  with sellers from Kampala, Nairobi, Lagos, Accra, Dar es Salaam, and beyond.
                </p>
                <p>
                  Our technology powers live shopping streams, flash sales, POS systems for physical stores,
                  and a smart logistics network that ensures fast, reliable delivery. We're just getting started,
                  and we're excited to build the future of commerce with you.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-slate-50">
        <div className="container-app">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Meet the Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {teamMembers.map(({ name, initials, color, title }: any) => (
              <div key={name} className="text-center">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 shadow-md`}>
                  {initials}
                </div>
                <p className="text-sm font-semibold text-slate-700">{title || name}</p>
                {title && <p className="text-xs text-slate-500">{name}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16">
        <div className="container-app max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Get in Touch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-sky-50 rounded-2xl p-6 text-center border border-sky-100">
              <MapPin className="w-8 h-8 text-sky-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800 mb-1">Address</h3>
              <p className="text-sm text-slate-500">{siteAddress}</p>
            </div>
            <div className="bg-sky-50 rounded-2xl p-6 text-center border border-sky-100">
              <Phone className="w-8 h-8 text-sky-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800 mb-1">Phone</h3>
              <p className="text-sm text-slate-500">
                {settings.SOCIAL_WHATSAPP
                  ? <a href={`https://wa.me/${settings.SOCIAL_WHATSAPP.replace(/\D/g, '')}`} className="text-sky-600 hover:underline">{sitePhone}</a>
                  : sitePhone
                }
              </p>
            </div>
            <div className="bg-sky-50 rounded-2xl p-6 text-center border border-sky-100">
              <Mail className="w-8 h-8 text-sky-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800 mb-1">Email</h3>
              <p className="text-sm text-slate-500">
                <a href={`mailto:${siteEmail}`} className="text-sky-600 hover:underline">{siteEmail}</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-gradient-to-r from-sky-700 to-sky-900 text-white">
        <div className="container-app text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to start shopping?</h2>
          <p className="text-sky-200 mb-6">Join over 50,000 happy customers on {siteName}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/products" className="bg-white text-sky-700 font-semibold px-6 py-3 rounded-xl hover:bg-sky-50 transition-colors">
              Shop Now
            </Link>
            <Link href="/blog" className="border border-white text-white font-semibold px-6 py-3 rounded-xl hover:bg-sky-700 transition-colors">
              Read Our Blog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
