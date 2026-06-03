'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import dynamic from 'next/dynamic';
import { useSellerStore } from '@/stores/seller.store';
import { ArrowLeft, MapPin, Package, Truck, CheckCircle2, Clock, User, Phone } from 'lucide-react';
import Link from 'next/link';

const LiveMapClient = dynamic(
  () => import('@/components/maps/LiveMapClient'),
  { ssr: false, loading: () => <div className="h-80 bg-slate-100 rounded-xl animate-pulse" /> },
);

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Rider Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: 'text-blue-600 bg-blue-50',
  PICKED_UP: 'text-amber-600 bg-amber-50',
  IN_TRANSIT: 'text-indigo-600 bg-indigo-50',
  DELIVERED: 'text-green-600 bg-green-50',
  FAILED: 'text-red-600 bg-red-50',
};

export default function SellerOrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useSellerStore();

  const { data: tracking, isLoading, isError } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => sellerApi.getOrderTracking(id),
    refetchInterval: 15_000,
    enabled: !!id,
  });

  const delivery = (tracking as any)?.delivery;
  const order = (tracking as any)?.order;
  const rider = delivery?.rider;
  const currentLoc = delivery?.currentLocation;
  const isActive = delivery && ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-80 skeleton rounded-xl" />
        <div className="h-32 skeleton rounded-xl" />
      </div>
    );
  }

  if (isError || !delivery) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href={`/orders/${id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Order
        </Link>
        <div className="card p-8 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Tracking not available for this order</p>
          <p className="text-sm mt-1">Delivery has not started yet or is already complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/orders/${id}`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              Order #{order?.orderNumber}
            </h1>
            <p className="text-sm text-slate-500">Live delivery tracking</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[delivery.status] || 'bg-slate-100 text-slate-600'}`}>
          {STATUS_LABEL[delivery.status] || delivery.status}
        </span>
      </div>

      {/* Live Map */}
      {isActive ? (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-700">Live Map</span>
            {currentLoc && (
              <span className="text-xs text-slate-400 ml-auto">
                Updated {currentLoc.updatedAt ? new Date(currentLoc.updatedAt).toLocaleTimeString() : '—'}
              </span>
            )}
          </div>
          <LiveMapClient
            orderId={id}
            adminToken={token ?? undefined}
            height="380px"
          />
        </div>
      ) : (
        <div className="card p-6 text-center text-slate-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">
            {delivery.status === 'DELIVERED' ? 'Order has been delivered' : 'Rider not yet moving'}
          </p>
        </div>
      )}

      {/* Rider Info */}
      {rider && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> Rider
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{rider.name || 'Rider'}</p>
              <p className="text-xs text-slate-500">{rider.vehicleType ?? 'Motorcycle'}</p>
            </div>
            {rider.phone && (
              <a href={`tel:${rider.phone}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                <Phone className="w-4 h-4" /> {rider.phone}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Status Timeline */}
      {delivery.statusLogs?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Timeline
          </h2>
          <ol className="space-y-3">
            {[...delivery.statusLogs].reverse().map((log: any, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">{STATUS_LABEL[log.status] || log.status}</span>
                  {log.note && <span className="text-slate-500 ml-1">— {log.note}</span>}
                  <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Delivery Timestamps */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Delivery Details
        </h2>
        <div className="space-y-2 text-sm text-slate-600">
          {delivery.estimatedTime && (
            <div className="flex justify-between">
              <span>Estimated delivery</span>
              <span className="font-medium">{new Date(delivery.estimatedTime).toLocaleString()}</span>
            </div>
          )}
          {delivery.actualPickupAt && (
            <div className="flex justify-between">
              <span>Picked up at</span>
              <span className="font-medium">{new Date(delivery.actualPickupAt).toLocaleString()}</span>
            </div>
          )}
          {delivery.deliveredAt && (
            <div className="flex justify-between">
              <span>Delivered at</span>
              <span className="font-medium text-green-600">{new Date(delivery.deliveredAt).toLocaleString()}</span>
            </div>
          )}
          {!delivery.estimatedTime && !delivery.actualPickupAt && !delivery.deliveredAt && (
            <p className="text-slate-400">No timestamp data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
