'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { PlusCircle, Pencil, Trash2, BadgeCheck, Users, ToggleLeft, ToggleRight } from 'lucide-react';

const BILLING_CYCLES = ['MONTHLY', 'YEARLY', 'ONCE'] as const;
const CURRENCIES = ['UGX', 'USD', 'KES', 'TZS'] as const;

const EMPTY_FORM = {
  name: '',
  description: '',
  price: 0,
  currency: 'UGX' as string,
  billingCycle: 'MONTHLY' as string,
  features: '' as string,
  maxProducts: 0,
  sortOrder: 0,
  isActive: true,
};

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['subscription-plans'] });

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => adminApi.getSubscriptionPlans(),
  });

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = {
        ...d,
        price: Number(d.price),
        maxProducts: Number(d.maxProducts),
        sortOrder: Number(d.sortOrder),
        features: d.features ? d.features.split('\n').map((f: string) => f.trim()).filter(Boolean) : [],
      };
      return editItem
        ? adminApi.updateSubscriptionPlan(editItem.id, payload)
        : adminApi.createSubscriptionPlan(payload);
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setEditItem(null);
      setForm({ ...EMPTY_FORM });
      toast.success(editItem ? 'Plan updated!' : 'Plan created!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save plan'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateSubscriptionPlan(id, { isActive }),
    onSuccess: () => { invalidate(); toast.success('Plan updated'); },
    onError: () => toast.error('Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSubscriptionPlan(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('Plan deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete plan'),
  });

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (plan: any) => {
    setEditItem(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      maxProducts: plan.maxProducts ?? 0,
      sortOrder: plan.sortOrder ?? 0,
      isActive: plan.isActive,
    });
    setShowForm(true);
  };

  const activeSubs = (plan: any) => plan._count?.subscriptions ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BadgeCheck className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Subscription Plans</h1>
            <p className="text-sm text-slate-500">{plans.length} plan{plans.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/subscriptions/subscribers"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <Users className="w-4 h-4" /> View Subscribers
          </Link>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> New Plan
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          No plans yet. Create your first subscription plan.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-th">Plan</th>
                <th className="table-th">Price</th>
                <th className="table-th">Billing</th>
                <th className="table-th">Max Products</th>
                <th className="table-th text-center">Active Subs</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plans.map((plan: any) => (
                <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td">
                    <div className="font-medium text-slate-800">{plan.name}</div>
                    {plan.description && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{plan.description}</div>
                    )}
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {plan.features.slice(0, 3).map((f: string, i: number) => (
                          <span key={i} className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                        {plan.features.length > 3 && (
                          <span className="text-xs text-slate-400">+{plan.features.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="table-td font-semibold text-slate-700">
                    {Number(plan.price) === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <>{plan.currency} {Number(plan.price).toLocaleString()}</>
                    )}
                  </td>
                  <td className="table-td">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                      {plan.billingCycle}
                    </span>
                  </td>
                  <td className="table-td text-slate-600">
                    {plan.maxProducts === 0 ? 'Unlimited' : plan.maxProducts}
                  </td>
                  <td className="table-td text-center">
                    <span className="flex items-center justify-center gap-1 text-slate-600">
                      <Users className="w-3.5 h-3.5" /> {activeSubs(plan)}
                    </span>
                  </td>
                  <td className="table-td text-center">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: plan.id, isActive: !plan.isActive })}
                      className={`flex items-center justify-center gap-1 text-xs font-medium mx-auto ${
                        plan.isActive ? 'text-green-600' : 'text-slate-400'
                      }`}
                      title={plan.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {plan.isActive
                        ? <ToggleRight className="w-5 h-5" />
                        : <ToggleLeft className="w-5 h-5" />}
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(plan)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        title="Delete"
                        disabled={activeSubs(plan) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">
                {editItem ? 'Edit Plan' : 'New Subscription Plan'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Plan Name *</label>
                  <input
                    className="input w-full"
                    placeholder="e.g. Basic, Pro, Enterprise"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input
                    className="input w-full"
                    placeholder="Short description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Price</label>
                  <input
                    type="number"
                    min={0}
                    className="input w-full"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
                  <select
                    className="input w-full"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Billing Cycle</label>
                  <select
                    className="input w-full"
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                  >
                    {BILLING_CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Products (0 = unlimited)</label>
                  <input
                    type="number"
                    min={0}
                    className="input w-full"
                    value={form.maxProducts}
                    onChange={(e) => setForm({ ...form, maxProducts: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    className="input w-full"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700">Active (visible to sellers)</label>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Features (one per line)
                  </label>
                  <textarea
                    className="input w-full font-mono text-sm"
                    rows={5}
                    placeholder={"Unlimited listings\nPriority support\nAnalytics dashboard"}
                    value={form.features}
                    onChange={(e) => setForm({ ...form, features: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => { setShowForm(false); setEditItem(null); }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!form.name || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending ? 'Saving...' : editItem ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-2">Delete Plan?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
