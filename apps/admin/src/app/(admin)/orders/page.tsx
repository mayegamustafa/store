'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-sky-100 text-sky-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status],
    queryFn: () => adminApi.getOrders(page, status === 'ALL' ? undefined : status),
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: string }) =>
      adminApi.updateOrderStatus(orderId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const orders = data?.data || [];
  const filtered = search
    ? orders.filter(
        (o: any) =>
          o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
          o.user?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <span className="text-sm text-slate-500">{data?.total || 0} total orders</span>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full border rounded-lg pl-9 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  status === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading orders...</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr>
                  {['Order #', 'Buyer', 'Items', 'Total', 'Payment', 'Pay Status', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="table-td font-mono text-sky-600 font-semibold">
                      #{order.orderNumber}
                    </td>
                    <td className="table-td">
                      <div>
                        <p className="font-medium">{order.user?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{order.user?.phone}</p>
                      </div>
                    </td>
                    <td className="table-td text-center">{order.items?.length || 0}</td>
                    <td className="table-td font-semibold">UGX {Number(order.total).toLocaleString()}</td>
                    <td className="table-td">
                      <span className="text-xs text-slate-500">{order.paymentMethod || order.payment?.method}</span>
                    </td>
                    <td className="table-td">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        (order.paymentStatus || order.payment?.status) === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        (order.paymentStatus || order.payment?.status) === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.paymentStatus || order.payment?.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="table-td">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateMutation.mutate({ orderId: order.id, newStatus: e.target.value })
                        }
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                          STATUS_COLOR[order.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {STATUS_OPTIONS.filter((s) => s !== 'ALL').map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="table-td">
                      <Link href={`/orders/${order.id}`} className="text-sky-600 hover:text-sky-700">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="table-td text-center text-slate-400 py-8">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* Pagination */}
            {data?.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === p ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
