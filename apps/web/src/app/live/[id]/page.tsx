'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRuntimeApiBaseUrl } from '@/lib/runtime-config';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  status: 'LIVE' | 'UPCOMING' | 'ENDED';
  viewerCount: number;
  thumbnailUrl?: string;
  streamUrl?: string;
  products?: Array<{ id: string; name: string; price: number; images?: string[]; slug?: string }>;
  seller?: { id?: string; storeName?: string; logoUrl?: string };
}

export default function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${getRuntimeApiBaseUrl()}/live-streams/${id}`, { cache: 'no-store' });
      if (!res.ok) { router.push('/live'); return; }
      setStream(await res.json());
    } catch { router.push('/live'); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (stream?.status === 'LIVE') {
      const t = setInterval(load, 15_000);
      return () => clearInterval(t);
    }
  }, [stream?.status, load]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stream) return null;

  const isLive = stream.status === 'LIVE';
  const isEnded = stream.status === 'ENDED';

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/live" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Live Streams
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video + info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Player */}
            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
              {isLive && stream.streamUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="text-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-red-500 mx-auto mb-3">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                    <p className="text-white font-medium">Live stream is active</p>
                    <p className="text-slate-400 text-xs mt-1 font-mono break-all max-w-xs">{stream.streamUrl}</p>
                    <p className="text-slate-500 text-xs mt-3">Open in your media player for the best experience</p>
                    <a href={stream.streamUrl} target="_blank" rel="noopener noreferrer"
                       className="mt-3 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z"/></svg>
                      Watch Stream
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {stream.thumbnailUrl && (
                    <img src={stream.thumbnailUrl} alt={stream.title}
                         className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  )}
                  <div className="relative text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-slate-500" strokeWidth="1.5">
                        <rect x="2" y="7" width="20" height="15" rx="2" /><path d="M17 2L12 7 7 2"/>
                      </svg>
                    </div>
                    <p className="text-slate-300 font-medium">
                      {stream.status === 'UPCOMING' ? 'Stream starting soon' : 'Stream has ended'}
                    </p>
                  </div>
                </div>
              )}
              {/* Live badge */}
              {isLive && (
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {stream.viewerCount} watching
                  </span>
                </div>
              )}
              {isEnded && (
                <span className="absolute top-3 left-3 bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">ENDED</span>
              )}
            </div>

            {/* Title & seller */}
            <div>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white leading-tight">{stream.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    {stream.seller?.logoUrl && (
                      <img src={stream.seller.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    )}
                    <span className="text-sky-400 text-sm font-medium">{stream.seller?.storeName || 'Seller'}</span>
                  </div>
                </div>
              </div>
              {stream.description && (
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">{stream.description}</p>
              )}
            </div>
          </div>

          {/* Featured products sidebar */}
          {stream.products && stream.products.length > 0 && (
            <div className="lg:col-span-1">
              <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
                </svg>
                Featured Products
              </h2>
              <div className="space-y-3 overflow-y-auto max-h-[600px]">
                {stream.products.map(p => (
                  <Link key={p.id} href={p.slug ? `/products/${p.slug}` : '/products'}>
                    <div className="flex gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl p-3 transition-colors cursor-pointer">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-slate-500" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-sky-400 text-sm font-bold mt-1">USh {p.price?.toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
