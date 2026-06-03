'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { RotateCcw, Package, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const RETURN_REASONS = [
  'Item received is different from what was ordered',
  'Item is damaged or defective',
  'Wrong size or colour',
  'Item is of poor quality',
  'I changed my mind',
  'Other',
];

export default function ReturnsPage() {
  const { user } = useAuthStore();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: ordersData } = useQuery({
    queryKey: ['my-orders-for-returns'],
    queryFn: () => ordersApi.getBuyerOrders(1, 50).then((r: any) => r?.data?.data ?? r?.data ?? []).catch(() => []),
    enabled: !!user,
  });

  const deliveredOrders = (Array.isArray(ordersData) ? ordersData : []).filter(
    (o: any) => o.status === 'DELIVERED'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !reason) return;
    setSubmitting(true);
    setError('');
    try {
      await ordersApi.returnRequest(selectedOrderId, { reason, description });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit return request. Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Returns & Refunds</h1>
          <p className="text-purple-200 text-sm">Easy 7-day returns on most items. We make it simple.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Policy summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { icon: 'package', title: '7-Day Returns', desc: 'Return unused items within 7 days of delivery' },
            { icon: 'creditcard', title: 'Quick Refund', desc: 'Refunds processed within 3–5 business days' },
            { icon: 'truck', title: 'Free Pickup', desc: 'We collect the item from your delivery address' },
          ] as const).map((p) => (
            <div key={p.title} className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <div className="flex justify-center mb-3">
                {p.icon === 'package' && <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>}
                {p.icon === 'creditcard' && <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
                {p.icon === 'truck' && <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{p.title}</h3>
              <p className="text-xs text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Return form */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Request a Return</h2>

            {!user ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4">Login to see your orders and request a return</p>
                <Link href="/auth/login" className="btn-primary px-5 py-2.5 rounded-xl text-sm inline-block">
                  Login
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-800 mb-2">Return Request Submitted!</h3>
                <p className="text-sm text-slate-500 mb-4">
                  We've received your request. Our team will contact you within 24 hours.
                </p>
                <Link href="/orders" className="text-sm text-sky-600 hover:underline">View My Orders</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Select Order</label>
                  {deliveredOrders.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No delivered orders eligible for return.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        required
                        className="w-full border rounded-xl px-3 py-2.5 text-sm appearance-none bg-white pr-8"
                      >
                        <option value="">-- Select an order --</option>
                        {deliveredOrders.map((o: any) => (
                          <option key={o.id} value={o.id}>
                            #{o.orderNumber} — UGX {Number(o.total).toLocaleString()}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Reason for Return</label>
                  <div className="relative">
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      className="w-full border rounded-xl px-3 py-2.5 text-sm appearance-none bg-white pr-8"
                    >
                      <option value="">-- Select reason --</option>
                      {RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Additional Details (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the issue in more detail..."
                    className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || !selectedOrderId || !reason}
                  className="w-full btn-primary py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </form>
            )}
          </div>

          {/* Return policy details */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Return Policy</h2>
            <div className="space-y-4 text-sm text-slate-600">
              {[
                {
                  q: 'What items can be returned?',
                  a: 'Most items can be returned within 7 days of delivery, provided they are unused, undamaged, and in original packaging. Electronics must be returned within 48 hours.',
                },
                {
                  q: 'What items cannot be returned?',
                  a: 'Perishable goods (food, flowers), personalised items, digital downloads, underwear, and cosmetics that have been opened.',
                },
                {
                  q: 'How long does a refund take?',
                  a: 'Refunds are processed within 3–5 business days after we receive and inspect the item. Mobile money refunds arrive within 24 hours.',
                },
                {
                  q: 'How will I be refunded?',
                  a: 'Refunds are issued via the original payment method — MTN MoMo, Airtel Money, or bank transfer depending on how you paid.',
                },
                {
                  q: 'Who pays for return shipping?',
                  a: 'If the item is defective or incorrect, TotalStore covers the pickup cost. For change-of-mind returns, a small collection fee may apply.',
                },
              ].map(({ q, a }) => (
                <div key={q}>
                  <p className="font-semibold text-slate-800 mb-1">{q}</p>
                  <p>{a}</p>
                </div>
              ))}
              <div className="border-t pt-4">
                <p className="text-slate-500">
                  Need help? Contact us at{' '}
                  <a href="mailto:support@totalstore.ug" className="text-sky-600 hover:underline">
                    support@totalstore.ug
                  </a>{' '}
                  or call{' '}
                  <a href="tel:+256700000000" className="text-sky-600 hover:underline">
                    +256 700 000 000
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
