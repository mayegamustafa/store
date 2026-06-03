import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-8xl font-black text-slate-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Page not found</h2>
        <p className="text-sm text-slate-500 mb-6">Sorry, we couldn&apos;t find the page you&apos;re looking for.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="px-5 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 transition-colors">
            Go Home
          </Link>
          <Link href="/products" className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
