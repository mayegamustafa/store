'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, Eye, Film, ToggleLeft, ToggleRight, Play, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MediaUpload } from '@/components/MediaUpload';

const EMPTY_FORM = { title: '', description: '', videoUrl: '', thumbnailUrl: '', tags: '', productIds: '', isActive: true };

export default function ReelsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reels', page, search],
    queryFn: () => adminApi.getReels(page, search || undefined),
  });

  const reels: any[] = (data?.data as any)?.items || [];
  const totalPages = (data?.data as any)?.totalPages || 0;
  const invalid = () => qc.invalidateQueries({ queryKey: ['admin-reels'] });

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = { ...d, tags: d.tags ? d.tags.split(',').map((t: string) => t.trim()) : [], productIds: d.productIds ? d.productIds.split(',').map((t: string) => t.trim()) : [] };
      return editItem ? adminApi.updateReel(editItem.id, payload) : adminApi.createReel(payload);
    },
    onSuccess: () => { invalid(); setShowForm(false); setEditItem(null); toast.success(editItem ? 'Reel updated!' : 'Reel created!'); },
    onError: () => toast.error('Failed to save reel'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteReel(id),
    onSuccess: () => { invalid(); setConfirmDelete(null); toast.success('Reel deleted'); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => adminApi.updateReel(id, { isActive }),
    onSuccess: () => { invalid(); toast.success('Updated'); },
  });

  const openEdit = (r: any) => {
    setEditItem(r);
    setForm({ ...EMPTY_FORM, title: r.title || '', description: r.description || '', videoUrl: r.videoUrl || '', thumbnailUrl: r.thumbnailUrl || '', tags: (r.tags || []).join(', '), productIds: (r.productIds || []).join(', '), isActive: r.isActive ?? true });
    setShowForm(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Film className="w-6 h-6 text-primary-500" /><h1 className="text-2xl font-bold text-slate-900">Reels</h1></div>
        <button onClick={() => { setEditItem(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Add Reel</button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search reels..." className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-400" />
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-slate-900 mb-4">{editItem ? 'Edit Reel' : 'New Reel'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Reel title" className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <MediaUpload label="Video File *" value={form.videoUrl} onChange={(url) => setForm((p) => ({ ...p, videoUrl: url }))} accept="video/*" previewType="video" />
              <MediaUpload label="Thumbnail (optional)" value={form.thumbnailUrl} onChange={(url) => setForm((p) => ({ ...p, thumbnailUrl: url }))} accept="image/*" compact />
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="fashion, trending, sale" className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Linked Product IDs (comma separated, optional)</label>
                <input value={form.productIds} onChange={(e) => setForm((p) => ({ ...p, productIds: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono text-xs" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4" /> Active
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.videoUrl || saveMutation.isPending} className="btn-primary flex-1">{saveMutation.isPending ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-3">{viewItem.title}</h3>
            <video src={viewItem.videoUrl} controls className="w-full rounded-xl mb-3 bg-black" />
            <p className="text-sm text-slate-600 mb-2">{viewItem.description}</p>
            <div className="flex gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {viewItem.views} views</span>
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {viewItem.likes} likes</span>
            </div>
            {viewItem.seller && <p className="text-xs text-slate-400 mt-2">By: {viewItem.seller.storeName}</p>}
            <button onClick={() => setViewItem(null)} className="mt-4 w-full border rounded-xl py-2 text-sm hover:bg-slate-50">Close</button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Delete Reel?</h3>
            <p className="text-sm text-slate-600 mb-5">"{confirmDelete.title}" will be permanently deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="btn-danger flex-1">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 animate-pulse">Loading reels...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {reels.map((reel: any) => (
            <div key={reel.id} className="card border overflow-hidden group">
              <div className="relative aspect-[9/16] bg-slate-900 max-h-48">
                {reel.thumbnailUrl ? (
                  <img src={reel.thumbnailUrl} alt={reel.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-slate-600" /></div>
                )}
                <button onClick={() => setViewItem(reel)} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-10 h-10 text-white" />
                </button>
                <div className="absolute top-2 right-2">
                  <button onClick={() => toggleMutation.mutate({ id: reel.id, isActive: !reel.isActive })}>
                    {reel.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="font-medium text-xs text-slate-900 line-clamp-1">{reel.title}</p>
                <p className="text-xs text-slate-400">{reel.seller?.storeName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400 flex items-center gap-0.5"><Eye className="w-3 h-3" /> {reel.views}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(reel)} className="text-primary-500 hover:text-sky-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setConfirmDelete(reel)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {reels.length === 0 && <p className="col-span-full text-center text-slate-400 py-16">No reels found. Add the first reel above.</p>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
