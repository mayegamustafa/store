'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Tag, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MediaUpload } from '@/components/MediaUpload';

const EMPTY_FORM = { name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, parentId: '' };

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });

  const allCats: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  const filtered = search
    ? allCats.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
    : allCats;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-categories'] });

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) =>
      editItem ? adminApi.updateCategory(editItem.id, d) : adminApi.createCategory(d),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setEditItem(null);
      setForm({ ...EMPTY_FORM });
      toast.success(editItem ? 'Category updated!' : 'Category created!');
    },
    onError: () => toast.error('Failed to save category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('Category deleted'); },
    onError: () => toast.error('Cannot delete — may have products attached'),
  });

  const openEdit = (cat: any) => {
    setEditItem(cat);
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      imageUrl: cat.image || '',
      sortOrder: cat.sortOrder || 0,
      parentId: cat.parentId || '',
    });
    setShowForm(true);
  };

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: k === 'sortOrder' ? Number(e.target.value) : e.target.value })),
  });

  // Top-level categories for parent selector
  const topLevel = allCats.filter((c: any) => !c.parentId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-400" />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-4">{editItem ? 'Edit Category' : 'New Category'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Name <span className="text-red-500">*</span></label>
                <input {...f('name')} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="e.g. Electronics" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Slug</label>
                <input {...f('slug')} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="e.g. electronics (leave blank to auto-generate)" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <textarea {...f('description')} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <MediaUpload
                label="Category Image"
                value={form.imageUrl}
                onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                accept="image/*"
                compact
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Sort Order</label>
                  <input {...f('sortOrder')} type="number" className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Parent Category</label>
                  <select {...f('parentId')} className="w-full border rounded-xl px-3 py-2 text-sm">
                    <option value="">— None (top-level) —</option>
                    {topLevel.filter((c: any) => c.id !== editItem?.id).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}
                className="btn-primary flex-1">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Delete Category?</h3>
            <p className="text-sm text-slate-600 mb-5">Delete <span className="font-semibold">{confirmDelete.name}</span>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending}
                className="btn-danger flex-1">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-xl px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat: any) => (
            <div key={cat.id} className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
              <div className="h-24 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <Tag className="w-8 h-8 text-slate-300" />
                )}
                {cat.parentId && (
                  <span className="absolute top-1 left-1 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md font-medium">Sub</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-slate-800 truncate">{cat.name}</p>
                <p className="text-xs text-slate-400 truncate">{cat.slug}</p>
                <p className="text-xs text-slate-400 mt-0.5">{cat._count?.products || 0} products</p>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg border hover:bg-sky-50 text-sky-600">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setConfirmDelete(cat)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg border hover:bg-red-50 text-red-500">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 py-16 text-center text-slate-400">
              {search ? 'No categories match your search.' : 'No categories yet. Click "Add Category" to create one.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
