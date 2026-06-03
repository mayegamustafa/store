'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { blogApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Tag, Clock, ChevronRight, Newspaper } from 'lucide-react';

const CATEGORIES = ['All', 'news', 'tips', 'announcement', 'offers', 'guide'];

function PostCard({ post }: { post: any }) {
  const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-UG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  return (
    <Link href={`/blog/${post.slug}`} className="group bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:border-sky-200 transition-all overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-slate-50 overflow-hidden">
        {post.coverImage ? (
          <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100">
            <Newspaper className="w-10 h-10 text-sky-300" />
          </div>
        )}
        {post.category && (
          <span className="absolute top-3 left-3 bg-sky-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
            {post.category}
          </span>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h2 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-sky-700 transition-colors">{post.title}</h2>
        {post.excerpt && <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{post.excerpt}</p>}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{date}</span>
          </div>
          {post.author && (
            <span className="text-xs text-slate-500">{post.author.firstName} {post.author.lastName}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['blog', page, category],
    queryFn: () => blogApi.list({ page, limit: 12, category: category || undefined }).then((r) => r.data),
  });

  const posts = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="bg-slate-50 min-h-screen pb-14">
      {/* Hero */}
      <div className="bg-gradient-to-r from-sky-700 to-sky-900 text-white py-14">
        <div className="container-app text-center">
          <h1 className="text-4xl font-extrabold mb-3">Our Blog</h1>
          <p className="text-sky-200 text-lg max-w-xl mx-auto">News, tips, and stories from TotalStore</p>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c === 'All' ? '' : c); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                (c === 'All' && !category) || c === category
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
              }`}
            >
              {c === 'All' ? 'All Posts' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8 text-sky-400" />
            </div>
            <p className="text-slate-500 font-medium text-lg mb-2">No posts yet</p>
            <p className="text-sm text-slate-400">Check back soon for news and updates</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p: any) => <PostCard key={p.id} post={p} />)}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-5 py-2 text-sm rounded-full border disabled:opacity-40 hover:bg-slate-100 transition-colors">← Prev
            </button>
            <span className="px-5 py-2 text-sm text-slate-600">{page} / {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-5 py-2 text-sm rounded-full border disabled:opacity-40 hover:bg-slate-100 transition-colors">Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
