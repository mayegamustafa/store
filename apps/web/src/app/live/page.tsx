'use client';
import { useEffect, useState, useCallback } from 'react';
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
  seller?: { storeName?: string; logoUrl?: string };
}

async function fetchStreams(status?: string): Promise<LiveStream[]> {
  try {
    const params = new URLSearchParams({ page: '1' });
    if (status && status !== 'ALL') params.set('status', status);
    const res = await fetch(`${getRuntimeApiBaseUrl()}/live-streams?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch { return []; }
}

export default function LiveStreamsPage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'LIVE' | 'UPCOMING' | 'ALL'>('LIVE');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchStreams(filter);
    setStreams(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <circle cx="12" cy="12" r="4" />
                <path d="M6.3 6.3A8 8 0 109.7 17.7M22 12A10 10 0 0012 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Live Streams</h1>
              <p className="text-slate-400 text-sm">Watch sellers showcase their products live</p>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-6 mt-6 border-b border-slate-700">
            {(['LIVE', 'UPCOMING', 'ALL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  filter === f
                    ? f === 'LIVE' ? 'border-red-500 text-red-400' : 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'LIVE' && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live Now
                  </span>
                )}
                {f === 'UPCOMING' && 'Upcoming'}
                {f === 'ALL' && 'All Streams'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-slate-600" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="15" rx="2" />
                <path d="M17 2L12 7 7 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {filter === 'LIVE' ? 'No live streams right now' : 'No streams found'}
            </h3>
            <p className="text-slate-500 text-sm">Check back soon for more live content</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {streams.map(stream => (
              <Link key={stream.id} href={`/live/${stream.id}`}>
                <div className={`group bg-slate-800 rounded-xl overflow-hidden hover:ring-2 transition-all cursor-pointer ${
                  stream.status === 'LIVE' ? 'hover:ring-red-500' : 'hover:ring-sky-500'
                }`}>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-slate-700">
                    {stream.thumbnailUrl ? (
                      <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-12 h-12 text-slate-600" strokeWidth="1.5">
                          <rect x="2" y="7" width="20" height="15" rx="2" />
                          <path d="M17 2L12 7 7 2" />
                        </svg>
                      </div>
                    )}
                    {/* Live badge */}
                    {stream.status === 'LIVE' && (
                      <div className="absolute top-2 left-2 flex gap-2">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                        <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-300"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                          {stream.viewerCount}
                        </span>
                      </div>
                    )}
                    {stream.status === 'UPCOMING' && (
                      <span className="absolute top-2 left-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded">UPCOMING</span>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-white text-sm font-medium line-clamp-2 leading-snug">{stream.title}</p>
                    <p className="text-slate-400 text-xs mt-1.5">
                      {stream.seller?.storeName || 'Seller'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
