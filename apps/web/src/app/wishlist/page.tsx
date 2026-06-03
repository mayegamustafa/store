'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCartStore } from '@/stores/cart.store';
import { useCurrencyStore } from '@/stores/currency.store';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

export default function WishlistPage() {
  const { items, remove, clear } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const { format } = useCurrencyStore();

  // Clean up any persisted wishlist items that have no valid slug
  useEffect(() => {
    items.forEach((item) => {
      if (!item.slug || item.slug === 'undefined') remove(item.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveToCart = (item: (typeof items)[0]) => {
    addItem({ id: item.id, productId: item.id, name: item.name, price: item.price, image: item.image || '', quantity: 1, sellerName: '' });
    remove(item.id);
    toast.success('Moved to cart!');
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="container-app">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            My Wishlist
            <span className="text-base font-normal text-slate-500">({items.length} items)</span>
          </h1>
          {items.length > 0 && (
            <button
              onClick={() => { clear(); toast.success('Wishlist cleared'); }}
              className="text-sm text-red-500 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <Heart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Your wishlist is empty</h2>
            <p className="text-slate-500 text-sm mb-6">Save items you love by tapping the heart icon on products.</p>
            <Link href="/" className="btn-primary px-6 py-2.5 rounded-xl inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden group">
                <div className="relative aspect-square bg-slate-50">
                  {item.slug ? (
                    <Link href={`/products/${item.slug}`}>
                      <Image
                        src={item.image || '/placeholder.png'}
                        alt={item.name}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition duration-300"
                      />
                    </Link>
                  ) : (
                    <Image
                      src={item.image || '/placeholder.png'}
                      alt={item.name}
                      fill
                      className="object-contain p-2"
                    />
                  )}
                  <button
                    onClick={() => { remove(item.id); toast.success('Removed from wishlist'); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <Heart className="w-3.5 h-3.5 fill-red-500" />
                  </button>
                </div>
                <div className="p-3">
                  {item.slug ? (
                    <Link href={`/products/${item.slug}`}>
                      <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug mb-1 hover:text-sky-600 transition-colors">
                        {item.name}
                      </p>
                    </Link>
                  ) : (
                    <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug mb-1">{item.name}</p>
                  )}
                  <p className="text-sm font-bold text-sky-600 mb-2">{format(item.price)}</p>
                  <button
                    onClick={() => moveToCart(item)}
                    className="w-full flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
