'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowUpFromLine, CheckCircle2, XCircle, Clock, Smartphone, Landmark,
  RefreshCcw, TrendingUp,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

interface Payout {
  id: string;
  ownerType: 'BUYER' | 'SELLER' | 'RIDER';
  owner: string;
  amount: number;
  currency: string;
  method: 'mobile_money' | 'bank';
  destination: string;
  destinationName?: string | null;
  bankName?: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reference?: string | null;
  failReason?: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PROCESSING: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const OWNER_LABEL: Record<string, string> = { BUYER: 'Buyer', SELLER: 'Seller', RIDER: 'Rider' };

export default function PayoutsPage() {
  const [status, setStatus] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payouts', status, page],
    queryFn: () => adminApi.getPayouts(status || undefined, page) as Promise<any>,
    refetchInterval: 15_000, // live queue — new withdrawal requests appear on their own
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin-platform-revenue'],
    queryFn: () => adminApi.getPlatformRevenue() as Promise<any>,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, reference }: { id: string; reference?: string }) =>
      adminApi.approvePayout(id, reference),
    onSuccess: () => {
      toast.success('Payout marked as paid');
      qc.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectPayout(id, reason),
    onSuccess: () => {
      toast.success('Payout rejected — wallet refunded');
      qc.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to reject'),
  });

  function approve(p: Payout) {
    const reference = window.prompt(
      `Approve payout of ${p.amount.toLocaleString()} ${p.currency} to ${p.destination}?\n\n` +
      'Pay the money via mobile money / bank FIRST, then enter the transaction reference:',
    );
    if (reference === null) return; // cancelled
    approveMutation.mutate({ id: p.id, reference: reference.trim() || undefined });
  }

  function reject(p: Payout) {
    const reason = window.prompt(
      `Reject payout of ${p.amount.toLocaleString()} ${p.currency}?\nThe wallet will be refunded.\n\nReason:`,
    );
    if (!reason?.trim()) return;
    rejectMutation.mutate({ id: p.id, reason: reason.trim() });
  }

  const payouts: Payout[] = data?.data ?? [];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpFromLine className="w-6 h-6 text-sky-600" />
            Payouts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Withdrawal requests from sellers, riders and buyers. Pay via mobile money or bank, then approve with the transaction reference.
          </p>
        </div>
        {revenue && (
          <div className="bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-xs text-slate-400">Platform revenue (commissions)</p>
              <p className="text-lg font-bold text-slate-900">
                UGX {Number(revenue.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['PENDING', 'COMPLETED', 'FAILED', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              status === s
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <button onClick={() => refetch()} className="ml-auto p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <RefreshCcw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-slate-500 p-8">
          <RefreshCcw className="w-4 h-4 animate-spin" /> Loading payouts…
        </div>
      ) : payouts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No {status ? status.toLowerCase() : ''} payouts
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{p.owner}</span>
                    <span className="ml-2 text-xs text-slate-400">{OWNER_LABEL[p.ownerType]}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {p.amount.toLocaleString()} {p.currency}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      {p.method === 'bank'
                        ? <Landmark className="w-3.5 h-3.5 text-slate-400" />
                        : <Smartphone className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{p.destination}</span>
                    </div>
                    {(p.destinationName || p.bankName) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[p.destinationName, p.bankName].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                    {p.reference && <p className="text-xs text-slate-400 mt-0.5">Ref: {p.reference}</p>}
                    {p.failReason && <p className="text-xs text-rose-400 mt-0.5">{p.failReason}</p>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.status === 'PENDING' && (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => approve(p)}
                          disabled={approveMutation.isPending}
                          className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                        </button>
                        <button
                          onClick={() => reject(p)}
                          disabled={rejectMutation.isPending}
                          className="inline-flex items-center gap-1 bg-white text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-rose-50 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {data.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
