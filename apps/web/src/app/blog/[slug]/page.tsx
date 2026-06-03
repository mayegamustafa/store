'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { blogApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, User, Tag, ArrowLeft, FileQuestion } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => blogApi.get(slug).then((r) => r.data),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container-app py-12 max-w-3xl mx-auto animate-pulse">
        <div className="aspect-video bg-slate-100 rounded-2xl mb-8" />
        <div className="space-y-3">
          <div className="h-8 bg-slate-100 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded mt-6" />
          <div className="h-3 bg-slate-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="container-app py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Post Not Found</h1>
        <p className="text-slate-500 mb-6">This blog post doesn't exist or has been removed.</p>
        <Link href="/blog" className="text-sky-600 hover:underline">← Back to Blog</Link>
      </div>
    );
  }

  const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-UG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-white min-h-screen pb-16">
      {/* Cover image */}
      {post.coverImage && (
        <div className="relative w-full aspect-[21/9] bg-slate-100 max-h-96 overflow-hidden">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority />
        </div>
      )}

      <div className="container-app max-w-3xl mx-auto py-10">
        {/* Breadcrumb */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        {/* Category tag */}
        {post.category && (
          <span className="inline-block bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 capitalize">
            {post.category}
          </span>
        )}

        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 leading-tight">{post.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-5 text-sm text-slate-500 mb-8 pb-6 border-b">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {date}</span>
          {post.author && (
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {post.author.firstName} {post.author.lastName}
            </span>
          )}
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-slate-600 italic mb-6 font-medium leading-relaxed">{post.excerpt}</p>
        )}

        {/* Content */}
        <div
          className="prose prose-gray max-w-none text-slate-800 leading-relaxed text-base whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: post.content?.replace(/\n/g, '<br>') || '' }}
        />

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t">
            <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
            {post.tags.map((tag: string) => (
              <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
