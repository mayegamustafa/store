'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, X, PenLine, RefreshCw, Percent, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { MultiImageUpload, MediaUpload } from '@/components/MediaUpload';

const CONDITION_OPTIONS = ['NEW', 'USED', 'REFURBISHED'];

export default function AddProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    sellerId: '',
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    cost: '',
    sku: '',
    stock: '',
    categoryId: '',
    brand: '',
    condition: 'NEW',
    weight: '',
    discountType: '' as '' | 'PERCENTAGE' | 'FIXED',
    discountValue: '',
    tags: [] as string[],
    images: [] as string[],
    thumbnailUrl: '',
    videoUrl: '',
    adVideoUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [autoFillLoading, setAiLoading] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });
  const categories = categoriesData?.data || categoriesData || [];

  const { data: sellersData } = useQuery({
    queryKey: ['admin-sellers-all'],
    queryFn: () => adminApi.getSellers(1, undefined, undefined),
  });
  const allSellers: any[] = (sellersData as any)?.data || [];
  const officialSeller = allSellers.find((s: any) => s.isOfficial);
  const otherSellers = allSellers.filter((s: any) => !s.isOfficial);


  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      adminApi.createProduct({
        sellerId: data.sellerId,
        name: data.name,
        description: data.description || undefined,
        basePrice: parseFloat(data.price),
        comparePrice: data.compareAtPrice ? parseFloat(data.compareAtPrice) : undefined,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        sku: data.sku || undefined,
        stock: parseInt(data.stock, 10),
        categoryId: data.categoryId || undefined,
        brand: data.brand || undefined,
        condition: data.condition,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        discountType: data.discountType || undefined,
        discountValue: data.discountValue ? parseFloat(data.discountValue) : undefined,
        tags: data.tags,
        images: data.images,
        thumbnailUrl: data.thumbnailUrl || undefined,
        videoUrl: data.videoUrl || undefined,
        adVideoUrl: data.adVideoUrl || undefined,
      }),
    onSuccess: () => {
      toast.success('Product created!');
      router.push('/products');
    },
    onError: () => toast.error('Failed to create product'),
  });

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const generateSku = () => {
    const brandPart = form.brand ? form.brand.slice(0, 3).toUpperCase() : 'PRD';
    const namePart = form.name
      ? form.name.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase()
      : 'ITEM';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    set('sku', `${brandPart}-${namePart}-${rand}`);
  };

  const handleAutoFillDescription = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiLoading(true);
    try {
      const res = await adminApi.generateProductDescription({
        name: form.name,
        brand: form.brand || undefined,
        category: (Array.isArray(categories) ? categories : []).find((c: any) => c.id === form.categoryId)?.name,
        tags: form.tags,
        condition: form.condition,
      });
      // Axios interceptor already unwraps .data → res IS { description: string }
      const generated = (res as any)?.description || (res as any)?.data?.description || '';
      if (!generated) throw new Error('Empty response');
      set('description', generated);
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setAiLoading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) {
      toast.error('Name, price and stock are required');
      return;
    }
    // If no seller selected, auto-select official seller if available
    let sellerId = form.sellerId;
    if (!sellerId && officialSeller) {
      sellerId = officialSeller.id;
      set('sellerId', sellerId);
      toast('Defaulted to official seller');
    }
    if (!sellerId) {
      toast.error('Please select a seller for this product');
      return;
    }
    mutation.mutate({ ...form, sellerId });
  };

  const field = (label: string, key: keyof typeof form, opts?: {
    type?: string; placeholder?: string; required?: boolean; as?: 'textarea';
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {opts?.required && <span className="text-red-500">*</span>}
      </label>
      {opts?.as === 'textarea' ? (
        <textarea
          value={form[key] as string}
          onChange={(e) => set(key, e.target.value)}
          placeholder={opts.placeholder}
          rows={4}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      ) : (
        <input
          type={opts?.type || 'text'}
          value={form[key] as string}
          onChange={(e) => set(key, e.target.value)}
          placeholder={opts?.placeholder}
          required={opts?.required}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/products" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Product</h1>
          <p className="text-sm text-slate-500">Create a new product in the catalogue</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Basic Information</h2>
          {field('Product Name', 'name', { required: true, placeholder: 'e.g. Samsung Galaxy S24' })}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <button
                type="button"
                onClick={handleAutoFillDescription}
                disabled={autoFillLoading}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50 transition-colors"
              >
                {autoFillLoading ? (
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-violet-500 border-t-transparent" />
                ) : (
                  <PenLine className="w-3.5 h-3.5" />
                )}
                {autoFillLoading ? 'Writing…' : 'Auto-fill Description'}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the product, or auto-fill from the product name…"
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Brand', 'brand', { placeholder: 'e.g. Samsung' })}
            {/* SKU with auto-generate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">SKU</label>
                <button
                  type="button"
                  onClick={generateSku}
                  className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Auto-generate
                </button>
              </div>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="e.g. SAM-S24-128R"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Pricing & Stock</h2>
          <div className="grid grid-cols-3 gap-4">
            {field('Selling Price (UGX)', 'price', { type: 'number', required: true, placeholder: '50000' })}
            {field('Compare-at Price', 'compareAtPrice', { type: 'number', placeholder: '65000' })}
            {field('Cost Price', 'cost', { type: 'number', placeholder: '35000' })}
          </div>

          {/* Discount */}
          <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Discount (optional)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set('discountType', form.discountType === 'PERCENTAGE' ? '' : 'PERCENTAGE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.discountType === 'PERCENTAGE'
                    ? 'bg-sky-50 border-sky-400 text-sky-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Percent className="w-3.5 h-3.5" /> Percentage
              </button>
              <button
                type="button"
                onClick={() => set('discountType', form.discountType === 'FIXED' ? '' : 'FIXED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.discountType === 'FIXED'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Fixed Amount
              </button>
              {form.discountType && (
                <button type="button" onClick={() => { set('discountType', ''); set('discountValue', ''); }} className="ml-auto text-xs text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {form.discountType && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) => set('discountValue', e.target.value)}
                  placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 15 (%)' : 'e.g. 5000 (UGX)'}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                {form.price && form.discountValue && (
                  <span className="text-sm text-emerald-600 font-medium whitespace-nowrap">
                    Final: UGX {(
                      form.discountType === 'PERCENTAGE'
                        ? parseFloat(form.price) * (1 - parseFloat(form.discountValue) / 100)
                        : parseFloat(form.price) - parseFloat(form.discountValue)
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Stock Quantity', 'stock', { type: 'number', required: true, placeholder: '100' })}
            {field('Weight (kg)', 'weight', { type: 'number', placeholder: '0.5' })}
          </div>
        </div>

        {/* Seller */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Seller <span className="text-red-500">*</span></h2>
          <select
            value={form.sellerId}
            onChange={(e) => set('sellerId', e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">— Select seller / shop —</option>
            {officialSeller && (
              <option value={officialSeller.id}>
                ★ {officialSeller.storeName} — Company Store
              </option>
            )}
            {officialSeller && otherSellers.length > 0 && (
              <option disabled>──────────────────</option>
            )}
            {otherSellers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.storeName} ({s.user?.email || s.user?.phone || ''})</option>
            ))}
          </select>
          {!officialSeller && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              No official store set yet. Go to <strong>Sellers</strong> and click the store icon on a seller to mark it as the company store.
            </p>
          )}
          <p className="text-xs text-slate-400">This product will be created on behalf of the selected seller and auto-approved.</p>
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Category</h2>
          <select
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">— Select category —</option>
            {(Array.isArray(categories) ? categories : []).map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Media */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Media</h2>
          <MultiImageUpload
            label="Product Images"
            values={form.images}
            onChange={(urls) => set('images', urls)}
            max={10}
          />
          <MediaUpload
            label="Thumbnail (main display image)"
            value={form.thumbnailUrl}
            onChange={(url) => set('thumbnailUrl', url)}
            accept="image/*"
            compact
          />
          <MediaUpload
            label="Product Demo Video (optional)"
            value={form.videoUrl}
            onChange={(url) => set('videoUrl', url)}
            accept="video/*"
            previewType="video"
          />
          <MediaUpload
            label="Ad / Promo Video (optional)"
            value={form.adVideoUrl}
            onChange={(url) => set('adVideoUrl', url)}
            accept="video/*"
            previewType="video"
          />
        </div>

        {/* Tags */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Tags</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag and press Enter"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button type="button" onClick={addTag} className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs px-3 py-1 rounded-full">
                  {tag}
                  <button type="button" onClick={() => set('tags', form.tags.filter((t) => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Link href="/products" className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
          >
            {mutation.isPending ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {mutation.isPending ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
