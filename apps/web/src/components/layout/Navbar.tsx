'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingCart, Heart, Search, Menu, X, MapPin,
  ChevronDown, ChevronRight, LayoutGrid, Home, Package, LogIn, User, LogOut,
  Zap, Store,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSettings } from '@/contexts/settings';
import { LangCurrencySwitcher } from '@/components/ui/LangCurrencySwitcher';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, productsApi } from '@/lib/api';
import { MegaMenu } from '@/components/ui/MegaMenu';

// ── Category data hook ──────────────────────────────────────────────────────
const FALLBACK_CATS = [
  {
    id: 'electronics', name: 'Electronics', slug: 'electronics', children: [
      { id: 'phones', name: 'Phones & Tablets', slug: 'phones-tablets', children: [
          { id: 'smartphones', name: 'Smartphones', slug: 'smartphones' },
          { id: 'feature-phones', name: 'Feature Phones', slug: 'feature-phones' },
          { id: 'tablets', name: 'Tablets', slug: 'tablets' },
          { id: 'phone-cases', name: 'Phone Cases', slug: 'phone-cases' },
        ]},
      { id: 'laptops', name: 'Laptops & PCs', slug: 'laptops', children: [
          { id: 'laptops-budget', name: 'Budget Laptops', slug: 'budget-laptops' },
          { id: 'laptops-gaming', name: 'Gaming Laptops', slug: 'gaming-laptops' },
          { id: 'desktops', name: 'Desktops', slug: 'desktops' },
          { id: 'monitors', name: 'Monitors', slug: 'monitors' },
        ]},
      { id: 'tv', name: 'TVs & Audio', slug: 'tvs-audio', children: [
          { id: 'smart-tvs', name: 'Smart TVs', slug: 'smart-tvs' },
          { id: 'speakers', name: 'Speakers', slug: 'speakers' },
          { id: 'headphones', name: 'Headphones', slug: 'headphones' },
          { id: 'decoders', name: 'Decoders', slug: 'decoders' },
        ]},
      { id: 'cameras', name: 'Cameras', slug: 'cameras', children: [
          { id: 'dslr', name: 'DSLR Cameras', slug: 'dslr-cameras' },
          { id: 'mirrorless', name: 'Mirrorless', slug: 'mirrorless' },
          { id: 'action-cams', name: 'Action Cameras', slug: 'action-cameras' },
        ]},
      { id: 'accessories', name: 'Accessories', slug: 'electronics-accessories', children: [
          { id: 'chargers', name: 'Chargers & Cables', slug: 'chargers-cables' },
          { id: 'power-banks', name: 'Power Banks', slug: 'power-banks' },
          { id: 'earphones', name: 'Earphones', slug: 'earphones' },
        ]},
    ],
  },
  {
    id: 'fashion', name: 'Fashion', slug: 'fashion', children: [
      { id: 'mens', name: "Men's Clothing", slug: 'mens-clothing', children: [
          { id: 'mens-shirts', name: 'Shirts & T-Shirts', slug: 'mens-shirts' },
          { id: 'mens-trousers', name: 'Trousers & Jeans', slug: 'mens-trousers' },
          { id: 'mens-suits', name: 'Suits & Blazers', slug: 'mens-suits' },
          { id: 'mens-underwear', name: 'Underwear & Socks', slug: 'mens-underwear' },
        ]},
      { id: 'womens', name: "Women's Clothing", slug: 'womens-clothing', children: [
          { id: 'womens-dresses', name: 'Dresses', slug: 'dresses' },
          { id: 'womens-tops', name: 'Tops & Blouses', slug: 'womens-tops' },
          { id: 'womens-skirts', name: 'Skirts', slug: 'skirts' },
          { id: 'womens-lingerie', name: 'Lingerie', slug: 'lingerie' },
        ]},
      { id: 'shoes', name: 'Shoes', slug: 'shoes', children: [
          { id: 'mens-shoes', name: "Men's Shoes", slug: 'mens-shoes' },
          { id: 'womens-shoes', name: "Women's Shoes", slug: 'womens-shoes' },
          { id: 'sneakers', name: 'Sneakers', slug: 'sneakers' },
          { id: 'sandals', name: 'Sandals & Flip-flops', slug: 'sandals' },
        ]},
      { id: 'bags', name: 'Bags & Accessories', slug: 'bags-accessories', children: [
          { id: 'handbags', name: 'Handbags', slug: 'handbags' },
          { id: 'backpacks', name: 'Backpacks', slug: 'backpacks' },
          { id: 'belts', name: 'Belts & Wallets', slug: 'belts-wallets' },
        ]},
    ],
  },
  {
    id: 'home', name: 'Home & Living', slug: 'home-living', children: [
      { id: 'furniture', name: 'Furniture', slug: 'furniture', children: [
          { id: 'sofas', name: 'Sofas & Couches', slug: 'sofas' },
          { id: 'beds', name: 'Beds & Mattresses', slug: 'beds' },
          { id: 'tables', name: 'Tables & Chairs', slug: 'tables-chairs' },
          { id: 'shelving', name: 'Shelving & Storage', slug: 'shelving' },
        ]},
      { id: 'kitchen', name: 'Kitchen', slug: 'kitchen', children: [
          { id: 'cookware', name: 'Cookware', slug: 'cookware' },
          { id: 'appliances', name: 'Small Appliances', slug: 'small-appliances' },
          { id: 'utensils', name: 'Cutlery & Utensils', slug: 'utensils' },
          { id: 'storage-org', name: 'Storage & Organisation', slug: 'kitchen-storage' },
        ]},
      { id: 'bedding', name: 'Bedding', slug: 'bedding', children: [
          { id: 'duvets', name: 'Duvets & Blankets', slug: 'duvets' },
          { id: 'pillows', name: 'Pillows', slug: 'pillows' },
          { id: 'bed-sheets', name: 'Bed Sheets', slug: 'bed-sheets' },
        ]},
      { id: 'decor', name: 'Decor', slug: 'decor', children: [
          { id: 'curtains', name: 'Curtains & Blinds', slug: 'curtains' },
          { id: 'rugs', name: 'Rugs & Carpets', slug: 'rugs' },
          { id: 'lighting', name: 'Lighting', slug: 'lighting' },
          { id: 'wall-art', name: 'Wall Art', slug: 'wall-art' },
        ]},
    ],
  },
  {
    id: 'health', name: 'Health & Beauty', slug: 'health-beauty', children: [
      { id: 'skincare', name: 'Skincare', slug: 'skincare', children: [
          { id: 'moisturisers', name: 'Moisturisers', slug: 'moisturisers' },
          { id: 'sunscreen', name: 'Sunscreen & SPF', slug: 'sunscreen' },
          { id: 'serums', name: 'Serums & Toners', slug: 'serums' },
          { id: 'face-wash', name: 'Face Wash', slug: 'face-wash' },
        ]},
      { id: 'haircare', name: 'Hair Care', slug: 'hair-care', children: [
          { id: 'shampoos', name: 'Shampoos', slug: 'shampoos' },
          { id: 'conditioners', name: 'Conditioners', slug: 'conditioners' },
          { id: 'hair-oils', name: 'Hair Oils', slug: 'hair-oils' },
          { id: 'styling', name: 'Styling Products', slug: 'hair-styling' },
        ]},
      { id: 'vitamins', name: 'Vitamins & Supplements', slug: 'vitamins', children: [
          { id: 'multivitamins', name: 'Multivitamins', slug: 'multivitamins' },
          { id: 'protein', name: 'Protein & Sports', slug: 'protein-sports' },
          { id: 'herbal', name: 'Herbal Supplements', slug: 'herbal' },
        ]},
      { id: 'pharmacy', name: 'Pharmacy', slug: 'pharmacy', children: [
          { id: 'pain-relief', name: 'Pain Relief', slug: 'pain-relief' },
          { id: 'first-aid', name: 'First Aid', slug: 'first-aid' },
          { id: 'family-planning', name: 'Family Planning', slug: 'family-planning' },
        ]},
    ],
  },
  {
    id: 'food', name: 'Food & Grocery', slug: 'food-grocery', children: [
      { id: 'fresh', name: 'Fresh Produce', slug: 'fresh-produce', children: [
          { id: 'vegetables', name: 'Vegetables', slug: 'vegetables' },
          { id: 'fruits', name: 'Fruits', slug: 'fruits' },
          { id: 'meat', name: 'Meat & Poultry', slug: 'meat-poultry' },
          { id: 'dairy', name: 'Dairy & Eggs', slug: 'dairy-eggs' },
        ]},
      { id: 'beverages', name: 'Beverages', slug: 'beverages', children: [
          { id: 'water', name: 'Water & Juices', slug: 'water-juices' },
          { id: 'soft-drinks', name: 'Soft Drinks', slug: 'soft-drinks' },
          { id: 'tea-coffee', name: 'Tea & Coffee', slug: 'tea-coffee' },
          { id: 'energy-drinks', name: 'Energy Drinks', slug: 'energy-drinks' },
        ]},
      { id: 'snacks', name: 'Snacks', slug: 'snacks', children: [
          { id: 'crisps', name: 'Crisps & Chips', slug: 'crisps-chips' },
          { id: 'biscuits', name: 'Biscuits & Cookies', slug: 'biscuits' },
          { id: 'nuts-dried', name: 'Nuts & Dried Fruits', slug: 'nuts-dried' },
          { id: 'chocolates', name: 'Chocolates & Sweets', slug: 'chocolates' },
        ]},
      { id: 'bakery', name: 'Bakery', slug: 'bakery', children: [
          { id: 'bread', name: 'Bread & Rolls', slug: 'bread' },
          { id: 'cakes', name: 'Cakes & Pastries', slug: 'cakes' },
          { id: 'cereals', name: 'Cereals & Oats', slug: 'cereals' },
        ]},
    ],
  },
  {
    id: 'sports', name: 'Sports', slug: 'sports', children: [
      { id: 'gym', name: 'Gym & Fitness', slug: 'gym-equipment', children: [
          { id: 'weights', name: 'Weights & Dumbbells', slug: 'weights' },
          { id: 'cardio', name: 'Cardio Machines', slug: 'cardio-machines' },
          { id: 'yoga', name: 'Yoga & Pilates', slug: 'yoga' },
        ]},
      { id: 'outdoor', name: 'Outdoor Sports', slug: 'outdoor-sports', children: [
          { id: 'cycling', name: 'Cycling', slug: 'cycling' },
          { id: 'running', name: 'Running', slug: 'running' },
          { id: 'camping', name: 'Camping & Hiking', slug: 'camping' },
        ]},
      { id: 'team-sports', name: 'Team Sports', slug: 'team-sports', children: [
          { id: 'football', name: 'Football', slug: 'football' },
          { id: 'basketball', name: 'Basketball', slug: 'basketball' },
          { id: 'cricket', name: 'Cricket', slug: 'cricket' },
        ]},
    ],
  },
  {
    id: 'kids', name: 'Baby & Kids', slug: 'baby-kids', children: [
      { id: 'baby', name: 'Baby Care', slug: 'baby-care', children: [
          { id: 'nappies', name: 'Nappies & Wipes', slug: 'nappies' },
          { id: 'feeding', name: 'Feeding & Nursing', slug: 'feeding' },
          { id: 'baby-gear', name: 'Baby Gear', slug: 'baby-gear' },
        ]},
      { id: 'toys', name: 'Toys & Games', slug: 'toys-games', children: [
          { id: 'educational', name: 'Educational Toys', slug: 'educational-toys' },
          { id: 'dolls', name: 'Dolls & Action Figures', slug: 'dolls' },
          { id: 'board-games', name: 'Board Games', slug: 'board-games' },
          { id: 'outdoor-toys', name: 'Outdoor Toys', slug: 'outdoor-toys' },
        ]},
      { id: 'kids-fashion', name: "Kids' Fashion", slug: 'kids-fashion', children: [
          { id: 'boys', name: "Boys' Clothing", slug: 'boys-clothing' },
          { id: 'girls', name: "Girls' Clothing", slug: 'girls-clothing' },
          { id: 'school', name: 'School Uniforms', slug: 'school-uniforms' },
        ]},
    ],
  },
  {
    id: 'auto', name: 'Automotive', slug: 'automotive', children: [
      { id: 'parts', name: 'Car Parts', slug: 'car-parts', children: [
          { id: 'engine', name: 'Engine Parts', slug: 'engine-parts' },
          { id: 'brakes', name: 'Brakes', slug: 'brakes' },
          { id: 'tyres', name: 'Tyres & Wheels', slug: 'tyres' },
        ]},
      { id: 'accessories', name: 'Car Accessories', slug: 'car-accessories', children: [
          { id: 'seat-covers', name: 'Seat Covers', slug: 'seat-covers' },
          { id: 'dash-cams', name: 'Dash Cams', slug: 'dash-cams' },
          { id: 'car-audio', name: 'Car Audio', slug: 'car-audio' },
        ]},
      { id: 'tools-workshop', name: 'Tools & Workshop', slug: 'tools-workshop', children: [
          { id: 'hand-tools', name: 'Hand Tools', slug: 'hand-tools' },
          { id: 'power-tools', name: 'Power Tools', slug: 'power-tools' },
        ]},
    ],
  },
];

function useCats() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data ?? []).catch(() => []),
    staleTime: 5 * 60_000,
  });
  // Use API data only if at least one category has subcategories (children).
  // Otherwise fall back to the rich FALLBACK_CATS so the mega menu works.
  const hasChildren = Array.isArray(data) && data.some((c: any) => Array.isArray(c.children) && c.children.length > 0);
  return (hasChildren ? data : FALLBACK_CATS) as any[];
}

// ── Desktop category bar with mega menu ─────────────────────────────────
function DesktopCategoryBar() {
  const cats = useCats();
  const [activeId, setActiveId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveId(id);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveId(null), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const clearNow = useCallback(() => setActiveId(null), []);

  const activeCategory = cats.find((c: any) => c.id === activeId);

  return (
    <nav
      className="hidden md:block border-t border-slate-100 bg-white relative"
      onMouseLeave={scheduleClose}
    >
      <div className="container-app">
        <div className="flex items-center text-sm overflow-x-auto scrollbar-hide">
          {/* Home */}
          <Link
            href="/"
            onMouseEnter={clearNow}
            className="flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-600 hover:text-primary px-3 py-2 transition flex-shrink-0"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-slate-200 mx-0.5">|</span>

          {/* All Categories button */}
          <Link
            href="/categories"
            onMouseEnter={clearNow}
            className="flex items-center gap-1.5 whitespace-nowrap font-bold text-slate-800 hover:text-primary px-3 py-2 transition border-r border-slate-100 mr-2 flex-shrink-0"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>All Categories</span>
          </Link>

          {/* Category tabs — each triggers the mega menu */}
          {cats.slice(0, 12).map((cat: any) => {
            const children: any[] = Array.isArray(cat.children) ? cat.children : [];
            const hasMega = children.length > 0;
            const isActive = activeId === cat.id;

            return (
              <div
                key={cat.id}
                className="relative flex-shrink-0"
                onMouseEnter={() => hasMega ? openMenu(cat.id) : clearNow()}
              >
                <Link
                  href={`/category/${cat.slug}`}
                  className={[
                    'flex items-center gap-1 whitespace-nowrap font-medium transition px-3 py-2 rounded-lg',
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-slate-600 hover:text-primary hover:bg-primary/5',
                  ].join(' ')}
                >
                  {cat.name}
                  {hasMega && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${
                        isActive ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  )}
                </Link>
              </div>
            );
          })}

          {/* Promo quick links */}
          <div
            className="ml-auto flex items-center gap-1 flex-shrink-0 pl-3 border-l border-slate-100"
            onMouseEnter={clearNow}
          >
            <Link href="/flash-sales" className="whitespace-nowrap text-accent font-bold text-xs px-3 py-2 hover:bg-accent/5 rounded-lg transition">
              Flash Sales
            </Link>
            <Link href="/brands" className="whitespace-nowrap text-slate-500 text-xs px-3 py-2 hover:text-primary hover:bg-primary/5 rounded-lg transition">
              Brands
            </Link>
            <Link href="/live" className="whitespace-nowrap text-red-500 font-bold text-xs px-3 py-2 hover:bg-red-50 rounded-lg transition flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </Link>
          </div>
        </div>
      </div>

      {/* Full-width mega menu — mounted inside the nav so it spans the full bar */}
      <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
        <MegaMenu
          category={activeCategory ?? { id: '', name: '', slug: '', children: [] }}
          isOpen={!!activeId && !!activeCategory}
          onClose={clearNow}
        />
      </div>
    </nav>
  );
}

// ── Mobile drawer: categories as accordion ────────────────────────────────
function DrawerCategories({ onClose }: { onClose: () => void }) {
  const cats = useCats();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="px-5 pt-4 pb-3 border-b border-slate-100">
      <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Categories</p>
      <Link href="/categories" onClick={onClose}
        className="flex items-center gap-2 py-2 text-slate-700 hover:text-primary font-medium text-sm">
        <LayoutGrid className="w-4 h-4 text-slate-400 flex-shrink-0" /> All Categories
      </Link>
      {cats.slice(0, 10).map((cat: any) => {
        const children: any[] = Array.isArray(cat.children) ? cat.children : [];
        const isOpen = openId === cat.id;

        if (!children.length) {
          return (
            <Link key={cat.id} href={`/category/${cat.slug}`} onClick={onClose}
              className="flex items-center gap-2 py-2 text-slate-700 hover:text-primary font-medium text-sm">
              {cat.image
                ? <img src={cat.image} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-1.5" />
              }
              {cat.name}
            </Link>
          );
        }

        return (
          <div key={cat.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : cat.id)}
              className="flex items-center justify-between w-full py-2 text-slate-700 hover:text-primary font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                {cat.image
                  ? <img src={cat.image} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-1.5" />
                }
                {cat.name}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="ml-4 border-l-2 border-primary/20 pl-3 pb-1 space-y-1">
                {children.map((child: any) => {
                  const grandchildren: any[] = Array.isArray(child.children) ? child.children : [];
                  return (
                    <div key={child.id}>
                      {/* Subcategory link */}
                      <Link href={`/category/${child.slug}`} onClick={onClose}
                        className="flex items-center gap-2 py-1.5 text-slate-700 hover:text-primary text-sm font-medium">
                        <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {child.name}
                      </Link>
                      {/* Leaf (grandchild) items */}
                      {grandchildren.length > 0 && (
                        <div className="ml-5 space-y-0.5 mb-1">
                          {grandchildren.map((gc: any) => (
                            <Link key={gc.id} href={`/category/${gc.slug}`} onClick={onClose}
                              className="flex items-center gap-1.5 py-1 text-slate-500 hover:text-primary text-xs">
                              <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                              {gc.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile scroll strip (compact, top-level only) ────────────────────────
function MobileCategoryStrip() {
  const cats = useCats();
  return (
    <nav className="md:hidden border-t border-slate-100 overflow-x-auto scrollbar-hide">
      <div className="flex items-center text-sm px-2 py-1">
        <Link href="/categories"
          className="flex items-center gap-1.5 whitespace-nowrap font-bold text-slate-800 hover:text-primary px-3 py-1.5 transition border-r border-slate-100 mr-2 flex-shrink-0">
          <LayoutGrid className="w-4 h-4" />
          <span>All</span>
        </Link>
        {cats.slice(0, 10).map((cat: any) => (
          <Link key={cat.id} href={`/category/${cat.slug}`}
            className="whitespace-nowrap text-slate-600 hover:text-primary font-medium transition px-3 py-1.5 hover:bg-primary/5 rounded-lg flex-shrink-0">
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

// ── Main Navbar ──────────────────────────────────────────────────────────────
export function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const searchRef = useRef<HTMLFormElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { items } = useCartStore();
  const wishlistItems = useWishlistStore((s) => s.items);
  const { user, logout } = useAuthStore();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const wishlistCount = wishlistItems.length;
  const settings = useSettings();
  const { t } = useTranslation();

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); setMobileSearchOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Debounced search autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      productsApi.autocomplete(searchQuery)
        .then((r: any) => {
          const results = r?.data?.data ?? r?.data ?? [];
          setSearchSuggestions(Array.isArray(results) ? results.slice(0, 7) : []);
        })
        .catch(() => setSearchSuggestions([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setMobileSearchOpen(false);
      setMobileOpen(false);
    }
  };

  const primaryBg = { backgroundColor: settings.PRIMARY_COLOR || '#0ea5e9' };
  const headerBg  = { backgroundColor: settings.HEADER_BG_COLOR || '#ffffff' };

  /** Returns true when a hex color is perceived as "light" (needs dark text/icons) */
  function isLightColor(hex: string): boolean {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return false;
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    // Perceived luminance (WCAG formula)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
  }

  const primaryIsLight = isLightColor(settings.PRIMARY_COLOR || '#0ea5e9');
  const headerIsLight  = isLightColor(settings.HEADER_BG_COLOR || '#ffffff');
  // Text/icon classes for adaptive contrast
  const primaryTextClass = primaryIsLight ? 'text-slate-800' : 'text-white';
  const primaryIconClass  = primaryIsLight ? 'text-slate-800 hover:text-slate-600' : 'text-white hover:text-white/80';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 shadow-sm" style={headerBg}>

        {/* Announcement bar */}
        {settings.BANNER_TEXT && (
          <div className="text-white text-xs text-center py-1.5 px-4 font-medium"
            style={{ backgroundColor: settings.BANNER_BG_COLOR || settings.PRIMARY_COLOR || '#0ea5e9' }}>
            {settings.BANNER_TEXT}
          </div>
        )}

        {/* ── Top info bar: hidden on mobile ───────────────────── */}
        <div className={`hidden md:block text-sm py-1.5 ${primaryTextClass}`} style={primaryBg}>
          <div className="container-app flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{t('nav.deliverTo')}: {settings.SITE_ADDRESS || 'Kampala, Uganda'}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/seller/register" className={`hover:underline opacity-90 ${primaryTextClass}`}>{t('nav.becomeSeller')}</Link>
              <Link href="/rider/register" className={`hover:underline opacity-90 ${primaryTextClass}`}>{t('nav.deliverWithUs')}</Link>
              <LangCurrencySwitcher />
            </div>
          </div>
        </div>

        {/* ── MOBILE compact bar ───────────────────────────────── */}
        <div className="md:hidden container-app py-2.5 flex items-center gap-2" style={primaryBg}>
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img
              src={settings.SITE_LOGO_URL || '/logo.png'}
              alt={settings.SITE_NAME || 'TotalStore'}
              className={`h-8 w-auto object-contain ${primaryIsLight ? 'brightness-0' : 'brightness-0 invert'}`}
            />
          </Link>
          <div className="flex-1" />
          <button onClick={() => setMobileSearchOpen((v) => !v)}
            className={`p-2 transition ${primaryIconClass}`} aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <Link href="/cart" className={`relative p-2 transition ${primaryIconClass}`}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-accent text-slate-900 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
          <button onClick={() => setMobileOpen(true)}
            className={`p-2 transition ${primaryIconClass}`} aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile expandable search */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button type="submit"
                className="bg-accent px-4 py-2 rounded-lg hover:bg-accent/90 transition">
                <Search className="h-4 w-4 text-slate-800" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile category scroll strip */}
        <MobileCategoryStrip />

        {/* ── DESKTOP main bar ─────────────────────────────────── */}
        <div className="hidden md:block bg-white border-b border-slate-100">
          <div className="max-w-[1500px] mx-auto px-6 lg:px-10 h-[72px] flex items-center gap-5">

            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0 mr-2">
              <img
                src={settings.SITE_LOGO_URL || '/logo.png'}
                alt={settings.SITE_NAME || 'TotalStore'}
                className="h-11 w-auto object-contain"
              />
            </Link>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 min-w-0 relative" ref={searchRef}>
              <div className={`flex items-stretch rounded-xl overflow-hidden border-2 shadow-sm transition-colors duration-150 ${searchFocused ? 'border-sky-500' : 'border-slate-200 hover:border-slate-300'}`}>
                {/* Category selector */}
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="border-r border-slate-200 pl-4 pr-2 text-sm bg-slate-50 text-slate-600 focus:outline-none flex-shrink-0 cursor-pointer font-medium min-w-[130px]"
                >
                  <option value="">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home-living">Home & Living</option>
                  <option value="food-grocery">Food & Groceries</option>
                  <option value="beauty">Beauty & Health</option>
                  <option value="sports">Sports & Fitness</option>
                  <option value="automotive">Automotive</option>
                </select>
                {/* Search input */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  placeholder={t('nav.searchPlaceholder')}
                  className="flex-1 px-4 py-3 text-sm focus:outline-none text-slate-800 placeholder:text-slate-400 bg-white min-w-0"
                />
                {/* Search button */}
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-6 transition-colors font-semibold flex-shrink-0 text-sm"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden lg:inline">Search</span>
                </button>
              </div>

              {/* Autocomplete dropdown */}
              {searchFocused && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] overflow-hidden">
                  {searchSuggestions.map((s: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => {
                        setSearchQuery(s.name);
                        setSearchSuggestions([]);
                        router.push(`/products/${s.slug}`);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{s.name}</span>
                      {s.category?.name && (
                        <span className="text-xs text-slate-400 flex-shrink-0">{s.category.name}</span>
                      )}
                    </button>
                  ))}
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery)}`}
                    onMouseDown={() => setSearchSuggestions([])}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-sky-600 font-medium hover:bg-sky-50 transition-colors border-t border-slate-100"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Search all results for &ldquo;{searchQuery}&rdquo;
                  </Link>
                </div>
              )}
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Account */}
              {user ? (
                <div className="relative group">
                  <button className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors min-w-[58px]">
                    <User className="h-5 w-5" />
                    <span className="text-[11px] font-medium truncate max-w-[64px]">{user.firstName}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-100 rounded-xl shadow-xl hidden group-hover:block z-50 py-1.5">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">{user.firstName} {user.lastName}</p>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 transition-colors">{t('nav.myAccount')}</Link>
                    <Link href="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 transition-colors">{t('nav.myOrders')}</Link>
                    <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 transition-colors">{t('nav.wishlist')}</Link>
                    <hr className="my-1 border-slate-100" />
                    <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" />{t('nav.signOut')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/auth/login" className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors min-w-[58px]">
                  <User className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Sign In</span>
                </Link>
              )}

              {/* Notifications */}
              <NotificationBell />

              {/* Wishlist */}
              <Link href="/wishlist" className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors min-w-[58px]">
                <Heart className="h-5 w-5" />
                <span className="text-[11px] font-medium">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link href="/cart" className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors min-w-[58px]">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-[11px] font-medium">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

          </div>
        </div>

        {/* Desktop category bar */}
        <DesktopCategoryBar />
      </header>

      {/* ── MOBILE DRAWER ─────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[82vw] max-w-xs bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog" aria-modal="true" aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={primaryBg}>
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <img
              src={settings.SITE_LOGO_URL || '/logo.png'}
              alt={settings.SITE_NAME || 'TotalStore'}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-white/80 hover:text-white p-1" aria-label="Close menu">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Drawer search */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button type="submit" className="bg-accent px-3 py-2 rounded-lg hover:bg-accent/90 transition">
              <Search className="h-4 w-4 text-slate-800" />
            </button>
          </form>
        </div>

        {/* Scrollable nav links */}
        <nav className="flex-1 overflow-y-auto">
          {/* Categories accordion */}
          <DrawerCategories onClose={() => setMobileOpen(false)} />

          {user && (
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Account</p>
              <Link href="/account" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" /> My Account
              </Link>
              <Link href="/orders" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
                <Package className="w-4 h-4 text-slate-400 flex-shrink-0" /> My Orders
              </Link>
              <Link href="/wishlist" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
                <Heart className="w-4 h-4 text-slate-400 flex-shrink-0" /> Wishlist
              </Link>
            </div>
          )}
          <div className="px-5 pt-4 pb-2">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Quick Links</p>
            <Link href="/" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
              <Home className="w-4 h-4 text-slate-400 flex-shrink-0" /> Home
            </Link>
            <Link href="/products?sort=newest" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
              <Package className="w-4 h-4 text-slate-400 flex-shrink-0" /> New Arrivals
            </Link>
            <Link href="/flash-sales" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 py-2.5 text-amber-600 hover:text-accent font-medium text-sm">
              Flash Sales
            </Link>
          </div>
          <div className="px-5 pt-3 pb-2 border-t border-slate-100 mt-2">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Earn with us</p>
            <Link href="/seller/register" onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
              Become a Seller
            </Link>
            <Link href="/rider/register" onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-slate-700 hover:text-primary font-medium text-sm">
              Deliver with Us
            </Link>
          </div>
        </nav>

        {/* Sign in / out */}
        <div className="border-t border-slate-100 px-5 py-4 flex-shrink-0">
          {user ? (
            <button onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-3 text-red-500 font-medium w-full text-sm">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          ) : (
            <Link href="/auth/login" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-slate-700 hover:text-primary font-medium text-sm">
              <LogIn className="w-4 h-4" /> Sign In / Register
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
