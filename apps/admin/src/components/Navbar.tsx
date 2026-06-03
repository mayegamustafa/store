'use client';

import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/stores/admin.store';
import { Bell, Search, ChevronDown, LogOut, Settings, Check, CheckCheck, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api';

// Map route segments to readable page titles
const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  sellers: 'Sellers',
  riders: 'Riders',
  users: 'Buyers',
  staff: 'Staff & Roles',
  categories: 'Categories',
  banners: 'Banners',
  coupons: 'Coupons',
  notifications: 'Notifications',
  reports: 'Reports',
  settings: 'Settings',
  wallet: 'Wallets',
  analytics: 'Audit Trail',
  blog: 'Blog',
  brands: 'Top Brands',
  'home-blocks': 'Home Blocks',
  'live-map': 'Live Map',
  'live-streams': 'Live Streams',
  messages: 'Messages',
  newsletter: 'Newsletter',
  pos: 'POS',
  reels: 'Reels',
  support: 'Support',
};

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const pathname = usePathname();
  const { admin, logout } = useAdminStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const segment = pathname.split('/').filter(Boolean).pop() ?? 'dashboard';
  const pageTitle = TITLES[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);

  const initials = admin?.name
    ? admin.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  // Poll unread count every 30 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await (adminApi as any).getAdminUnreadCount();
        setUnreadCount(typeof res === 'number' ? res : 0);
      } catch { /* silent */ }
    };
    fetchCount();
    const timer = setInterval(fetchCount, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications when dropdown opens
  const openNotifs = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      setNotifsLoading(true);
      try {
        const res = await (adminApi as any).getAdminInbox();
        setNotifications(Array.isArray(res) ? res : res?.data || []);
      } catch { /* silent */ }
      setNotifsLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await (adminApi as any).markAdminNotifRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAll = async () => {
    try {
      await (adminApi as any).markAllAdminNotifsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary-600 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 leading-tight">{pageTitle}</h1>
          <p className="text-[11px] text-slate-400 leading-tight hidden sm:block">Total Store Admin</p>
        </div>
      </div>

      {/* Right: search, bell, profile */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search…"
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl w-56 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Notification bell with dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifs}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary-600 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 ring-2 ring-white shadow-sm">
                <span className="text-white text-[10px] font-bold leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200/60 rounded-2xl shadow-card-lg z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAll} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifsLoading ? (
                  <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">No notifications yet</div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-primary-50/60' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-primary-500' : 'bg-slate-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!n.isRead && (
                        <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }} className="text-primary-400 hover:text-primary-600 flex-shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-slate-100">
                <Link href="/notifications" onClick={() => setNotifOpen(false)} className="block text-center text-xs text-primary-600 hover:text-primary-700 font-medium py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            onBlur={() => setTimeout(() => setProfileOpen(false), 150)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-tight">{admin?.name || 'Admin'}</p>
              <p className="text-[11px] text-slate-400 leading-tight capitalize">{admin?.role?.toLowerCase().replace('_', ' ') ?? 'Admin'}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 hidden md:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200/60 rounded-2xl shadow-card-lg z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-900 truncate">{admin?.name}</p>
                <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
