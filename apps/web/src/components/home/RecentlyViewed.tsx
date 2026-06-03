'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ShoppingCart, Heart } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCurrencyStore } from '@/stores/currency.store';

export function RecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      setRecentIds(stored ? JSON.parse(stored) : []);
    } catch { setRecentIds([]); }
  }, []);

  const { data } = useQuery({
    queryKey: ['recently-viewed', recentIds],
    queryFn: () =>
      recentIds.length
        ? productsApi.list({ ids: recentIds.join(','), limit: 8 }).then((r: any) => r.data?.data ?? r.data ?? [])
        : Promise.resolve([]),
    enabled: recentIds.length > 0,
  });

  const items: any[] = Array.isArray(data) ? data : [];
  const { format } = useCurrencyStore();
  const addItem = useCartStore?.((s: any) => s.addItem);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlistStore();
  if (!recentIds.length || items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
      <div className="section-header mb-4">
        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
          <Clock className="w-4 h-4 text-slate-600" />
        </div>
        <h2 className="section-title">Recently Viewed</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {items.map((p: any) => {
          const base = Number(p.basePrice ?? p.price ?? 0);
          return (
            <div key={p.id} className="product-card group relative">
              <Link href={`/products/${p.slug}`}>
                <div className="product-card-img">
                  {p.images?.[0] ? (
                    <Image src={p.images[0]} alt={p.name} fill sizes="120px"
                      className="object-contain p-2 group-hover:scale-105 transition duration-300" />
                  ) : <div className="w-full h-full bg-slate-100" />}
                </div>
                <div className="product-card-body">
                  <p className="product-card-title">{p.name}</p>
                  <p className="product-card-price">{format(base)}</p>
                </div>
              </Link>
              {addItem && (
                <button
                  onClick={() => addItem({ productId: p.id, name: p.name, price: base, image: p.images?.[0], quantity: 1 })}
                  className="product-card-cart-btn"
                  title="Add to cart"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-white" />
                </button>
              )}
              <button
                onClick={(e) => { e.preventDefault(); toggleWishlist({ id: p.id, name: p.name, slug: p.slug, image: p.images?.[0], price: base }); }}
                className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center transition-colors hover:scale-110 ${
                  inWishlist(p.id) ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
                }`}
                title={inWishlist(p.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`w-3.5 h-3.5 ${inWishlist(p.id) ? 'fill-red-500' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
