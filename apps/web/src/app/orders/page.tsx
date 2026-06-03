'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import Link from 'next/link';
import { Package, ChevronRight, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  PROCESSING: { label: 'Processing', color: 'text-purple-600 bg-purple-50', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'text-sky-600 bg-sky-50', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function OrdersPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getBuyerOrders(1, 20).then((r: any) => r?.data?.data ?? r?.data ?? []),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container-app py-20 text-center">
        <p className="text-slate-600 mb-4">Please login to view your orders</p>
        <Link href="/auth/login" className="btn-primary px-6 py-2.5 rounded-xl inline-block">Login</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-app py-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-200 rounded-xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  const orders = Array.isArray(data) ? data : (data?.data || []);

  if (orders.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
        <p className="text-slate-500 mb-6">Start shopping to see your orders here</p>
        <Link href="/products" className="btn-primary px-6 py-2.5 rounded-xl inline-block">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="container-app max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Orders</h1>
        <div className="space-y-3">
          {orders.map((order: any) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusCfg.icon;
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      #{order.orderNumber}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">
                    {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {' '}
                    {new Date(order.createdAt).toLocaleDateString('en-UG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm font-bold text-sky-600">
                    UGX {Number(order.total).toLocaleString()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
