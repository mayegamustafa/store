import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-7xl font-black text-slate-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Page not found</h2>
        <p className="text-sm text-slate-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
