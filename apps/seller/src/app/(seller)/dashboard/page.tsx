'use client';

import { useQuery } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { ShoppingBag, Package, DollarSign, Star, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function SellerDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: sellerApi.getDashboard,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-7 w-36 skeleton mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 skeleton" />)}
        </div>
        <div className="h-64 skeleton" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, gradient: 'bg-gradient-to-br from-sky-500 to-blue-600', sub: `${stats?.pendingOrders || 0} pending` },
    { label: 'Total Revenue', value: `UGX ${((stats?.totalRevenue || 0) / 1_000_000).toFixed(2)}M`, icon: DollarSign, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', sub: `UGX ${((stats?.monthRevenue || 0) / 1000).toFixed(0)}K this month` },
    { label: 'Active Products', value: stats?.activeProducts || 0, icon: Package, gradient: 'bg-gradient-to-br from-violet-500 to-purple-600', sub: `${stats?.pendingProducts || 0} pending approval` },
    { label: 'Avg Rating', value: stats?.avgRating?.toFixed(1) || '0.0', icon: Star, gradient: 'bg-gradient-to-br from-amber-500 to-orange-500', sub: `${stats?.totalReviews || 0} reviews` },
  ];

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your store performance at a glance</p>
      </div>

      {/* Alert if not approved */}
      {stats?.sellerStatus !== 'APPROVED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Store Pending Approval</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Your store is under review. Products won't be visible until approved.{' '}
              {stats?.sellerStatus === 'REJECTED' && (
                <Link href="/store" className="underline">View reason & resubmit</Link>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, gradient, sub }) => (
          <div key={label} className={`relative overflow-hidden rounded-2xl p-5 shadow-card hover:shadow-card-md transition-all duration-200 hover:-translate-y-0.5 ${gradient}`}>
            <div className="absolute right-0 top-0 w-20 h-20 opacity-10">
              <Icon className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
              <p className="text-sm text-white/80 font-medium mt-0.5">{label}</p>
              {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <p className="card-title">Recent Orders</p>
            <p className="text-xs text-slate-400 mt-0.5">Latest activity</p>
          </div>
          <Link href="/orders" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Order #', 'Buyer', 'Product', 'Earning', 'Status'].map((h) => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders?.map((order: any) => (
                <tr key={order.id} className="table-row">
                  <td className="table-td font-mono text-xs text-primary-600 font-medium">#{order.orderNumber}</td>
                  <td className="table-td font-medium text-slate-800">{order.user?.name || '—'}</td>
                  <td className="table-td text-slate-500 truncate max-w-[160px]">{order.items?.[0]?.product?.name}</td>
                  <td className="table-td font-semibold text-emerald-600">UGX {Number(order.sellerEarning || order.total).toLocaleString()}</td>
                  <td className="table-td">
                    <span className={`badge ${{ DELIVERED: 'badge-success', PENDING: 'badge-warning', CANCELLED: 'badge-danger' }[order.status as string] || 'badge-info'}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats?.recentOrders?.length && (
                <tr><td colSpan={5} className="table-td text-center text-slate-400 py-12"><ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
