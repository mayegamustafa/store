'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Mail, Send, Users, Plus, CheckCircle, Clock, FileText, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Tab = 'campaigns' | 'subscribers';

const EMPTY_CAMPAIGN = { subject: '', body: '', preview: '' };

const TEMPLATES = [
  {
    label: 'Flash Sale',
    subject: 'Flash Sale — Up to 50% Off Today Only!',
    preview: 'Grab the best deals before they expire.',
    body: `<h2 style="color:#f97316">Flash Sale — Today Only!</h2>
<p>Hi there,</p>
<p>We've just launched a massive flash sale with <strong>up to 50% off</strong> on top products. This sale ends at midnight — don't miss out!</p>
<a href="{{WEB_URL}}/flash-sales" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Shop the Sale</a>
<p>Happy shopping!<br/>The TotalStore Team</p>`,
  },
  {
    label: 'New Arrivals',
    subject: 'Fresh Arrivals Just Landed!',
    preview: 'Check out the newest products added this week.',
    body: `<h2 style="color:#0ea5e9">New Arrivals This Week!</h2>
<p>Hi there,</p>
<p>We've added hundreds of new products across all categories. From the latest electronics to trendy fashion — there's something for everyone.</p>
<a href="{{WEB_URL}}/products?sort=newest" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Explore New Arrivals</a>
<p>See you there!<br/>The TotalStore Team</p>`,
  },
  {
    label: 'Promo Code',
    subject: 'Exclusive Coupon Just for You',
    preview: 'Use code SAVE15 for 15% off your next order.',
    body: `<h2 style="color:#8b5cf6">A Special Gift for You!</h2>
<p>Hi there,</p>
<p>As a valued subscriber, we're giving you an exclusive discount. Use the code below at checkout:</p>
<div style="font-size:28px;font-weight:900;letter-spacing:4px;background:#f3e8ff;padding:16px;border-radius:12px;text-align:center;margin:16px 0;color:#7c3aed">SAVE15</div>
<p>Valid for <strong>15% off</strong> your next order. Offer expires in 7 days.</p>
<a href="{{WEB_URL}}/products" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">Shop Now</a>
<p>Thanks for being with us!<br/>The TotalStore Team</p>`,
  },
];

export default function NewsletterPage() {
  const queryClient = useQueryClient();
  const [tab, setTab]                 = useState<Tab>('campaigns');
  const [form, setForm]               = useState(EMPTY_CAMPAIGN);
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [sending, setSending]         = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery<any[]>({
    queryKey: ['admin', 'campaigns'],
    queryFn:  () => adminApi.getCampaigns().catch(() => []),
  });

  // Always-enabled count for the stat card
  const { data: activeSubCount = 0 } = useQuery<number>({
    queryKey: ['admin', 'subscribers', 'count'],
    queryFn:  () => adminApi.getSubscribers({ limit: 1 }).then((r: any) => r?.total ?? 0).catch(() => 0),
  });

  const { data: subsData, isLoading: loadingSubs } = useQuery<{ data: any[]; total: number }>({
    queryKey: ['admin', 'subscribers'],
    queryFn:  () => adminApi.getSubscribers({ limit: 100 }).catch(() => ({ data: [], total: 0 })),
    enabled: tab === 'subscribers',
  });

  const subscribers: any[] = subsData?.data ?? [];
  const totalSubs: number  = subsData?.total ?? activeSubCount;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => editId
      ? adminApi.updateCampaign(editId, form)
      : adminApi.createCampaign(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_CAMPAIGN);
      toast.success(editId ? 'Campaign updated' : 'Campaign created');
    },
    onError: () => toast.error('Failed to save campaign'),
  });

  async function handleSend(id: string) {
    if (!confirm('Send this campaign to all active subscribers now?')) return;
    setSending(id);
    try {
      await adminApi.sendCampaign(id);
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast.success('Campaign sent successfully!');
    } catch {
      toast.error('Failed to send campaign');
    } finally {
      setSending(null);
    }
  }

  function openNew()              { setForm(EMPTY_CAMPAIGN); setEditId(null); setShowForm(true); }
  function openEdit(c: any)       { setForm({ subject: c.subject, body: c.body, preview: c.preview ?? '' }); setEditId(c.id); setShowForm(true); }
  function applyTemplate(t: any)  { setForm({ subject: t.subject, body: t.body, preview: t.preview ?? '' }); }

  const statusColor: Record<string, string> = {
    draft:    'badge-neutral',
    sending:  'bg-blue-50 text-blue-700',
    sent:     'bg-green-50 text-green-700',
    scheduled:'bg-amber-50 text-amber-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Email Promotions</h1>
            <p className="text-sm text-slate-500">Newsletter campaigns & subscriber management</p>
          </div>
        </div>
        {tab === 'campaigns' && (
          <button onClick={openNew}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Campaigns', value: (campaigns as any[]).length, icon: <FileText className="w-5 h-5 text-violet-500" />, bg: 'bg-violet-50' },
          { label: 'Campaigns Sent',  value: (campaigns as any[]).filter((c: any) => c.status === 'sent').length, icon: <CheckCircle className="w-5 h-5 text-green-500" />, bg: 'bg-green-50' },
          { label: 'Active Subscribers', value: activeSubCount, icon: <Users className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Drafts', value: (campaigns as any[]).filter((c: any) => c.status === 'draft').length, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
        {(['campaigns', 'subscribers'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition capitalize ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Campaigns tab ────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          {loadingCampaigns ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))
          ) : (campaigns as any[]).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Mail className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No campaigns yet. Create your first one!</p>
            </div>
          ) : (
            (campaigns as any[]).map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 text-sm truncate">{c.subject}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'badge-neutral'}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.preview && <p className="text-xs text-slate-400 truncate">{c.preview}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {c.status === 'sent'
                      ? `Sent ${new Date(c.sentAt).toLocaleDateString()} · ${c.totalSent} recipients`
                      : `Created ${new Date(c.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.status !== 'sent' && (
                    <>
                      <button onClick={() => openEdit(c)}
                        className="p-2 rounded-lg bg-slate-50 hover:badge-neutral transition text-xs">
                        Edit
                      </button>
                      <button
                        onClick={() => handleSend(c.id)}
                        disabled={sending === c.id}
                        className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-violet-700 transition disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sending === c.id ? 'Sending…' : 'Send Now'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Subscribers tab ──────────────────────────────────────── */}
      {tab === 'subscribers' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{totalSubs} subscribers</p>
          </div>
          {loadingSubs ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 skeleton" />)}
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No subscribers yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {['Email', 'Name', 'Source', 'Date', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscribers.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.email}</td>
                    <td className="px-4 py-3 text-slate-600">{s.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{s.source}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {s.isActive ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Campaign Form Modal ───────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mt-8 mb-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{editId ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Template picker */}
              {!editId && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Templates</p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((t) => (
                      <button key={t.label} onClick={() => applyTemplate(t)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition">
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject line *</label>
                <input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Flash Sale — 50% Off Today Only!"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Preview text</label>
                <input value={form.preview} onChange={(e) => setForm(f => ({ ...f, preview: e.target.value }))}
                  placeholder="Short teaser shown in inbox..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email body (HTML) *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={12}
                  placeholder="<h2>Your email content here...</h2>"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-y"
                />
                <p className="text-[11px] text-slate-400 mt-1">Supports HTML. Use {'{{WEB_URL}}'} as a placeholder for the site URL.</p>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!form.subject || !form.body || saveMutation.isPending}
                className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
