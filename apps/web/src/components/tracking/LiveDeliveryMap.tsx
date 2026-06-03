'use client';

/**
 * LiveDeliveryMap — Leaflet-based map showing a rider's live location + road route.
 * Uses CartoCDN Voyager tiles (Google Maps-quality road detail).
 * Fetches real road route from OSRM (free, no API key).
 * MUST be dynamically imported (ssr: false) due to Leaflet's window dependency.
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths broken by Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  riderLocation: { lat: number; lng: number } | null;
  destination:   { lat: number; lng: number; street?: string; city?: string } | null;
}

// Custom motorcycle icon
const motoIcon = L.divIcon({
  html: `<div style="
    width:44px; height:44px; border-radius:50%;
    background:#16a34a; border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
    font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.25);
  ">🏍</div>`,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// Custom destination pin
const destIcon = L.divIcon({
  html: `<div style="
    width:36px; height:44px; display:flex; flex-direction:column; align-items:center;
  ">
    <div style="
      width:36px; height:36px; border-radius:50%;
      background:#ef4444; border:3px solid #fff;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 8px rgba(239,68,68,0.4);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
    <div style="width:2px;height:8px;background:#ef4444;"></div>
  </div>`,
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
});

export default function LiveDeliveryMap({ riderLocation, destination }: Props) {
  const mapRef    = useRef<L.Map | null>(null);
  const mapDiv    = useRef<HTMLDivElement>(null);
  const riderMkr  = useRef<L.Marker | null>(null);
  const destMkr   = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const fallback  = useRef<L.Polyline | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;

    const map = L.map(mapDiv.current, {
      center: [0.3136, 32.5811], // Kampala default
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
      subdomains: ['a','b','c','d'],
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update rider marker & route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (riderLocation) {
      const ll = L.latLng(riderLocation.lat, riderLocation.lng);
      if (riderMkr.current) {
        riderMkr.current.setLatLng(ll);
      } else {
        riderMkr.current = L.marker(ll, { icon: motoIcon }).addTo(map);
      }

      // Fetch OSRM route if we also have destination
      if (destination) {
        const url = `https://router.project-osrm.org/route/v1/driving/${riderLocation.lng},${riderLocation.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full`;
        fetch(url, { signal: AbortSignal.timeout?.(8000) })
          .then((r) => r.json())
          .then((data) => {
            const coords: [number,number][] = data.routes?.[0]?.geometry?.coordinates ?? [];
            if (!coords.length) return;
            const lls = coords.map(([lng, lat]) => L.latLng(lat, lng));

            // Remove old route lines
            routeLine.current?.remove();
            fallback.current?.remove();

            // Add white border + colored line
            L.polyline(lls, { color: '#ffffff', weight: 9, opacity: 0.6 }).addTo(map);
            routeLine.current = L.polyline(lls, { color: '#0369a1', weight: 5, opacity: 0.9 }).addTo(map);

            // Fit bounds to route
            map.fitBounds(L.latLngBounds(lls), { padding: [40, 40] });
          })
          .catch(() => {
            // Fallback: draw straight dotted line
            fallback.current?.remove();
            fallback.current = L.polyline([
              [riderLocation.lat, riderLocation.lng],
              [destination.lat, destination.lng],
            ], { color: '#0369a1', weight: 3, dashArray: '8 6', opacity: 0.6 }).addTo(map);
          });
      } else {
        map.setView(ll, Math.max(map.getZoom(), 14), { animate: true });
      }
    }
  }, [riderLocation, destination]);

  // Update destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destination) return;
    const ll = L.latLng(destination.lat, destination.lng);
    if (destMkr.current) {
      destMkr.current.setLatLng(ll);
    } else {
      destMkr.current = L.marker(ll, { icon: destIcon })
        .bindPopup(destination.street ? `${destination.street}, ${destination.city || ''}` : 'Delivery Address')
        .addTo(map);
    }
  }, [destination]);

  return (
    <div
      ref={mapDiv}
      className="w-full h-full"
      style={{ minHeight: 240 }}
    />
  );
}
