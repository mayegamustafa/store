'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Percent, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';

const EMPTY_FORM = {
  code: '', description: '', discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: '', minOrderAmount: '', maxDiscountAmount: '',
  usageLimit: '', expiresAt: '', isActive: true,
};

export default function CouponsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons', page, search],
    queryFn: () => adminApi.getCoupons(page, search || undefined),
  });

  const coupons: any[] = (data?.data as any)?.items || (data?.data as any) || [];
  const invalid = () => qc.invalidateQueries({ queryKey: ['admin-coupons'] });

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = {
        ...d,
        discountValue: parseFloat(d.discountValue),
        minOrderAmount: d.minOrderAmount ? parseFloat(d.minOrderAmount) : undefined,
        maxDiscountAmount: d.maxDiscountAmount ? parseFloat(d.maxDiscountAmount) : undefined,
        usageLimit: d.usageLimit ? parseInt(d.usageLimit) : undefined,
        expiresAt: d.expiresAt || undefined,
      };
      return editItem ? adminApi.updateCoupon(editItem.id, payload) : adminApi.createCoupon(payload);
    },
    onSuccess: () => {
      invalid(); setShowForm(false); setEditItem(null); setForm({ ...EMPTY_FORM });
      toast.success(editItem ? 'Coupon updated!' : 'Coupon created!');
    },
    onError: () => toast.error('Failed to save coupon'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.toggleCoupon(id, isActive),
    onSuccess: () => { invalid(); toast.success('Coupon updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCoupon(id),
    onSuccess: () => { invalid(); setConfirmDelete(null); toast.success('Coupon deleted'); },
    onError: () => toast.error('Failed to delete coupon'),
  });

  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({
      code: c.code || '',
      description: c.description || '',
      discountType: c.discountType || 'PERCENTAGE',
      discountValue: String(c.discountValue || ''),
      minOrderAmount: String(c.minOrderAmount || ''),
      maxDiscountAmount: String(c.maxDiscountAmount || ''),
      usageLimit: String(c.usageLimit || ''),
      expiresAt: c.expiresAt ? c.expiresAt.substring(0, 10) : '',
      isActive: c.isActive ?? true,
    });
    setShowForm(true);
  };

  const now = new Date();
  const isExpired = (c: any) => c.expiresAt && new Date(c.expiresAt) < now;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>
        <button onClick={() => { setEditItem(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search coupon code..."
          className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-400" />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-slate-900 mb-4">{editItem ? 'Edit Coupon' : 'New Coupon'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Coupon Code <span className="text-red-500">*</span></label>
                <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE20" className="w-full border rounded-xl px-3 py-2 text-sm font-mono tracking-widest" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. 20% off all orders" className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Discount Type</label>
                <select value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as any }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (UGX)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Discount Value {form.discountType === 'PERCENTAGE' ? '(%)' : '(UGX)'} <span className="text-red-500">*</span>
                  </label>
                  <input type="number" value={form.discountValue} onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                    placeholder={form.discountType === 'PERCENTAGE' ? '20' : '5000'} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Min Order (UGX)</label>
                  <input type="number" value={form.minOrderAmount} onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))}
                    placeholder="50000" className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              {form.discountType === 'PERCENTAGE' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Max Discount Cap (UGX)</label>
                  <input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: e.target.value }))}
                    placeholder="20000" className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Usage Limit</label>
                  <input type="number" value={form.usageLimit} onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                    placeholder="Unlimited" className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Expires At</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4" />
                Active
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => saveMutation.mutate(form)} disabled={!form.code || !form.discountValue || saveMutation.isPending}
                className="btn-primary flex-1">{saveMutation.isPending ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Delete Coupon?</h3>
            <p className="text-sm text-slate-600 mb-5">Delete coupon <span className="font-mono font-semibold">{confirmDelete.code}</span>?</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="btn-danger flex-1">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading coupons...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Code', 'Discount', 'Min Order', 'Usage', 'Expires', 'Status', 'Actions'].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {coupons.map((coupon: any) => (
                <tr key={coupon.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className="bg-sky-50 text-sky-700 font-mono font-bold text-sm px-2 py-0.5 rounded-lg">{coupon.code}</span>
                    </div>
                    {coupon.description && <p className="text-xs text-slate-400 mt-0.5">{coupon.description}</p>}
                  </td>
                  <td className="table-td">
                    <span className="flex items-center gap-1 font-semibold text-sm">
                      {coupon.discountType === 'PERCENTAGE'
                        ? <><Percent className="w-3.5 h-3.5 text-purple-500" />{coupon.discountValue}%</>
                        : <><Tag className="w-3.5 h-3.5 text-green-500" />UGX {coupon.discountValue?.toLocaleString()}</>
                      }
                    </span>
                    {coupon.maxDiscountAmount && <p className="text-xs text-slate-400">cap: UGX {coupon.maxDiscountAmount?.toLocaleString()}</p>}
                  </td>
                  <td className="table-td text-sm">{coupon.minOrderAmount ? `UGX ${coupon.minOrderAmount.toLocaleString()}` : '—'}</td>
                  <td className="table-td text-sm">
                    <span>{coupon.usageCount || 0}</span>
                    {coupon.usageLimit && <span className="text-slate-400"> / {coupon.usageLimit}</span>}
                  </td>
                  <td className="table-td text-xs">
                    {coupon.expiresAt ? (
                      <span className={isExpired(coupon) ? 'text-red-500 font-medium' : 'text-slate-600'}>
                        {isExpired(coupon) ? '[Expired] ' : ''}{new Date(coupon.expiresAt).toLocaleDateString()}
                      </span>
                    ) : <span className="text-slate-400">No expiry</span>}
                  </td>
                  <td className="table-td">
                    <button onClick={() => toggleMutation.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${coupon.isActive ? 'text-green-600 hover:text-green-700' : 'text-slate-400 hover:text-slate-600'}`}>
                      {coupon.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(coupon)} className="text-primary-600 hover:text-primary-700" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete(coupon)} className="text-red-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-slate-400 py-10">No coupons yet. Click "Create Coupon" to add one.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {((data?.data as any)?.totalPages ?? (data?.data as any)?.pages ?? 0) > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: (data?.data as any)?.totalPages ?? (data?.data as any)?.pages ?? 0 }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
