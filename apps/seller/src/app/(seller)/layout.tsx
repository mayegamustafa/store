'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSellerStore } from '@/stores/seller.store';
import { Sidebar } from '@/components/Sidebar';
import { Menu, ChevronRight } from 'lucide-react';

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user } = useSellerStore();

  // Derive page title from route
  const segments = pathname.split('/').filter(Boolean);
  const title = segments[segments.length - 1];
  const pageTitle = title
    ? title.charAt(0).toUpperCase() + title.slice(1).replace(/-/g, ' ')
    : 'Dashboard';

  return (
    <header className="flex-shrink-0 h-[60px] bg-white border-b border-slate-100 flex items-center gap-3 px-4 lg:px-6 z-20 shadow-sm">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <div className="flex-1 flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-slate-400 hidden sm:block">Seller</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block flex-shrink-0" />
        <span className="font-semibold text-slate-800 truncate">{pageTitle}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {user?.name?.[0]?.toUpperCase() || 'S'}
        </div>
      </div>
    </header>
  );
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSellerStore();
  const router = useRouter();

  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  useEffect(() => {
    // router.push already prepends basePath — passing it explicitly would
    // double it (/seller/seller/login)
    if (!user) router.push('/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
