'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { User, Package, Heart, MapPin, Bell, ChevronRight, LogOut } from 'lucide-react';

const QUICK_LINKS = [
  { href: '/orders',            icon: <Package className="w-5 h-5 text-primary" />,             label: 'My Orders',     desc: 'Track and manage your orders' },
  { href: '/account/wishlist',  icon: <Heart className="w-5 h-5 text-accent" />,                label: 'Wishlist',      desc: 'Products you saved for later' },
  { href: '/notifications',     icon: <Bell className="w-5 h-5 text-blue-500" />,               label: 'Notifications', desc: 'Updates about your orders & deals' },
  { href: '/account/addresses', icon: <MapPin className="w-5 h-5 text-green-500" />,            label: 'Addresses',     desc: 'Manage delivery addresses' },
];

export default function AccountPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user, router]);

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => ordersApi.list({ limit: 3 }).then((r: any) => r.data?.data ?? r.data?.orders ?? []).catch(() => []),
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const recentOrders: any[] = Array.isArray(ordersData) ? ordersData : [];

  if (!user) return null;

  const u = user as any;
  const initials = (u.firstName?.[0] ?? u.name?.[0] ?? u.email[0]).toUpperCase();

  return (
    <div className="container-app py-8 max-w-3xl">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-900">
            {u.firstName && u.lastName
              ? `${u.firstName} ${u.lastName}`
              : u.name ?? u.email}
          </h1>
          <p className="text-sm text-slate-500">{user.email}</p>
          {u.phone && (
            <p className="text-xs text-slate-400 mt-0.5">{u.phone}</p>
          )}
        </div>
        <Link href="/account/edit" className="btn-primary text-xs px-4 py-2 rounded-xl font-medium shrink-0">
          Edit
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition">{item.label}</p>
              <p className="text-xs text-slate-500 truncate">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-800">Order #{order.orderNumber ?? order.id}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{order.itemCount ?? order.items?.length ?? '—'} items</p>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-50 text-green-700' :
                    order.status === 'shipped'   ? 'bg-blue-50 text-blue-700' :
                    order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={() => { logout(); router.push('/'); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 text-red-600 hover:bg-red-50 transition text-sm font-medium"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
