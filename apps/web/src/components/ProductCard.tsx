'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { cartApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    images?: string[];
    basePrice?: number;
    price?: number;
    comparePrice?: number;
    compareAtPrice?: number;
    rating?: number;
    averageRating?: number;
    seller?: { storeName?: string; storeCategory?: string };
  };
  size?: 'sm' | 'md';
}

const STORE_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  SUPERMARKET:      { label: 'Supermarket', color: 'bg-green-100 text-green-700' },
  FOOD_RESTAURANT:  { label: 'Food & Restaurant', color: 'bg-orange-100 text-orange-700' },
  BAKERY:           { label: 'Bakery', color: 'bg-amber-100 text-amber-700' },
  PHARMACY:         { label: 'Pharmacy', color: 'bg-blue-100 text-blue-700' },
  ELECTRONICS:      { label: 'Electronics', color: 'bg-sky-100 text-sky-700' },
  FASHION:          { label: 'Fashion', color: 'bg-pink-100 text-pink-700' },
  BEAUTY:           { label: 'Beauty', color: 'bg-purple-100 text-purple-700' },
  HARDWARE:         { label: 'Hardware', color: 'bg-slate-100 text-slate-700' },
};

export function StoreCategoryBadge({ category }: { category?: string | null }) {
  if (!category || category === 'GENERAL') return null;
  const meta = STORE_TYPE_BADGE[category];
  if (!meta) return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{category}</span>
  );
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
  );
}

export function StarRating({ rating, count, size = 'sm' }: { rating?: number; count?: number; size?: 'sm' | 'md' }) {
  const r = Math.round(Number(rating ?? 0));
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`${cls} ${s <= r ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
        ))}
      </div>
      {count != null && <span className="text-xs text-slate-500">({count})</span>}
    </div>
  );
}

export default function ProductCard({ product: p, size = 'md' }: Props) {
  const { toggle: toggleWishlist, has: inWishlist } = useWishlistStore();
  const addToStore = useCartStore((s) => s.addItem);
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const base = Number(p.basePrice ?? p.price ?? 0);
  const compare = Number(p.compareAtPrice ?? p.comparePrice ?? 0);
  const discount = compare > base ? Math.round(((compare - base) / compare) * 100) : 0;
  const rating = Number(p.averageRating ?? p.rating ?? 0);

  const addMutation = useMutation({
    mutationFn: () => cartApi.addItem({ productId: p.id, quantity: 1 }),
    onSuccess: () => {
      addToStore({ id: p.id, productId: p.id, name: p.name, price: base, image: p.images?.[0] ?? '', quantity: 1, sellerName: p.seller?.storeName ?? '' });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: () => toast.error('Failed to add to cart'),
  });

  const imgSize = size === 'sm' ? 120 : 180;

  return (
    <div className="product-card group relative">
      <Link href={`/products/${p.slug}`}>
        <div className="product-card-img" style={{ height: size === 'sm' ? 120 : undefined }}>
          {p.images?.[0] ? (
            <Image src={p.images[0]} alt={p.name} fill sizes={`${imgSize}px`}
              className="object-contain p-2 group-hover:scale-105 transition duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </div>
          )}
          {discount > 0 && <span className="absolute top-2 left-2 badge-sale">-{discount}%</span>}
        </div>
        <div className="product-card-body">
          {p.seller?.storeCategory && p.seller.storeCategory !== 'GENERAL' && (
            <div className="mb-1"><StoreCategoryBadge category={p.seller.storeCategory} /></div>
          )}
          <p className="product-card-title">{p.name}</p>
          {rating > 0 && <div className="mb-1"><StarRating rating={rating} /></div>}
          <p className="product-card-price">UGX {base.toLocaleString()}</p>
          {compare > base && <p className="text-[10px] text-slate-400 line-through">UGX {compare.toLocaleString()}</p>}
        </div>
      </Link>

      <button
        onClick={() => { if (!user) { router.push('/auth/login'); return; } addMutation.mutate(); }}
        disabled={addMutation.isPending}
        className="product-card-cart-btn"
        title="Add to cart"
      >
        <ShoppingCart className="w-3.5 h-3.5 text-white" />
      </button>

      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist({ id: p.id, name: p.name, slug: p.slug, image: p.images?.[0], price: base });
        }}
        className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center transition hover:scale-110 ${
          inWishlist(p.id) ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
        }`}
        title={inWishlist(p.id) ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart className={`w-3.5 h-3.5 ${inWishlist(p.id) ? 'fill-red-500' : ''}`} />
      </button>
    </div>
  );
}
