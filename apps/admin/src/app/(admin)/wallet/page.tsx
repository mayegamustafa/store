'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Search, User, Store, Bike } from 'lucide-react';

type OwnerType = 'BUYER' | 'SELLER' | 'RIDER';

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  reference: string;
  createdAt: string;
}

export default function WalletPage() {
  const [ownerType, setOwnerType] = useState<OwnerType>('BUYER');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<{ balance: number; transactions: WalletTx[]; total: number } | null>(null);
  const [error, setError] = useState('');

  // Credit/debit modal
  const [showModal, setShowModal] = useState<'credit' | 'debit' | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function lookup() {
    if (!targetId.trim()) return;
    setLoading(true); setError(''); setWalletData(null);
    try {
      const res = await adminApi.getWallet(targetId.trim(), ownerType);
      setWalletData(res as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Wallet not found');
    }
    setLoading(false);
  }

  async function handleAction() {
    if (!showModal || !amount || !description.trim()) return;
    setActionLoading(true);
    try {
      const fn = showModal === 'credit' ? adminApi.creditWallet : adminApi.debitWallet;
      await fn({ targetId: targetId.trim(), ownerType, amount: Number(amount), description: description.trim() });
      setShowModal(null); setAmount(''); setDescription('');
      await lookup(); // Refresh
    } catch (e: any) {
      alert(e?.response?.data?.message || `${showModal} failed`);
    }
    setActionLoading(false);
  }

  const ownerTabs: { type: OwnerType; label: string; icon: any }[] = [
    { type: 'BUYER', label: 'Buyers', icon: User },
    { type: 'SELLER', label: 'Sellers', icon: Store },
    { type: 'RIDER', label: 'Riders', icon: Bike },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
            <Wallet className="w-5 h-5" />
          </div>
          Wallet Management
        </h1>
        <p className="text-slate-500 text-sm mt-1">View, credit, and debit any user wallet</p>
      </div>

      {/* Owner Type Tabs */}
      <div className="card">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {ownerTabs.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => { setOwnerType(type); setWalletData(null); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                ownerType === type
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Lookup */}
        <div className="flex gap-3 mt-4 px-5 pb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
              placeholder={`Enter ${ownerType.toLowerCase()} ID (UUID)…`}
              className="input pl-10 w-full"
            />
          </div>
          <button onClick={lookup} disabled={loading || !targetId.trim()} className="btn btn-primary">
            {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Wallet Data */}
      {walletData && (
        <div className="space-y-5">
          {/* Balance Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Current Balance</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  UGX {walletData.balance.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">{walletData.total} transaction{walletData.total !== 1 ? 's' : ''} total</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal('credit')}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4" /> Credit
                </button>
                <button
                  onClick={() => setShowModal('debit')}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <ArrowUpFromLine className="w-4 h-4" /> Debit
                </button>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="card overflow-hidden">
            <div className="card-header border-b border-slate-100 px-5 py-4">
              <h2 className="card-title">Transaction History</h2>
            </div>
            {walletData.transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Type</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Balance</th>
                      <th className="table-th">Description</th>
                      <th className="table-th">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletData.transactions.map((tx) => (
                      <tr key={tx.id} className="table-row">
                        <td className="table-td text-slate-500 text-xs whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-UG', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="table-td">
                          <span className={tx.type === 'credit' ? 'badge-success' : 'badge-danger'}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`table-td font-mono font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </td>
                        <td className="table-td font-mono text-slate-600">
                          {tx.balance.toLocaleString()}
                        </td>
                        <td className="table-td text-slate-600 max-w-[200px] truncate">
                          {tx.description}
                        </td>
                        <td className="table-td text-slate-400 text-xs font-mono">
                          {tx.reference?.slice(0, 12)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credit/Debit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {showModal === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Amount (UGX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="input w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Refund for order #1234"
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(null); setAmount(''); setDescription(''); }} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !amount || !description.trim()}
                className={`btn flex-1 ${showModal === 'credit' ? 'btn-primary' : 'btn-danger'}`}
              >
                {actionLoading ? 'Processing…' : showModal === 'credit' ? 'Credit' : 'Debit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
