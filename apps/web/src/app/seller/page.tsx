'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { ExternalLink, Store, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// The seller dashboard is served on this same domain at /seller/* (the web
// app's rewrites proxy anything under /seller that isn't one of our marketing
// pages to the seller service). A relative URL keeps this working on any host.
const SELLER_APP_URL = process.env.NEXT_PUBLIC_SELLER_URL || '/seller/dashboard';

export default function SellerDashboardRedirectPage() {
  const { user } = useAuthStore();

  useEffect(() => {
    // Auto-redirect after 1.5s if user is a seller
    if (user?.role === 'SELLER' || user?.role === 'ADMIN') {
      const timer = setTimeout(() => {
        window.location.href = SELLER_APP_URL;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="w-7 h-7 text-sky-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Seller Dashboard</h1>
        <p className="text-sm text-slate-500 mb-6">
          Manage your products, orders, and earnings in the TotalStore Seller Portal.
        </p>

        {user && (user as any).role !== 'BUYER' ? (
          <>
            <p className="text-xs text-slate-400 mb-4">Redirecting you to the seller portal…</p>
            <a
              href={SELLER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
            >
              Open Seller Dashboard
              <ExternalLink className="w-4 h-4" />
            </a>
          </>
        ) : !user ? (
          <>
            <p className="text-sm text-slate-500 mb-5">Sign in to your seller account to access the dashboard.</p>
            <Link href="/auth/login" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5">Your account isn't set up as a seller yet.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/seller/register" className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm">
                Register as a Seller
              </Link>
              <a
                href={SELLER_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition"
              >
                Open Portal Anyway
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
