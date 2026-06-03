'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';

export default function WishlistPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user, router]);

  if (!user) return null;

  // Wishlist items would come from a wishlist store or API.
  // Showing empty state with clear CTAs for now.
  return (
    <div className="container-app py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold text-slate-900">My Wishlist</h1>
      </div>

      <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Heart className="w-14 h-14 text-slate-200 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-600">Your wishlist is empty</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Tap the heart icon on any product to save it here.
        </p>
        <Link
          href="/products"
          className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
        >
          <ShoppingCart className="w-4 h-4" /> Browse Products
        </Link>
      </div>
    </div>
  );
}
