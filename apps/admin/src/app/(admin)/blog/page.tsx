'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, X } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  category?: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  author?: { firstName: string; lastName: string };
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: '',
  tags: '',
  isPublished: false,
};

const CATEGORIES = ['news', 'tips', 'announcement', 'offers', 'guide'];

export default function BlogAdminPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-blog', page],
    queryFn: () => (api as any).getBlogPosts(page),
  });

  const posts: BlogPost[] = data?.data || [];
  const meta = data?.meta || {};

  const filtered = search.trim()
    ? posts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : posts;

  const saveMutation = useMutation({
    mutationFn: (dto: any) =>
      editing
        ? (api as any).updateBlogPost(editing.id, dto)
        : (api as any).createBlogPost(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (api as any).deleteBlogPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog'] });
      setDeleteConfirm(null);
    },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      (api as any).updateBlogPost(id, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-blog'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      coverImage: post.coverImage || '',
      category: post.category || '',
      tags: post.tags?.join(', ') || '',
      isPublished: post.isPublished,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    saveMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog Posts</h1>
          <p className="text-sm text-slate-500">{meta.total || 0} posts total</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…"
          className="pl-9 pr-4 py-2 text-sm border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-sky-400" />
      </div>

      {/* Posts table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Post</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-3/4" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">No posts found</td></tr>
            ) : (
              filtered.map((post) => (
                <tr key={post.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 line-clamp-1">{post.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {post.category && (
                      <span className="badge-info text-xs px-2 py-0.5 rounded-full capitalize">{post.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish.mutate({ id: post.id, isPublished: !post.isPublished })}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        post.isPublished ? 'badge-success hover:bg-emerald-200' : 'badge-neutral hover:bg-slate-200'
                      }`}
                    >
                      {post.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {post.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(post)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(post.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm rounded-xl border disabled:opacity-40 hover:bg-slate-50">← Prev</button>
          <span className="px-4 py-2 text-sm text-slate-600">{page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-xl border disabled:opacity-40 hover:bg-slate-50">Next →</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Post' : 'New Blog Post'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Post title" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated from title" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                    <option value="">-- none --</option>
                    {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cover Image</label>
                <MediaUpload
                  value={form.coverImage}
                  onChange={(url) => setForm({ ...form, coverImage: url })}
                  label="Upload cover image"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Excerpt</label>
                <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2} placeholder="Brief summary shown in listings…" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Content *</label>
                <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={12} placeholder="Write your blog post here…" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. deal, electronics, promo" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded" />
                  <span className="text-sm text-slate-700">Publish immediately</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button type="submit" disabled={saveMutation.isPending}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                  {saveMutation.isPending ? 'Saving…' : editing ? 'Update Post' : 'Create Post'}
                </button>
                <button type="button" onClick={closeForm}
                  className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
              {saveMutation.isError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">Failed to save. Please try again.</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Post?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
