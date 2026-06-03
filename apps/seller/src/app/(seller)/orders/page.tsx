'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

const STATUS_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-sky-100 text-sky-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

// Seller can advance: PENDING→CONFIRMED→PROCESSING→SHIPPED
const SELLER_NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
};

export default function SellerOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-orders', page, status],
    queryFn: () => sellerApi.getOrders(page, status === 'ALL' ? undefined : status),
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: string }) =>
      sellerApi.updateOrderStatus(orderId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const orders = data?.data || [];

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data?.total || 0} total orders</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-card border border-slate-100 w-fit overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`text-xs px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-150 ${
              status === s ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton mb-2" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Order #', 'Buyer', 'Items', 'My Earning', 'Payment', 'Status', 'Date', 'Action'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const nextStatus = SELLER_NEXT_STATUS[order.status];
                  return (
                    <tr key={order.id} className="table-row hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/seller/orders/${order.id}`}>
                      <td className="table-td font-mono text-xs text-primary-600 font-semibold">
                        <Link href={`/seller/orders/${order.id}`} className="hover:underline">#{order.orderNumber}</Link>
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-slate-800 text-sm">{order.user?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{order.user?.phone}</p>
                      </td>
                      <td className="table-td text-center font-medium">{order.items?.length}</td>
                      <td className="table-td font-semibold text-emerald-600">UGX {Number(order.sellerEarning || 0).toLocaleString()}</td>
                      <td className="table-td text-slate-500 text-xs">{order.paymentMethod}</td>
                      <td className="table-td">
                        <span className={`badge ${{ DELIVERED:'badge-success', CANCELLED:'badge-danger', PENDING:'badge-warning', SHIPPED:'badge-info', CONFIRMED:'badge-info', PROCESSING:'badge-purple' }[order.status] || 'badge-neutral'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="table-td text-slate-400 text-xs">
                        {new Date(order.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="table-td">
                        {nextStatus && (
                          <button
                            onClick={() => updateMutation.mutate({ orderId: order.id, newStatus: nextStatus })}
                            disabled={updateMutation.isPending}
                            className="btn btn-primary btn-sm whitespace-nowrap"
                          >
                            → {nextStatus}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="table-td text-center text-slate-400 py-12">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(data?.total ?? 0) > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-slate-500">Page {page} of {Math.ceil((data?.total ?? 0) / 20)}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-sm border text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil((data?.total ?? 0) / 20)}
                className="btn btn-sm border text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
