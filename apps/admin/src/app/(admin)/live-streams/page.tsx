'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, Radio, Play, Square, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MediaUpload } from '@/components/MediaUpload';

const STATUS_TABS = ['ALL', 'SCHEDULED', 'LIVE', 'ENDED'];
const EMPTY_FORM = { title: '', description: '', thumbnailUrl: '', scheduledAt: '', productIds: '', playbackUrl: '' };

const statusColor: Record<string, string> = {
  LIVE: 'badge-danger animate-pulse',
  SCHEDULED: 'badge-warning',
  ENDED: 'badge-neutral',
};

export default function LiveStreamsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-streams', page, status, search],
    queryFn: () => adminApi.getLiveStreams(page, status === 'ALL' ? undefined : status, search || undefined),
  });

  const streams: any[] = (data?.data as any)?.items || [];
  const totalPages = (data?.data as any)?.totalPages || 0;
  const invalid = () => qc.invalidateQueries({ queryKey: ['admin-streams'] });

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = { ...d, productIds: d.productIds ? d.productIds.split(',').map((t: string) => t.trim()) : [] };
      return editItem ? adminApi.updateLiveStream(editItem.id, payload) : adminApi.createLiveStream(payload);
    },
    onSuccess: () => { invalid(); setShowForm(false); setEditItem(null); toast.success(editItem ? 'Stream updated!' : 'Stream scheduled!'); },
    onError: () => toast.error('Failed to save stream'),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => adminApi.startLiveStream(id),
    onSuccess: () => { invalid(); toast.success('Stream is now LIVE!'); },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => adminApi.endLiveStream(id),
    onSuccess: () => { invalid(); toast.success('Stream ended'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteLiveStream(id),
    onSuccess: () => { invalid(); setConfirmDelete(null); toast.success('Stream deleted'); },
  });

  const openEdit = (s: any) => {
    setEditItem(s);
    setForm({ title: s.title || '', description: s.description || '', thumbnailUrl: s.thumbnailUrl || '', scheduledAt: s.scheduledAt ? s.scheduledAt.substring(0, 16) : '', productIds: (s.productIds || []).join(', '), playbackUrl: s.playbackUrl || '' });
    setShowForm(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Radio className="w-6 h-6 text-red-500" /><h1 className="text-2xl font-bold text-slate-900">Live Streams</h1></div>
        <button onClick={() => { setEditItem(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Schedule Stream</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${status === s ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{s}</button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search streams..." className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-slate-900 mb-4">{editItem ? 'Edit Stream' : 'Schedule New Stream'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Stream title" className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <MediaUpload label="Thumbnail" value={form.thumbnailUrl} onChange={(url) => setForm((p) => ({ ...p, thumbnailUrl: url }))} accept="image/*" compact />
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Scheduled Date & Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Playback/Embed URL (HLS or RTMP)</label>
                <input value={form.playbackUrl} onChange={(e) => setForm((p) => ({ ...p, playbackUrl: e.target.value }))} placeholder="https://... or rtmp://..." className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Linked Product IDs (comma separated)</label>
                <input value={form.productIds} onChange={(e) => setForm((p) => ({ ...p, productIds: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono text-xs" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending} className="btn-primary flex-1">{saveMutation.isPending ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Delete Stream?</h3>
            <p className="text-sm text-slate-600 mb-5">"{confirmDelete.title}" will be permanently deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading streams...</div>
        ) : (
          <table className="w-full">
            <thead><tr>{['Stream', 'Seller', 'Status', 'Scheduled', 'Viewers', 'Actions'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
            <tbody>
              {streams.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      {s.thumbnailUrl ? <img src={s.thumbnailUrl} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Radio className="w-4 h-4 text-slate-400" /></div>}
                      <div><p className="font-medium text-sm">{s.title}</p><p className="text-xs text-slate-400 line-clamp-1">{s.description}</p></div>
                    </div>
                  </td>
                  <td className="table-td text-sm">{s.seller?.storeName || '—'}</td>
                  <td className="table-td"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[s.status] || 'badge-neutral'}`}>{s.status}</span></td>
                  <td className="table-td text-xs text-slate-500">
                    {s.scheduledAt ? (
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(s.scheduledAt).toLocaleString()}</div>
                    ) : '—'}
                  </td>
                  <td className="table-td text-sm text-center">{s.viewerCount}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      {s.status === 'SCHEDULED' && (
                        <button onClick={() => startMutation.mutate(s.id)} className="text-green-600 hover:text-green-700" title="Go Live"><Play className="w-4 h-4" /></button>
                      )}
                      {s.status === 'LIVE' && (
                        <button onClick={() => endMutation.mutate(s.id)} className="text-red-500 hover:text-red-600" title="End Stream"><Square className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => openEdit(s)} className="text-primary-600 hover:text-primary-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete(s)} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {streams.length === 0 && <tr><td colSpan={6} className="table-td text-center text-slate-400 py-10">No streams found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
