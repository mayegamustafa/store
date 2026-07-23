'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, X, PenLine, RefreshCw, Percent, Tag, Upload, Film } from 'lucide-react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

const CONDITION_OPTIONS = ['NEW', 'USED', 'REFURBISHED'];

// ─── Multi-image upload component ────────────────────────────────────────────
function MultiImageUpload({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      setUploading(true);
      try {
        const urls = await sellerApi.uploadImages(files);
        onChange([...images, ...(Array.isArray(urls) ? urls : [urls])]);
      } catch {
        toast.error('Failed to upload images');
      } finally {
        setUploading(false);
      }
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 10,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop images here' : 'Drag & drop images here'}
        </p>
        <p className="text-xs text-slate-400 mt-1">or click to browse — up to 10 images</p>
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <Image src={url} alt="" fill className="object-contain p-1" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single file upload component ────────────────────────────────────────────
function SingleFileUpload({
  value,
  onChange,
  accept,
  previewType = 'image',
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  accept: string;
  previewType?: 'image' | 'video';
  label: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await sellerApi.uploadSingle(file);
      const url = (res as any)?.url || (res as any)?.data?.url || '';
      if (!url) throw new Error('No URL returned');
      onChange(url);
    } catch {
      toast.error(`Failed to upload ${label.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
          {previewType === 'video' ? <Film className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : `Upload ${label}`}
          <input type="file" accept={accept} onChange={handleFile} className="hidden" />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>
      {value && previewType === 'image' && (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <Image src={value} alt="" fill className="object-contain p-2" />
        </div>
      )}
      {value && previewType === 'video' && (
        <video src={value} controls className="max-w-xs rounded-xl border border-slate-200" />
      )}
      {value && (
        <p className="text-xs text-slate-400 truncate max-w-sm">{value}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    cost: '',
    sku: '',
    stock: '',
    categoryId: '',
    brand: '',
    condition: 'NEW' as string,
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

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Categories
  const { data: categoriesRaw } = useQuery({
    queryKey: ['seller-categories'],
    queryFn: sellerApi.getCategories,
  });
  const categories: any[] = Array.isArray(categoriesRaw)
    ? categoriesRaw
    : (categoriesRaw as any)?.data || [];

  // Submit mutation
  const mutation = useMutation({
    mutationFn: () =>
      sellerApi.createProduct({
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
        stock: parseInt(form.stock, 10),
        sku: form.sku || undefined,
        brand: form.brand || undefined,
        condition: form.condition,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        discountType: form.discountType || undefined,
        discountValue: form.discountValue ? parseFloat(form.discountValue) : undefined,
        tags: form.tags,
        images: form.images,
        thumbnailUrl: form.thumbnailUrl || undefined,
        videoUrl: form.videoUrl || undefined,
        adVideoUrl: form.adVideoUrl || undefined,
        categoryId: form.categoryId || undefined,
        isFeatured: false,
      }),
    onSuccess: () => {
      toast.success('Product submitted for approval!');
      router.push('/products');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to create product'),
  });

  // Auto-generate SKU
  const generateSku = () => {
    const brandPart = form.brand ? form.brand.slice(0, 3).toUpperCase() : 'PRD';
    const namePart = form.name
      ? form.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 4)
          .toUpperCase()
      : 'ITEM';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    set('sku', `${brandPart}-${namePart}-${rand}`);
  };

  // AI description
  const handleAutoFill = async () => {
    if (!form.name) {
      toast.error('Enter a product name first');
      return;
    }
    setAiLoading(true);
    try {
      const res = await sellerApi.generateProductDescription({
        name: form.name,
        brand: form.brand || undefined,
        category: categories.find((c) => c.id === form.categoryId)?.name,
        tags: form.tags,
        condition: form.condition,
      });
      const generated =
        (res as any)?.description || (res as any)?.data?.description || '';
      if (!generated) throw new Error('Empty response');
      set('description', generated);
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setAiLoading(false);
    }
  };

  // Tags
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) {
      toast.error('Name, price and stock are required');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/products"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Product</h1>
          <p className="text-sm text-slate-500">
            New products will be reviewed by the admin before going live
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Media ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <h2 className="font-semibold text-slate-800">Product Images</h2>
          <MultiImageUpload
            images={form.images}
            onChange={(urls) => set('images', urls)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Thumbnail</p>
              <SingleFileUpload
                label="Thumbnail"
                value={form.thumbnailUrl}
                onChange={(url) => set('thumbnailUrl', url)}
                accept="image/*"
                previewType="image"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Demo Video <span className="text-slate-400 font-normal">(optional)</span>
              </p>
              <SingleFileUpload
                label="Video"
                value={form.videoUrl}
                onChange={(url) => set('videoUrl', url)}
                accept="video/*"
                previewType="video"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Promo Video <span className="text-slate-400 font-normal">(short ad · optional)</span>
              </p>
              <SingleFileUpload
                label="Promo"
                value={form.adVideoUrl}
                onChange={(url) => set('adVideoUrl', url)}
                accept="video/*"
                previewType="video"
              />
              <p className="text-xs text-slate-400 mt-1">A 15–30s clip used in promotions &amp; reels.</p>
            </div>
          </div>
        </div>

        {/* ── Basic Info ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Basic Information</h2>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Samsung Galaxy S24"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Description + AI button */}
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
                {autoFillLoading ? 'Writing...' : 'AI Auto-fill'}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the product, or use AI auto-fill..."
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* Brand + SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                placeholder="e.g. Samsung"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
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

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Pricing & Stock ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Pricing &amp; Stock</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Selling Price (UGX) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="50000"
                required
                min={0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Compare-at Price <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice', e.target.value)}
                placeholder="65000"
                min={0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Discount (optional)</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  set('discountType', form.discountType === 'PERCENTAGE' ? '' : 'PERCENTAGE')
                }
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
                onClick={() =>
                  set('discountType', form.discountType === 'FIXED' ? '' : 'FIXED')
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.discountType === 'FIXED'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Tag className="w-3.5 h-3.5" /> Fixed Amount
              </button>
              {form.discountType && (
                <button
                  type="button"
                  onClick={() => {
                    set('discountType', '');
                    set('discountValue', '');
                  }}
                  className="ml-auto text-xs text-slate-400 hover:text-red-500"
                >
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
                  placeholder={
                    form.discountType === 'PERCENTAGE'
                      ? 'e.g. 15 (%)'
                      : 'e.g. 5000 (UGX)'
                  }
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                {form.price && form.discountValue && (
                  <span className="text-sm text-emerald-600 font-medium whitespace-nowrap">
                    Final: UGX{' '}
                    {(
                      form.discountType === 'PERCENTAGE'
                        ? parseFloat(form.price) *
                          (1 - parseFloat(form.discountValue) / 100)
                        : parseFloat(form.price) - parseFloat(form.discountValue)
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder="100"
                required
                min={0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Weight (kg) <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) => set('weight', e.target.value)}
                placeholder="0.5"
                min={0}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
        </div>

        {/* ── Category ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Category</h2>
          <select
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">— Select category —</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Tags ──────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Tags</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="button"
              onClick={addTag}
              className="flex items-center gap-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 bg-sky-100 text-sky-700 text-xs px-3 py-1.5 rounded-full font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'tags',
                        form.tags.filter((t) => t !== tag),
                      )
                    }
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-6">
          <Link
            href="/products"
            className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {mutation.isPending ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {mutation.isPending ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
