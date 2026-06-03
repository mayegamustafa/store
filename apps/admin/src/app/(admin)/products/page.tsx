'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { CheckCircle, XCircle, Search, Package, PlusCircle, Trash2, Pencil, PackagePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Match actual Prisma enum values
const STATUS_TABS = ['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];
const STATUS_LABEL: Record<string, string> = {
  ALL: 'All', PENDING_REVIEW: 'Pending Review', APPROVED: 'Approved', REJECTED: 'Rejected',
};
const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [stockModal, setStockModal] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [addQty, setAddQty] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, status, search],
    queryFn: () => adminApi.getProducts(page, status === 'ALL' ? undefined : status, search || undefined),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product approved!'); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product rejected'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete product'),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, addStock }: { id: string; addStock: number }) => adminApi.updateProductStock(id, { addStock }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      const updated = res?.data ?? res;
      toast.success(`Stock updated to ${updated.stock ?? '?'}`);
      setStockModal(null);
      setAddQty('');
    },
    onError: () => toast.error('Failed to update stock'),
  });

  const products = (data as any)?.data || [];
  const meta = (data as any)?.meta || {};

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{meta.total || 0} total</span>
          <Link href="/products/new" className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
            <PlusCircle className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Status tabs */}
        <div className="flex gap-1 bg-slate-50 rounded-xl p-1 shadow-sm">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${status === s ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading products…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Product', 'Seller', 'Price', 'Stock', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {products.map((product: any) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0]} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400 m-2.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.category?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-sm">{product.seller?.storeName || '—'}</td>
                  <td className="table-td font-semibold text-sm">
                    UGX {Number(product.basePrice).toLocaleString()}
                  </td>
                  <td className="table-td text-center">
                    <button onClick={() => setStockModal({ id: product.id, name: product.name, stock: product.stock })}
                      className={`${product.stock < 5 ? 'text-red-600 font-semibold' : 'text-slate-700'} text-sm hover:underline cursor-pointer`}
                      title="Click to add stock">
                      {product.stock}
                    </button>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[product.status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[product.status] || product.status}
                    </span>
                  </td>
                  <td className="table-td text-xs text-slate-400">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="table-td">
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => setStockModal({ id: product.id, name: product.name, stock: product.stock })}
                        className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Add Stock">
                        <PackagePlus className="w-4 h-4" />
                      </button>
                      <Link href={`/products/${product.id}/edit`} className="text-sky-500 hover:text-sky-700 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      {product.status === 'PENDING_REVIEW' && (
                        <>
                          <button onClick={() => approveMutation.mutate(product.id)} className="text-green-600 hover:text-green-700" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => rejectMutation.mutate(product.id)} className="text-red-500 hover:text-red-600" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => { if (confirm(`Delete "${product.name}"?`)) deleteMutation.mutate(product.id); }}
                        className="text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-slate-400 py-10">No products found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">← Prev</button>
          <span className="px-3 py-1.5 text-sm text-slate-600">{page} / {meta.totalPages}</span>
          <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">Next →</button>
        </div>
      )}
      {/* Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Stock</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-1">{stockModal.name}</p>
            <p className="text-sm text-slate-600 mb-3">Current stock: <span className="font-semibold">{stockModal.stock}</span></p>
            <input
              type="number" min="1" value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              placeholder="Quantity to add"
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setStockModal(null); setAddQty(''); }}
                className="flex-1 px-4 py-2 text-sm rounded-xl border hover:bg-slate-50">Cancel</button>
              <button
                disabled={!addQty || Number(addQty) < 1 || stockMutation.isPending}
                onClick={() => stockMutation.mutate({ id: stockModal.id, addStock: Number(addQty) })}
                className="flex-1 px-4 py-2 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
                {stockMutation.isPending ? 'Updating…' : `Add ${addQty || 0} units`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

