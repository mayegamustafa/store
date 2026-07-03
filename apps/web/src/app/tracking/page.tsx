'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { Search, Package, Truck, CheckCircle, Clock, MapPin, XCircle, ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// ── Types ────────────────────────────────────────────────────────────────────
interface RiderLocation { lat: number; lng: number; updatedAt?: string }
interface Destination   { lat: number; lng: number; street?: string; city?: string }

// ── Lazy-loaded Map (avoids SSR issues with Leaflet) ────────────────────────
const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-400 text-sm animate-pulse">Loading map…</div>
    </div>
  ),
});

const STATUS_STEPS = [
  { key: 'PENDING',          label: 'Order Placed',     icon: Clock },
  { key: 'CONFIRMED',        label: 'Confirmed',        icon: CheckCircle },
  { key: 'PROCESSING',       label: 'Processing',       icon: Package },
  { key: 'SHIPPED',          label: 'Shipped',          icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED',        label: 'Delivered',        icon: CheckCircle },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

// ── Hook: Live socket.io tracking ────────────────────────────────────────────
function useOrderTracking(orderId: string | null) {
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [destination, setDestination]     = useState<Destination | null>(null);
  const [connected, setConnected]         = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!orderId) return;
    let mounted = true;

    const connect = async () => {
      const { io } = await import('socket.io-client');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      // Same origin by default: the web gateway proxies /socket.io to the API.
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';

      const socket = io(`${apiBase}/tracking`, {
        transports: ['polling', 'websocket'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (mounted) setConnected(true);
        socket.emit('track:order', { orderId });
      });

      socket.on('rider:moved', (data: any) => {
        if (!mounted) return;
        const lat = (data.location?.lat ?? data.lat) as number | undefined;
        const lng = (data.location?.lng ?? data.lng) as number | undefined;
        if (lat != null && lng != null) {
          setRiderLocation({ lat, lng, updatedAt: data.updatedAt });
        }
      });

      socket.on('delivery:destination', (data: any) => {
        if (!mounted) return;
        if (data.lat != null && data.lng != null) {
          setDestination({ lat: data.lat, lng: data.lng, street: data.street, city: data.city });
        }
      });

      socket.on('disconnect', () => { if (mounted) setConnected(false); });
    };

    connect();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, [orderId]);

  return { riderLocation, destination, connected };
}

// ── Main tracking content ────────────────────────────────────────────────────
function TrackingContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [query, setQuery] = useState(searchParams.get('order') || '');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['track', query],
    queryFn: () => ordersApi.get(query).then((r: any) => r?.data ?? r),
    enabled: !!query,
    retry: false,
  });

  const order = data?.data ?? data;
  const isCancelled = order?.status === 'CANCELLED';
  const currentIdx = isCancelled ? -1 : STATUS_ORDER.indexOf(order?.status ?? '');
  const orderId = order?.id ?? null;
  const isOutForDelivery = ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order?.status);

  const { riderLocation, destination, connected } = useOrderTracking(isOutForDelivery ? orderId : null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(orderNumber.trim());
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-800 text-white py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-sky-200 text-sm mb-8">Enter your order number to get real-time delivery updates</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. TS-20260301-ABC123"
              className="flex-1 bg-white/15 border border-white/30 text-white placeholder-white/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/25 transition"
            />
            <button
              type="submit"
              disabled={!orderNumber.trim() || isLoading}
              className="bg-white text-sky-700 hover:bg-sky-50 font-semibold px-5 py-3 rounded-xl flex items-center gap-2 text-sm disabled:opacity-50 transition"
            >
              <Search className="w-4 h-4" />
              Track
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-8 animate-pulse space-y-4">
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
        )}

        {isError && query && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="font-semibold text-slate-800 mb-1">Order Not Found</h2>
            <p className="text-sm text-slate-500">
              No order found with number <strong>{query}</strong>. Please check and try again.
            </p>
          </div>
        )}

        {order && !isError && (
          <div className="space-y-4">
            {/* Order header */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">#{order.orderNumber}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Placed {new Date(order.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOutForDelivery && (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Radio className="w-3 h-3" />
                      {connected ? 'Live' : 'Connecting…'}
                    </div>
                  )}
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    isCancelled ? 'bg-red-100 text-red-700'
                    : order.status === 'DELIVERED' ? 'bg-green-100 text-green-700'
                    : 'bg-sky-100 text-sky-700'
                  }`}>
                    {order.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Progress steps */}
              {!isCancelled ? (
                <div className="relative">
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                  <div className="flex justify-between relative z-10">
                    {STATUS_STEPS.slice(0, 5).map((step, idx) => {
                      const Icon = step.icon;
                      const done = idx <= currentIdx;
                      const active = idx === currentIdx;
                      return (
                        <div key={step.key} className="flex flex-col items-center gap-1.5 w-16">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                            done ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'
                          } ${active ? 'ring-4 ring-sky-100' : ''}`}>
                            <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-slate-400'}`} />
                          </div>
                          <span className={`text-[10px] text-center leading-tight ${done ? 'text-sky-600 font-semibold' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Order Cancelled</p>
                    {order.cancelReason && <p className="text-xs text-red-600 mt-0.5">{order.cancelReason}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* ── LIVE MAP ──────────────────────────────────────── */}
            {isOutForDelivery && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-500" /> Live Delivery Map
                  </h3>
                  {riderLocation ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Rider located
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Waiting for rider GPS…</span>
                  )}
                </div>
                <div className="h-72">
                  <LiveDeliveryMap
                    riderLocation={riderLocation}
                    destination={destination ?? (order.address?.latitude ? {
                      lat: parseFloat(order.address.latitude),
                      lng: parseFloat(order.address.longitude),
                    } : null)}
                  />
                </div>
                {!riderLocation && (
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-center">
                    GPS tracking will appear once the rider is on the way
                  </div>
                )}
              </div>
            )}

            {/* Delivery address */}
            {order.address && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-500" /> Delivery Address
                </h3>
                <p className="text-sm text-slate-700">{order.address.fullName}</p>
                <p className="text-sm text-slate-500">{order.address.addressLine1}</p>
                <p className="text-sm text-slate-500">{order.address.city}{order.address.district ? `, ${order.address.district}` : ''}</p>
                <p className="text-sm text-slate-500">{order.address.phone}</p>
              </div>
            )}

            {/* Items */}
            {order.items?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-3">Items ({order.items.length})</h3>
                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.productImage && (
                          <img src={item.productImage} alt={item.productName} className="w-full h-full object-contain p-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{item.productName}</p>
                        <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-800">
                        UGX {Number(item.subtotal).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status history */}
            {order.statusHistory?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-3">Status History</h3>
                <div className="space-y-3">
                  {[...order.statusHistory].reverse().map((h: any) => (
                    <div key={h.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 bg-sky-400 rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-700">{h.status?.replace(/_/g, ' ')}</p>
                        {h.note && <p className="text-slate-400 text-xs">{h.note}</p>}
                        <p className="text-slate-400 text-xs">{new Date(h.createdAt).toLocaleString('en-UG')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <Link href="/orders" className="text-sm text-sky-600 hover:underline flex items-center justify-center gap-1">
                View all my orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {!query && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <h2 className="font-semibold text-slate-700 mb-2">Enter Your Order Number</h2>
            <p className="text-sm text-slate-400 mb-4">Your order number can be found in your confirmation email or order history.</p>
            <Link href="/orders" className="text-sm text-sky-600 hover:underline">
              View My Orders
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="container-app py-20 text-center text-slate-400">Loading...</div>}>
      <TrackingContent />
    </Suspense>
  );
}
