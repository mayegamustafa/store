'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Plus, Trash2, Star, Edit2, X, Save, Home, Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const LABEL_ICONS: Record<string, any> = {
  Home: Home,
  Work: Briefcase,
  Other: MapPin,
};

const EMPTY_FORM = {
  label: 'Home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  region: '',
  country: 'Uganda',
  postalCode: '',
  isDefault: false,
};

export default function AddressesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user, router]);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list().then((r: any) => {
      const d = r.data ?? r;
      return Array.isArray(d) ? d : [];
    }),
    enabled: !!user,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () => addressesApi.create(form),
    onSuccess: () => {
      toast.success('Address added!');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add address'),
  });

  const updateMutation = useMutation({
    mutationFn: () => addressesApi.update(editId!, form),
    onSuccess: () => {
      toast.success('Address updated!');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update address'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.delete(id),
    onSuccess: () => {
      toast.success('Address removed');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: () => toast.error('Failed to remove address'),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => addressesApi.setDefault(id),
    onSuccess: () => {
      toast.success('Default address updated');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const handleClose = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleEdit = (addr: any) => {
    setForm({
      label: addr.label ?? 'Home',
      fullName: addr.fullName ?? '',
      phone: addr.phone ?? '',
      addressLine1: addr.addressLine1 ?? '',
      addressLine2: addr.addressLine2 ?? '',
      city: addr.city ?? '',
      district: addr.district ?? '',
      region: addr.region ?? '',
      country: addr.country ?? '',
      postalCode: addr.postalCode ?? '',
      isDefault: addr.isDefault ?? false,
    });
    setEditId(addr.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.fullName || !form.phone || !form.addressLine1 || !form.city) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (editId) updateMutation.mutate();
    else createMutation.mutate();
  };

  if (!user) return null;
  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container-app py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/account" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Delivery Addresses</h1>
            <p className="text-sm text-slate-500">Manage your saved addresses</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => { handleClose(); setShowForm(true); }}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              {editId ? 'Edit Address' : 'New Address'}
            </h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Label tabs */}
          <div className="flex gap-2 mb-4">
            {['Home', 'Work', 'Other'].map(l => {
              const Icon = LABEL_ICONS[l] ?? MapPin;
              return (
                <button
                  key={l}
                  onClick={() => setForm(f => ({ ...f, label: l }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    form.label === l ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:border-primary/40'
                  }`}
                >
                  <Icon className="w-3 h-3" /> {l}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
              <input className="input w-full" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Recipient name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
              <input className="input w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256 700 000 000" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Address Line 1 *</label>
              <input className="input w-full" value={form.addressLine1} onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))} placeholder="Street / building name" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Address Line 2</label>
              <input className="input w-full" value={form.addressLine2} onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))} placeholder="Apartment, floor, landmark (optional)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City *</label>
              <input className="input w-full" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Kampala, Jinja" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">District</label>
              <input className="input w-full" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Wakiso" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Region</label>
              <input className="input w-full" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Central" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
              <input className="input w-full" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Country" />
            </div>
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-slate-700">Set as default delivery address</span>
          </label>

          <div className="flex gap-2 mt-4">
            <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isBusy}
              className="flex-1 flex items-center justify-center gap-2 btn-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {isBusy ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? 'Save Changes' : 'Add Address'}
            </button>
          </div>
        </div>
      )}

      {/* Address List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (addresses as any[]).length === 0 ? (
        <div className="text-center py-20">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-slate-600">No addresses saved</h2>
          <p className="text-sm text-slate-500 mt-1">Add a delivery address to speed up checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(addresses as any[]).map((addr: any) => {
            const Icon = LABEL_ICONS[addr.label] ?? MapPin;
            return (
              <div
                key={addr.id}
                className={`bg-white rounded-2xl border p-4 transition ${
                  addr.isDefault ? 'border-primary shadow-sm' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      addr.isDefault ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-primary" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{addr.fullName} · {addr.phone}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[addr.addressLine1, addr.addressLine2, addr.city, addr.district, addr.region, addr.country]
                          .filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleEdit(addr)} className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!addr.isDefault && (
                      <>
                        <button
                          onClick={() => defaultMutation.mutate(addr.id)}
                          disabled={defaultMutation.isPending}
                          className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition"
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(addr.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
