'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  BadgeCheck, CheckCircle2, Clock, XCircle, Zap, Package, Calendar,
  ExternalLink, RefreshCw, AlertTriangle, Download,
} from 'lucide-react';

const BILLING_LABEL: Record<string, string> = {
  MONTHLY: '/ month',
  YEARLY:  '/ year',
  ONCE:    'one-time',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-green-50 text-green-700 border-green-200',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  GRACE:     'bg-orange-50 text-orange-700 border-orange-200',
  EXPIRED:   'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  ACTIVE:    CheckCircle2,
  PENDING:   Clock,
  GRACE:     AlertTriangle,
  EXPIRED:   XCircle,
  CANCELLED: XCircle,
};

/** Days remaining as a signed integer (negative if past expiry). */
function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function daysLeft(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const days = Math.ceil(diff / 86_400_000);
  return `${days} day${days !== 1 ? 's' : ''} left`;
}

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  const { data: mySubData, isLoading: loadingMy } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => sellerApi.getMySubscription(),
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['subscription-plans-public'],
    queryFn: () => sellerApi.getSubscriptionPlans(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['subscription-history'],
    queryFn: () => sellerApi.getSubscriptionHistory(),
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => sellerApi.subscribeToPlan(planId),
    onSuccess: (data: any) => {
      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast.success('Payment page opened — complete payment to activate your plan.');
      } else {
        qc.invalidateQueries({ queryKey: ['my-subscription'] });
        qc.invalidateQueries({ queryKey: ['subscription-history'] });
        toast.success('Free plan activated!');
      }
      setSubscribingPlanId(null);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to initiate subscription');
      setSubscribingPlanId(null);
    },
  });

  const handleSubscribe = (planId: string) => {
    setSubscribingPlanId(planId);
    subscribeMutation.mutate(planId);
  };

  const current = (mySubData as any)?.subscription;
  const isActive = (mySubData as any)?.isActive;
  const inGrace: boolean = !!(mySubData as any)?.inGrace || current?.status === 'GRACE';
  const daysToExpiry = daysUntil(current?.expiresAt ?? null);
  // M3b.4: surface a renewal nudge when in GRACE or within 3 days of expiry.
  const showRenewBanner =
    !!current && (inGrace || (current.status === 'ACTIVE' && daysToExpiry !== null && daysToExpiry <= 3));

  const handleDownloadReceipt = async (subId: string) => {
    try {
      const blob = await sellerApi.downloadSubscriptionReceipt(subId);
      const url = URL.createObjectURL(blob as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `totalstore-receipt-${subId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to download receipt');
    }
  };

  if (loadingMy || loadingPlans) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-32 skeleton rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BadgeCheck className="w-6 h-6 text-indigo-600" /> Subscription
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Choose a plan that fits your store</p>
      </div>

      {/* Current Plan Banner */}
      {current ? (
        <div className={`rounded-2xl border p-5 ${STATUS_STYLES[current.status] || 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const Icon = STATUS_ICONS[current.status] || Clock;
                  return <Icon className="w-4 h-4" />;
                })()}
                <span className="text-xs font-semibold uppercase tracking-wider">{current.status}</span>
              </div>
              <p className="text-lg font-bold">{current.plan?.name}</p>
              <p className="text-sm mt-0.5 opacity-80">
                {current.plan?.currency} {Number(current.plan?.price || 0).toLocaleString()}
                {current.plan?.billingCycle ? ` ${BILLING_LABEL[current.plan.billingCycle] || ''}` : ''}
              </p>
            </div>
            <div className="text-right text-sm">
              {current.expiresAt ? (
                <>
                  <p className="font-medium">{daysLeft(current.expiresAt)}</p>
                  <p className="opacity-70">Expires {new Date(current.expiresAt).toLocaleDateString()}</p>
                </>
              ) : (
                <p className="opacity-70">No expiry date</p>
              )}
            </div>
          </div>
          {current.status === 'PENDING' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Payment pending — if you've paid, it will activate shortly. Check back or contact support.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No active subscription</p>
          <p className="text-sm mt-0.5">Choose a plan below to get started</p>
        </div>
      )}

      {/* Renewal Nudge — shown in GRACE or within 3 days of expiry */}
      {showRenewBanner && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900">
              {inGrace
                ? 'Your subscription is in grace period — renew now to avoid losing premium features.'
                : `Your ${current.plan?.name} plan ends in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}.`}
            </p>
            <p className="text-sm text-orange-800 mt-0.5">
              {current.plan?.name} • {current.plan?.currency} {Number(current.plan?.price || 0).toLocaleString()}
              {current.plan?.billingCycle ? ` ${BILLING_LABEL[current.plan.billingCycle] || ''}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => current.planId && handleSubscribe(current.planId)}
            disabled={subscribeMutation.isPending}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold flex items-center gap-2 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${subscribeMutation.isPending ? 'animate-spin' : ''}`} />
            Renew now
          </button>
        </div>
      )}

      {/* Plan Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(plans as any[]).map((plan) => {
            const isCurrent = current?.planId === plan.id && isActive;
            const isFree = Number(plan.price) === 0;
            const isLoading = subscribingPlanId === plan.id && subscribeMutation.isPending;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-5 flex flex-col transition-shadow hover:shadow-md ${
                  isCurrent
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-3 right-3 text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
                <div className="mb-4">
                  <p className="text-base font-bold text-slate-800">{plan.name}</p>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                  )}
                </div>
                <div className="mb-4">
                  {isFree ? (
                    <p className="text-3xl font-extrabold text-green-600">Free</p>
                  ) : (
                    <p className="text-3xl font-extrabold text-slate-800">
                      {plan.currency} {Number(plan.price).toLocaleString()}
                      <span className="text-sm font-normal text-slate-500 ml-1">
                        {BILLING_LABEL[plan.billingCycle] || ''}
                      </span>
                    </p>
                  )}
                </div>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {(plan.maxProducts > 0) && (
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Up to {plan.maxProducts} products
                    </li>
                  )}
                  {plan.maxProducts === 0 && (
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Unlimited products
                    </li>
                  )}
                  {Array.isArray(plan.features) && plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-indigo-100 text-indigo-600 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  disabled={isCurrent || isLoading}
                  onClick={() => !isCurrent && handleSubscribe(plan.id)}
                >
                  {isLoading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : isCurrent ? (
                    <><CheckCircle2 className="w-4 h-4" /> Active</>
                  ) : isFree ? (
                    <><Zap className="w-4 h-4" /> Activate Free Plan</>
                  ) : (
                    <><ExternalLink className="w-4 h-4" /> Subscribe &amp; Pay</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {(history as any[]).length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Subscription History
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-th">Plan</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Started</th>
                  <th className="table-th">Expires</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(history as any[]).map((sub) => {
                  const isPaid = Number(sub.amount) > 0;
                  return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="table-td font-medium text-slate-700">{sub.plan?.name}</td>
                    <td className="table-td">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
                        STATUS_STYLES[sub.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="table-td text-slate-500">
                      {sub.startedAt ? new Date(sub.startedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="table-td text-slate-500">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="table-td text-slate-700">
                      {Number(sub.amount) === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        `${sub.plan?.currency || 'UGX'} ${Number(sub.amount).toLocaleString()}`
                      )}
                    </td>
                    <td className="table-td text-right">
                      {isPaid && (sub.status === 'ACTIVE' || sub.status === 'GRACE' || sub.status === 'EXPIRED') ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(sub.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
