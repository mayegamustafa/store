'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { TrendingUp, Package, DollarSign, Download, RefreshCcw, BarChart3 } from 'lucide-react';

const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const PRESETS = [
  { label: 'Today',      from: () => startOfDay(new Date()),  to: () => endOfDay(new Date()) },
  { label: 'Yesterday',  from: () => startOfDay(subDays(new Date(), 1)),  to: () => endOfDay(subDays(new Date(), 1)) },
  { label: 'Last 7 days',  from: () => startOfDay(subDays(new Date(), 6)), to: () => endOfDay(new Date()) },
  { label: 'Last 30 days', from: () => startOfDay(subDays(new Date(), 29)), to: () => endOfDay(new Date()) },
  { label: 'Last 90 days', from: () => startOfDay(subDays(new Date(), 89)), to: () => endOfDay(new Date()) },
];

function fmt(n: number) { return `UGX ${Number(n || 0).toLocaleString()}`; }

export default function ReportsPage() {
  const [preset, setPreset] = useState(2); // Last 7 days default
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [useCustom, setUseCustom]  = useState(false);

  const from = useCustom && customFrom ? new Date(customFrom) : PRESETS[preset].from();
  const to   = useCustom && customTo   ? new Date(customTo)   : PRESETS[preset].to();

  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr   = format(to,   'yyyy-MM-dd');

  const { data: revenueData, isLoading: loadRev, refetch: refetchRev } = useQuery({
    queryKey: ['reports-revenue', fromStr, toStr],
    queryFn: () => adminApi.getRevenueReport(fromStr, toStr),
  });

  const { data: topData, isLoading: loadTop } = useQuery({
    queryKey: ['reports-top'],
    queryFn: () => adminApi.getTopProducts,
  });

  const { data: analyticsData, isLoading: loadAnalytics } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => adminApi.getAnalyticsStats(),
  });

  const { data: trendData } = useQuery({
    queryKey: ['analytics-trend', 30],
    queryFn: () => adminApi.getAnalyticsTrend(30),
  });

  const revRows: any[] = (revenueData?.data as any[]) || [];
  const totalRevenue  = revRows.reduce((s: number, r: any) => s + Number(r._sum?.amount || 0), 0);
  const totalTx       = revRows.reduce((s: number, r: any) => s + Number(r._count?.id || 0), 0);

  const topProducts: any[] = (topData as any)?.data || (topData as any) || [];

  const stats: any = (analyticsData?.data as any) || {};
  const trend: any[] = (trendData?.data as any[]) || [];

  const downloadCSV = () => {
    const rows = [
      ['Payment Method', 'Revenue (UGX)', 'Transactions'],
      ...revRows.map((r: any) => [r.method, r._sum?.amount || 0, r._count?.id || 0]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `revenue_${fromStr}_to_${toStr}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-500" /> Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">Revenue, sales and product performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { refetchRev(); }} className="p-2 border rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-2 items-center">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => { setPreset(i); setUseCustom(false); }}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                !useCustom && preset === i ? 'bg-primary-600 text-white' : 'border hover:bg-slate-50 text-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="text-slate-300 mx-1">|</span>
          <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }}
            className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }}
            className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Showing: <span className="font-medium text-slate-600">{format(from, 'MMM d, yyyy')}</span> → <span className="font-medium text-slate-600">{format(to, 'MMM d, yyyy')}</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: 'text-primary-500', bg: 'bg-sky-50' },
          { label: 'Transactions', value: totalTx.toLocaleString(), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Total Orders', value: (stats.totalOrders || '—').toLocaleString(), icon: Package, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'Total Users', value: (stats.totalUsers || '—').toLocaleString(), icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{c.label}</p>
            {loadRev || loadAnalytics
              ? <div className="h-7 w-24 skeleton mt-1" />
              : <p className="text-2xl font-bold text-slate-900 mt-0.5">{c.value}</p>
            }
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by Method (Pie) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Revenue by Payment Method</h3>
          {loadRev ? (
            <div className="flex items-center justify-center h-56">
              <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : revRows.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-slate-400 text-sm">No payment data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={revRows.map((r: any) => ({ name: r.method, value: Number(r._sum?.amount || 0) }))}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {revRows.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Method breakdown table */}
          {revRows.length > 0 && (
            <div className="mt-4 space-y-2">
              {revRows.map((r: any, i: number) => (
                <div key={r.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-700 font-medium">{r.method}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{fmt(r._sum?.amount || 0)}</span>
                    <span className="text-slate-400 ml-2 text-xs">({r._count?.id || 0} txn)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visitor Trend (Bar) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Visitor Trend (last 30 days)</h3>
          {trend.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-slate-400 text-sm">No visitor trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="visitors" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Top Selling Products</h3>
        {loadTop ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1 h-4 bg-slate-100 rounded" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No product data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">#</th>
                  <th className="pb-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">Product</th>
                  <th className="pb-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">Seller</th>
                  <th className="pb-3 text-xs text-slate-400 font-semibold uppercase tracking-wide text-right">Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.slice(0, 10).map((p: any, i: number) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0]
                          ? <img src={p.images[0]} className="w-9 h-9 object-cover rounded-lg" alt="" />
                          : <div className="w-9 h-9 bg-slate-100 rounded-lg" />
                        }
                        <span className="font-medium text-slate-900 truncate max-w-[260px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-500">{p.seller?.storeName || '—'}</td>
                    <td className="py-3 text-right">
                      <span className="font-bold text-slate-900">{Number(p.totalSold || 0).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
