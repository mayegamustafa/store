'use client';

import dynamic from 'next/dynamic';
import { MapPin, RefreshCw, Activity } from 'lucide-react';
import { useState } from 'react';
import { useAdminStore } from '@/stores/admin.store';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

const LiveMapClient = dynamic(
  () => import('@/components/maps/LiveMapClient'),
  { ssr: false, loading: () => <div className="h-[600px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Loading map…</div> },
);

export default function LiveMapPage() {
  const [key, setKey] = useState(0);
  const { token } = useAdminStore();

  const { data: deliveries } = useQuery({
    queryKey: ['admin-active-deliveries'],
    queryFn: () => adminApi.getPendingDeliveries(),
    refetchInterval: 30_000,
  });

  const activeCount = Array.isArray(deliveries) ? deliveries.length : 0;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Fleet Map</h1>
            <p className="text-sm text-slate-500">
              {activeCount > 0 ? `${activeCount} active delivery${activeCount !== 1 ? 'ies' : ''}` : 'All active riders in real-time'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reconnect
        </button>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <LiveMapClient key={key} adminToken={token ?? undefined} height="640px" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="card p-4">
          <p className="text-slate-500 text-xs font-medium uppercase mb-1">Active Deliveries</p>
          <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Riders on the road</p>
        </div>
        <div className="card p-4">
          <p className="text-slate-500 text-xs font-medium uppercase mb-1">Update Protocol</p>
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-green-500" /> WebSocket
          </p>
          <p className="text-xs text-slate-400 mt-0.5">/tracking namespace · 2s throttle</p>
        </div>
        <div className="card p-4">
          <p className="text-slate-500 text-xs font-medium uppercase mb-1">WS Events</p>
          <p className="font-semibold text-slate-800">admin:watch_all</p>
          <p className="text-xs text-slate-400 mt-0.5">admin:deliveries_snapshot · rider:moved</p>
        </div>
      </div>

      {/* Active deliveries list */}
      {activeCount > 0 && Array.isArray(deliveries) && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
            Active Deliveries
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="table-th">Order</th>
                <th className="table-th">Status</th>
                <th className="table-th">Rider</th>
                <th className="table-th">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(deliveries as any[]).map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="table-td font-mono text-xs text-slate-700">{d.order?.orderNumber}</td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.status === 'IN_TRANSIT' ? 'bg-indigo-50 text-indigo-700' :
                      d.status === 'PICKED_UP'  ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>{d.status}</span>
                  </td>
                  <td className="table-td text-slate-600">{d.rider?.user?.firstName ?? '—'}</td>
                  <td className="table-td text-slate-500 truncate max-w-[200px]">
                    {(d.order?.address as any)?.street ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
