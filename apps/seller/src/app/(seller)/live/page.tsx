'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sellerApi as api } from '../../../lib/api';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  status: 'LIVE' | 'UPCOMING' | 'ENDED';
  viewerCount: number;
  thumbnailUrl?: string;
  streamUrl?: string;
  streamKey?: string;
  rtmpUrl?: string;
}

function statusBadge(status: string) {
  const cfg: Record<string, string> = {
    LIVE: 'bg-red-100 text-red-700 border border-red-200',
    UPCOMING: 'bg-amber-100 text-amber-700 border border-amber-200',
    ENDED: 'bg-slate-100 text-slate-500 border border-slate-200',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cfg[status] ?? cfg.ENDED}`}>{status}</span>;
}

export default function LivePage() {
  const router = useRouter();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected stream for detail
  const [selected, setSelected] = useState<LiveStream | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => { loadStreams(); }, []);

  async function loadStreams() {
    setLoading(true); setError(null);
    try {
      const res = await api.get<any>('/live-streams');
      setStreams(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setError('Failed to load streams'); }
    finally { setLoading(false); }
  }

  async function createStream() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<LiveStream>('/live-streams', { title: newTitle.trim(), description: newDesc.trim() });
      setShowCreate(false); setNewTitle(''); setNewDesc('');
      await loadStreams();
      setSelected(res.data);
    } catch { alert('Failed to create stream'); }
    finally { setCreating(false); }
  }

  async function startStream(id: string) {
    setActionLoading(true);
    try {
      const res = await api.patch<LiveStream>(`/live-streams/${id}/start`);
      setSelected(res.data);
      await loadStreams();
    } catch { alert('Failed to start stream'); }
    finally { setActionLoading(false); }
  }

  async function endStream(id: string) {
    if (!confirm('End this live stream? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      const res = await api.patch<LiveStream>(`/live-streams/${id}/end`);
      setSelected(res.data);
      await loadStreams();
    } catch { alert('Failed to end stream'); }
    finally { setActionLoading(false); }
  }

  async function deleteStream(id: string) {
    if (!confirm('Delete this stream permanently?')) return;
    try {
      await api.delete(`/live-streams/${id}`);
      setSelected(null);
      await loadStreams();
    } catch { alert('Failed to delete stream'); }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Streams</h1>
          <p className="text-slate-500 text-sm mt-1">Broadcast your products live to customers across Africa</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 btn btn-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New Stream
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Live Stream</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro — Flash Sale Live"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="What will you be showing?"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewTitle(''); setNewDesc(''); }}
                className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >Cancel</button>
              <button
                onClick={createStream}
                disabled={creating || !newTitle.trim()}
                className="flex-1 btn btn-primary disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create Stream'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Stream list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-sm">{error}</p>
              <button onClick={loadStreams} className="mt-3 text-primary-600 text-sm hover:underline">Retry</button>
            </div>
          ) : streams.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-slate-400" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2L12 7 7 2"/>
                </svg>
              </div>
              <p className="text-slate-500 text-sm">No streams yet</p>
              <p className="text-slate-400 text-xs mt-1">Create your first live stream to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {streams.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected?.id === s.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 truncate flex-1 mr-2">{s.title}</p>
                    {statusBadge(s.status)}
                  </div>
                  {s.status === 'LIVE' && (
                    <p className="text-xs text-slate-400 mt-1">{s.viewerCount} watching</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-64 flex items-center justify-center">
              <p className="text-slate-400 text-sm">Select a stream to manage it</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                  {selected.description && <p className="text-slate-500 text-sm mt-1">{selected.description}</p>}
                </div>
                {statusBadge(selected.status)}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-slate-900">{selected.viewerCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Total Viewers</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-slate-900 capitalize">{selected.status.toLowerCase()}</p>
                  <p className="text-xs text-slate-500 mt-1">Status</p>
                </div>
              </div>

              {/* RTMP credentials */}
              {(selected.rtmpUrl || selected.streamKey) && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-primary-700 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    Streaming Credentials
                  </p>
                  {selected.rtmpUrl && (
                    <div>
                      <p className="text-xs text-violet-500 font-medium mb-1">RTMP URL</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-violet-900 bg-white/70 rounded px-2 py-1 flex-1 truncate">{selected.rtmpUrl}</code>
                        <button onClick={() => copyToClipboard(selected.rtmpUrl!)} className="text-primary-600 hover:text-violet-800 text-xs">Copy</button>
                      </div>
                    </div>
                  )}
                  {selected.streamKey && (
                    <div>
                      <p className="text-xs text-violet-500 font-medium mb-1">Stream Key</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-violet-900 bg-white/70 rounded px-2 py-1 flex-1 truncate">{'•'.repeat(24)}</code>
                        <button onClick={() => copyToClipboard(selected.streamKey!)} className="text-primary-600 hover:text-violet-800 text-xs">
                          {copiedKey ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-violet-500">Use these in OBS Studio, Streamlabs, or your mobile camera app</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {selected.status === 'UPCOMING' && (
                  <button
                    onClick={() => startStream(selected.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {actionLoading ? 'Starting...' : 'Go Live'}
                  </button>
                )}
                {selected.status === 'LIVE' && (
                  <button
                    onClick={() => endStream(selected.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {actionLoading ? 'Ending...' : 'End Stream'}
                  </button>
                )}
                {selected.status === 'ENDED' && (
                  <button
                    onClick={() => deleteStream(selected.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold py-2.5 rounded-lg transition-colors border border-red-200"
                  >
                    Delete Stream
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
