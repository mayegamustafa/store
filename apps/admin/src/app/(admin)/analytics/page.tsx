'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Globe, Monitor, Smartphone, Tablet, Eye, MapPin, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface Stats {
  today:   { value: number; change: string };
  weekly:  { value: number; change: string };
  monthly: { value: number; change: string };
  total:   { value: number; change: string };
}
interface TrendPoint { day: string; count: number }
interface GeoRow     { country: string; visitors: number; pct: number }
interface CityRow    { city: string; visitors: number }
interface DeviceRow  { device: string; count: number; pct: number }
interface LogRow {
  id: string; userId?: string; sessionId?: string; page: string;
  country?: string; city?: string; browser?: string; device: string; createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const COUNTRY_CODES: Record<string, string> = {
  Uganda: 'UG', Kenya: 'KE', Tanzania: 'TZ', Rwanda: 'RW',
  Ethiopia: 'ET', 'South Africa': 'ZA', Nigeria: 'NG',
  'United States': 'US', 'United Kingdom': 'GB', Unknown: '?',
};
const cflag = (c: string) => COUNTRY_CODES[c] ?? '?';

const DEVICE_COLORS: Record<string, string> = {
  Mobile: 'bg-sky-500', Desktop: 'bg-emerald-500', Tablet: 'bg-amber-500',
};
const DEVICE_STROKE: Record<string, string> = {
  Mobile: '#0ea5e9', Desktop: '#10b981', Tablet: '#f59e0b',
};
const DEVICE_ICONS: Record<string, React.ElementType> = {
  Mobile: Smartphone, Desktop: Monitor, Tablet: Tablet,
};

// ── Tiny SVG sparkline ──────────────────────────────────────────────────────
function Sparkline({ data }: { data: TrendPoint[] }) {
  if (!data.length) return null;
  const values = data.map((d) => d.count);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const H = 60, W = 320;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  const fill = pts + ` ${W},${H} 0,${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <polygon points={fill} fill="rgba(14,165,233,0.15)" />
      <polyline points={pts} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * W;
        const y = H - ((v - min) / (max - min || 1)) * H;
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#0ea5e9" />;
      })}
    </svg>
  );
}

export default function AuditTrailPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [trend,   setTrend]   = useState<TrendPoint[]>([]);
  const [geo,     setGeo]     = useState<GeoRow[]>([]);
  const [cities,  setCities]  = useState<CityRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [logs,    setLogs]    = useState<LogRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, g, c, d] = await Promise.all([
        (adminApi as any).getAnalyticsStats().then((r: any) => r.data ?? r),
        (adminApi as any).getAnalyticsTrend(7).then((r: any) => r.data ?? r),
        (adminApi as any).getAnalyticsGeo().then((r: any) => r.data ?? r),
        (adminApi as any).getAnalyticsCities().then((r: any) => r.data ?? r),
        (adminApi as any).getAnalyticsDevices().then((r: any) => r.data ?? r),
      ]);
      setStats(s); setTrend(Array.isArray(t) ? t : []);
      setGeo(Array.isArray(g) ? g : []); setCities(Array.isArray(c) ? c : []);
      setDevices(Array.isArray(d) ? d : []);
      setLastUpdated(new Date());
    } catch (e) { console.error('Analytics error', e); }
    setLoading(false);
  }, []);

  const loadLogs = useCallback(async (p: number, q: string) => {
    setLogLoading(true);
    try {
      const r: any = await (adminApi as any).getAnalyticsLogs({ page: p, limit: 50, search: q });
      const res = r.data ?? r;
      setLogs(res.data ?? []); setTotal(res.total ?? 0);
    } catch (e) { console.error('Logs error', e); }
    setLogLoading(false);
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadLogs(page, search); }, [page, search, loadLogs]);

  const STAT_CARDS = [
    { label: "Today's Visitors", key: 'today' as const,   icon: Eye,        color: 'text-sky-600',     bg: 'bg-sky-50' },
    { label: 'Weekly Visitors',  key: 'weekly' as const,  icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Monthly Visitors', key: 'monthly' as const, icon: Users,      color: 'text-violet-600',  bg: 'bg-violet-50' },
    { label: 'Total Visitors',   key: 'total' as const,   icon: Globe,      color: 'text-amber-600',   bg: 'bg-amber-50' },
  ];
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time visitor insights, geographic data, and activity logs</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-slate-400">Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={loadSummary} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-xl hover:bg-slate-50 transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : 'text-slate-500'}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, key, icon: Icon, color, bg }) => {
          const d = stats?.[key];
          return (
            <div key={key} className="bg-white rounded-2xl border p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{label}</span>
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              {loading ? <div className="h-8 w-20 skeleton" /> :
                <p className="text-3xl font-black text-slate-900">{d?.value?.toLocaleString() ?? '0'}</p>}
              <span className="text-xs text-emerald-600 font-semibold">{d?.change ?? '—'} vs last period</span>
            </div>
          );
        })}
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold text-slate-800 mb-4">Visitor Trends — Last 7 Days</h2>
        {loading ? <div className="h-16 bg-slate-50 rounded animate-pulse" /> :
          trend.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No visit data yet — visits will appear once the web store is accessed</p> : (
          <>
            <Sparkline data={trend} />
            <div className="flex justify-between mt-1">
              {trend.map((d, i) => (
                <span key={i} className="text-xs text-slate-400 text-center flex-1">
                  {d.day}<span className="block text-slate-600 font-medium">{d.count}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Geographic + Devices */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Geo */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-500" /> Geographic Distribution
          </h2>
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-6 skeleton" />)}</div> :
            geo.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No geographic data yet</p> : (
            <div className="space-y-3">
              {geo.map(({ country, visitors, pct }) => (
                <div key={country}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <span className="text-[10px] font-bold badge-neutral px-1.5 py-0.5 rounded font-mono">{cflag(country)}</span>
                      {country}
                    </span>
                    <span className="text-slate-500">{visitors.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 className="font-semibold text-slate-700 mt-6 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-500" /> Top Cities
          </h3>
          {cities.length === 0 ? <p className="text-sm text-slate-400">No city data yet</p> : (
            <div className="grid grid-cols-2 gap-2">
              {cities.slice(0, 8).map(({ city, visitors }) => (
                <div key={city} className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  <span>{city}</span><span className="font-semibold">{visitors.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary-500" /> Devices
          </h2>
          {loading ? <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-8 skeleton" />)}</div> :
            devices.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No device data yet</p> : (
            <div className="space-y-5">
              {devices.map(({ device, pct }) => {
                const Icon = DEVICE_ICONS[device] ?? Monitor;
                return (
                  <div key={device}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Icon className="w-4 h-4 text-slate-400" /> {device}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{pct}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${DEVICE_COLORS[device] ?? 'bg-slate-400'} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && devices.length > 0 && (
            <>
              <div className="mt-6 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-36 h-36">
                  {(() => {
                    let offset = 0;
                    const r = 40, circ = 2 * Math.PI * r;
                    return devices.map(({ device, pct }) => {
                      const dash = (pct / 100) * circ;
                      const el = (
                        <circle key={device} cx="60" cy="60" r={r} fill="none"
                          stroke={DEVICE_STROKE[device] ?? '#94a3b8'} strokeWidth="18"
                          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                  <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#64748b">Devices</text>
                </svg>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {devices.map(({ device, pct }) => (
                  <div key={device} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`w-2.5 h-2.5 rounded-full ${DEVICE_COLORS[device] ?? 'bg-slate-400'}`} />
                    {device} {pct}%
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Visitor / Audit Logs */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-slate-800">Visitor Logs</h2>
            <p className="text-xs text-slate-400 mt-0.5">{total.toLocaleString()} total records</p>
          </div>
          <input type="text" placeholder="Search by page, city, browser…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-sky-200" />
        </div>
        {logLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Eye className="w-10 h-10 mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">No visitor logs yet</p>
            <p className="text-xs text-slate-300 mt-1">Logs appear as users visit the web store</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['User / Session', 'Page URL', 'Location', 'Browser', 'Device', 'Timestamp'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {log.userId ? `User #${log.userId.slice(-4).toUpperCase()}` : `Session ${(log.sessionId ?? 'Guest').slice(-4)}`}
                    </td>
                    <td className="px-4 py-3 text-sky-600 whitespace-nowrap max-w-[180px] truncate">{log.page}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {[log.city, log.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{log.browser || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.device === 'Mobile'  ? 'badge-info' :
                        log.device === 'Desktop' ? 'badge-success' :
                        'badge-warning'
                      }`}>{log.device}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-white transition">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-white transition">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
