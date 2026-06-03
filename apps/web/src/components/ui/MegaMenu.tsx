'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles, Flame, Star, Package } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChildItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface SubGroup {
  id: string;
  name: string;
  slug: string;
  image?: string;
  children?: ChildItem[];
}

export interface MegaMenuCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
  children?: SubGroup[];
}

// ── SubCategoryGroup ───────────────────────────────────────────────────────
// Renders a single subcategory heading + the leaf children below it.

interface SubCategoryGroupProps {
  sub: SubGroup;
}

export function SubCategoryGroup({ sub }: SubCategoryGroupProps) {
  return (
    <div>
      {/* Subcategory heading → links to that subcategory page */}
      <Link
        href={`/category/${sub.slug}`}
        className="block text-[13px] font-bold text-slate-900 hover:text-primary mb-2 transition-colors leading-tight"
      >
        {sub.name}
      </Link>

      {/* Leaf items */}
      {Array.isArray(sub.children) && sub.children.length > 0 && (
        <ul className="space-y-1.5">
          {sub.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/category/${child.slug}`}
                className="flex items-center gap-2 text-[12px] text-slate-500 hover:text-primary transition-colors group/leaf"
              >
                <span className="w-1 h-1 rounded-full bg-slate-300 group-hover/leaf:bg-primary flex-shrink-0 transition-colors mt-px" />
                <span className="leading-tight hover:underline underline-offset-2">
                  {child.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── CategoryColumn ─────────────────────────────────────────────────────────
// One visual column in the mega menu grid (maps 1:1 to a SubGroup).

interface CategoryColumnProps {
  sub: SubGroup;
}

export function CategoryColumn({ sub }: CategoryColumnProps) {
  return (
    <div className="flex flex-col">
      <SubCategoryGroup sub={sub} />

      {/* "See all" link for this subcategory */}
      <Link
        href={`/category/${sub.slug}`}
        className="mt-2 text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 w-fit"
      >
        See all
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ── MegaMenu ───────────────────────────────────────────────────────────────
// Full-width animated dropdown panel. Position it relative to the nav strip.

interface MegaMenuProps {
  category: MegaMenuCategory;
  isOpen: boolean;
  onClose?: () => void;
}

export function MegaMenu({ category, isOpen, onClose }: MegaMenuProps) {
  const subs: SubGroup[] = Array.isArray(category.children) ? category.children : [];

  return (
    <div
      aria-hidden={!isOpen}
      className={[
        'absolute left-0 right-0 top-full z-[200]',
        'bg-white border-t-2 border-primary/10 shadow-2xl',
        'transition-all duration-200 ease-out origin-top',
        isOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none',
      ].join(' ')}
    >
      <div className="container-app py-6">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {category.image && (
              <img
                src={category.image}
                alt={category.name}
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              {category.name}
            </h3>
            {subs.length > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                {subs.length} subcategories
              </span>
            )}
          </div>
          <Link
            href={`/category/${category.slug}`}
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-2"
          >
            View all in {category.name}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── Columns grid ── */}
        {subs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 lg:gap-8">
            {subs.map((sub) => (
              <CategoryColumn key={sub.id} sub={sub} />
            ))}
          </div>
        ) : (
          /* Fallback: no subcategory data yet */
          <p className="text-sm text-slate-400 py-4">
            Browse all products in this category
          </p>
        )}

        {/* ── Promo strip ── */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <Link
            href={`/category/${category.slug}?sort=newest`}
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
          >
            <Sparkles className="w-3.5 h-3.5" /> New Arrivals
          </Link>
          <Link
            href={`/category/${category.slug}?sort=discount`}
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-accent/5"
          >
            <Flame className="w-3.5 h-3.5" /> Best Deals
          </Link>
          <Link
            href={`/category/${category.slug}?sort=rating`}
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-amber-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-50"
          >
            <Star className="w-3.5 h-3.5" /> Top Rated
          </Link>
          <Link
            href={`/category/${category.slug}?sort=sales`}
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
          >
            <Package className="w-3.5 h-3.5" /> Best Sellers
          </Link>
        </div>
      </div>
    </div>
  );
}
