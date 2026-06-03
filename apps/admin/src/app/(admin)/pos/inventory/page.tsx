'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Boxes, AlertTriangle, Plus, Minus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [editStock, setEditStock] = useState<{ id: string; current: number; value: string } | null>(null);
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pos-inventory', page, search, lowStock],
    queryFn: () => adminApi.posGetInventory(page, search || undefined, lowStock || undefined),
  });
  const items: any[] = (data?.data as any)?.items || [];
  const totalPages = (data?.data as any)?.totalPages || 0;
  const invalid = () => qc.invalidateQueries({ queryKey: ['pos-inventory'] });

  const setStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => adminApi.posUpdateStock(id, stock),
    onSuccess: () => { invalid(); setEditStock(null); toast.success('Stock updated'); },
    onError: () => toast.error('Failed to update stock'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta, reason }: any) => adminApi.posAdjustStock(id, delta, reason),
    onSuccess: () => { invalid(); setAdjustItem(null); setAdjustDelta(''); setAdjustReason(''); toast.success('Stock adjusted'); },
    onError: () => toast.error('Failed to adjust stock'),
  });

  const stockColor = (stock: number, lowStockAlert: number) => {
    if (stock === 0) return 'bg-red-100 text-red-700';
    if (stock <= lowStockAlert) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Boxes className="w-6 h-6 text-sky-500" /><h1 className="text-2xl font-bold text-slate-900">Inventory</h1></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, SKU, barcode..." className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer bg-white border rounded-xl px-4 py-2 hover:bg-slate-50">
          <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} className="w-4 h-4" />
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Only
        </label>
      </div>

      {/* Adjust Modal */}
      {adjustItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-1">Adjust Stock</h3>
            <p className="text-sm text-slate-500 mb-4">{adjustItem.name} · Current: <strong>{adjustItem.stock}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Adjustment (use negative to reduce)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAdjustDelta((p) => String((parseInt(p || '0')) - 1))} className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200"><Minus className="w-4 h-4" /></button>
                  <input type="number" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm text-center" placeholder="0" />
                  <button onClick={() => setAdjustDelta((p) => String((parseInt(p || '0')) + 1))} className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200"><Plus className="w-4 h-4" /></button>
                </div>
                {adjustDelta && <p className="text-xs text-slate-400 mt-1">New stock: {adjustItem.stock + parseInt(adjustDelta || '0')}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Reason</label>
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Restock, damage, count correction" className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => adjustMutation.mutate({ id: adjustItem.id, delta: parseInt(adjustDelta || '0'), reason: adjustReason })} disabled={!adjustDelta || adjustMutation.isPending} className="btn-primary flex-1">{adjustMutation.isPending ? 'Saving...' : 'Apply'}</button>
              <button onClick={() => { setAdjustItem(null); setAdjustDelta(''); }} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading inventory...</div>
        ) : (
          <table className="w-full">
            <thead><tr>{['Product', 'SKU / Barcode', 'Category', 'Price', 'Stock', 'Actions'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      {(item.thumbnailUrl || item.images?.[0]) && <img src={item.thumbnailUrl || item.images[0]} className="w-9 h-9 rounded-lg object-cover" alt="" />}
                      <div><p className="font-medium text-sm text-slate-900">{item.name}</p><p className="text-xs text-slate-400">{item.seller?.storeName}</p></div>
                    </div>
                  </td>
                  <td className="table-td text-xs font-mono text-slate-500">
                    <p>{item.sku || '—'}</p>
                    <p>{item.barcode || ''}</p>
                  </td>
                  <td className="table-td text-sm text-slate-500">{item.category?.name}</td>
                  <td className="table-td text-sm font-medium">UGX {Number(item.basePrice).toLocaleString()}</td>
                  <td className="table-td">
                    {editStock?.id === item.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={editStock.value} onChange={(e) => setEditStock((p) => p && ({ ...p, value: e.target.value }))} className="w-20 border rounded-lg px-2 py-1 text-sm" autoFocus />
                        <button onClick={() => setStockMutation.mutate({ id: item.id, stock: parseInt(editStock.value) })} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditStock({ id: item.id, current: item.stock, value: String(item.stock) })} className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${stockColor(item.stock, item.lowStockAlert || 5)}`}>
                        {item.stock}
                        {item.stock <= (item.lowStockAlert || 5) && item.stock > 0 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </button>
                    )}
                  </td>
                  <td className="table-td">
                    <button onClick={() => { setAdjustItem(item); setAdjustDelta(''); }} className="text-xs text-sky-600 hover:text-sky-700 font-medium border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-50">Adjust</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="table-td text-center text-slate-400 py-10">No products found</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-sky-500 text-white' : 'bg-white border hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
