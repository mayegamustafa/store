'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentsApi, ordersApi } from '@/lib/api';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, RefreshCw, ShoppingBag } from 'lucide-react';

/**
 * Pesapal Callback URL page.
 * Pesapal redirects here with:
 *   ?OrderTrackingId=xxx&OrderMerchantReference=xxx&OrderNotificationType=CALLBACKURL
 *
 * We poll the backend to get the final payment status.
 */
export default function PaymentStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderTrackingId = searchParams.get('OrderTrackingId');
  const notificationType = searchParams.get('OrderNotificationType');

  const [polling, setPolling] = useState(true);
  const pollCount = useRef(0);
  const maxPolls = 24; // 24 × 5 s = 2 min
  const latestStatus = useRef<string | null>(null);

  // ── Confirm payment via backend ───────────────────────────────────────────
  const { mutate: confirm, data: confirmResult, isPending: confirming } = useMutation({
    mutationFn: () => paymentsApi.confirm(orderId),
    onSuccess: (data: any) => {
      const s = data?.status ?? data?.data?.status;
      if (s) latestStatus.current = s;
    },
  });

  useEffect(() => {
    if (!polling || !orderId) return;

    // Trigger the first confirm immediately
    confirm();

    const timer = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current >= maxPolls) {
        setPolling(false);
        clearInterval(timer);
        return;
      }
      if (latestStatus.current === 'COMPLETED' || latestStatus.current === 'FAILED') {
        setPolling(false);
        clearInterval(timer);
        return;
      }
      confirm();
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const result: any = (confirmResult as any)?.data ?? confirmResult ?? {};
  const status: string = result?.status ?? 'PENDING';
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';
  const isPending = !isCompleted && !isFailed;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        {/* Status icon */}
        {isCompleted ? (
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        ) : isFailed ? (
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-10 h-10 text-blue-500 animate-pulse" />
          </div>
        )}

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {isCompleted ? 'Payment Confirmed!' : isFailed ? 'Payment Failed' : 'Processing Payment…'}
        </h1>

        <p className="text-sm text-slate-500 mb-6">
          {isCompleted
            ? 'Your payment has been received and your order is being prepared.'
            : isFailed
            ? 'Your payment could not be processed. Please try again or choose a different method.'
            : polling
            ? 'We are verifying your payment. This may take a moment…'
            : 'Payment verification timed out. Check your order status below.'}
        </p>

        {/* Confirmation details */}
        {isCompleted && result?.providerRef && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left text-xs space-y-1">
            <p className="text-slate-500">Pesapal reference</p>
            <p className="font-mono text-slate-700 break-all">{orderTrackingId || result.providerRef}</p>
          </div>
        )}

        {/* Spinner while polling */}
        {isPending && polling && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-500 mb-6">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking payment status…</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isCompleted && (
            <Link
              href={`/orders/${orderId}`}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition text-center"
            >
              View Order
            </Link>
          )}
          {isFailed && (
            <button
              onClick={() => router.push('/checkout')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition"
            >
              Try Again
            </button>
          )}
          {isPending && !polling && (
            <Link
              href={`/orders/${orderId}`}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition text-center"
            >
              Check Order Status
            </Link>
          )}
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-50 transition text-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
