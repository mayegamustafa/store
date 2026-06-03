'use client';

import dynamic from 'next/dynamic';
import { useSellerStore } from '@/stores/seller.store';
import { MapPin, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const LiveMapClient = dynamic(
  () => import('@/components/maps/LiveMapClient'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400">
        Loading map…
      </div>
    ),
  },
);

export default function SellerLiveMapPage() {
  const { user, token } = useSellerStore();
  const [key, setKey] = useState(0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Deliveries</h1>
            <p className="text-sm text-slate-500">Track your active orders in real-time</p>
          </div>
        </div>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Reconnect
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-2">
        <LiveMapClient
          key={key}
          sellerId={user?.id}
          adminToken={token ?? undefined}
          height="680px"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-slate-500 text-xs font-medium uppercase mb-1">Map Source</p>
          <p className="font-semibold text-slate-800">CartoCDN Voyager</p>
          <p className="text-xs text-slate-400">Google Maps-quality roads</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-slate-500 text-xs font-medium uppercase mb-1">Update Protocol</p>
          <p className="font-semibold text-slate-800">WebSocket / Socket.IO</p>
          <p className="text-xs text-slate-400">/tracking namespace</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-slate-500 text-xs font-medium uppercase mb-1">WS Events</p>
          <p className="font-semibold text-slate-800">seller:watch_store</p>
          <p className="text-xs text-slate-400">seller:orders_snapshot · rider:moved</p>
        </div>
      </div>
    </div>
  );
}
