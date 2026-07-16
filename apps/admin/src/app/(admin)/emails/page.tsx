'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Mail, Plus, RefreshCcw, Trash2, Pencil, CheckCircle2, XCircle,
  Globe, ShieldCheck, Activity, Inbox,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

type Tab = 'aliases' | 'logs' | 'settings';

interface Alias { alias: string; email: string; forward: string; }
interface LogRow {
  id: string; created: string; sender: string | null; recipient: string | null;
  forwardedTo: string | null; subject: string | null; status: string; reason: string | null;
}

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>('aliases');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['email-status'],
    queryFn: () => adminApi.getEmailStatus() as Promise<any>,
    retry: false,
  });
  const { data: aliases, isLoading: aliasesLoading, error: aliasesError } = useQuery({
    queryKey: ['email-aliases'],
    queryFn: () => adminApi.getEmailAliases() as Promise<Alias[]>,
    retry: false,
  });
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => adminApi.getEmailLogs() as Promise<LogRow[]>,
    enabled: tab === 'logs',
    retry: false,
  });
  const { data: dns, refetch: recheckDns, isFetching: dnsLoading } = useQuery({
    queryKey: ['email-dns'],
    queryFn: () => adminApi.checkEmailDns() as Promise<any>,
    enabled: tab === 'settings',
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['email-aliases'] });

  const createMutation = useMutation({
    mutationFn: ({ alias, forward }: { alias: string; forward: string }) =>
      adminApi.createEmailAlias(alias, forward),
    onSuccess: () => { toast.success('Alias created'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create alias'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ alias, forward }: { alias: string; forward: string }) =>
      adminApi.updateEmailAlias(alias, forward),
    onSuccess: () => { toast.success('Alias updated'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update alias'),
  });
  const deleteMutation = useMutation({
    mutationFn: (alias: string) => adminApi.deleteEmailAlias(alias),
    onSuccess: () => { toast.success('Alias deleted'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete alias'),
  });

  function promptCreate() {
    const alias = window.prompt('Alias (the part before @):\ne.g. support, info, sales');
    if (!alias?.trim()) return;
    const forward = window.prompt(`Forward ${alias.trim()}@${status?.domain || 'your domain'} to which email?`);
    if (!forward?.trim()) return;
    createMutation.mutate({ alias: alias.trim().toLowerCase(), forward: forward.trim() });
  }

  function promptEdit(a: Alias) {
    const forward = window.prompt(`New forward destination for ${a.email}:`, a.forward);
    if (!forward?.trim() || forward.trim() === a.forward) return;
    updateMutation.mutate({ alias: a.alias, forward: forward.trim() });
  }

  function confirmDelete(a: Alias) {
    if (window.confirm(`Delete ${a.email}? Mail sent to it will bounce.`)) {
      deleteMutation.mutate(a.alias);
    }
  }

  const filteredAliases = (aliases ?? []).filter(
    (a) => !search || a.alias.includes(search.toLowerCase()) || a.forward.includes(search.toLowerCase()),
  );

  const notConfigured = (aliasesError as any)?.response?.status === 503;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-sky-600" />
            Email Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Company email aliases on {status?.domain || 'your domain'} — powered by ImprovMX forwarding.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
              status.connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <Activity className="w-3.5 h-3.5" />
              {status.connected ? `Connected · ${status.aliasCount} aliases` : 'Not connected'}
            </span>
          )}
          <button onClick={promptCreate} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Alias
          </button>
        </div>
      </div>

      {notConfigured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 mb-4">
          ImprovMX isn&apos;t configured yet. Add your API key under
          <span className="font-semibold"> Settings → Integrations → ImprovMX API Key</span>,
          then refresh this page. Keys are stored server-side and never exposed.
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {(['aliases', 'logs', 'settings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              tab === t ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          onClick={() => qc.invalidateQueries()}
          className="ml-auto p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCcw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {tab === 'aliases' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search aliases or destinations…"
              className="input w-full max-w-sm"
            />
          </div>
          {aliasesLoading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading aliases…</div>
          ) : filteredAliases.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
              {notConfigured ? 'Configure ImprovMX to manage aliases' : 'No aliases yet — create the first one'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Email address</th>
                    <th className="px-5 py-3 font-medium">Forwards to</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAliases.map((a) => (
                    <tr key={a.alias} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-800">{a.email}</td>
                      <td className="px-5 py-3 text-slate-600">{a.forward}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => promptEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50" title="Edit forward">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => confirmDelete(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="card overflow-hidden">
          {logsLoading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading logs…</div>
          ) : !logs?.length ? (
            <div className="p-10 text-center text-slate-400">No forwarding activity yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">From</th>
                    <th className="px-5 py-3 font-medium">To</th>
                    <th className="px-5 py-3 font-medium">Forwarded to</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{l.created ? new Date(l.created).toLocaleString() : '—'}</td>
                      <td className="px-5 py-3">{l.sender || '—'}</td>
                      <td className="px-5 py-3">{l.recipient || '—'}</td>
                      <td className="px-5 py-3">{l.forwardedTo || '—'}</td>
                      <td className="px-5 py-3 max-w-[220px] truncate">{l.subject || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          /deliver|queued|sent/i.test(l.status) ? 'text-emerald-600' : /refused|error|fail/i.test(l.status) ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          {/deliver|queued|sent/i.test(l.status) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {l.status}
                        </span>
                        {l.reason && <p className="text-xs text-slate-400 mt-0.5 max-w-[240px] truncate">{l.reason}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-sky-500" /> Domain
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Domain</span><span className="font-medium">{status?.domain || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="font-medium">ImprovMX</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-medium">{status?.plan || 'Free'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Domain active</span>
                <span className={status?.active ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                  {status?.active ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> DNS verification
            </h2>
            {dns ? (
              <div className="space-y-2 text-sm">
                {(['mx', 'spf', 'dkim'] as const).map((k) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500 uppercase">{k}</span>
                    <span className={dns[k]?.valid ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                      {dns[k] == null ? '—' : dns[k].valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                  <span className="text-slate-500">Overall</span>
                  <span className={dns.valid ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                    {dns.valid ? 'All good' : 'Needs attention'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Run a check to verify MX / SPF / DKIM records.</p>
            )}
            <button
              onClick={() => recheckDns()}
              disabled={dnsLoading}
              className="btn btn-primary mt-4 flex items-center gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${dnsLoading ? 'animate-spin' : ''}`} />
              {dnsLoading ? 'Checking…' : 'Test DNS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
