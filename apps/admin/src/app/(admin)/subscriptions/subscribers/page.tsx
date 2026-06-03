'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Search, Users, Clock, CheckCircle2, AlertTriangle, XCircle,
  CalendarPlus, Ban, History,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-green-50 text-green-700 border-green-200',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  GRACE:     'bg-orange-50 text-orange-700 border-orange-200',
  EXPIRED:   'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_FILTERS = ['', 'ACTIVE', 'GRACE', 'PENDING', 'EXPIRED', 'CANCELLED'];

const QUICK_EXTEND_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
];

export default function SubscribersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Extend modal state
  const [extendTarget, setExtendTarget] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState('');

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Audit log side-panel
  const [auditTarget, setAuditTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscribers', status, search, page],
    queryFn: () => adminApi.getSubscriptionSubscribers({ status: status || undefined, search: search || undefined, page, limit: 20 }),
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['subscription-audit', auditTarget?.id],
    queryFn: () => adminApi.getSubscriptionAuditLog(auditTarget!.id),
    enabled: !!auditTarget?.id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['subscribers'] });

  const extendMutation = useMutation({
    mutationFn: ({ id, days, reason }: { id: string; days: number; reason: string }) =>
      adminApi.extendSubscription(id, { days, reason }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['subscription-audit'] });
      setExtendTarget(null);
      setExtendDays(30);
      setExtendReason('');
      toast.success('Subscription extended');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to extend'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.cancelSubscription(id, { reason }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['subscription-audit'] });
      setCancelTarget(null);
      setCancelReason('');
      toast.success('Subscription cancelled');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to cancel'),
  });

  const items: any[] = (data as any)?.items ?? [];
  const total: number = (data as any)?.total ?? 0;
  const limit: number = (data as any)?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/subscriptions" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Plans
          </Link>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-1">
            <Users className="w-5 h-5 text-indigo-600" /> Subscribers
          </h1>
          <p className="text-sm text-slate-500">{total} subscriber{total !== 1 ? 's' : ''} matching filters</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search seller / email / store..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button type="submit" className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-900">
            Search
          </button>
        </form>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                status === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No subscribers match the filters.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-th">Seller</th>
                <th className="table-th">Plan</th>
                <th className="table-th">Status</th>
                <th className="table-th">Expires</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((sub) => {
                const user = sub.seller?.user ?? {};
                const sellerName = [user.firstName, user.lastName].filter(Boolean).join(' ') || sub.seller?.storeName;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <div className="font-medium text-slate-800">{sub.seller?.storeName}</div>
                      <div className="text-xs text-slate-500">{sellerName}</div>
                      {user.email && <div className="text-xs text-slate-400">{user.email}</div>}
                    </td>
                    <td className="table-td">
                      <div className="font-medium text-slate-700">{sub.plan?.name}</div>
                      <div className="text-xs text-slate-500">
                        {sub.plan?.currency} {Number(sub.plan?.price || 0).toLocaleString()} {sub.plan?.billingCycle}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[sub.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="table-td text-slate-500">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAuditTarget(sub)}
                          className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 text-xs inline-flex items-center gap-1"
                          title="View audit log"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setExtendTarget(sub); setExtendDays(30); setExtendReason(''); }}
                          className="px-2 py-1 rounded-md text-indigo-600 hover:bg-indigo-50 text-xs inline-flex items-center gap-1"
                          disabled={sub.status === 'CANCELLED'}
                        >
                          <CalendarPlus className="w-3.5 h-3.5" /> Extend
                        </button>
                        <button
                          onClick={() => { setCancelTarget(sub); setCancelReason(''); }}
                          className="px-2 py-1 rounded-md text-red-600 hover:bg-red-50 text-xs inline-flex items-center gap-1"
                          disabled={sub.status === 'CANCELLED'}
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Extend modal */}
      {extendTarget && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-indigo-600" /> Extend subscription
            </h3>
            <div className="text-sm text-slate-600">
              <div>{extendTarget.seller?.storeName} — {extendTarget.plan?.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Current expires: {extendTarget.expiresAt ? new Date(extendTarget.expiresAt).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {QUICK_EXTEND_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setExtendDays(opt.days)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${
                    extendDays === opt.days
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={3650}
                value={extendDays}
                onChange={(e) => setExtendDays(Math.max(1, Number(e.target.value) || 1))}
                className="px-2 py-1.5 rounded-md border border-slate-200 text-sm w-24"
              />
              <span className="text-xs text-slate-500">days</span>
            </div>
            <textarea
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="Reason (required for audit)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setExtendTarget(null)} className="px-3 py-2 rounded-lg text-slate-600 text-sm hover:bg-slate-100">
                Cancel
              </button>
              <button
                disabled={!extendReason.trim() || extendMutation.isPending}
                onClick={() => extendMutation.mutate({ id: extendTarget.id, days: extendDays, reason: extendReason.trim() })}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {extendMutation.isPending ? 'Extending...' : `Extend ${extendDays}d`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" /> Cancel subscription
            </h3>
            <div className="text-sm text-slate-600">
              <div>{cancelTarget.seller?.storeName} — {cancelTarget.plan?.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">Status: {cancelTarget.status}</div>
            </div>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancellation reason (required for audit)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setCancelTarget(null)} className="px-3 py-2 rounded-lg text-slate-600 text-sm hover:bg-slate-100">
                Keep
              </button>
              <button
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason.trim() })}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit log side panel */}
      {auditTarget && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setAuditTarget(null)} />
          <div className="w-full max-w-md bg-white shadow-xl overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" /> Audit Log
              </h3>
              <button onClick={() => setAuditTarget(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-700">
              <div className="font-medium">{auditTarget.seller?.storeName}</div>
              <div className="text-xs text-slate-500">{auditTarget.plan?.name}</div>
            </div>
            <div className="space-y-3">
              {(auditLog as any[]).length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">No audit entries yet.</div>
              ) : (
                (auditLog as any[]).map((entry) => {
                  const Icon =
                    entry.action === 'EXTEND' ? CalendarPlus
                    : entry.action === 'CANCEL' ? Ban
                    : entry.action === 'ACTIVATE' ? CheckCircle2
                    : Clock;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                      <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-700">{entry.action}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(entry.createdAt).toLocaleString()}
                          {entry.actor && ` • ${[entry.actor.firstName, entry.actor.lastName].filter(Boolean).join(' ') || entry.actor.email}`}
                        </div>
                        {entry.payload?.reason && (
                          <div className="text-xs text-slate-600 mt-1 italic">"{entry.payload.reason}"</div>
                        )}
                        {entry.payload?.days && (
                          <div className="text-xs text-slate-500 mt-0.5">+{entry.payload.days} days</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
