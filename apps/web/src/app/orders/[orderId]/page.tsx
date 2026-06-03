'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ArrowLeft, MapPin, Clock, CheckCircle, Truck, XCircle, RotateCcw, Download } from 'lucide-react';
import { StartChatButton } from '@/components/chat/StartChatButton';

const STATUS_STEPS = [
  { key: 'PENDING',          label: 'Order Placed',    icon: Package },
  { key: 'PROCESSING',       label: 'Processing',      icon: RotateCcw },
  { key: 'SHIPPED',          label: 'Shipped',         icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
  { key: 'DELIVERED',        label: 'Delivered',       icon: CheckCircle },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:          'bg-amber-50 text-amber-700',
    PROCESSING:       'bg-blue-50 text-blue-700',
    SHIPPED:          'bg-indigo-50 text-indigo-700',
    OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700',
    DELIVERED:        'bg-green-50 text-green-700',
    CANCELLED:        'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

interface Props { params: { orderId: string } }

export default function OrderDetailPage({ params }: Props) {
  const { orderId } = params;
  const { user } = useAuthStore();
  const router   = useRouter();

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user, router]);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId).then((r: any) => r.data?.data ?? r.data).catch(() => null),
    enabled: !!user && !!orderId,
    staleTime: 60_000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="container-app py-8 max-w-3xl space-y-4">
        {[200, 300, 150, 250].map((w, i) => (
          <div key={i} className={`h-${w === 200 ? 12 : w === 300 ? 36 : w === 150 ? 10 : 28} bg-slate-100 rounded-2xl animate-pulse`} />
        ))}
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-app py-16 text-center max-w-md">
        <XCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-slate-700">Order not found</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">This order doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/orders" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
          Back to My Orders
        </Link>
      </div>
    );
  }

  const statusUpper   = (order.status ?? 'PENDING').toUpperCase();
  const currentStep   = STATUS_STEPS.findIndex((s) => s.key === statusUpper);
  const isCancelled   = statusUpper === 'CANCELLED';

  const items: any[]  = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="container-app py-8 max-w-3xl">
      <Link href="/orders" className="flex items-center gap-1.5 text-sm text-primary mb-6 hover:underline">
        <ArrowLeft className="w-4 h-4" /> My Orders
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-slate-500">Order</p>
          <h1 className="text-base font-bold text-slate-900">#{order.orderNumber ?? order.id}</h1>
          {order.createdAt && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(order.createdAt).toLocaleDateString('en-UG', { dateStyle: 'long' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={statusUpper} />
          {!isCancelled && statusUpper !== 'DELIVERED' && (
            <Link
              href={`/orders/${orderId}/track`}
              className="btn-primary text-xs px-3 py-1.5 rounded-xl"
            >
              Track
            </Link>
          )}
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Status</h2>
          <div className="flex items-start justify-between">
            {STATUS_STEPS.map((s, i) => {
              const done    = i <= currentStep;
              const active  = i === currentStep;
              const Icon    = s.icon;
              return (
                <div key={s.key} className="flex flex-col items-center flex-1 relative">
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`absolute left-1/2 top-4 w-full h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-slate-100'}`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    done ? (active ? 'bg-primary ring-4 ring-primary/20' : 'bg-primary') : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <p className={`text-[10px] mt-2 text-center leading-tight ${active ? 'font-bold text-primary' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Items</h2>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">No items found.</p>
          ) : items.map((item: any, i: number) => (
            <div key={item.id ?? i} className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                {item.product?.images?.[0] || item.image ? (
                  <Image
                    src={item.product?.images?.[0] ?? item.image}
                    alt={item.product?.name ?? item.name ?? ''}
                    width={56} height={56}
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 line-clamp-1">
                  {item.product?.name ?? item.name ?? 'Product'}
                </p>
                {item.variant && <p className="text-xs text-slate-500">{item.variant}</p>}
                <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 shrink-0">
                KSh {Number(item.price ?? (item.unitPrice * item.quantity)).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Order Summary</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Subtotal',  value: order.subtotal },
            { label: 'Shipping',  value: order.shippingCost ?? 0 },
            { label: 'Discount',  value: order.discount, negate: true },
          ].filter((r) => r.value != null && r.value !== 0).map((r) => (
            <div key={r.label} className="flex justify-between text-slate-600">
              <span>{r.label}</span>
              <span>{r.negate ? '-' : ''}KSh {Number(r.value).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>KSh {Number(order.total ?? order.totalAmount).toLocaleString()}</span>
          </div>
        </div>

        {/* Download Receipt */}
        {(order.paymentStatus === 'COMPLETED' || (order as any).payment?.status === 'COMPLETED') && (
          <button
            onClick={async () => {
              try {
                const res = await ordersApi.downloadReceipt(orderId);
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${order.orderNumber || orderId.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                // If blob download fails, try direct link
                window.open(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/orders/${orderId}/receipt`, '_blank');
              }
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-primary text-primary font-medium py-2.5 rounded-xl hover:bg-primary/5 transition text-sm"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </button>
        )}
      </div>

      {/* Delivery Address */}
      {order.shippingAddress && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Delivery Address</h2>
          <p className="text-sm text-slate-600 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>
              {[
                order.shippingAddress.name,
                order.shippingAddress.line1,
                order.shippingAddress.city,
                order.shippingAddress.country,
              ].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Contact */}
      {(order.seller?.userId || order.rider?.userId) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Contact</h2>
          <div className="flex flex-col gap-3">
            {order.seller?.userId && (
              <StartChatButton
                targetUserId={order.seller.userId}
                targetName={order.seller.storeName ?? 'Seller'}
                targetPhone={order.seller.phone}
                type="BUYER_SELLER"
                orderId={orderId}
                variant="full"
              />
            )}
            {order.rider?.userId && (
              <StartChatButton
                targetUserId={order.rider.userId}
                targetName={`${order.rider.firstName ?? ''} ${order.rider.lastName ?? ''}`.trim() || 'Rider'}
                targetPhone={order.rider.phone}
                type="BUYER_RIDER"
                orderId={orderId}
                variant="full"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
