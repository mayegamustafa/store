'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { useSellerStore } from '@/stores/seller.store';
import Image from 'next/image';
import {
  Store, Star, ShoppingBag, Camera, Save, Edit2,
  Package, TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STORE_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'SUPERMARKET', label: 'Supermarket' },
  { value: 'FOOD_RESTAURANT', label: 'Food & Restaurant' },
  { value: 'BAKERY', label: 'Bakery' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'FASHION', label: 'Fashion' },
  { value: 'BEAUTY', label: 'Beauty' },
  { value: 'HARDWARE', label: 'Hardware' },
];

export default function MyStorePage() {
  const queryClient = useQueryClient();
  const { setSellerProfile } = useSellerStore();
  const [editing, setEditing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: () => sellerApi.getProfile().then((r: any) => r.data ?? r),
    staleTime: 60_000,
    onSuccess: (data: any) => setSellerProfile(data),
  } as any);

  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => sellerApi.updateProfile(form),
    onSuccess: () => {
      toast.success('Store updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
      setEditing(false);
      setForm({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  const startEdit = () => {
    if (!profile) return;
    setForm({
      storeName: profile.storeName ?? '',
      storeDescription: profile.storeDescription ?? '',
      storeCategory: profile.storeCategory ?? 'GENERAL',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm({});
    setEditing(false);
  };

  const handleImageUpload = async (file: File, field: 'storeLogo' | 'storeBanner') => {
    const which = field === 'storeLogo' ? 'logo' : 'banner';
    setUploading(which as any);
    try {
      const res: any = await sellerApi.uploadSingle(file);
      const url: string = res.data?.url ?? res.url ?? res.data?.filePath ?? res.filePath ?? '';
      if (!url) throw new Error('No URL in response');
      await sellerApi.updateProfile({ [field]: url });
      toast.success(`${which === 'logo' ? 'Logo' : 'Banner'} updated!`);
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? `Failed to upload ${which}`);
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <div className="h-44 skeleton rounded-2xl" />
        <div className="h-7 w-48 skeleton" />
        <div className="h-4 w-72 skeleton" />
        <div className="grid grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      </div>
    );
  }

  const p = profile ?? {};

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Store</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your storefront</p>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="btn btn-primary flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit Store
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="btn btn-secondary">Cancel</button>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Banner */}
      <div className="relative h-44 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden mb-4 group">
        {p.storeBanner && (
          <Image src={p.storeBanner} alt="Store banner" fill className="object-cover" />
        )}
        <button
          onClick={() => bannerInputRef.current?.click()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition text-white text-sm font-medium"
        >
          {uploading === 'banner' ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Camera className="w-6 h-6" />
              Change Banner
            </>
          )}
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'storeBanner')}
        />

        {/* Logo */}
        <div className="absolute -bottom-6 left-6 group/logo">
          <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-white overflow-hidden relative">
            {p.storeLogo ? (
              <Image src={p.storeLogo} alt="Logo" fill className="object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xl font-bold">
                {p.storeName?.[0]?.toUpperCase() ?? 'S'}
              </div>
            )}
            <button
              onClick={() => logoInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/logo:opacity-100 transition"
            >
              {uploading === 'logo' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'storeLogo')}
          />
        </div>
      </div>

      {/* Store info card */}
      <div className="card p-6 mt-8">
        {/* Status badge */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`badge ${{ ACTIVE: 'badge-success', PENDING: 'badge-warning', REJECTED: 'badge-danger', APPROVED: 'badge-success' }[p.status as string] || 'badge-neutral'}`}>
            {p.status === 'ACTIVE' || p.status === 'APPROVED' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
            {p.status ?? 'PENDING'}
          </span>
          {p.isOfficial && (
            <span className="badge badge-info">Official</span>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
              <input
                className="input w-full"
                value={form.storeName ?? ''}
                onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store Category</label>
              <select
                className="input w-full"
                value={form.storeCategory ?? ''}
                onChange={e => setForm(f => ({ ...f, storeCategory: e.target.value }))}
              >
                {STORE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store Description</label>
              <textarea
                rows={3}
                className="input w-full resize-none"
                value={form.storeDescription ?? ''}
                onChange={e => setForm(f => ({ ...f, storeDescription: e.target.value }))}
              />
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-900">{p.storeName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{p.storeSlug ? `@${p.storeSlug}` : ''}</p>
            {p.storeCategory && (
              <span className="inline-block mt-2 badge badge-neutral">
                {STORE_CATEGORIES.find(c => c.value === p.storeCategory)?.label ?? p.storeCategory}
              </span>
            )}
            {p.storeDescription && (
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{p.storeDescription}</p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        <div className="stat-card text-center">
          <ShoppingBag className="w-5 h-5 text-sky-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-900">{p.totalOrders ?? 0}</p>
          <p className="text-xs text-slate-500">Total Orders</p>
        </div>
        <div className="stat-card text-center">
          <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-900">UGX {Number(p.totalSales ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Sales</p>
        </div>
        <div className="stat-card text-center">
          <Star className="w-5 h-5 fill-amber-400 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-900">{Number(p.rating ?? 0).toFixed(1)}</p>
          <p className="text-xs text-slate-500">Rating</p>
        </div>
        <div className="stat-card text-center">
          <Package className="w-5 h-5 text-violet-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-900">{p.reviewCount ?? 0}</p>
          <p className="text-xs text-slate-500">Reviews</p>
        </div>
      </div>
    </div>
  );
}
