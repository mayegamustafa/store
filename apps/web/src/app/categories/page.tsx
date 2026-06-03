'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api';
import Link from 'next/link';
import {
  LayoutGrid, ChevronRight, Cpu, Shirt, Sofa, HeartPulse, ShoppingCart,
  Dumbbell, Baby, Car, Monitor, BookOpen, Gamepad2, Leaf, Grid2X2,
  Smartphone, Wrench,
} from 'lucide-react';
import type { ElementType } from 'react';

type CatStyle = { bg: string; icon: ElementType; color: string };
const ICON_MAP: Record<string, CatStyle> = {
  electronics:    { bg: 'bg-sky-50',    icon: Cpu,          color: 'text-sky-600'   },
  fashion:        { bg: 'bg-pink-50',   icon: Shirt,        color: 'text-pink-600'  },
  'home-living':  { bg: 'bg-amber-50',  icon: Sofa,         color: 'text-amber-600' },
  'health-beauty':{ bg: 'bg-rose-50',   icon: HeartPulse,   color: 'text-rose-500'  },
  'food-grocery': { bg: 'bg-green-50',  icon: ShoppingCart, color: 'text-green-600' },
  sports:         { bg: 'bg-orange-50', icon: Dumbbell,     color: 'text-orange-500'},
  'baby-kids':    { bg: 'bg-violet-50', icon: Baby,         color: 'text-violet-500'},
  automotive:     { bg: 'bg-zinc-100',  icon: Car,          color: 'text-zinc-600'  },
  computing:      { bg: 'bg-indigo-50', icon: Monitor,      color: 'text-indigo-600'},
  books:          { bg: 'bg-yellow-50', icon: BookOpen,     color: 'text-yellow-600'},
  gaming:         { bg: 'bg-purple-50', icon: Gamepad2,     color: 'text-purple-600'},
  garden:         { bg: 'bg-lime-50',   icon: Leaf,         color: 'text-lime-600'  },
  phones:         { bg: 'bg-sky-50',    icon: Smartphone,   color: 'text-sky-500'   },
  tools:          { bg: 'bg-stone-100', icon: Wrench,       color: 'text-stone-600' },
};
const defaultStyle: CatStyle = { bg: 'bg-slate-100', icon: Grid2X2, color: 'text-slate-500' };

const FALLBACK_CATS = [
  { id: 'electronics', name: 'Electronics', slug: 'electronics', children: [
      { id: 'phones', name: 'Phones & Tablets', slug: 'phones-tablets' },
      { id: 'laptops', name: 'Laptops', slug: 'laptops' },
      { id: 'tv', name: 'TVs & Audio', slug: 'tvs-audio' },
      { id: 'cameras', name: 'Cameras', slug: 'cameras' },
      { id: 'acc', name: 'Accessories', slug: 'electronics-accessories' },
    ]},
  { id: 'fashion', name: 'Fashion', slug: 'fashion', children: [
      { id: 'mens', name: "Men's Clothing", slug: 'mens-clothing' },
      { id: 'womens', name: "Women's Clothing", slug: 'womens-clothing' },
      { id: 'shoes', name: 'Shoes', slug: 'shoes' },
      { id: 'bags', name: 'Bags & Accessories', slug: 'bags-accessories' },
      { id: 'watches', name: 'Watches', slug: 'watches' },
    ]},
  { id: 'home', name: 'Home & Living', slug: 'home-living', children: [
      { id: 'furniture', name: 'Furniture', slug: 'furniture' },
      { id: 'kitchen', name: 'Kitchen', slug: 'kitchen' },
      { id: 'bedding', name: 'Bedding', slug: 'bedding' },
      { id: 'decor', name: 'Decor', slug: 'decor' },
    ]},
  { id: 'health', name: 'Health & Beauty', slug: 'health-beauty', children: [
      { id: 'skincare', name: 'Skincare', slug: 'skincare' },
      { id: 'haircare', name: 'Hair Care', slug: 'hair-care' },
      { id: 'vitamins', name: 'Vitamins & Supplements', slug: 'vitamins' },
      { id: 'pharmacy', name: 'Pharmacy', slug: 'pharmacy' },
    ]},
  { id: 'food', name: 'Food & Grocery', slug: 'food-grocery', children: [
      { id: 'fresh', name: 'Fresh Produce', slug: 'fresh-produce' },
      { id: 'beverages', name: 'Beverages', slug: 'beverages' },
      { id: 'snacks', name: 'Snacks', slug: 'snacks' },
      { id: 'dairy', name: 'Dairy & Eggs', slug: 'dairy-eggs' },
    ]},
  { id: 'sports', name: 'Sports', slug: 'sports', children: [
      { id: 'gym', name: 'Gym Equipment', slug: 'gym-equipment' },
      { id: 'outdoor', name: 'Outdoor Sports', slug: 'outdoor-sports' },
      { id: 'sportswear', name: 'Sports Clothing', slug: 'sports-clothing' },
    ]},
  { id: 'kids', name: 'Baby & Kids', slug: 'baby-kids', children: [
      { id: 'babycare', name: 'Baby Care', slug: 'baby-care' },
      { id: 'toys', name: 'Toys & Games', slug: 'toys-games' },
      { id: 'kidscloth', name: 'Kids Clothing', slug: 'kids-clothing' },
    ]},
  { id: 'auto', name: 'Automotive', slug: 'automotive', children: [
      { id: 'parts', name: 'Car Parts', slug: 'car-parts' },
      { id: 'caracc', name: 'Car Accessories', slug: 'car-accessories' },
      { id: 'tyres', name: 'Tyres & Rims', slug: 'tyres-rims' },
    ]},
  { id: 'computing', name: 'Computing', slug: 'computing', children: [
      { id: 'desktops', name: 'Desktops', slug: 'desktops' },
      { id: 'printers', name: 'Printers', slug: 'printers' },
      { id: 'networking', name: 'Networking', slug: 'networking' },
    ]},
  { id: 'books', name: 'Books & Stationery', slug: 'books', children: [
      { id: 'fiction', name: 'Fiction', slug: 'fiction' },
      { id: 'nonfiction', name: 'Non-Fiction', slug: 'non-fiction' },
      { id: 'educational', name: 'Educational', slug: 'educational' },
    ]},
  { id: 'gaming', name: 'Gaming', slug: 'gaming', children: [
      { id: 'consoles', name: 'Consoles', slug: 'consoles' },
      { id: 'games', name: 'Games & Software', slug: 'games-software' },
      { id: 'gamingacc', name: 'Gaming Accessories', slug: 'gaming-accessories' },
    ]},
  { id: 'garden', name: 'Garden & Tools', slug: 'garden', children: [
      { id: 'handtools', name: 'Hand Tools', slug: 'hand-tools' },
      { id: 'powertools', name: 'Power Tools', slug: 'power-tools' },
      { id: 'gardensupplies', name: 'Garden Supplies', slug: 'garden-supplies' },
    ]},
];

export default function CategoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data ?? []).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const cats: any[] = Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATS;

  return (
    <div className="container-app py-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Categories</h1>
          <p className="text-sm text-slate-500">Browse {cats.length} departments</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cats.map((cat: any) => {
            const children: any[] = Array.isArray(cat.children) ? cat.children : [];
            const style = ICON_MAP[cat.slug] ?? defaultStyle;
            const CatIcon = style.icon;
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition">
                <Link href={`/category/${cat.slug}`} className="block">
                  <div className="relative h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center`}>
                        <CatIcon className={`w-7 h-7 ${style.color}`} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <h2 className="text-white font-bold text-sm drop-shadow">{cat.name}</h2>
                      {children.length > 0 && (
                        <p className="text-white/70 text-[11px]">{children.length} subcategories</p>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="p-3">
                  {children.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-2">
                        {children.slice(0, 6).map((child: any) => (
                          <Link
                            key={child.id}
                            href={`/category/${child.slug}`}
                            className="flex items-center gap-1 py-1.5 text-xs text-slate-600 hover:text-primary transition group"
                          >
                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-primary flex-shrink-0" />
                            <span className="truncate">{child.name}</span>
                          </Link>
                        ))}
                      </div>
                      {children.length > 6 && (
                        <Link href={`/category/${cat.slug}`} className="text-[11px] text-primary font-semibold hover:underline mt-1 block">
                          +{children.length - 6} more
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link href={`/category/${cat.slug}`} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      Shop Now <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
