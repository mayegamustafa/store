'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Bell, FileText, Activity, Save, Send, X, CheckCircle, XCircle, Users, Megaphone, Radio, User, Globe, ShoppingBag, Bike, Store, BatteryMedium } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';

const EVENT_TYPES = [
  'ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_CANCELLED', 'ORDER_SHIPPED',
  'OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_RETURNED', 'RIDER_ASSIGNED',
  'RIDER_LOCATION_UPDATE', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYOUT_PROCESSED',
  'SELLER_NEW_ORDER', 'ACCOUNT_WELCOME', 'ACCOUNT_PASSWORD_RESET', 'CUSTOM',
];

const CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH', 'IN_APP'];

const CHANNEL_COLORS: Record<string, string> = {
  SMS: 'badge-info',
  EMAIL: 'bg-indigo-100 text-indigo-700',
  WHATSAPP: 'badge-success',
  PUSH: 'badge-purple',
  IN_APP: 'bg-yellow-100 text-yellow-700',
};

const STATUS_COLORS: Record<string, string> = {
  SENT: 'badge-success',
  FAILED: 'badge-danger',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const HINT_VARS = ['{{order_number}}', '{{buyer_name}}', '{{amount}}', '{{rider_name}}', '{{store_name}}', '{{pickup_address}}', '{{delivery_address}}', '{{status}}'];

type Tab = 'templates' | 'logs' | 'test' | 'send';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('templates');

  // --- Templates ---
  const [tplForm, setTplForm] = useState({ event: EVENT_TYPES[0], channel: 'SMS', subject: '', body: '', isActive: true });
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  const { data: tplData, isLoading: tplLoading } = useQuery({
    queryKey: ['notif-templates'],
    queryFn: () => adminApi.getNotificationTemplates(),
  });

  const upsertTplMut = useMutation({
    mutationFn: (data: any) => editingTplId ? adminApi.updateNotificationTemplate(editingTplId, data) : adminApi.upsertNotificationTemplate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-templates'] }); setEditingTplId(null); setTplForm({ event: EVENT_TYPES[0], channel: 'SMS', subject: '', body: '', isActive: true }); },
  });

  const templates = (tplData?.templates ?? []).filter((t: any) =>
    (!filterEvent || t.event === filterEvent) && (!filterChannel || t.channel === filterChannel)
  );

  function loadTemplate(t: any) {
    setEditingTplId(t.id);
    setTplForm({ event: t.event, channel: t.channel, subject: t.subject ?? '', body: t.body ?? '', isActive: t.isActive });
    setTab('templates');
  }

  // --- Logs ---
  const [logPage, setLogPage] = useState(0);
  const { data: logsData } = useQuery({
    queryKey: ['notif-logs', logPage],
    queryFn: () => adminApi.getNotificationLogs({ skip: logPage * 30, take: 30 }),
    enabled: tab === 'logs',
  });
  const logs = logsData?.logs ?? [];

  // Load a past notification back into the composer and jump to Send.
  function reuseLog(l: any) {
    setSendTitle(l.subject || 'TotalStore');
    setSendBody(l.body || '');
    setTab('send');
  }

  // --- Test Panel ---
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testMsg, setTestMsg] = useState('Hello from TotalStore! This is a test notification.');
  const [testFcmToken, setTestFcmToken] = useState('');
  const [testResults, setTestResults] = useState<Record<string, 'ok' | 'err' | null>>({ sms: null, whatsapp: null, email: null, push: null });

  // --- Send / Broadcast ---
  const [sendMode, setSendMode] = useState<'broadcast' | 'user'>('broadcast');
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'BUYERS' | 'RIDERS' | 'SELLERS'>('ALL');
  const [sendTitle, setSendTitle] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendRoute, setSendRoute] = useState('');
  const [sendImage, setSendImage] = useState('');
  const [sendUserId, setSendUserId] = useState('');
  const [sendChannels, setSendChannels] = useState<string[]>(['PUSH']);
  const [sendResult, setSendResult] = useState<'ok' | 'err' | null>(null);
  const [sendLoading, setSendLoading] = useState(false);

  const CHANNELS_ALL = ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'IN_APP'];

  async function runSend() {
    if (!sendTitle || !sendBody) return;
    setSendLoading(true);
    setSendResult(null);
    try {
      if (sendMode === 'broadcast') {
        await adminApi.broadcastNotification({ target: broadcastTarget, title: sendTitle, body: sendBody, route: sendRoute || undefined, imageUrl: sendImage || undefined });
      } else {
        if (!sendUserId) return;
        await adminApi.sendNotificationToUser({ userId: sendUserId, title: sendTitle, body: sendBody, channels: sendChannels as any[], route: sendRoute || undefined, imageUrl: sendImage || undefined });
      }
      setSendResult('ok');
      setSendTitle(''); setSendBody(''); setSendRoute(''); setSendImage('');
    } catch {
      setSendResult('err');
    }
    setSendLoading(false);
  }

  async function runTest(type: string) {
    try {
      if (type === 'sms') await adminApi.testSendSms({ phone: testPhone, message: testMsg });
      if (type === 'whatsapp') await adminApi.testSendWhatsApp({ phone: testPhone, message: testMsg });
      if (type === 'email') await adminApi.testSendEmail({ email: testEmail, subject: 'TotalStore Test', body: testMsg });
      if (type === 'push') await adminApi.testSendPush({ fcmToken: testFcmToken, title: 'TotalStore Test', body: testMsg });
      setTestResults((p) => ({ ...p, [type]: 'ok' }));
    } catch {
      setTestResults((p) => ({ ...p, [type]: 'err' }));
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="w-7 h-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Manage templates, view logs, and send test messages</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['templates', 'logs', 'test', 'send'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'templates' ? <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Templates</span>
              : t === 'logs' ? <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Logs</span>
              : t === 'send' ? <span className="flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" />Send</span>
                : <span className="flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Test Send</span>}
          </button>
        ))}
      </div>

      {/* ── TEMPLATES TAB ── */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: template list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex gap-2">
              <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">All Events</option>
                {EVENT_TYPES.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
              </select>
              <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">All Channels</option>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y max-h-[500px] overflow-y-auto">
              {tplLoading ? (
                <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
              ) : templates.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No templates yet. Create one →</div>
              ) : templates.map((t: any) => (
                <button key={t.id} onClick={() => loadTemplate(t)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${editingTplId === t.id ? 'bg-indigo-50' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-800">{t.event.replace(/_/g, ' ')}</span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${CHANNEL_COLORS[t.channel] ?? 'badge-neutral'}`}>{t.channel}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{t.subject || t.body?.slice(0, 60) || '(no content)'}</p>
                  <span className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full ${t.isActive ? 'badge-success' : 'bg-slate-100 text-slate-500'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => { setEditingTplId(null); setTplForm({ event: EVENT_TYPES[0], channel: 'SMS', subject: '', body: '', isActive: true }); }}
              className="w-full border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl py-2.5 text-sm hover:bg-indigo-50 transition-colors">
              + New Template
            </button>
          </div>

          {/* Right: editor */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">{editingTplId ? 'Edit Template' : 'New Template'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Event</label>
                <select value={tplForm.event} onChange={(e) => setTplForm((p) => ({ ...p, event: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {EVENT_TYPES.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Channel</label>
                <select value={tplForm.channel} onChange={(e) => setTplForm((p) => ({ ...p, channel: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {(tplForm.channel === 'EMAIL' || tplForm.channel === 'PUSH') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subject / Title</label>
                <input value={tplForm.subject} onChange={(e) => setTplForm((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Body</label>
                <div className="flex flex-wrap gap-1">
                  {HINT_VARS.map((v) => (
                    <button key={v} type="button" onClick={() => setTplForm((p) => ({ ...p, body: p.body + v }))}
                      className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-100">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={tplForm.body} onChange={(e) => setTplForm((p) => ({ ...p, body: e.target.value }))} rows={5}
                placeholder="Hi {{buyer_name}}, your order #{{order_number}} has been placed!"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={tplForm.isActive} onChange={(e) => setTplForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
              <label htmlFor="isActive" className="text-sm text-slate-700">Active (sends on trigger)</label>
            </div>
            {/* Preview */}
            {tplForm.body && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Preview</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {tplForm.body
                    .replace(/{{order_number}}/g, 'TS-00123')
                    .replace(/{{buyer_name}}/g, 'John Doe')
                    .replace(/{{amount}}/g, '$45.00')
                    .replace(/{{rider_name}}/g, 'Mike')
                    .replace(/{{store_name}}/g, 'TechZone')
                    .replace(/{{status}}/g, 'Delivered')
                  }
                </p>
              </div>
            )}
            <button onClick={() => upsertTplMut.mutate(tplForm)} disabled={!tplForm.body || upsertTplMut.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
              <Save className="w-4 h-4" /> {upsertTplMut.isPending ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Recipient</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Sent At</th>
                <th className="px-4 py-3 text-left">Reuse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No logs yet.</td></tr>
              ) : logs.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${CHANNEL_COLORS[l.channel] ?? 'badge-neutral'}`}>{l.channel}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{l.event?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{l.recipient}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[l.status] ?? 'bg-slate-100'}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-[220px]">
                    {l.subject && <p className="font-medium truncate">{l.subject}</p>}
                    <p className="truncate">{l.body || l.error || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(l.sentAt ?? l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => reuseLog(l)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                    >
                      Reuse →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <button onClick={() => setLogPage((p) => Math.max(0, p - 1))} disabled={logPage === 0}
                className="text-sm text-indigo-600 disabled:opacity-40 hover:underline">← Previous</button>
              <span className="text-xs text-slate-400">Page {logPage + 1}</span>
              <button onClick={() => setLogPage((p) => p + 1)} disabled={logs.length < 30}
                className="text-sm text-indigo-600 disabled:opacity-40 hover:underline">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── TEST PANEL ── */}
      {tab === 'test' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Test Message</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone (SMS / WhatsApp)</label>
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+256700000000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">FCM Device Token (Push)</label>
              <input value={testFcmToken} onChange={(e) => setTestFcmToken(e.target.value)} placeholder="FCM token…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Message Body</label>
              <textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
          </div>

          <div className="space-y-4">
            {(['sms', 'whatsapp', 'email', 'push'] as const).map((type) => {
              const disabled = (type === 'email' ? !testEmail : type === 'push' ? !testFcmToken : !testPhone) || !testMsg;
              const result = testResults[type];
              return (
                <div key={type} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full mr-2 ${CHANNEL_COLORS[type.toUpperCase()] ?? 'bg-slate-100'}`}>
                      {type.toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-600">Send test {type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result === 'ok' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {result === 'err' && <XCircle className="w-5 h-5 text-red-500" />}
                    <button onClick={() => runTest(type)} disabled={disabled}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50">
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-400 px-1">Make sure your API environment variables are configured (TWILIO_*, MAIL_*, FCM keys) before testing.</p>
          </div>
        </div>
      )}

      {/* ── SEND TAB ── */}
      {tab === 'send' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: compose */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" /> Compose Notification
            </h2>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(['broadcast', 'user'] as const).map((m) => (
                <button key={m} onClick={() => setSendMode(m)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${sendMode === m ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {m === 'broadcast' ? <><Radio className="w-3.5 h-3.5 inline mr-1" />Broadcast to Group</> : <><User className="w-3.5 h-3.5 inline mr-1" />Send to Specific User</>}
                </button>
              ))}
            </div>

            {sendMode === 'broadcast' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Audience</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ALL', 'BUYERS', 'RIDERS', 'SELLERS'] as const).map((t) => (
                    <button key={t} onClick={() => setBroadcastTarget(t)}
                      className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${broadcastTarget === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {t === 'ALL' ? <><Globe className="w-4 h-4 inline mr-1" />Everyone</> : t === 'BUYERS' ? <><ShoppingBag className="w-4 h-4 inline mr-1" />Buyers</> : t === 'RIDERS' ? <><Bike className="w-4 h-4 inline mr-1" />Riders</> : <><Store className="w-4 h-4 inline mr-1" />Sellers</>}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">Sent via FCM topic — reaches all subscribed devices instantly.</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">User ID</label>
                <input value={sendUserId} onChange={(e) => setSendUserId(e.target.value)} placeholder="User UUID…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Channels</label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS_ALL.map((c) => (
                      <button key={c} onClick={() => setSendChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-2 transition-colors ${sendChannels.includes(c) ? `border-indigo-600 ${CHANNEL_COLORS[c] ?? 'bg-indigo-100 text-indigo-700'}` : 'border-slate-200 text-slate-500'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="e.g. New Offer Just For You!"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
              <textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={3} placeholder="Write your message here…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deep Link Route (optional)</label>
              <input value={sendRoute} onChange={(e) => setSendRoute(e.target.value)} placeholder="e.g. /orders or /promotions/SALE50"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notification Image (optional)</label>
              <MediaUpload value={sendImage} onChange={setSendImage} accept="image/*" compact />
              {sendImage && (
                <button type="button" onClick={() => setSendImage('')}
                  className="text-xs text-rose-500 hover:text-rose-600 mt-1">Remove image</button>
              )}
              <p className="text-xs text-slate-400 mt-1">Shown as a large banner image in the notification (Android &amp; iOS)</p>
            </div>

            <button onClick={runSend} disabled={!sendTitle || !sendBody || (sendMode === 'user' && !sendUserId) || sendChannels.length === 0 || sendLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {sendLoading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</span>
              ) : (
                <><Megaphone className="w-4 h-4" /> {sendMode === 'broadcast' ? `Send to ${broadcastTarget}` : 'Send to User'}</>
              )}
            </button>
            {sendResult === 'ok' && <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /> Notification sent successfully!</div>}
            {sendResult === 'err' && <div className="flex items-center gap-2 text-red-600 text-sm"><XCircle className="w-4 h-4" /> Failed to send. Check API config.</div>}
          </div>

          {/* Right: preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Phone Preview</h3>
              {/* Android notification card mock */}
              <div className="bg-slate-900 rounded-2xl p-4 max-w-xs mx-auto">
                <div className="text-slate-400 text-xs mb-3 flex items-center justify-between">
                  <span>12:34</span><BatteryMedium className="w-4 h-4 text-slate-400" />
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{sendTitle || 'Notification Title'}</p>
                      <p className="text-slate-300 text-xs mt-0.5 line-clamp-2">{sendBody || 'Your message will appear here…'}</p>
                    </div>
                  </div>                  {sendImage && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-700">
                      <img src={sendImage} alt="notification banner" className="w-full h-24 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}                  <p className="text-slate-500 text-[10px] mt-2">TotalStore · now</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Delivery Notes</h3>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li><Radio className="w-3 h-3 inline mr-1" /><strong>Broadcast</strong> uses FCM topics — no database lookup needed, instant delivery to all subscribed devices</li>
                <li><User className="w-3 h-3 inline mr-1" /><strong>User send</strong> looks up the user's FCM token, phone, and email for multi-channel delivery</li>
                <li><Bell className="w-3 h-3 inline mr-1" />Messages appear as <strong>heads-up banners</strong> even when the app is locked or killed</li>
                <li><ShoppingBag className="w-3 h-3 inline mr-1" />Buyers subscribe to <code className="bg-slate-100 px-1 rounded">buyers</code> + <code className="bg-slate-100 px-1 rounded">all_users</code> topics on login</li>
                <li><Bike className="w-3 h-3 inline mr-1" />Riders subscribe to <code className="bg-slate-100 px-1 rounded">riders</code> + <code className="bg-slate-100 px-1 rounded">all_users</code> topics on login</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
