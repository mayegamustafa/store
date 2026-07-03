'use client';

// This file must be loaded client-side only (no SSR).
// Parent page wraps this with next/dynamic { ssr: false }.

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRuntimeWsBaseUrl } from '@/lib/runtime-config';

interface Rider {
  riderId: string;
  riderName: string;
  lat: number;
  lng: number;
  orderId?: string;
  orderNumber?: string;
  buyerAddress?: string;
  speed?: number;
  heading?: number;
  updatedAt: number;
}

interface Props {
  /** If provided, track only this order. Otherwise admin:watch_all mode */
  orderId?: string;
  /** Seller mode — watch_store */
  sellerId?: string;
  adminToken?: string;
  height?: string;
}

export default function LiveMapClient({ orderId, sellerId, adminToken, height = '600px' }: Props) {
  const mapRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const [riders, setRiders] = useState<Map<string, Rider>>(new Map());
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<Rider | null>(null);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    let L: any;
    let destroyed = false;

    async function init() {
      L = (await import('leaflet')).default;
      // @ts-ignore – Leaflet CSS loaded dynamically
      await import('leaflet/dist/leaflet.css');

      if (destroyed || !mapDivRef.current) return;

      // Fix default marker icons (webpack issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const map = L.map(mapDivRef.current, { center: [0, 36], zoom: 12 });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
        subdomains: ['a','b','c','d'],
        maxZoom: 19,
      }).addTo(map);

      // WebSocket
      const socket = io(`${getRuntimeWsBaseUrl()}/tracking`, {
        transports: ['polling', 'websocket'],
        auth: { token: adminToken ?? '' },
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        if (orderId) {
          socket.emit('track:order', { orderId });
        } else if (sellerId) {
          socket.emit('seller:watch_store', { sellerId });
        } else {
          socket.emit('admin:watch_all');
        }
      });

      socket.on('disconnect', () => setConnected(false));

      function upsertRider(data: any) {
        if (!data?.riderId) return;
        setRiders((prev) => {
          const next = new Map(prev);
          const existing = (next.get(data.riderId) ?? {}) as Partial<Rider>;
          const rider: Rider = {
            riderId: data.riderId,
            riderName: data.riderName ?? existing.riderName ?? 'Rider',
            lat: data.location?.lat ?? data.lat,
            lng: data.location?.lng ?? data.lng,
            orderId: data.orderId ?? existing.orderId,
            orderNumber: data.orderNumber ?? existing.orderNumber,
            buyerAddress: data.buyerAddress ?? existing.buyerAddress,
            speed: data.location?.speed ?? data.speed,
            heading: data.location?.heading ?? data.heading,
            updatedAt: Date.now(),
          };
          next.set(data.riderId, rider);

          // Update/create marker
          if (!isNaN(rider.lat) && !isNaN(rider.lng)) {
            const latlng = L.latLng(rider.lat, rider.lng);
            if (markersRef.current.has(rider.riderId)) {
              markersRef.current.get(rider.riderId)!.setLatLng(latlng);
            } else {
              const icon = L.divIcon({
                className: '',
                html: `<div style="background:#7c3aed;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">R</div>`,
                iconSize: [32, 32], iconAnchor: [16, 16],
              });
              const marker = L.marker(latlng, { icon })
                .addTo(map)
                .on('click', () => setSelected(rider));
              markersRef.current.set(rider.riderId, marker);
              if (orderId) map.setView(latlng, 14);
            }
          }
          return next;
        });
      }

      socket.on('rider:moved', upsertRider);
      socket.on('delivery:status', upsertRider);

      // Snapshot events
      socket.on('admin:deliveries_snapshot', (data: { deliveries: any[] }) => {
        data.deliveries?.forEach(upsertRider);
      });
      socket.on('seller:orders_snapshot', (data: { orders: any[] }) => {
        data.orders?.forEach(upsertRider);
      });
    }

    init();

    return () => {
      destroyed = true;
      socketRef.current?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [orderId, sellerId, adminToken]);

  return (
    <div className="relative" style={{ height }}>
      {/* Status bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-4 py-1.5 shadow text-xs font-medium">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
        {connected ? `Live · ${riders.size} rider${riders.size !== 1 ? 's' : ''} active` : 'Connecting…'}
      </div>

      {/* Map */}
      <div ref={mapDivRef} style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />

      {/* Rider detail panel */}
      {selected && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-xl p-4 w-72">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-900">{selected.riderName}</span>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          </div>
          {selected.orderNumber && <p className="text-xs text-slate-500">Order: <span className="font-mono font-medium">{selected.orderNumber}</span></p>}
          {selected.buyerAddress && <p className="text-xs text-slate-500 mt-1">Delivering to: {selected.buyerAddress}</p>}
          <p className="text-xs text-slate-400 mt-1">
            {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
            {selected.speed != null ? ` · ${Math.round(selected.speed)} km/h` : ''}
          </p>
          {selected.orderId && (
            <a href={`/orders/${selected.orderId}/track`}
              className="mt-3 block text-center text-xs bg-purple-600 text-white rounded-lg py-1.5 hover:bg-purple-700">
              View Order Track
            </a>
          )}
        </div>
      )}
    </div>
  );
}
