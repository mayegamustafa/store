'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { MediaUpload } from '@/components/MediaUpload';

const PLACEMENTS = [
  { value: 'home_hero',    label: 'Home — Hero Slideshow' },
  { value: 'home_middle',  label: 'Home — Mid Banners (2-col grid)' },
  { value: 'home_single',  label: 'Home — Full-width Single Banner' },
  { value: 'home_bottom',  label: 'Home — Bottom Banners' },
  { value: 'category_top', label: 'Category page — Top' },
  { value: 'flash_sale',   label: 'Flash Sale page' },
];

const BG_PRESETS = [
  { label: 'Dark zinc',   value: 'bg-zinc-900' },
  { label: 'Sky blue',    value: 'bg-sky-700' },
  { label: 'Emerald',     value: 'bg-emerald-700' },
  { label: 'Rose',        value: 'bg-rose-700' },
  { label: 'Violet',      value: 'bg-violet-700' },
  { label: 'Amber',       value: 'bg-amber-600' },
  { label: 'Custom',      value: 'custom' },
];

const EMPTY = {
  title: '', subtitle: '', badgeText: '',
  buttonText: '', buttonUrl: '', button2Text: '', button2Url: '',
  image: '', bgColor: 'bg-zinc-900', textAlign: 'left',
  placement: 'home_hero', sortOrder: 0, isActive: true,
};

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<any>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [customBg, setCustomBg] = useState('');

  const { data: bannersRaw, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: adminApi.getBanners,
  });
  const banners: any[] = Array.isArray(bannersRaw) ? bannersRaw : (bannersRaw as any)?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editBanner ? adminApi.updateBanner(editBanner.id, data) : adminApi.createBanner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      setShowForm(false); setEditBanner(null); setForm({ ...EMPTY });
      toast.success(editBanner ? 'Banner updated!' : 'Banner created!');
    },
    onError: () => toast.error('Failed to save banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBanner(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-banners'] }); toast.success('Deleted'); },
  });

  const openEdit = (b: any) => {
    setEditBanner(b);
    setForm({
      title: b.title ?? '', subtitle: b.subtitle ?? '', badgeText: b.badgeText ?? '',
      buttonText: b.buttonText ?? '', buttonUrl: b.buttonUrl ?? '',
      button2Text: b.button2Text ?? '', button2Url: b.button2Url ?? '',
      image: b.image ?? '', bgColor: b.bgColor ?? 'bg-zinc-900',
      textAlign: b.textAlign ?? 'left', placement: b.placement ?? 'home_hero',
      sortOrder: b.sortOrder ?? 0, isActive: b.isActive ?? true,
    });
    setShowForm(true);
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const isCustomBg = !BG_PRESETS.slice(0, -1).some(p => p.value === form.bgColor);

  const handleSubmit = () => {
    saveMutation.mutate({ ...form, bgColor: isCustomBg ? customBg : form.bgColor });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banners</h1>
          <p className="text-sm text-slate-500 mt-0.5">Hero slides, mid banners &amp; promotional banners</p>
        </div>
        <button onClick={() => { setEditBanner(null); setForm({ ...EMPTY }); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8">
            <h3 className="font-bold text-slate-900 text-lg mb-5">{editBanner ? 'Edit Banner' : 'New Banner'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="field-label">Placement *</label>
                <select value={form.placement} onChange={e => set('placement', e.target.value)} className="field-input">
                  {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Badge text (above title)</label>
                <input value={form.badgeText} onChange={e => set('badgeText', e.target.value)} placeholder="e.g. Welcome to" className="field-input" />
              </div>
              <div>
                <label className="field-label">Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. TotalStore" className="field-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Subtitle / Description</label>
                <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g. Africa's #1 Online Marketplace" className="field-input" />
              </div>
              <div>
                <label className="field-label">Primary Button Label</label>
                <input value={form.buttonText} onChange={e => set('buttonText', e.target.value)} placeholder="Shop Now" className="field-input" />
              </div>
              <div>
                <label className="field-label">Primary Button URL</label>
                <input value={form.buttonUrl} onChange={e => set('buttonUrl', e.target.value)} placeholder="/products" className="field-input" />
              </div>
              <div>
                <label className="field-label">Secondary Button Label</label>
                <input value={form.button2Text} onChange={e => set('button2Text', e.target.value)} placeholder="Start Selling" className="field-input" />
              </div>
              <div>
                <label className="field-label">Secondary Button URL</label>
                <input value={form.button2Url} onChange={e => set('button2Url', e.target.value)} placeholder="/seller/register" className="field-input" />
              </div>
              <div>
                <label className="field-label">Background Colour</label>
                <select value={isCustomBg ? 'custom' : form.bgColor} onChange={e => set('bgColor', e.target.value)} className="field-input">
                  {BG_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                {(form.bgColor === 'custom' || isCustomBg) && (
                  <>
                    <label className="field-label">Custom colour (Tailwind class or hex)</label>
                    <input value={customBg} onChange={e => setCustomBg(e.target.value)} placeholder="#1e40af or bg-blue-800" className="field-input" />
                  </>
                )}
              </div>
              <div>
                <label className="field-label">Text Alignment</label>
                <select value={form.textAlign} onChange={e => set('textAlign', e.target.value)} className="field-input">
                  {['left', 'center', 'right'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} className="field-input" />
              </div>
              <div className="sm:col-span-2">
                <MediaUpload label="Background Image (optional — overlays colour)" value={form.image} onChange={url => set('image', url)} accept="image/*" />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="font-medium text-slate-700">Active (visible on website)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} disabled={saveMutation.isPending} className="btn-primary flex-1">
                {saveMutation.isPending ? 'Saving…' : 'Save Banner'}
              </button>
              <button onClick={() => { setShowForm(false); setEditBanner(null); }} className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-slate-100 rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No banners yet</p>
          <p className="text-sm mt-1">Click <strong className="text-slate-600">Add Banner</strong> to create your first banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="card overflow-hidden border border-slate-100">
              <div className={`relative h-36 ${b.bgColor?.startsWith('bg-') ? b.bgColor : 'bg-zinc-800'} flex items-end p-3`}>
                {b.image && <Image src={b.image} alt={b.title} fill className="object-cover opacity-40" />}
                <div className="relative z-10">
                  {b.badgeText && <p className="text-white/60 text-[10px] uppercase tracking-wide mb-0.5">{b.badgeText}</p>}
                  <p className="text-white font-bold leading-tight">{b.title}</p>
                  {b.subtitle && <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{b.subtitle}</p>}
                </div>
                <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${b.isActive ? 'badge-success' : 'bg-slate-200 text-slate-500'}`}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="px-3 py-2 border-t flex items-center justify-between">
                <span className="text-xs text-slate-500 truncate">{PLACEMENTS.find(p => p.value === b.placement)?.label ?? b.placement} · #{b.sortOrder}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteMutation.mutate(b.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
