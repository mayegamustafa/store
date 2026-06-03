'use client';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCurrencyStore } from '@/stores/currency.store';

export function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productsApi.featured().then((r: any) => r.data),
  });
  const addItem = useCartStore?.((s: any) => s.addItem);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlistStore();
  const { format } = useCurrencyStore();

  if (isLoading)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <div className="aspect-square skeleton" />
            <div className="p-3 space-y-2">
              <div className="h-3 skeleton w-full" />
              <div className="h-3 skeleton w-3/4" />
              <div className="h-4 skeleton w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {data?.map((p: any) => {
        const base = Number(p.basePrice ?? 0);
        const compare = Number(p.comparePrice ?? 0);
        const discount = compare > base ? Math.round(((compare - base) / compare) * 100) : 0;
        return (
          <div key={p.id} className="product-card relative">
            <Link href={`/products/${p.slug}`}>
              <div className="product-card-img relative">
                {p.images?.[0] ? (
                  <Image src={p.images[0]} alt={p.name} fill sizes="200px"
                    className="object-contain p-2 transition-transform duration-300" />
                ) : <div className="w-full h-full bg-slate-100" />}
                {discount > 0 && <span className="absolute top-2 left-2 badge-sale">-{discount}%</span>}
                {p.isNew && <span className="absolute top-2 right-2 badge-new">New</span>}
              </div>
              <div className="product-card-body">
                <p className="text-[10px] text-slate-400 mb-0.5">{p.seller?.storeName}</p>
                <p className="product-card-title">{p.name}</p>
                {Number(p.rating) > 0 && (
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-2.5 h-2.5 ${i < Math.round(Number(p.rating)) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                    ))}
                    <span className="text-[10px] text-slate-400 ml-0.5">({p.reviewCount ?? 0})</span>
                  </div>
                )}
                <p className="product-card-price">{format(base)}</p>
                {compare > base && (
                  <p className="text-[10px] text-slate-400 line-through">{format(compare)}</p>
                )}
              </div>
            </Link>
            {addItem && (
              <button
                onClick={() => addItem({ productId: p.id, name: p.name, price: base, image: p.images?.[0], quantity: 1 })}
                className="product-card-cart-btn"
                title="Add to cart">
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
  );
}
