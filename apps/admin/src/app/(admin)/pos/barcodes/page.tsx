'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Barcode, Printer, Search, Package, RefreshCcw, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';

declare const JsBarcode: any;

function loadJsBarcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).JsBarcode) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

interface BarcodeLabel {
  serial: string;
  name: string;
  price: number;
  sku: string;
}

export default function BarcodesPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<'sku' | 'serial'>('sku');
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const [jsLoaded, setJsLoaded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pos-inventory-barcodes', search],
    queryFn: () => adminApi.posGetInventory(1, search || undefined),
  });
  const products: any[] = (data?.data as any)?.items || [];

  useEffect(() => {
    loadJsBarcode().then(() => setJsLoaded(true)).catch(() => toast.error('Barcode library failed to load'));
  }, []);

  // Re-render barcodes whenever labels change
  useEffect(() => {
    if (!jsLoaded || labels.length === 0) return;
    const jb = (window as any).JsBarcode;
    if (!jb) return;
    setTimeout(() => {
      document.querySelectorAll('[data-barcode]').forEach((el) => {
        const val = el.getAttribute('data-barcode');
        if (!val) return;
        try {
          jb(el, val, { format: 'CODE128', width: 1.8, height: 50, displayValue: true, fontSize: 10, margin: 4 });
        } catch { /* invalid barcode value */ }
      });
    }, 50);
  }, [labels, jsLoaded]);

  const selectProduct = (p: any) => {
    setSelected(p);
    setQty(Math.max(1, p.stock || 1));
    setLabels([]);
  };

  const generateLabels = () => {
    if (!selected) return;
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sku = selected.sku || selected.id.slice(-8).toUpperCase();
    const generated: BarcodeLabel[] = Array.from({ length: qty }, (_, i) => ({
      serial: mode === 'sku' ? sku : `${sku}${year}${month}${String(i + 1).padStart(4, '0')}`,
      name: selected.name,
      price: Number(selected.basePrice),
      sku,
    }));
    setLabels(generated);
  };

  const handlePrint = () => {
    if (labels.length === 0) { toast.error('Generate labels first'); return; }
    window.print();
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #barcode-print-area { display: grid !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Barcode className="w-6 h-6 text-sky-500" /> Barcode & Serial Generator
            </h1>
            <p className="text-sm text-slate-500 mt-1">Generate printable barcode labels by product stock quantity</p>
          </div>
          {labels.length > 0 && (
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600">
              <Printer className="w-4 h-4" /> Print {labels.length} Labels
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Product selector */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h2 className="font-semibold text-slate-800 mb-3">1. Select Product</h2>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU…"
                className="pl-9 pr-3 py-2 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {products.map((p: any) => (
                  <button key={p.id} onClick={() => selectProduct(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${selected?.id === p.id ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50'}`}>
                    {p.thumbnailUrl || p.images?.[0]
                      ? <img src={p.thumbnailUrl || p.images[0]} className="w-9 h-9 object-cover rounded-lg flex-shrink-0" alt="" />
                      : <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-slate-400" /></div>
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku || 'No SKU'} · Stock: {p.stock}</p>
                    </div>
                  </button>
                ))}
                {products.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No products found</p>}
              </div>
            )}
          </div>

          {/* Config + Preview */}
          <div className="md:col-span-2 space-y-4">
            {/* Config panel */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h2 className="font-semibold text-slate-800 mb-4">2. Configure Labels</h2>
              {selected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
                    {selected.thumbnailUrl || selected.images?.[0]
                      ? <img src={selected.thumbnailUrl || selected.images[0]} className="w-12 h-12 object-cover rounded-xl" alt="" />
                      : <div className="w-12 h-12 bg-white rounded-xl border flex items-center justify-center"><Package className="w-5 h-5 text-slate-400" /></div>
                    }
                    <div>
                      <p className="font-semibold text-slate-900">{selected.name}</p>
                      <p className="text-sm text-slate-500">SKU: {selected.sku || 'N/A'} · Stock: {selected.stock} units</p>
                    </div>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Label Type</label>
                    <div className="flex gap-2">
                      <button onClick={() => setMode('sku')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${mode === 'sku' ? 'bg-sky-500 text-white border-sky-500' : 'hover:bg-slate-50'}`}>
                        <Barcode className="w-4 h-4 inline mr-1.5" />SKU Barcode
                      </button>
                      <button onClick={() => setMode('serial')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${mode === 'serial' ? 'bg-sky-500 text-white border-sky-500' : 'hover:bg-slate-50'}`}>
                        <Hash className="w-4 h-4 inline mr-1.5" />Serial Numbers
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {mode === 'sku' ? 'Same barcode on every label — scan to identify product at checkout' : 'Unique serial per unit (SKU + YYMM + sequence) — for item-level tracking'}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Number of Labels</label>
                    <div className="flex items-center gap-3">
                      <input type="number" min="1" max="9999" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-28 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      <button onClick={() => setQty(selected.stock || 1)} className="text-xs text-sky-500 hover:underline">
                        Use stock qty ({selected.stock})
                      </button>
                    </div>
                  </div>

                  <button onClick={generateLabels}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <RefreshCcw className="w-4 h-4" /> Generate {qty} Label{qty !== 1 ? 's' : ''}
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <Barcode className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select a product on the left to configure labels</p>
                </div>
              )}
            </div>

            {/* Preview */}
            {labels.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-800">Preview ({labels.length} labels)</h2>
                  <button onClick={handlePrint} className="flex items-center gap-1.5 text-sm text-sky-500 hover:underline">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-xl p-3 bg-slate-50">
                  <div className="flex flex-wrap gap-2">
                    {labels.slice(0, 20).map((l, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 text-center w-36 flex-shrink-0" style={{ pageBreakInside: 'avoid' }}>
                        <p className="text-xs font-bold text-slate-800 truncate mb-0.5">{l.name}</p>
                        <svg data-barcode={l.serial} className="w-full" />
                        <p className="text-xs text-slate-500 mt-0.5">UGX {l.price.toLocaleString()}</p>
                      </div>
                    ))}
                    {labels.length > 20 && <div className="w-36 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-sm text-slate-400">+{labels.length - 20} more</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print area (hidden on screen, visible when printing) */}
      <div id="barcode-print-area" ref={printRef} style={{ display: 'none', gridTemplateColumns: 'repeat(4, 1fr)' }}
        className="grid gap-2 p-4">
        {labels.map((l, i) => (
          <div key={i} style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8, textAlign: 'center', pageBreakInside: 'avoid', width: 148 }}>
            <p style={{ fontSize: 9, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
            <svg data-barcode={l.serial} style={{ width: '100%' }} />
            <p style={{ fontSize: 9, color: '#666', marginTop: 2 }}>UGX {l.price.toLocaleString()}</p>
            {mode === 'serial' && <p style={{ fontSize: 8, color: '#888' }}>{l.serial}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
