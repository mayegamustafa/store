'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  ShoppingBag, Users, Store, Truck, TrendingUp, Package, Clock, CheckCircle,
  ArrowUpRight, ArrowDownRight, DollarSign, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    '#f59e0b',
  CONFIRMED:  '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED:    '#06b6d4',
  DELIVERED:  '#10b981',
  CANCELLED:  '#ef4444',
};

function StatCard({
  label, value, icon: Icon, gradient, sub, trend, href,
}: {
  label: string; value: string | number; icon: any;
  gradient: string; sub?: string; trend?: 'up' | 'down'; href?: string;
}) {
  const Tag = (href ? Link : 'div') as any;
  return (
    <Tag
      {...(href ? { href } : {})}
      className={`group relative overflow-hidden rounded-2xl p-5 shadow-card hover:shadow-card-md transition-all duration-200 hover:-translate-y-0.5 ${gradient}`}
    >
      {/* Background decoration */}
      <div className="absolute right-0 top-0 w-24 h-24 opacity-10">
        <Icon className="w-full h-full" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
              trend === 'up' ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-sm text-white/80 mt-0.5 font-medium">{label}</p>
        {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
      </div>
    </Tag>
  );
}

function Skeleton() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 skeleton mb-1" />
      <div className="h-4 w-72 skeleton mt-1.5 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 skeleton" /><div className="h-72 skeleton" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
  });

  if (isLoading) return <Skeleton />;

  const revenueData    = stats?.revenueByMonth || [];
  const ordersByStatus = stats?.ordersByStatus || {};
  const barData = Object.entries(ordersByStatus).map(([status, count]) => ({ status: status.slice(0, 3), count, color: STATUS_COLORS[status] || '#0ea5e9' }));

  return (
    <div className="p-6 max-w-[1600px]">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* ── KPI Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Orders" value={stats?.totalOrders?.toLocaleString() || 0}
          icon={ShoppingBag} gradient="bg-gradient-to-br from-sky-500 to-blue-600"
          sub={`+${stats?.ordersToday || 0} today`} trend="up" href="/orders"
        />
        <StatCard
          label="Total Revenue" value={`UGX ${(stats?.totalRevenue / 1_000_000)?.toFixed(1) || 0}M`}
          icon={DollarSign} gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          sub={`UGX ${(stats?.revenueToday / 1000)?.toFixed(0) || 0}K today`} trend="up" href="/reports"
        />
        <StatCard
          label="Active Sellers" value={stats?.activeSellers?.toLocaleString() || 0}
          icon={Store} gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          sub={`${stats?.pendingSellers || 0} pending`} href="/sellers"
        />
        <StatCard
          label="Total Buyers" value={stats?.totalBuyers?.toLocaleString() || 0}
          icon={Users} gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          sub={`+${stats?.newBuyersToday || 0} today`} trend="up" href="/users"
        />
        <StatCard
          label="Total Products" value={stats?.totalProducts?.toLocaleString() || 0}
          icon={Package} gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
          sub={`${stats?.pendingProducts || 0} pending approval`} href="/products"
        />
        <StatCard
          label="Active Riders" value={stats?.activeRiders || 0}
          icon={Truck} gradient="bg-gradient-to-br from-cyan-500 to-sky-600"
          href="/riders"
        />
        <StatCard
          label="Pending Orders" value={stats?.pendingOrders || 0}
          icon={Clock} gradient="bg-gradient-to-br from-orange-500 to-amber-600"
          href="/orders?status=PENDING"
        />
        <StatCard
          label="Delivered Today" value={stats?.deliveredToday || 0}
          icon={CheckCircle} gradient="bg-gradient-to-br from-lime-500 to-green-600"
        />
        <StatCard
          label="Paid — Awaiting Delivery" value={stats?.paidPendingDelivery || 0}
          icon={DollarSign} gradient="bg-gradient-to-br from-teal-500 to-emerald-600"
          sub={`${stats?.processingOrders || 0} processing`} href="/orders?status=PROCESSING"
        />
      </div>

      {/* ── Charts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Revenue chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="card-title">Revenue Overview</p>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3" /> Trending up
            </span>
          </div>
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={(v: any) => [`UGX ${Number(v).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by status */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="card-title">Orders by Status</p>
              <p className="text-xs text-slate-400 mt-0.5">Current distribution</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded-lg">
              <Activity className="w-3 h-3" /> Live
            </span>
          </div>
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ───────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <p className="card-title">Recent Orders</p>
            <p className="text-xs text-slate-400 mt-0.5">Latest transactions</p>
          </div>
          <Link href="/orders" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Order #', 'Buyer', 'Amount', 'Payment', 'Status', 'Date'].map((h) => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders?.map((order: any) => (
                <tr key={order.id} className="table-row">
                  <td className="table-td font-mono font-medium text-primary-600 text-xs">#{order.orderNumber}</td>
                  <td className="table-td font-medium text-slate-800">{order.user?.name || '—'}</td>
                  <td className="table-td font-semibold text-slate-900">UGX {Number(order.total).toLocaleString()}</td>
                  <td className="table-td">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      order.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      order.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.paymentStatus === 'COMPLETED' ? 'PAID' : order.paymentStatus || 'PENDING'}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${{
                      DELIVERED: 'badge-success', CANCELLED: 'badge-danger',
                      PENDING: 'badge-warning', SHIPPED: 'badge-info',
                    }[order.status as string] || 'badge-neutral'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="table-td text-slate-400 text-xs">{new Date(order.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
              {!stats?.recentOrders?.length && (
                <tr>
                    <td colSpan={6} className="table-td text-center text-slate-400 py-12">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No recent orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
