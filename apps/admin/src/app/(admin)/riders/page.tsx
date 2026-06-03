'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { CheckCircle, XCircle, Search, Truck, Ban, RotateCcw, MapPin, Phone, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

const STATUS_COLOR: Record<string, string> = {
  APPROVED:  'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  REJECTED:  'bg-red-100 text-red-700',
  SUSPENDED: 'bg-slate-100 text-slate-600',
};

export default function RidersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewRider, setViewRider] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRider, setNewRider] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', vehicleType: 'MOTORCYCLE', vehiclePlate: '', zone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-riders', page, status, search],
    queryFn: () => adminApi.getRiders(page, status === 'ALL' ? undefined : status, search || undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-riders'] });

  const approve  = useMutation({ mutationFn: (id: string) => adminApi.approveRider(id),  onSuccess: () => { invalidate(); toast.success('Rider approved!'); } });
  const reject   = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectRider(id, reason), onSuccess: () => { invalidate(); setRejectingId(null); setRejectReason(''); toast.success('Rider rejected'); } });
  const suspend  = useMutation({ mutationFn: (id: string) => adminApi.suspendRider(id),  onSuccess: () => { invalidate(); toast.success('Rider suspended'); } });
  const unsuspend = useMutation({ mutationFn: (id: string) => adminApi.unsuspendRider(id), onSuccess: () => { invalidate(); toast.success('Rider reactivated'); } });
  const createRider = useMutation({
    mutationFn: (data: any) => adminApi.createRider(data),
    onSuccess: () => { invalidate(); setShowCreate(false); setNewRider({ firstName: '', lastName: '', phone: '', email: '', password: '', vehicleType: 'MOTORCYCLE', vehiclePlate: '', zone: '' }); toast.success('Rider created!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create rider'),
  });

  const riders = data?.data || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Riders</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
            <UserPlus className="w-4 h-4" /> Add Rider
          </button>
          <span className="text-sm text-slate-500">{data?.total || 0} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone..."
            className="pl-9 pr-4 py-2 border rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${status === s ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-3">Reject Rider</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm mb-4" placeholder="Reason for rejection..." />
            <div className="flex gap-2">
              <button onClick={() => reject.mutate({ id: rejectingId, reason: rejectReason })}
                disabled={!rejectReason || reject.isPending} className="btn-danger flex-1">Reject</button>
              <button onClick={() => setRejectingId(null)} className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Rider Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">Add New Rider</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'firstName', label: 'First Name', required: true },
                { key: 'lastName', label: 'Last Name', required: true },
                { key: 'phone', label: 'Phone', placeholder: '+256 700 000 000', required: true },
                { key: 'email', label: 'Email' },
                { key: 'password', label: 'Password', type: 'password', required: true },
                { key: 'vehiclePlate', label: 'Vehicle Plate' },
                { key: 'zone', label: 'Zone / Area' },
              ].map((f) => (
                <div key={f.key} className={f.key === 'phone' || f.key === 'email' ? '' : ''}>
                  <label className="text-xs text-slate-600 mb-1 block">{f.label}{f.required && <span className="text-red-500">*</span>}</label>
                  <input value={(newRider as any)[f.key]} type={f.type || 'text'} placeholder={f.placeholder}
                    onChange={(e) => setNewRider((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Vehicle Type</label>
                <select value={newRider.vehicleType} onChange={(e) => setNewRider((p) => ({ ...p, vehicleType: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                  {['MOTORCYCLE', 'BICYCLE', 'CAR', 'VAN', 'TRUCK', 'FOOT'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => createRider.mutate(newRider)}
                disabled={!newRider.firstName || !newRider.lastName || !newRider.phone || !newRider.password || createRider.isPending}
                className="flex-1 bg-primary-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {createRider.isPending ? 'Creating...' : 'Create Rider'}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewRider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xl">
                {viewRider.user?.name?.[0] || 'R'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{viewRider.user?.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[viewRider.status] || 'bg-slate-100 text-slate-600'}`}>{viewRider.status}</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Phone',   viewRider.user?.phone],
                ['Email',   viewRider.user?.email],
                ['Vehicle', viewRider.vehicleType],
                ['Plate',   viewRider.vehiclePlate],
                ['Zone',    viewRider.zone],
                ['Rating',  viewRider.rating ? `${viewRider.rating}/5` : '—'],
                ['Trips',   viewRider.totalTrips || 0],
                ['Joined',  new Date(viewRider.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v || '—'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewRider(null)} className="mt-5 w-full border rounded-xl py-2 text-sm hover:bg-slate-50">Close</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading riders...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Rider', 'Contact', 'Vehicle', 'Zone', 'Trips', 'Rating', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {riders.map((rider: any) => (
                <tr key={rider.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                        {rider.user?.name?.[0] || 'R'}
                      </div>
                      <span className="font-medium text-sm">{rider.user?.name}</span>
                    </div>
                  </td>
                  <td className="table-td text-xs text-slate-500">
                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{rider.user?.phone}</p>
                    <p>{rider.user?.email}</p>
                  </td>
                  <td className="table-td text-xs">
                    <p className="font-medium">{rider.vehicleType || '—'}</p>
                    <p className="text-slate-400">{rider.vehiclePlate}</p>
                  </td>
                  <td className="table-td text-sm">
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3" />{rider.zone || '—'}
                    </span>
                  </td>
                  <td className="table-td text-center text-sm">{rider.totalTrips || 0}</td>
                  <td className="table-td text-sm">
                    {rider.rating ? (
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <span>{rider.rating}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[rider.status] || 'bg-slate-100 text-slate-500'}`}>
                      {rider.status}
                    </span>
                  </td>
                  <td className="table-td text-xs text-slate-400">{new Date(rider.createdAt).toLocaleDateString()}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setViewRider(rider)} className="text-sky-600 hover:text-sky-700" title="View">
                        <Truck className="w-4 h-4" />
                      </button>
                      {rider.status === 'PENDING' && (
                        <>
                          <button onClick={() => approve.mutate(rider.id)} className="text-green-600 hover:text-green-700" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => setRejectingId(rider.id)} className="text-red-500 hover:text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      {rider.status === 'APPROVED' && (
                        <button onClick={() => suspend.mutate(rider.id)} className="text-orange-500 hover:text-orange-600" title="Suspend"><Ban className="w-4 h-4" /></button>
                      )}
                      {rider.status === 'SUSPENDED' && (
                        <button onClick={() => unsuspend.mutate(rider.id)} className="text-green-600 hover:text-green-700" title="Reactivate"><RotateCcw className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {riders.length === 0 && (
                <tr><td colSpan={9} className="table-td text-center text-slate-400 py-10">No riders found</td></tr>
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
