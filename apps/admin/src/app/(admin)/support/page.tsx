'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  Inbox, MessageSquare, ChevronRight, Search, RefreshCw, Send,
  AlertTriangle, CheckCircle, Clock, XCircle, User, Tag, Paperclip,
  ArrowLeft, Phone, Mail, Package,
} from 'lucide-react';

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'] as const;
const PRIORITIES = ['ALL', 'LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
const CATEGORIES = ['ALL', 'ORDER_ISSUE', 'PAYMENT', 'DELIVERY', 'ACCOUNT', 'REFUND', 'PRODUCT', 'OTHER'] as const;

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'badge-info',
  IN_PROGRESS: 'bg-violet-100 text-violet-700',
  WAITING_CUSTOMER: 'badge-warning',
  RESOLVED: 'badge-success',
  CLOSED: 'bg-slate-100 text-slate-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-500',
  NORMAL: 'badge-info',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'badge-danger',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  OPEN: <Inbox className="w-4 h-4" />,
  IN_PROGRESS: <Clock className="w-4 h-4" />,
  WAITING_CUSTOMER: <AlertTriangle className="w-4 h-4" />,
  RESOLVED: <CheckCircle className="w-4 h-4" />,
  CLOSED: <XCircle className="w-4 h-4" />,
};

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SupportPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [replyBody, setReplyBody] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState('');

  // Ticket list
  const { data: ticketsData, isLoading, refetch } = useQuery({
    queryKey: ['support-tickets', statusFilter, priorityFilter, catFilter, search],
    queryFn: () => adminApi.getSupportTickets(
      1,
      statusFilter !== 'ALL' ? statusFilter : undefined,
      priorityFilter !== 'ALL' ? priorityFilter : undefined,
      catFilter !== 'ALL' ? catFilter : undefined,
      search || undefined,
    ),
  });

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ['support-stats'],
    queryFn: () => adminApi.getSupportStats(),
  });

  // Detail view
  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['support-ticket', selected?.id],
    queryFn: () => adminApi.getSupportTicket(selected!.id),
    enabled: !!selected,
  });

  const tickets = (ticketsData as any)?.data || [];
  const stats = statsData as any;
  const detail = ticketDetail as any;

  const replyMutation = useMutation({
    mutationFn: () => adminApi.supportStaffReply(selected!.id, replyBody),
    onSuccess: () => {
      toast.success('Reply sent to customer');
      setReplyBody('');
      qc.invalidateQueries({ queryKey: ['support-ticket', selected?.id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateSupportTicket(selected!.id, data),
    onSuccess: () => {
      toast.success('Ticket updated');
      qc.invalidateQueries({ queryKey: ['support-ticket', selected?.id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-stats'] });
    },
  });

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary-500" /> Support Inbox
          </h1>
          <p className="text-sm text-slate-500">Manage customer support tickets & follow-ups</p>
        </div>
        <button onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['support-stats'] }); }}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex gap-4 shrink-0 overflow-x-auto">
          {[
            { label: 'Open', value: stats.open, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Waiting', value: stats.waitingCustomer, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Today', value: stats.totalToday, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg} whitespace-nowrap`}>
              <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — ticket list */}
        <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 xl:w-[420px] border-r border-slate-100 shrink-0`}>
          {/* Filters */}
          <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                {PRIORITIES.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All priorities' : p}</option>)}
              </select>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All categories' : c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Inbox className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              tickets.map((t: any) => (
                <button key={t.id} onClick={() => setSelected(t)}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    selected?.id === t.id ? 'bg-sky-50 border-l-2 border-l-sky-500' : ''
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-slate-800 line-clamp-1 flex-1">{t.subject}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{timeAgo(t.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_BADGE[t.status] || 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_ICON[t.status]} {t.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[t.priority] || ''}`}>
                      {t.priority}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" />{t._count?.messages ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" />{t.name} · {t.email}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — ticket detail */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ticket header */}
            <div className="card-header border-b border-slate-100 bg-white shrink-0 flex items-start gap-3">
              <button onClick={() => setSelected(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 mt-0.5">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-900 truncate">{selected.subject}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono text-slate-500">{selected.ticketNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[selected.status] || 'bg-slate-100 text-slate-500'}`}>
                    {selected.status.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[selected.priority] || ''}`}>
                    {selected.priority}
                  </span>
                  <span className="text-xs badge-neutral px-2 py-0.5 rounded-full">
                    {selected.category?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-1.5 shrink-0">
                <select
                  value={updatingStatus || selected.status}
                  onChange={(e) => {
                    setUpdatingStatus(e.target.value);
                    updateMutation.mutate({ status: e.target.value });
                  }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {STATUSES.filter(s => s !== 'ALL').map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer info bar */}
            {detail && (
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 text-sm shrink-0">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-3.5 h-3.5" />{detail.name}
                </span>
                <a href={`mailto:${detail.email}`} className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700">
                  <Mail className="w-3.5 h-3.5" />{detail.email}
                </a>
                {detail.phone && (
                  <a href={`tel:${detail.phone}`} className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700">
                    <Phone className="w-3.5 h-3.5" />{detail.phone}
                  </a>
                )}
                {detail.orderId && (
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Package className="w-3.5 h-3.5" />Order: {detail.orderId.slice(0, 8)}…
                  </span>
                )}
              </div>
            )}

            {/* Messages thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading messages…</div>
              ) : (
                (detail?.messages || []).map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.isStaff
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      <div className={`flex items-center gap-2 mb-1.5 text-xs ${msg.isStaff ? 'text-sky-100' : 'text-slate-500'}`}>
                        <span className="font-medium">{msg.senderName}</span>
                        <span>·</span>
                        <span>{timeAgo(msg.createdAt)}</span>
                        {msg.isStaff && <span className="bg-sky-400 text-white px-1.5 py-0.5 rounded text-xs">Staff</span>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.attachments.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className={`flex items-center gap-1 text-xs underline ${msg.isStaff ? 'text-sky-100' : 'text-sky-600'}`}>
                              <Paperclip className="w-3 h-3" /> Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            <div className="px-5 py-4 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-400">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && replyBody.trim()) {
                        e.preventDefault();
                        replyMutation.mutate();
                      }
                    }}
                    placeholder="Type your reply… (Ctrl+Enter to send)"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm resize-none focus:outline-none"
                  />
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                    <span>Reply will be sent to <strong>{detail?.email || selected?.email}</strong> via email</span>
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                </div>
                <button
                  onClick={() => replyMutation.mutate()}
                  disabled={!replyBody.trim() || replyMutation.isPending}
                  className="btn-primary p-3 rounded-xl flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replyMutation.isPending
                    ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                {['RESOLVED', 'CLOSED', 'WAITING_CUSTOMER'].map((s) => (
                  <button key={s}
                    onClick={() => updateMutation.mutate({ status: s })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
                    Mark {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-slate-400 flex-col gap-3">
            <Inbox className="w-14 h-14 opacity-20" />
            <p className="text-sm">Select a ticket to view the conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
