'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Bookmark } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { MediaUpload } from '@/components/MediaUpload';

const BG_PRESETS = [
  { label: 'Dark zinc',    value: 'bg-zinc-900' },
  { label: 'Blue',         value: 'bg-blue-600' },
  { label: 'Sky',          value: 'bg-sky-600' },
  { label: 'Red',          value: 'bg-red-600' },
  { label: 'Rose',         value: 'bg-rose-600' },
  { label: 'Orange',       value: 'bg-orange-500' },
  { label: 'Amber',        value: 'bg-amber-500' },
  { label: 'Emerald',      value: 'bg-emerald-600' },
  { label: 'Violet',       value: 'bg-violet-700' },
  { label: 'Slate',        value: 'bg-slate-700' },
  { label: 'Indigo',       value: 'bg-indigo-600' },
  { label: 'Gray',         value: 'bg-slate-700' },
];

const EMPTY = {
  name: '', monogram: '', logo: '',
  circleBg: 'bg-zinc-900', circleText: 'text-white',
  href: '/products', sortOrder: 0, isActive: true,
};

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBrand, setEditBrand] = useState<any>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: adminApi.getBrands,
  });
  const brands: any[] = Array.isArray(raw) ? raw : (raw as any)?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editBrand ? adminApi.updateBrand(editBrand.id, data) : adminApi.createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      setShowForm(false); setEditBrand(null); setForm({ ...EMPTY });
      toast.success(editBrand ? 'Brand updated!' : 'Brand created!');
    },
    onError: () => toast.error('Failed to save brand'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBrand(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-brands'] }); toast.success('Deleted'); },
  });

  const openEdit = (b: any) => {
    setEditBrand(b);
    setForm({
      name: b.name ?? '', monogram: b.monogram ?? '', logo: b.logo ?? '',
      circleBg: b.circleBg ?? 'bg-zinc-900', circleText: b.circleText ?? 'text-white',
      href: b.href ?? '/products', sortOrder: b.sortOrder ?? 0, isActive: b.isActive ?? true,
    });
    setShowForm(true);
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Auto-generate monogram from name
  const handleNameChange = (name: string) => {
    const words = name.trim().split(/\s+/);
    const mono = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
    setForm(p => ({ ...p, name, monogram: p.monogram || mono }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Top Brands</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage brands shown in the homepage Top Brands section</p>
        </div>
        <button onClick={() => { setEditBrand(null); setForm({ ...EMPTY }); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8">
            <h3 className="font-bold text-slate-900 text-lg mb-5">{editBrand ? 'Edit Brand' : 'New Brand'}</h3>
            <div className="space-y-4">
              <div>
                <label className="field-label">Brand Name *</label>
                <input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Samsung" className="field-input" />
              </div>
              <div>
                <label className="field-label">Monogram (2-letter fallback when no logo)</label>
                <input value={form.monogram} onChange={e => set('monogram', e.target.value.toUpperCase().slice(0, 3))} placeholder="e.g. SA" className="field-input uppercase" maxLength={3} />
              </div>
              <div>
                <label className="field-label">Background Colour</label>
                <select value={form.circleBg} onChange={e => set('circleBg', e.target.value)} className="field-input">
                  {BG_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {/* Live preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={`w-12 h-12 rounded-2xl ${form.circleBg} flex items-center justify-center flex-shrink-0`}>
                  {form.logo ? (
                    <Image src={form.logo} alt={form.name} width={36} height={36} className="object-contain rounded-xl" />
                  ) : (
                    <span className="text-sm font-black text-white">{form.monogram || '??'}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-700">{form.name || 'Brand Name'}</span>
              </div>
              <div>
                <label className="field-label">Link URL</label>
                <input value={form.href} onChange={e => set('href', e.target.value)} placeholder="/brand/samsung" className="field-input" />
              </div>
              <div>
                <label className="field-label">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} className="field-input" />
              </div>
              <MediaUpload label="Brand Logo (optional — replaces monogram)" value={form.logo} onChange={url => set('logo', url)} accept="image/*" />
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="font-medium text-slate-700">Active</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary flex-1">
                {saveMutation.isPending ? 'Saving…' : 'Save Brand'}
              </button>
              <button onClick={() => { setShowForm(false); setEditBrand(null); }} className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Bookmark className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No brands yet</p>
          <p className="text-sm mt-1">Click <strong className="text-slate-600">Add Brand</strong> to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {brands.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-col items-center gap-2 group relative">
              <div className={`w-14 h-14 rounded-2xl ${b.circleBg ?? 'bg-zinc-900'} flex items-center justify-center`}>
                {b.logo ? (
                  <Image src={b.logo} alt={b.name} width={40} height={40} className="object-contain rounded-xl" />
                ) : (
                  <span className="text-sm font-black text-white">{b.monogram}</span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-700 text-center leading-tight">{b.name}</p>
              {!b.isActive && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
              <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-0.5">
                <button onClick={() => openEdit(b)} className="p-1 bg-white border rounded text-sky-600 hover:bg-sky-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => deleteMutation.mutate(b.id)} className="p-1 bg-white border rounded text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
