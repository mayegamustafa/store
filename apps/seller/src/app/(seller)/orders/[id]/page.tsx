'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, User, MapPin, CreditCard, Clock, Printer, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED:    'bg-sky-100 text-sky-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
};

const SELLER_NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
};

export default function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['seller-order', id],
    queryFn: () => sellerApi.getOrder(id),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      sellerApi.updateOrderStatus(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-order', id] });
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-slate-500">Order not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sky-600 hover:underline">Go back</button>
      </div>
    );
  }

  const nextStatus = SELLER_NEXT_STATUS[order.status];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Order #{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">
              {new Date(order.createdAt).toLocaleDateString('en-UG', { dateStyle: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLOR[order.status] || 'bg-slate-100 text-slate-600'}`}>
            {order.status}
          </span>
          <button onClick={handlePrint} className="p-2 border rounded-lg hover:bg-slate-50" title="Print">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-500" /> Order Items
            </h2>
            <div className="divide-y">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img src={item.product.images[0]} alt={item.product?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{item.product?.name || 'Product'}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    UGX {Number(item.price || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">UGX {Number(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery Fee</span>
                <span>{Number(order.deliveryFee || 0) === 0 ? 'FREE' : `UGX ${Number(order.deliveryFee).toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span className="text-sky-600">UGX {Number(order.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Live Tracking link for in-transit orders */}
          {['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status) && (
            <div className="card p-5 bg-indigo-50 border border-indigo-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Rider is on the way</span>
                </div>
                <a
                  href={`/orders/${order.id}/tracking`}
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" /> Live Track
                </a>
              </div>
            </div>
          )}

          {/* Status Update */}
          {nextStatus && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-500" /> Update Status
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Move this order to <span className="font-semibold text-slate-700">{nextStatus}</span>
              </p>
              <button
                onClick={() => updateStatus.mutate({ status: nextStatus })}
                disabled={updateStatus.isPending}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {updateStatus.isPending ? 'Updating...' : `Mark as ${nextStatus}`}
              </button>
            </div>
          )}

          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-500" /> Status History
              </h2>
              <div className="space-y-3">
                {order.statusHistory.map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-slate-800">{h.status}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(h.createdAt).toLocaleString('en-UG')}
                        {h.note && <span className="ml-2 text-slate-500">— {h.note}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Buyer */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-sky-500" /> Buyer
            </h3>
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">{order.buyer?.firstName} {order.buyer?.lastName}</p>
              <p className="text-slate-500">{order.buyer?.phone}</p>
              {order.buyer?.email && <p className="text-slate-500">{order.buyer.email}</p>}
            </div>
          </div>

          {/* Delivery Address */}
          {order.address && (
            <div className="card p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-sky-500" /> Delivery Address
              </h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p className="font-medium">{order.address.label}</p>
                <p>{order.address.addressLine1}</p>
                <p>{order.address.city}, {order.address.district}</p>
                {order.address.country && <p>{order.address.country}</p>}
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-sky-500" /> Payment
            </h3>
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-medium">{order.paymentMethod || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                  {order.paymentStatus || 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card p-4">
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">Notes</h3>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
