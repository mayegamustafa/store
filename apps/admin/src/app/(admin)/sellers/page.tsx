'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { CheckCircle, XCircle, Eye, Search, Store, Ban, RotateCcw, Building2, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', storeName: '', description: '', whatsapp: '' };

export default function SellersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sellers', page, status],
    queryFn: () => adminApi.getSellers(page, status === 'ALL' ? undefined : status),
  });

  const markOfficialMutation = useMutation({
    mutationFn: ({ id, isOfficial }: { id: string; isOfficial: boolean }) =>
      (adminApi as any).markSellerOfficial(id, isOfficial),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      toast.success(v.isOfficial ? 'Company store set!' : 'Removed company store flag');
    },
    onError: () => toast.error('Failed to update'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveSeller(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sellers'] }); toast.success('Seller approved!'); },
    onError: () => toast.error('Failed to approve seller'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectSeller(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      setRejectingId(null); setRejectReason('');
      toast.success('Seller rejected');
    },
    onError: () => toast.error('Failed to reject seller'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendSeller(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sellers'] }); toast.success('Seller suspended'); },
    onError: () => toast.error('Failed to suspend seller'),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.unsuspendSeller(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sellers'] }); toast.success('Seller reactivated'); },
    onError: () => toast.error('Failed to reactivate seller'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => (adminApi as any).createSeller(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      setShowCreate(false);
      setCreateForm({ ...EMPTY_FORM });
      toast.success('Seller account created!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create seller'),
  });

  const sellers = data?.data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.password || !createForm.storeName) {
      toast.error('Name, password and store name are required');
      return;
    }
    createMutation.mutate(createForm);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sellers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{(data as any)?.meta?.total ?? sellers.length} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Seller
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${status === s ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Create Seller Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-slate-900 text-lg">Add Seller Manually</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 bg-sky-50 rounded-xl px-3 py-2">
                This creates a seller account directly with <strong>Approved</strong> status — no onboarding flow required.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input required value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. John Doe" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input required type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 6 characters" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Store Name <span className="text-red-500">*</span></label>
                <input required value={createForm.storeName} onChange={(e) => setCreateForm((f) => ({ ...f, storeName: e.target.value }))}
                  placeholder="e.g. TechHub Uganda" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="seller@example.com" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+256 7XX XXX XXX" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp Number</label>
                <input value={createForm.whatsapp} onChange={(e) => setCreateForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+256 7XX XXX XXX" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Store Description</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Brief description of the store…"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 bg-sky-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sky-600 disabled:opacity-50 transition-colors">
                  {createMutation.isPending ? 'Creating…' : 'Create Seller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-3">Reject Seller</h3>
            <p className="text-sm text-slate-600 mb-3">Provide a reason for rejection (sent to seller):</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm mb-4" placeholder="e.g., Incomplete KYC documents..." />
            <div className="flex gap-2">
              <button onClick={() => rejectMutation.mutate({ id: rejectingId, reason: rejectReason })}
                disabled={!rejectReason || rejectMutation.isPending} className="btn-danger flex-1">Reject</button>
              <button onClick={() => setRejectingId(null)} className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading sellers...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Store', 'Owner', 'Contact', 'KYC', 'Products', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {sellers.map((seller: any) => (
                <tr key={seller.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${seller.isOfficial ? 'bg-amber-100' : 'bg-sky-100'}`}>
                        {seller.isOfficial ? <Building2 className="w-4 h-4 text-amber-600" /> : <Store className="w-4 h-4 text-sky-600" />}
                      </div>
                      <div>
                        <span className="font-medium">{seller.storeName}</span>
                        {seller.isOfficial && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">Official Store</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-td">{[seller.user?.firstName, seller.user?.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td className="table-td text-xs text-slate-500">
                    <p>{seller.user?.phone}</p>
                    <p>{seller.user?.email}</p>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      seller.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                      seller.kycStatus === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{seller.kycStatus}</span>
                  </td>
                  <td className="table-td text-center">{seller._count?.products || 0}</td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      seller.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      seller.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      seller.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{seller.status}</span>
                  </td>
                  <td className="table-td text-xs text-slate-400">{new Date(seller.createdAt).toLocaleDateString()}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      {seller.status === 'PENDING' && (
                        <>
                          <button onClick={() => approveMutation.mutate(seller.id)} className="text-green-600 hover:text-green-700" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => setRejectingId(seller.id)} className="text-red-500 hover:text-red-600" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {seller.status === 'APPROVED' && (
                        <button onClick={() => suspendMutation.mutate(seller.id)} className="text-orange-500 hover:text-orange-600" title="Suspend">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {seller.status === 'SUSPENDED' && (
                        <button onClick={() => unsuspendMutation.mutate(seller.id)} className="text-green-600 hover:text-green-700" title="Reactivate">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button className="text-sky-600 hover:text-sky-700" title="View KYC">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => markOfficialMutation.mutate({ id: seller.id, isOfficial: !seller.isOfficial })}
                        className={seller.isOfficial ? 'text-amber-500 hover:text-amber-700' : 'text-slate-400 hover:text-amber-500'}
                        title={seller.isOfficial ? 'Remove Company Store flag' : 'Set as Company Store'}
                      >
                        <Building2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sellers.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center text-slate-400 py-8">No sellers found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
