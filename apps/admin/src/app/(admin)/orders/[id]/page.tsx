'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft, Package, User, CreditCard, MapPin, Truck, Clock, Printer, Download, UserPlus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-700 border-blue-200',
  PROCESSING: 'bg-purple-100 text-purple-700 border-purple-200',
  SHIPPED: 'bg-sky-100 text-sky-700 border-sky-200',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700 border-orange-200',
  DELIVERED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const PAYMENT_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedRider, setSelectedRider] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => adminApi.getOrder(id),
  });

  const { data: ridersData } = useQuery({
    queryKey: ['approved-riders'],
    queryFn: () => adminApi.getApprovedRiders(),
    enabled: showAssign,
  });

  const updateMutation = useMutation({
    mutationFn: (newStatus: string) => adminApi.updateOrderStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const assignMutation = useMutation({
    mutationFn: (riderId: string) => adminApi.assignRiderToOrder(id, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setShowAssign(false);
      setSelectedRider('');
      toast.success('Rider assigned successfully');
    },
    onError: () => toast.error('Failed to assign rider'),
  });

  const order = data?.order ?? data;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-6 w-32 skeleton mb-6" />
        <div className="h-8 w-64 skeleton mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 skeleton" />
          <div className="h-80 skeleton" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Link href="/orders" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 w-fit mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <p className="text-slate-500">Order not found.</p>
      </div>
    );
  }

  const buyer = order.buyer || order.user;
  const items = order.items || [];
  const payment = order.payment;

  return (
    <div className="p-6 max-w-[1200px] space-y-5">
      {/* Back */}
      <Link href="/orders" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Order #{order.orderNumber || id.slice(-6).toUpperCase()}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(order.createdAt).toLocaleString('en-UG', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={order.status}
            onChange={(e) => updateMutation.mutate(e.target.value)}
            disabled={updateMutation.isPending}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border cursor-pointer ${STATUS_COLOR[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <Link
            href={`/orders/${id}/track`}
            className="flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200"
          >
            <MapPin className="w-4 h-4" /> Track
          </Link>
          <button
            onClick={async () => {
              try {
                const res = await adminApi.downloadReceipt(id);
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${order.orderNumber || id}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch { toast.error('Failed to download receipt'); }
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200"
          >
            <Download className="w-4 h-4" /> Receipt
          </button>
          <button
            onClick={async () => {
              try {
                const res = await adminApi.downloadReceipt(id);
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const w = window.open(url);
                if (w) { w.onload = () => { w.print(); }; }
              } catch { toast.error('Failed to print receipt'); }
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Items */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="card-header">
              <p className="card-title flex items-center gap-2"><Package className="w-4 h-4 text-sky-500" /> Order Items</p>
            </div>
            <div className="divide-y">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.productName || item.product?.name || 'Product'}</p>
                    <p className="text-xs text-slate-400">
                      Qty: {item.quantity} &times; UGX {Number(item.price || item.subtotal / item.quantity || 0).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">UGX {Number(item.subtotal || 0).toLocaleString()}</p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">No items</p>
              )}
            </div>
            {/* Totals */}
            <div className="border-t px-5 py-4 space-y-1.5">
              {order.subtotal != null && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>UGX {Number(order.subtotal).toLocaleString()}</span>
                </div>
              )}
              {order.deliveryFee != null && Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Delivery Fee</span>
                  <span>UGX {Number(order.deliveryFee).toLocaleString()}</span>
                </div>
              )}
              {order.discount != null && Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-UGX {Number(order.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t">
                <span>Total</span>
                <span>UGX {Number(order.total || order.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status history */}
          {order.statusHistory?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <p className="card-title flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> Status History</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {order.statusHistory.map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{h.status?.replace(/_/g, ' ')}</p>
                      {h.note && <p className="text-xs text-slate-400">{h.note}</p>}
                      <p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-5">
          {/* Buyer */}
          <div className="card">
            <div className="card-header">
              <p className="card-title flex items-center gap-2"><User className="w-4 h-4 text-sky-500" /> Buyer</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="font-medium text-slate-900">
                {buyer?.firstName || buyer?.name || ''} {buyer?.lastName || ''}
              </p>
              {buyer?.phone && <p className="text-sm text-slate-500">{buyer.phone}</p>}
              {buyer?.email && <p className="text-sm text-slate-500">{buyer.email}</p>}
            </div>
          </div>

          {/* Payment */}
          <div className="card">
            <div className="card-header">
              <p className="card-title flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Payment</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Method</span>
                <span className="text-sm font-medium text-slate-900">{order.paymentMethod || payment?.method || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_COLOR[order.paymentStatus || payment?.status] || 'bg-slate-100 text-slate-600'}`}>
                  {order.paymentStatus || payment?.status || 'PENDING'}
                </span>
              </div>
              {payment?.providerRef && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Reference</span>
                  <span className="text-xs font-mono text-slate-700 max-w-[160px] truncate">{payment.providerRef}</span>
                </div>
              )}
              {payment?.confirmedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Confirmed</span>
                  <span className="text-xs text-slate-500">{new Date(payment.confirmedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery & Rider Assignment */}
          <div className="card">
            <div className="card-header">
              <p className="card-title flex items-center gap-2"><Truck className="w-4 h-4 text-orange-500" /> Delivery</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {order.address && (
                <div>
                  <p className="text-xs text-slate-400 uppercase font-medium">Address</p>
                  <p className="text-sm text-slate-900">{order.address}</p>
                </div>
              )}
              {order.delivery?.status && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Delivery Status</span>
                  <span className="text-xs font-semibold text-slate-700">{order.delivery.status.replace(/_/g, ' ')}</span>
                </div>
              )}

              {/* Assigned Rider Info */}
              {order.delivery?.rider && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-green-600 uppercase font-medium">Assigned Rider</p>
                  <p className="text-sm font-medium text-slate-900">
                    {order.delivery.rider.user?.firstName || order.delivery.rider.firstName || ''}{' '}
                    {order.delivery.rider.user?.lastName || order.delivery.rider.lastName || ''}
                  </p>
                  {(order.delivery.rider.user?.phone || order.delivery.rider.phone) && (
                    <p className="text-xs text-slate-500">{order.delivery.rider.user?.phone || order.delivery.rider.phone}</p>
                  )}
                  {order.delivery.rider.vehicleType && (
                    <p className="text-xs text-slate-500">{order.delivery.rider.vehicleType} — {order.delivery.rider.vehiclePlate || ''}</p>
                  )}
                </div>
              )}

              {/* Assign rider */}
              {!order.delivery?.rider && (
                <>
                  {!showAssign ? (
                    <button
                      onClick={() => setShowAssign(true)}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200"
                    >
                      <UserPlus className="w-4 h-4" /> Assign Rider
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={selectedRider}
                        onChange={(e) => setSelectedRider(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <option value="">Select a rider...</option>
                        {(ridersData?.riders || ridersData?.data || []).map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.user?.firstName || r.firstName || ''} {r.user?.lastName || r.lastName || ''} — {r.vehicleType || 'N/A'}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectedRider && assignMutation.mutate(selectedRider)}
                          disabled={!selectedRider || assignMutation.isPending}
                          className="flex-1 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-3 py-2 rounded-lg"
                        >
                          {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                        </button>
                        <button
                          onClick={() => { setShowAssign(false); setSelectedRider(''); }}
                          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!order.address && !order.delivery?.status && !order.delivery?.rider && (
                <p className="text-sm text-slate-400">No delivery info</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
