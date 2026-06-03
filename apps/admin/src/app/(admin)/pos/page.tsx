'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import { Search, Plus, Minus, Trash2, Receipt, Printer, ShoppingCart, User, Package, Monitor, Barcode } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CartItem { productId: string; variantId?: string; name: string; sku: string; qty: number; unitPrice: number; total: number; image?: string; }

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOMO'];

export default function PosPage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showReceipt, setShowReceipt] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef<{ ts: number }>({ ts: 0 });

  // Load last open session
  useEffect(() => {
    adminApi.posListSessions(1, 'OPEN').then((res) => {
      const sessions = (res.data as any)?.items || [];
      if (sessions.length > 0) setSessionId(sessions[0].id);
      else setShowOpenSession(true);
    }).catch(() => setShowOpenSession(true));
  }, []);

  const { data: searchData } = useQuery({
    queryKey: ['pos-search', search],
    queryFn: () => adminApi.posGetInventory(1, search),
    enabled: search.length > 1,
  });
  const searchResults: any[] = (searchData?.data as any)?.items || [];

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discountValue) / 100 : discountValue;
  const tax = 0; // can configure
  const total = Math.max(0, subtotal - discountAmount + tax);
  const change = Math.max(0, parseFloat(amountPaid || '0') - total);

  const openSession = useMutation({
    mutationFn: () => adminApi.posOpenSession({ openingCash: parseFloat(openingCash || '0') }),
    onSuccess: (res) => {
      setSessionId((res as any)?.id || (res as any)?.data?.id);
      setShowOpenSession(false);
      toast.success('POS session opened!');
    },
    onError: () => toast.error('Failed to open session'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => adminApi.posCreateTransaction(sessionId!, {
      items: cart.map((i) => ({ productId: i.productId, name: i.name, sku: i.sku, qty: i.qty, unitPrice: i.unitPrice, total: i.total, image: i.image })),
      subtotal, discountType, discountValue: discountAmount, tax, total,
      paymentMethod, amountPaid: parseFloat(amountPaid || String(total)), change,
      customerName: customerName || undefined, customerPhone: customerPhone || undefined,
    }),
    onSuccess: (res) => {
      setShowReceipt((res as any)?.data || res);
      setCart([]);
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setDiscountValue(0);
      qc.invalidateQueries({ queryKey: ['pos-inventory'] });
      toast.success('Sale complete!');
    },
    onError: () => toast.error('Checkout failed'),
  });

  const addToCart = useCallback((product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.unitPrice } : i);
      return [...prev, { productId: product.id, name: product.name, sku: product.sku || '', qty: 1, unitPrice: Number(product.basePrice), total: Number(product.basePrice), image: product.thumbnailUrl || product.images?.[0] }];
    });
    setSearch('');
    searchRef.current?.focus();
  }, []);

  // Barcode scanner: detect rapid keystrokes ending with Enter → auto-add
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const timeSinceLast = now - scanBufferRef.current.ts;
    scanBufferRef.current.ts = now;
    if (e.key === 'Enter') {
      const val = search.trim();
      if (!val) return;
      // If we only have 1 result, add it automatically (scanner fired Enter)
      if (searchResults.length === 1) {
        addToCart(searchResults[0]);
        toast.success(`Added: ${searchResults[0].name}`, { duration: 1200 });
      } else if (searchResults.length === 0) {
        toast.error('Product not found', { duration: 1500 });
      }
    }
  }, [search, searchResults, addToCart]);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const qty = Math.max(0, i.qty + delta);
      return qty === 0 ? null : { ...i, qty, total: qty * i.unitPrice };
    }).filter(Boolean) as CartItem[]);
  };

  const printReceipt = () => window.print();

  if (showOpenSession) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-white rounded-2xl p-8 w-96 shadow-xl text-center">
          <Monitor className="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Active POS Session</h2>
          <p className="text-slate-500 text-sm mb-6">Open a shift to start selling</p>
          <div className="mb-4">
            <label className="text-xs font-medium text-slate-600 mb-1 block text-left">Opening Cash (UGX)</label>
            <input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="0" className="w-full border rounded-xl px-3 py-2 text-sm" />
          </div>
          <button onClick={() => openSession.mutate()} disabled={openSession.isPending} className="btn-primary w-full py-3 text-base">
            {openSession.isPending ? 'Opening...' : 'Open POS Session'}
          </button>
        </div>
      </div>
    );
  }

  // Receipt Modal
  if (showReceipt) {
    const r = showReceipt;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl print:shadow-none" id="receipt">
          <div className="text-center mb-4">
            <p className="font-bold text-lg">TOTALSTORE POS</p>
            <p className="text-xs text-slate-400">{new Date().toLocaleString()}</p>
            <p className="text-sm font-mono font-bold mt-1">{r.receiptNo}</p>
          </div>
          {(r.customerName || r.customerPhone) && (
            <div className="border-t border-dashed py-2 mb-2 text-sm">
              <p><span className="text-slate-500">Customer: </span>{r.customerName || '—'}</p>
              <p><span className="text-slate-500">Phone: </span>{r.customerPhone || '—'}</p>
            </div>
          )}
          <div className="border-t border-dashed py-2 space-y-1">
            {(r.items as any[]).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="flex-1">{item.name} x{item.qty}</span>
                <span className="font-medium">UGX {Number(item.total).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed pt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>UGX {Number(r.subtotal).toLocaleString()}</span></div>
            {Number(r.discountValue) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- UGX {Number(r.discountValue).toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>TOTAL</span><span>UGX {Number(r.total).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid ({r.paymentMethod})</span><span>UGX {Number(r.amountPaid).toLocaleString()}</span></div>
            {Number(r.change) > 0 && <div className="flex justify-between font-semibold text-sky-600"><span>Change</span><span>UGX {Number(r.change).toLocaleString()}</span></div>}
          </div>
          <p className="text-center text-xs text-slate-400 mt-4 border-t pt-3">Thank you for shopping with us!</p>
          <div className="flex gap-2 mt-4 print:hidden">
            <button onClick={printReceipt} className="btn-primary flex-1 flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print</button>
            <button onClick={() => setShowReceipt(null)} className="flex-1 border rounded-xl py-2 text-sm hover:bg-slate-50">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: Product Search */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary-500" /> POS Checkout</h1>

        {/* Search products */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search product by name, SKU or barcode..."
            className="pl-9 pr-4 py-3 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white shadow-sm"
            autoFocus
          />
          <Link href="/pos/barcodes" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-500 hover:underline flex items-center gap-1">
            <Barcode className="w-4 h-4" /> Generate Barcodes
          </Link>
        </div>

        {/* Search results */}
        {search.length > 1 && (
          <div className="card border mb-4 max-h-80 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No products found</p>
            ) : searchResults.map((p: any) => (
              <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors border-b last:border-b-0 text-left">
                {p.thumbnailUrl || p.images?.[0] ? <img src={p.thumbnailUrl || p.images[0]} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-slate-400" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku} · Stock: {p.stock}</p>
                </div>
                <span className="font-bold text-sm text-sky-600">UGX {Number(p.basePrice).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="card border overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50">{['Item', 'Qty', 'Price', 'Total', ''].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.productId}>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {item.image && <img src={item.image} className="w-8 h-8 rounded object-cover" alt="" />}
                        <div><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-slate-400">{item.sku}</p></div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200"><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200"><Plus className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="table-td text-sm">UGX {item.unitPrice.toLocaleString()}</td>
                    <td className="table-td font-semibold text-sm">UGX {item.total.toLocaleString()}</td>
                    <td className="table-td"><button onClick={() => setCart((p) => p.filter((i) => i.productId !== item.productId))} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cart.length === 0 && search.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Cart is empty</p>
            <p className="text-sm">Search for a product to add it</p>
          </div>
        )}
      </div>

      {/* Right: Summary & Checkout */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4" /> Order Summary</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1"><User className="w-3 h-3" /> Customer (optional)</p>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name" className="w-full border rounded-xl px-3 py-2 text-sm" />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" className="w-full border rounded-xl px-3 py-2 text-sm" />
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Discount</p>
            <div className="flex gap-2">
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="border rounded-xl px-3 py-2 text-xs flex-1">
                <option value="PERCENTAGE">%</option>
                <option value="FIXED">UGX</option>
              </select>
              <input type="number" value={discountValue || ''} onChange={(e) => setDiscountValue(Number(e.target.value))} placeholder="0" className="w-24 border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- UGX {discountAmount.toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-1.5"><span>TOTAL</span><span className="text-sky-600">UGX {total.toLocaleString()}</span></div>
          </div>

          {/* Payment */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</p>
            <div className="flex gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${paymentMethod === m ? 'bg-primary-600 text-white' : 'border hover:bg-slate-50'}`}>{m}</button>
              ))}
            </div>
            <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={`Amount Paid (UGX ${total.toLocaleString()})`} className="w-full border rounded-xl px-3 py-2 text-sm" />
            {change > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex justify-between text-sm">
                <span className="text-green-700 font-medium">Change</span>
                <span className="font-bold text-green-700">UGX {change.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={cart.length === 0 || !sessionId || checkoutMutation.isPending}
            className="w-full bg-sky-500 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl text-base transition-colors"
          >
            {checkoutMutation.isPending ? 'Processing...' : `Checkout · UGX ${total.toLocaleString()}`}
          </button>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="w-full mt-2 border rounded-xl py-2 text-sm text-slate-500 hover:bg-slate-50">Clear Cart</button>
          )}
        </div>
      </div>
    </div>
  );
}
