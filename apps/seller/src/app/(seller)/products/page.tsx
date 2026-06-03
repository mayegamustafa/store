'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Package, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

function ImageUpload({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      const urls = await sellerApi.uploadImages(files);
      onChange([...images, ...(Array.isArray(urls) ? urls : [urls])]);
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [images, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 5,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
        <p className="text-xs text-slate-500">
          {uploading ? 'Uploading...' : 'Drag images here or click to upload'}
        </p>
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
              <Image src={url} alt="" fill className="object-contain p-1" />
              <button
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EDIT_INITIAL_FORM = {
  name: '', description: '', price: '', compareAtPrice: '',
  stock: '', sku: '', brand: '', categoryId: '', images: [] as string[],
  isFeatured: false,
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showEdit, setShowEdit] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState(EDIT_INITIAL_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products', page],
    queryFn: () => sellerApi.getProducts(page),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: sellerApi.getCategories,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => sellerApi.updateProduct(editProduct.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setShowEdit(false);
      setEditProduct(null);
      setForm(EDIT_INITIAL_FORM);
      toast.success('Product updated!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sellerApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Product deleted');
    },
  });

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
      stock: String(p.stock),
      sku: p.sku || '',
      brand: p.brand || '',
      categoryId: p.categoryId || '',
      images: p.images || [],
      isFeatured: p.isFeatured || false,
    });
    setShowEdit(true);
  };

  const handleUpdate = () => {
    if (!form.name || !form.price || !form.stock) {
      toast.error('Fill required fields: name, price, stock');
      return;
    }
    updateMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      stock: Number(form.stock),
      sku: form.sku || undefined,
      brand: form.brand || undefined,
      categoryId: form.categoryId || undefined,
      images: form.images,
      isFeatured: form.isFeatured,
    });
  };

  const products = (data as any)?.data || [];
  const total = (data as any)?.meta?.total ?? 0;
  const totalPages = (data as any)?.meta?.totalPages ?? 1;

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total products</p>
        </div>
        <Link href="/products/new" className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Edit Drawer */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="font-bold text-slate-900">Edit Product</h2>
              <button
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Images */}
              <div>
                <label className="label">Product Images</label>
                <ImageUpload images={form.images} onChange={(imgs) => setForm((p) => ({ ...p, images: imgs }))} />
              </div>

              <div>
                <label className="label">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (UGX) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Compare At Price (UGX)</label>
                  <input
                    type="number"
                    value={form.compareAtPrice}
                    onChange={(e) => setForm((p) => ({ ...p, compareAtPrice: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Stock Quantity *</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className="input"
                >
                  <option value="">-- Select Category --</option>
                  {((categories as any[]) || []).map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="input resize-none"
                  placeholder="Describe your product..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                  className="w-4 h-4"
                />
                Mark as featured
              </label>

              <button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="btn btn-primary w-full"
              >
                {updateMutation.isPending ? 'Saving...' : 'Update Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 skeleton mb-2" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Product', 'Price', 'Stock', 'Status', 'Sales', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                          {p.images?.[0]
                            ? <Image src={p.images[0]} alt="" fill className="object-contain p-1" />
                            : <Package className="w-5 h-5 text-slate-400 m-auto mt-2" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.category?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-semibold text-slate-900">UGX {Number(p.price).toLocaleString()}</td>
                    <td className="table-td text-center">
                      <span className={p.stock < 5 ? 'text-red-600 font-bold' : 'text-slate-700 font-medium'}>{p.stock}</span>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${{ ACTIVE: 'badge-success', PENDING_APPROVAL: 'badge-warning', REJECTED: 'badge-danger', INACTIVE: 'badge-neutral' }[p.status as string] || 'badge-neutral'}`}>
                        {p.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td text-center text-slate-600 font-medium">{p.soldCount || 0}</td>
                    <td className="table-td">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(p)} className="btn-icon text-primary-600 hover:bg-primary-50">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id); }}
                          className="btn-icon text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="table-td text-center py-16">
                    <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400 font-medium">No products yet</p>
                    <p className="text-xs text-slate-300 mt-1">Click &quot;Add Product&quot; to get started.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-sm border text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="btn btn-sm border text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
