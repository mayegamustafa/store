'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Package, MapPin, CheckCircle, Truck } from 'lucide-react';

interface TrackingPageProps {
  params: { orderId: string };
}

export default function OrderTrackingPage({ params }: TrackingPageProps) {
  const { orderId } = params;
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

  const steps = [
    { key: 'PENDING', label: 'Order Placed', icon: Package },
    { key: 'PROCESSING', label: 'Preparing', icon: Package },
    { key: 'SHIPPED', label: 'Picked Up', icon: Truck },
    { key: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: MapPin },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
  ];

  const currentStep = steps.findIndex((s) => s.key === deliveryStatus);

  // Initialize Leaflet map + Socket.IO
  useEffect(() => {
    let L: any;
    let destroyed = false;

    async function init() {
      L = (await import('leaflet')).default;

      // Load Leaflet CSS via link tag
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (destroyed || !mapDivRef.current) return;

      // Fix default marker icons (webpack/next.js issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }

      const map = L.map(mapDivRef.current, { center: [0.3136, 32.5811], zoom: 13 });
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Socket.IO tracking connection
      const socket = io(`${wsUrl}/tracking`, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('track:order', { orderId });
      });

      socket.on('rider:moved', (data: any) => {
        const lat = data.location?.lat ?? data.lat;
        const lng = data.location?.lng ?? data.lng;
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

        setRiderLocation({ lat, lng });
        const latlng = L.latLng(lat, lng);

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng(latlng);
        } else {
          const icon = L.divIcon({
            className: '',
            html: `<div style="background:#0ea5e9;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)">🏍</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          riderMarkerRef.current = L.marker(latlng, { icon }).addTo(map);
        }
        map.setView(latlng, Math.max(map.getZoom(), 14));
      });

      socket.on('delivery:status', (data: { status: string }) => {
        setDeliveryStatus(data.status);
      });

      socket.on('disconnect', () => setIsConnected(false));
    }

    init();

    return () => {
      destroyed = true;
      socketRef.current?.disconnect();
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      riderMarkerRef.current = null;
    };
  }, [orderId, wsUrl]);

  return (
    <div className="container-app py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
      <p className="text-slate-500 mb-6">Order ID: <span className="font-mono text-sky-600">{orderId}</span></p>

      {/* Connection status */}
      <div className={`flex items-center gap-2 text-sm mb-6 ${isConnected ? 'text-green-600' : 'text-slate-400'}`}>
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
        {isConnected ? 'Live tracking active' : 'Connecting...'}
      </div>

      {/* Status timeline */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-6">Order Status</h2>
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200">
            <div
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${Math.max(0, (currentStep / (steps.length - 1))) * 100}%` }}
            />
          </div>
          <div className="flex justify-between relative z-10">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isDone = i <= currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-medium text-center ${isDone ? 'text-sky-600' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live map */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-sky-500" />
          Live Rider Location
        </h2>
        <div className="relative">
          <div
            ref={mapDivRef}
            className="w-full rounded-lg overflow-hidden border border-slate-200"
            style={{ height: '400px' }}
          />
          {!riderLocation && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg pointer-events-none">
              <div className="text-center text-slate-400">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p>Waiting for rider location...</p>
                <p className="text-sm mt-1">GPS tracking will appear once rider is on the way</p>
              </div>
            </div>
          )}
        </div>
        {riderLocation && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            Rider at {riderLocation.lat.toFixed(5)}, {riderLocation.lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}
