'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import { DollarSign, ArrowDownRight, Clock, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FinancePage() {
  const [requestAmount, setRequestAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('MTN_MOMO');
  const [accountNumber, setAccountNumber] = useState('');

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: sellerApi.getEarnings,
  });

  const { data: walletData } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: sellerApi.getWalletBalance,
  });

  const { data: walletTxns } = useQuery({
    queryKey: ['seller-wallet-txns'],
    queryFn: () => sellerApi.getWalletTransactions(1, 10),
  });

  const payoutMutation = useMutation({
    mutationFn: () =>
      sellerApi.requestPayout(Number(requestAmount), payoutMethod, accountNumber),
    onSuccess: () => {
      toast.success('Payout request submitted!');
      setRequestAmount('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to request payout'),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-7 w-48 skeleton mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 skeleton" />)}</div>
        <div className="h-48 skeleton" />
      </div>
    );
  }

  const available   = earnings?.availableBalance || 0;
  const pending     = earnings?.pendingBalance   || 0;
  const totalEarned = earnings?.totalEarned      || 0;

  return (
    <div className="p-6 max-w-[1000px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finance & Earnings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your revenue and request payouts</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-card">
          <div className="absolute right-0 top-0 w-20 h-20 opacity-10"><DollarSign className="w-full h-full" /></div>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">UGX {Number(available).toLocaleString()}</p>
          <p className="text-sm text-white/80 font-medium mt-0.5">Available Balance</p>
          <p className="text-xs text-white/60 mt-1">Ready for withdrawal</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-sky-500 to-blue-600 shadow-card">
          <div className="absolute right-0 top-0 w-20 h-20 opacity-10"><Wallet className="w-full h-full" /></div>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">UGX {Number((walletData as any)?.balance || 0).toLocaleString()}</p>
          <p className="text-sm text-white/80 font-medium mt-0.5">Wallet Balance</p>
          <p className="text-xs text-white/60 mt-1">Internal wallet</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 shadow-card">
          <div className="absolute right-0 top-0 w-20 h-20 opacity-10"><Clock className="w-full h-full" /></div>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">UGX {Number(pending).toLocaleString()}</p>
          <p className="text-sm text-white/80 font-medium mt-0.5">Pending Balance</p>
          <p className="text-xs text-white/60 mt-1">Held in escrow</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-purple-600 shadow-card">
          <div className="absolute right-0 top-0 w-20 h-20 opacity-10"><ArrowDownRight className="w-full h-full" /></div>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <ArrowDownRight className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">UGX {Number(totalEarned).toLocaleString()}</p>
          <p className="text-sm text-white/80 font-medium mt-0.5">Total Earned</p>
          <p className="text-xs text-white/60 mt-1">All time</p>
        </div>
      </div>

      {/* Payout Request */}
      <div className="card p-5 max-w-md mb-6">
        <h2 className="card-title mb-4">Request Payout</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Amount (UGX)</label>
            <input
              type="number"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              placeholder={`Max: UGX ${Number(available).toLocaleString()}`}
              max={available}
              className="input"
            />
          </div>
          <div>
            <label className="label">Payout Method</label>
            <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="input">
              <option value="MTN_MOMO">MTN Mobile Money</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="label">Account Number</label>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={payoutMethod === 'BANK_TRANSFER' ? 'Bank Account Number' : 'Phone: 2567XXXXXXXX'}
              className="input"
            />
          </div>
          <p className="text-xs text-slate-400">
            Min payout: UGX 50,000 · Processed within 2 business days
          </p>
          <button
            onClick={() => payoutMutation.mutate()}
            disabled={
              !requestAmount ||
              Number(requestAmount) < 50000 ||
              Number(requestAmount) > available ||
              !accountNumber ||
              payoutMutation.isPending
            }
            className="btn btn-primary w-full"
          >
            {payoutMutation.isPending ? 'Processing...' : 'Request Payout'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <p className="card-title">Transaction History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Date', 'Description', 'Order #', 'Amount', 'Type'].map((h) => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earnings?.transactions?.map((tx: any) => (
                <tr key={tx.id} className="table-row">
                  <td className="table-td text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="table-td text-slate-700">{tx.description}</td>
                  <td className="table-td font-mono text-xs text-primary-600">{tx.order?.orderNumber ? `#${tx.order.orderNumber}` : '—'}</td>
                  <td className={`table-td font-semibold ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}UGX {Number(tx.amount).toLocaleString()}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${tx.type === 'CREDIT' ? 'badge-success' : 'badge-danger'}`}>{tx.type}</span>
                  </td>
                </tr>
              ))}
              {!earnings?.transactions?.length && (
                <tr><td colSpan={5} className="table-td text-center text-slate-400 py-12">No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
