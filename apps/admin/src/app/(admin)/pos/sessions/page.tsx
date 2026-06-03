'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ClipboardList, ChevronDown, ChevronUp, DollarSign, ReceiptText } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_TABS = ['ALL', 'OPEN', 'CLOSED'];

export default function PosSessionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingSession, setClosingSession] = useState<any>(null);
  const [closingCash, setClosingCash] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pos-sessions', page, status],
    queryFn: () => adminApi.posListSessions(page, status === 'ALL' ? undefined : status),
  });
  const sessions: any[] = (data?.data as any)?.items || [];
  const totalPages = (data?.data as any)?.totalPages || 0;

  const { data: sessionDetail } = useQuery({
    queryKey: ['pos-session-detail', expandedId],
    queryFn: () => adminApi.posGetSession(expandedId!),
    enabled: !!expandedId,
  });
  const detail = sessionDetail?.data as any;

  const closeMutation = useMutation({
    mutationFn: ({ id, closingCash }: any) => adminApi.posCloseSession(id, { closingCash: parseFloat(closingCash || '0') }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-sessions'] }); setClosingSession(null); setClosingCash(''); toast.success('Session closed'); },
    onError: () => toast.error('Failed to close session'),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => adminApi.posVoidTransaction(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-session-detail'] }); toast.success('Transaction voided'); },
    onError: () => toast.error('Failed to void transaction'),
  });

  const statusColor = (s: string) => s === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><ClipboardList className="w-6 h-6 text-sky-500" /><h1 className="text-2xl font-bold text-slate-900">POS Sessions & Shifts</h1></div>
      </div>

      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${status === s ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{s}</button>
        ))}
      </div>

      {/* Close Session Modal */}
      {closingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Close Session</h3>
            <p className="text-sm text-slate-500 mb-4">Count your drawer and enter the actual closing cash amount.</p>
            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Opening Cash</span><span>UGX {Number(closingSession.openingCash).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Sales</span><span className="font-semibold">UGX {Number(closingSession.totalSales).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Transactions</span><span>{closingSession.totalTxns}</span></div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Closing Cash Counted (UGX)</label>
              <input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="0" className="w-full border rounded-xl px-3 py-2 text-sm" autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => closeMutation.mutate({ id: closingSession.id, closingCash })} disabled={closeMutation.isPending} className="btn-primary flex-1">{closeMutation.isPending ? 'Closing...' : 'Close Session'}</button>
              <button onClick={() => setClosingSession(null)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading && <div className="text-center py-16 text-slate-400 animate-pulse">Loading sessions...</div>}
        {sessions.map((session: any) => (
          <div key={session.id} className="bg-white rounded-xl shadow-sm border">
            <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}>
              <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Opened</p>
                  <p className="font-medium">{new Date(session.openedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Closed</p>
                  <p className="font-medium">{session.closedAt ? new Date(session.closedAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Opening Cash</p>
                  <p className="font-medium">UGX {Number(session.openingCash).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Sales</p>
                  <p className="font-bold text-sky-600">UGX {Number(session.totalSales).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Transactions</p>
                  <p className="font-medium">{session._count?.transactions ?? session.totalTxns}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(session.status)}`}>{session.status}</span>
                {session.status === 'OPEN' && (
                  <button onClick={(e) => { e.stopPropagation(); setClosingSession(session); setClosingCash(''); }} className="btn-danger text-xs px-3 py-1.5">Close Session</button>
                )}
                {expandedId === session.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {expandedId === session.id && (
              <div className="border-t px-4 pb-4 pt-2">
                {!detail ? (
                  <p className="text-center text-slate-400 py-4 animate-pulse">Loading transactions...</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left">{['Receipt No', 'Customer', 'Items', 'Total', 'Method', 'Time', ''].map((h) => <th key={h} className="text-xs font-semibold text-slate-500 py-2 pr-3">{h}</th>)}</tr></thead>
                    <tbody>
                      {(detail.transactions || []).map((txn: any) => (
                        <tr key={txn.id} className="border-t hover:bg-slate-50">
                          <td className="py-2 pr-3 font-mono text-xs">{txn.receiptNo}</td>
                          <td className="py-2 pr-3 text-slate-600">{txn.customerName || '—'}</td>
                          <td className="py-2 pr-3">{(txn.items as any[]).length} item{(txn.items as any[]).length !== 1 ? 's' : ''}</td>
                          <td className="py-2 pr-3 font-semibold">UGX {Number(txn.total).toLocaleString()}</td>
                          <td className="py-2 pr-3 text-slate-500">{txn.paymentMethod}</td>
                          <td className="py-2 pr-3 text-xs text-slate-400">{new Date(txn.createdAt).toLocaleTimeString()}</td>
                          <td className="py-2">
                            <button onClick={() => voidMutation.mutate(txn.id)} className="text-xs text-red-400 hover:text-red-600">Void</button>
                          </td>
                        </tr>
                      ))}
                      {(!detail.transactions || detail.transactions.length === 0) && (
                        <tr><td colSpan={7} className="text-center text-slate-400 py-4">No transactions in this session</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {!isLoading && sessions.length === 0 && <p className="text-center text-slate-400 py-16">No sessions found.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-sky-500 text-white' : 'bg-white border hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
