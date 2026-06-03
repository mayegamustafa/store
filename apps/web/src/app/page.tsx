import { HeroBanner } from '@/components/home/HeroBanner';
import { FlashSaleSection } from '@/components/home/FlashSaleSection';
import { CategoriesGrid } from '@/components/home/CategoriesGrid';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { PromoSection } from '@/components/home/PromoSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import { PopularProducts } from '@/components/home/PopularProducts';
import { TopRatedShops } from '@/components/home/TopRatedShops';
import { JustForYou } from '@/components/home/JustForYou';
import { RecentlyViewed } from '@/components/home/RecentlyViewed';
import { CategoryDealsSection } from '@/components/home/CategoryDealsSection';
import { MidBannersDouble, MidBannerSingle } from '@/components/home/MidBanners';
import { BrandsSection } from '@/components/home/BrandsSection';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Section header: solid left accent bar + title + plain "View All" link */
function SectionHeader({
  title, subtitle, href, accent = 'bg-zinc-900',
}: { title: string; subtitle?: string; href?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-[3px] h-7 rounded-sm ${accent}`} />
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-slate-50 pb-16">
      {/* ── Hero: 3-col (sidebar + slideshow + promo cards) ── */}
      <div className="bg-white border-b border-slate-100 mb-2">
        <div className="container-app">
          <HeroBanner />
        </div>
      </div>

      {/* ── Trust badges strip ───────────────────────────────── */}
      <section className="container-app mt-4">
        <TrustBadges />
      </section>

      {/* ── Flash Sale ──────────────────────────────────────── */}
      <section className="container-app mt-4">
        <FlashSaleSection />
      </section>

      {/* ── Shop by Category (noon-style circles) ──────────── */}
      <section className="container-app mt-4">
        <div className="section-card">
          <SectionHeader
            title="Shop by Category"
            subtitle="Explore all departments"
            href="/categories"
            accent="bg-amber-500"
          />
          <CategoriesGrid />
        </div>
      </section>

      {/* ── Top Brands ──────────────────────────────────────── */}
      <section className="container-app mt-4">
        <BrandsSection />
      </section>

      {/* ── Mid promotional banners (2-col) ─────────────────── */}
      <section className="container-app mt-4">
        <MidBannersDouble />
      </section>

      {/* ── Category deals: Electronics ─────────────────────── */}
      <section className="container-app mt-4">
        <CategoryDealsSection
          category="electronics"
          label="Electronics"
          discount="Up to 60% off"
          accent="bg-sky-600"
        />
      </section>

      {/* ── Category deals: Fashion ─────────────────────────── */}
      <section className="container-app mt-4">
        <CategoryDealsSection
          category="fashion"
          label="Fashion"
          discount="Up to 50% off"
          accent="bg-pink-600"
        />
      </section>

      {/* ── Popular Products ─────────────────────────────────── */}
      <section className="container-app mt-4">
        <div className="section-card">
          <SectionHeader
            title="Most Popular"
            subtitle="Trending right now"
            href="/products?sort=sales"
            accent="bg-violet-600"
          />
          <PopularProducts />
        </div>
      </section>

      {/* ── Category deals: Health & Beauty ─────────────────── */}
      <section className="container-app mt-4">
        <CategoryDealsSection
          category="health-beauty"
          label="Health & Beauty"
          discount="Up to 45% off"
          accent="bg-emerald-600"
        />
      </section>

      {/* ── Mid single banner ───────────────────────────────── */}
      <section className="container-app mt-4">
        <MidBannerSingle />
      </section>

      {/* ── Top Rated Shops ─────────────────────────────────── */}
      <section className="container-app mt-4">
        <div className="section-card">
          <SectionHeader
            title="Top Rated Shops"
            subtitle="Trusted sellers near you"
            href="/shops"
            accent="bg-zinc-800"
          />
          <TopRatedShops />
        </div>
      </section>

      {/* ── Category deals: Home & Living ───────────────────── */}
      <section className="container-app mt-4">
        <CategoryDealsSection
          category="home-living"
          label="Home & Living"
          discount="Up to 55% off"
          accent="bg-amber-500"
          sort="newest"
        />
      </section>

      {/* ── Category deals: Sports ──────────────────────────── */}
      <section className="container-app mt-4">
        <CategoryDealsSection
          category="sports"
          label="Sports & Outdoor"
          discount="Up to 40% off"
          accent="bg-violet-600"
        />
      </section>

      {/* ── Mid promo banners (2nd set) ──────────────────────── */}
      <section className="container-app mt-4">
        <MidBannersDouble placement="home_bottom" />
      </section>

      {/* ── Best Deal ───────────────────────────────────────── */}
      <section className="container-app mt-4">
        <div className="section-card">
          <SectionHeader
            title="Best Deals"
            subtitle="Big discounts every day"
            href="/products?sort=discount"
            accent="bg-rose-600"
          />
          <FeaturedProducts />
        </div>
      </section>

      {/* ── Service guarantees ──────────────────────────────── */}
      <section className="container-app mt-4">
        <PromoSection />
      </section>

      {/* ── Just For You ─────────────────────────────────────── */}
      <section className="container-app mt-4">
        <div className="section-card">
          <SectionHeader
            title="Just For You"
            subtitle="Personalised picks"
            href="/products"
            accent="bg-sky-600"
          />
          <JustForYou />
        </div>
      </section>

      {/* ── Recently Viewed ──────────────────────────────────── */}
      <section className="container-app mt-4">
        <RecentlyViewed />
      </section>
    </div>
  );
}
