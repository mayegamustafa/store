'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Common lucide icon names that work well for service blocks
const ICON_OPTIONS = [
  'Truck','ShieldCheck','RefreshCcw','Headphones','CreditCard',
  'Smartphone','Star','Award','Clock','Zap','Gift','Lock',
  'Package','RotateCcw','CheckCircle','Heart','ThumbsUp','MapPin',
];

const PLACEMENTS = [
  { value: 'promo_strip',   label: 'Home — Service Strip (Free Delivery, etc.)' },
  { value: 'mid_single',    label: 'Home — Full-width Single Banner text content' },
  { value: 'footer_strip',  label: 'Footer — Info strip' },
];

const ICON_BG_PRESETS = [
  { label: 'Emerald (green)',  bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { label: 'Violet (purple)',  bg: 'bg-violet-50',  color: 'text-violet-600' },
  { label: 'Amber (yellow)',   bg: 'bg-amber-50',   color: 'text-amber-600' },
  { label: 'Sky (blue)',       bg: 'bg-sky-50',     color: 'text-sky-600' },
  { label: 'Rose (red)',       bg: 'bg-rose-50',    color: 'text-rose-600' },
  { label: 'Gray',             bg: 'bg-slate-100',   color: 'text-slate-600' },
];

const EMPTY = {
  title: '', subtitle: '', icon: 'Truck',
  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
  href: '', placement: 'promo_strip', sortOrder: 0, isActive: true,
};

export default function HomeBlocksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBlock, setEditBlock] = useState<any>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin-home-blocks'],
    queryFn: adminApi.getHomeBlocks,
  });
  const blocks: any[] = Array.isArray(raw) ? raw : (raw as any)?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editBlock ? adminApi.updateHomeBlock(editBlock.id, data) : adminApi.createHomeBlock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-home-blocks'] });
      setShowForm(false); setEditBlock(null); setForm({ ...EMPTY });
      toast.success(editBlock ? 'Block updated!' : 'Block created!');
    },
    onError: () => toast.error('Failed to save block'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteHomeBlock(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-home-blocks'] }); toast.success('Deleted'); },
  });

  const openEdit = (b: any) => {
    setEditBlock(b);
    setForm({
      title: b.title ?? '', subtitle: b.subtitle ?? '', icon: b.icon ?? 'Truck',
      iconBg: b.iconBg ?? 'bg-emerald-50', iconColor: b.iconColor ?? 'text-emerald-600',
      href: b.href ?? '', placement: b.placement ?? 'promo_strip',
      sortOrder: b.sortOrder ?? 0, isActive: b.isActive ?? true,
    });
    setShowForm(true);
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handlePresetChange = (preset: typeof ICON_BG_PRESETS[0]) => {
    setForm(p => ({ ...p, iconBg: preset.bg, iconColor: preset.color }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Home Blocks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage service/value proposition blocks shown on the homepage (e.g. Free Delivery, Secure Escrow)
          </p>
        </div>
        <button onClick={() => { setEditBlock(null); setForm({ ...EMPTY }); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Block
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8">
            <h3 className="font-bold text-slate-900 text-lg mb-5">{editBlock ? 'Edit Block' : 'New Home Block'}</h3>
            <div className="space-y-4">
              <div>
                <label className="field-label">Placement *</label>
                <select value={form.placement} onChange={e => set('placement', e.target.value)} className="field-input">
                  {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Free Delivery" className="field-input" />
              </div>
              <div>
                <label className="field-label">Subtitle</label>
                <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g. On orders above UGX 100,000" className="field-input" />
              </div>
              <div>
                <label className="field-label">Icon (lucide icon name)</label>
                <select value={form.icon} onChange={e => set('icon', e.target.value)} className="field-input">
                  {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Icon Colour Scheme</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {ICON_BG_PRESETS.map(p => (
                    <button
                      key={p.bg}
                      type="button"
                      onClick={() => handlePresetChange(p)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition ${form.iconBg === p.bg ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <span className={`w-6 h-6 rounded-md ${p.bg} flex items-center justify-center`}>
                        <span className={`w-3 h-3 rounded-sm ${p.color.replace('text-', 'bg-')}`} />
                      </span>
                      {p.label.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">Link URL (optional)</label>
                <input value={form.href} onChange={e => set('href', e.target.value)} placeholder="/products" className="field-input" />
              </div>
              <div>
                <label className="field-label">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} className="field-input" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="font-medium text-slate-700">Active</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary flex-1">
                {saveMutation.isPending ? 'Saving…' : 'Save Block'}
              </button>
              <button onClick={() => { setShowForm(false); setEditBlock(null); }} className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Layers className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No blocks yet</p>
          <p className="text-sm mt-1">Click <strong className="text-slate-600">Add Block</strong> to add the first one.</p>
          <p className="text-xs text-slate-400 mt-4 max-w-sm mx-auto">
            Suggested: Free Delivery · MTN &amp; Airtel Payment · Secure Escrow · Easy Returns · 24/7 Support
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {blocks.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 group relative">
              <div className={`w-11 h-11 rounded-lg ${b.iconBg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-xs font-bold ${b.iconColor}`}>{b.icon?.slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{b.title}</p>
                {b.subtitle && <p className="text-xs text-slate-500 truncate">{b.subtitle}</p>}
                <p className="text-[10px] text-slate-400 mt-0.5">{PLACEMENTS.find(p => p.value === b.placement)?.label ?? b.placement}</p>
              </div>
              {!b.isActive && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Off</span>}
              <div className="hidden group-hover:flex gap-1 absolute top-2 right-2">
                <button onClick={() => openEdit(b)} className="p-1 bg-white border rounded text-sky-600 hover:bg-sky-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteMutation.mutate(b.id)} className="p-1 bg-white border rounded text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
