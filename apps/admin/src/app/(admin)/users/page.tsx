'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Ban, RotateCcw, Trash2, User, ShoppingBag, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_TABS = ['ALL', 'ACTIVE', 'SUSPENDED'];

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewUser, setViewUser] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, status, search],
    queryFn: () => adminApi.getUsers(page, search || undefined, status === 'ALL' ? undefined : status),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const suspend   = useMutation({ mutationFn: (id: string) => adminApi.suspendUser(id),   onSuccess: () => { invalidate(); toast.success('User suspended'); } });
  const unsuspend = useMutation({ mutationFn: (id: string) => adminApi.unsuspendUser(id), onSuccess: () => { invalidate(); toast.success('User reactivated'); } });
  const del       = useMutation({ mutationFn: (id: string) => adminApi.deleteUser(id),    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('User deleted'); }, onError: () => toast.error('Cannot delete user') });

  const users = data?.data || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Buyers</h1>
        <span className="text-sm text-slate-500">{data?.total || 0} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone..."
            className="pl-9 pr-4 py-2 border rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${status === s ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* View Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-2xl">
                {viewUser.firstName?.[0] || viewUser.name?.[0] || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{viewUser.firstName} {viewUser.lastName}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[viewUser.status] || 'bg-slate-100 text-slate-600'}`}>{viewUser.status}</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Email',    viewUser.email],
                ['Phone',    viewUser.phone],
                ['Role',     viewUser.role],
                ['Orders',   viewUser._count?.orders || 0],
                ['Reviews',  viewUser._count?.reviews || 0],
                ['Joined',   new Date(viewUser.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v || '—'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewUser(null)} className="mt-5 w-full border rounded-xl py-2 text-sm hover:bg-slate-50">Close</button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Delete User?</h3>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete <span className="font-semibold">{confirmDelete.firstName} {confirmDelete.lastName}</span> and all their data.
            </p>
            <div className="flex gap-2">
              <button onClick={() => del.mutate(confirmDelete.id)} disabled={del.isPending} className="btn-danger flex-1">
                {del.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading buyers...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['User', 'Contact', 'Orders', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                        {user.firstName?.[0] || user.name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-400">{user.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-xs text-slate-500">
                    <p>{user.email}</p>
                    <p>{user.phone || '—'}</p>
                  </td>
                  <td className="table-td text-center">
                    <span className="flex items-center justify-center gap-1 text-sm">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                      {user._count?.orders || 0}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[user.status] || 'bg-green-100 text-green-700'}`}>
                      {user.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="table-td text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setViewUser(user)} className="text-sky-600 hover:text-sky-700" title="View"><Eye className="w-4 h-4" /></button>
                      {(!user.status || user.status === 'ACTIVE') ? (
                        <button onClick={() => suspend.mutate(user.id)} className="text-orange-500 hover:text-orange-600" title="Suspend"><Ban className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => unsuspend.mutate(user.id)} className="text-green-600 hover:text-green-700" title="Reactivate"><RotateCcw className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => setConfirmDelete(user)} className="text-red-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-slate-400 py-10">No buyers found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
