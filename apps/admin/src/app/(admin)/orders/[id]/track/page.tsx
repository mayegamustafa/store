'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ArrowLeft, MapPin, Package } from 'lucide-react';
import Link from 'next/link';

const LiveMapClient = dynamic(
  () => import('@/components/maps/LiveMapClient'),
  { ssr: false, loading: () => <div className="h-[500px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Loading map…</div> },
);

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-slate-100 text-slate-600',
};

export default function OrderTrackPage() {
  const { id } = useParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ['order', id],
    queryFn: () => adminApi.getOrder(id),
    refetchInterval: 15000,
  });

  const order = data?.order ?? data;

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <Link href="/orders" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Track Order {order?.orderNumber ? `#${order.orderNumber}` : `#${id.slice(-6).toUpperCase()}`}
            </h1>
            <p className="text-sm text-slate-500">Live GPS tracking — updates every few seconds</p>
          </div>
        </div>
        {order?.status && (
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Order summary cards */}
      {order && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Buyer</p>
            <p className="font-semibold text-slate-900">{order.buyer?.firstName} {order.buyer?.lastName}</p>
            <p className="text-xs text-slate-400">{order.buyer?.phone}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Rider</p>
            <p className="font-semibold text-slate-900">{order.rider?.user?.firstName ?? '—'} {order.rider?.user?.lastName ?? ''}</p>
            <p className="text-xs text-slate-400">{order.rider?.user?.phone ?? 'Not assigned'}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Total</p>
            <p className="font-semibold text-slate-900">${order.totalAmount ?? order.total ?? '—'}</p>
            <p className="text-xs text-slate-400">{order.items?.length ?? 0} items</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Delivery Address</p>
            <p className="font-semibold text-slate-900 text-sm leading-tight">{order.deliveryAddress?.street ?? (typeof order.address === 'string' ? order.address : order.address?.addressLine1) ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2">
        <LiveMapClient orderId={id} height="520px" />
      </div>

      {/* Timeline */}
      {order?.statusHistory?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" /> Order Timeline
          </h2>
          <div className="space-y-3">
            {order.statusHistory.map((s: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.status?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-400">{new Date(s.createdAt ?? s.timestamp).toLocaleString()}</p>
                  {s.note && <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
