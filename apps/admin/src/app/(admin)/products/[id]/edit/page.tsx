'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Percent, DollarSign, X, Plus, PenLine, Save } from 'lucide-react';
import Link from 'next/link';
import { MultiImageUpload, MediaUpload } from '@/components/MediaUpload';

const CONDITION_OPTIONS = ['NEW', 'USED', 'REFURBISHED'];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  cost: '',
  deliveryFee: '',
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
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [autoFillLoading, setAiLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // ── Load existing product ─────────────────────────────────────────────
  const { data: productData, isLoading: loadingProduct } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => adminApi.getProduct(id),
    enabled: !!id,
  });

  const product: any = (productData as any)?.data ?? productData;

  useEffect(() => {
    if (!product || ready) return;
    setForm({
      name:           product.name             ?? '',
      description:    product.description      ?? '',
      price:          String(product.basePrice  ?? ''),
      compareAtPrice: String(product.comparePrice ?? '') === '0' ? '' : String(product.comparePrice ?? ''),
      cost:           String(product.cost        ?? '') === '0' ? '' : String(product.cost ?? ''),
      deliveryFee:    product.deliveryFee ? String(product.deliveryFee) : '',
      sku:            product.sku              ?? '',
      stock:          String(product.stock      ?? ''),
      categoryId:     product.categoryId       ?? product.category?.id ?? '',
      brand:          product.brand            ?? '',
      condition:      product.condition        ?? 'NEW',
      weight:         product.weight ? String(product.weight) : '',
      discountType:   (product.discountType    ?? '') as '' | 'PERCENTAGE' | 'FIXED',
      discountValue:  product.discountValue ? String(product.discountValue) : '',
      tags:           Array.isArray(product.tags) ? product.tags : [],
      images:         Array.isArray(product.images) ? product.images : [],
      thumbnailUrl:   product.thumbnailUrl     ?? '',
      videoUrl:       product.videoUrl         ?? '',
      adVideoUrl:     product.adVideoUrl       ?? '',
    });
    setReady(true);
  }, [product, ready]);

  // ── Categories ────────────────────────────────────────────────────────
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });
  const categories: any[] = (categoriesData as any)?.data ?? categoriesData ?? [];

  // ── Save mutation ─────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateProduct(id, {
        name:          form.name,
        description:   form.description   || undefined,
        basePrice:     parseFloat(form.price),
        comparePrice:  form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
        cost:          form.cost           ? parseFloat(form.cost)           : undefined,
        deliveryFee:   form.deliveryFee    ? parseFloat(form.deliveryFee)    : null,
        sku:           form.sku            || undefined,
        stock:         parseInt(form.stock, 10),
        categoryId:    form.categoryId     || undefined,
        brand:         form.brand          || undefined,
        condition:     form.condition,
        weight:        form.weight         ? parseFloat(form.weight)         : undefined,
        discountType:  form.discountType   || undefined,
        discountValue: form.discountValue  ? parseFloat(form.discountValue)  : undefined,
        tags:          form.tags,
        images:        form.images,
        thumbnailUrl:  form.thumbnailUrl   || undefined,
        videoUrl:      form.videoUrl       || undefined,
        adVideoUrl:    form.adVideoUrl     || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
      toast.success('Product updated!');
      router.push('/products');
    },
    onError: () => toast.error('Failed to update product'),
  });

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const generateSku = () => {
    const b = form.brand ? form.brand.slice(0, 3).toUpperCase() : 'PRD';
    const n = form.name
      ? form.name.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase()
      : 'ITEM';
    set('sku', `${b}-${n}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  };

  const handleAutoFill = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiLoading(true);
    try {
      const res = await adminApi.generateProductDescription({
        name:      form.name,
        brand:     form.brand     || undefined,
        category:  (Array.isArray(categories) ? categories : []).find((c: any) => c.id === form.categoryId)?.name,
        tags:      form.tags,
        condition: form.condition,
      });
      const generated = (res as any)?.description || (res as any)?.data?.description || '';
      if (!generated) throw new Error('Empty');
      set('description', generated);
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) {
      toast.error('Name, price and stock are required');
      return;
    }
    mutation.mutate();
  };

  // ── Field helper ──────────────────────────────────────────────────────
  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { type?: string; placeholder?: string; required?: boolean; as?: 'textarea' },
  ) => (
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

  if (loadingProduct) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/products" className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                <div className="h-9 bg-slate-100 rounded-lg" />
                <div className="h-9 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/products" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
          <p className="text-sm text-slate-500 line-clamp-1">{product?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Basic Info ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Basic Information</h2>
          {field('Product Name', 'name', { required: true, placeholder: 'e.g. Samsung Galaxy S24' })}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <button
                type="button"
                onClick={handleAutoFill}
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
              placeholder="Describe the product…"
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Brand', 'brand', { placeholder: 'e.g. Samsung' })}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">SKU</label>
                <button type="button" onClick={generateSku}
                  className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors">
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

        {/* ── Pricing & Stock ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Pricing & Stock</h2>
          <div className="grid grid-cols-3 gap-4">
            {field('Selling Price (UGX)', 'price', { type: 'number', required: true, placeholder: '50000' })}
            {field('Compare-at Price', 'compareAtPrice', { type: 'number', placeholder: '65000' })}
            {field('Cost Price', 'cost', { type: 'number', placeholder: '35000' })}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {field('Delivery Fee (UGX)', 'deliveryFee', { type: 'number', placeholder: 'Leave empty for default' })}
          </div>

          {/* Discount */}
          <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Discount (optional)</p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => set('discountType', form.discountType === 'PERCENTAGE' ? '' : 'PERCENTAGE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.discountType === 'PERCENTAGE'
                    ? 'bg-sky-50 border-sky-400 text-sky-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                <Percent className="w-3.5 h-3.5" /> Percentage
              </button>
              <button type="button"
                onClick={() => set('discountType', form.discountType === 'FIXED' ? '' : 'FIXED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.discountType === 'FIXED'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                <DollarSign className="w-3.5 h-3.5" /> Fixed Amount
              </button>
              {form.discountType && (
                <button type="button"
                  onClick={() => { set('discountType', ''); set('discountValue', ''); }}
                  className="ml-auto text-xs text-slate-400 hover:text-red-500">
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

        {/* ── Category ─────────────────────────────────────────────────── */}
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

        {/* ── Media ───────────────────────────────────────────────────── */}
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

        {/* ── Tags ─────────────────────────────────────────────────────── */}
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
            <button type="button" onClick={addTag}
              className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-1">
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

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-6">
          <Link href="/products"
            className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
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
              <Save className="w-4 h-4" />
            )}
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
