'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  UserCog, Plus, Search, MoreVertical, ShieldCheck, ShieldOff,
  KeyRound, Trash2, Edit2, X, Eye, EyeOff,
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'badge-danger',
  ADMIN: 'badge-purple',
  ORDER_MANAGER: 'badge-info',
  FINANCE_MANAGER: 'badge-success',
  SUPPORT_AGENT: 'bg-yellow-100 text-yellow-700',
  CONTENT_MANAGER: 'bg-orange-100 text-orange-700',
  DELIVERY_MANAGER: 'bg-cyan-100 text-cyan-700',
  REPORTS_VIEWER: 'bg-slate-100 text-slate-700',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  password: '', staffRole: 'SUPPORT_AGENT', department: '', jobTitle: '', notes: '',
};

export default function StaffPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPwd, setShowPwd] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: rolesData } = useQuery({ queryKey: ['staff-roles'], queryFn: () => adminApi.getStaffRoles() });
  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => adminApi.getStaff() });

  const refetch = () => qc.invalidateQueries({ queryKey: ['staff'] });

  const createMut = useMutation({ mutationFn: adminApi.createStaff, onSuccess: () => { refetch(); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => adminApi.updateStaff(id, data), onSuccess: () => { refetch(); closeModal(); } });
  const suspendMut = useMutation({ mutationFn: adminApi.suspendStaff, onSuccess: refetch });
  const reactivateMut = useMutation({ mutationFn: adminApi.reactivateStaff, onSuccess: refetch });
  const deleteMut = useMutation({ mutationFn: adminApi.deleteStaff, onSuccess: refetch });
  const resetPwdMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => adminApi.resetStaffPassword(id, password),
    onSuccess: () => { setResetModal(null); setNewPassword(''); },
  });

  const roles: string[] = rolesData?.roles?.map((r: any) => r.role) ?? Object.keys(ROLE_COLORS);

  const staff = (data?.staff ?? []).filter((s: any) => {
    const q = search.toLowerCase();
    return !q || s.user?.firstName?.toLowerCase().includes(q) || s.user?.lastName?.toLowerCase().includes(q)
      || s.user?.email?.toLowerCase().includes(q) || s.staffRole?.toLowerCase().includes(q);
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(s: any) {
    setEditingId(s.id);
    setForm({
      firstName: s.user?.firstName ?? '',
      lastName: s.user?.lastName ?? '',
      email: s.user?.email ?? '',
      phone: s.user?.phone ?? '',
      password: '',
      staffRole: s.staffRole,
      department: s.department ?? '',
      jobTitle: s.jobTitle ?? '',
      notes: s.notes ?? '',
    });
    setShowModal(true);
    setActiveMenu(null);
  }

  function closeModal() { setShowModal(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const { password, ...rest } = form;
      updateMut.mutate({ id: editingId, data: rest });
    } else {
      createMut.mutate(form as any);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff & Roles</h1>
            <p className="text-sm text-slate-500">Manage company users and their permissions</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <span key={r} className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[r] ?? 'badge-neutral'}`}>
            {r.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, role…"
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Table */}
      <div className="card border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No staff members found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Job Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{s.user?.firstName} {s.user?.lastName}</div>
                    <div className="text-xs text-slate-400">{s.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[s.staffRole] ?? 'badge-neutral'}`}>
                      {s.staffRole?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.department || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.jobTitle || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {s.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)} className="p-1 rounded hover:bg-slate-100">
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                    {activeMenu === s.id && (
                      <div className="absolute right-4 top-8 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-44">
                        <button onClick={() => openEdit(s)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-slate-700">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => { setResetModal({ id: s.id, name: `${s.user?.firstName} ${s.user?.lastName}` }); setActiveMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-slate-700">
                          <KeyRound className="w-3.5 h-3.5" /> Reset Password
                        </button>
                        {s.isActive ? (
                          <button onClick={() => { suspendMut.mutate(s.id); setActiveMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-red-600">
                            <ShieldOff className="w-3.5 h-3.5" /> Suspend
                          </button>
                        ) : (
                          <button onClick={() => { reactivateMut.mutate(s.id); setActiveMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-green-600">
                            <ShieldCheck className="w-3.5 h-3.5" /> Reactivate
                          </button>
                        )}
                        <hr className="my-1" />
                        <button onClick={() => { if (confirm('Delete this staff member?')) { deleteMut.mutate(s.id); setActiveMenu(null); } }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-red-600">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(['firstName', 'lastName'] as const).map((f) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
                    <input value={(form as any)[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                      required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required disabled={!!editingId}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button type="button" onClick={() => setShowPwd((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPwd ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Staff Role</label>
                <select value={form.staffRole} onChange={(e) => setForm((p) => ({ ...p, staffRole: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {roles.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['department', 'jobTitle'] as const).map((f) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
                    <input value={(form as any)[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
              </div>
              {(createMut.isError || updateMut.isError) && (
                <p className="text-sm text-red-600">{(createMut.error as any)?.message ?? (updateMut.error as any)?.message ?? 'Something went wrong.'}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60">
                  {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Reset Password</h2>
            <p className="text-sm text-slate-500">Set a new password for <span className="font-medium">{resetModal.name}</span>.</p>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="New password"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              <button type="button" onClick={() => setShowPwd((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPwd ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={() => resetPwdMut.mutate({ id: resetModal.id, password: newPassword })}
                disabled={newPassword.length < 6 || resetPwdMut.isPending}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60">
                {resetPwdMut.isPending ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
