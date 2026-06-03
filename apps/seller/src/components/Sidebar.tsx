'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSellerStore } from '@/stores/seller.store';
import { sellerApi } from '@/lib/api';
import {
  LayoutDashboard, Package, ShoppingBag, DollarSign, Settings, LogOut,
  Store, ChevronLeft, ChevronRight, Bell, X, CheckCheck, MessageCircle, Tv,
  Smartphone, MapPin, BadgeCheck,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/products',     label: 'Products',      icon: Package },
  { href: '/orders',       label: 'Orders',        icon: ShoppingBag },
  { href: '/messages',     label: 'Messages',      icon: MessageCircle },
  { href: '/finance',      label: 'Finance',       icon: DollarSign },
  { href: '/subscription', label: 'Subscription',  icon: BadgeCheck },
  { href: '/live-map',     label: 'Live Map',      icon: MapPin },
  { href: '/live',         label: 'Live Streams',  icon: Tv },
  { href: '/store',        label: 'My Store',      icon: Store },
  { href: '/settings',     label: 'Settings',      icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname    = usePathname();
  const { user, sellerProfile, logout } = useSellerStore();

  const [unread, setUnread]     = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs]     = useState<any[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = () =>
      sellerApi.getUnreadCount().then((r: any) => setUnread(r.data?.count ?? 0)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openBell = () => {
    setBellOpen(o => !o);
    if (!bellOpen)
      sellerApi.getNotifications(1).then((r: any) => setNotifs(r.data?.data ?? [])).catch(() => {});
  };

  const markRead = async (id: string) => {
    await sellerApi.markNotifRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await sellerApi.markAllNotifsRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full relative">
      {/* Logo */}
      <div className={`flex items-center h-[60px] border-b border-white/10 flex-shrink-0 transition-all duration-300 ${collapsed ? 'px-[15px] justify-center' : 'px-4 gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow">
          <Store className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-none">TotalStore</p>
            <p className="text-xs text-indigo-300 mt-0.5">Seller Hub</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-[44px] w-6 h-6 rounded-full bg-indigo-800 border border-white/20 items-center justify-center z-10 hover:bg-indigo-600 transition-colors shadow-md"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-white" />
          : <ChevronLeft  className="w-3 h-3 text-white" />}
      </button>

      {/* Store chip */}
      {sellerProfile && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs font-semibold text-purple-200 truncate leading-none">{sellerProfile.storeName}</p>
          <p className={`text-[10px] mt-1 font-medium ${
            sellerProfile.status === 'APPROVED' ? 'text-emerald-400' :
            sellerProfile.status === 'PENDING'  ? 'text-amber-400'  : 'text-red-400'
          }`}>{sellerProfile.status}</p>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto scrollbar-hide py-3 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={`sidebar-link group relative ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <Icon className={`w-4 h-4 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
                {active && !collapsed && <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
              {!collapsed && <span className="truncate">{label}</span>}
              {collapsed && active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-r-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Bell */}
      <div ref={bellRef} className={`flex-shrink-0 py-2 relative ${collapsed ? 'px-1.5' : 'px-2'}`}>
        <button
          onClick={openBell}
          title={collapsed ? 'Notifications' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-300 hover:bg-white/10 hover:text-white transition-colors duration-150 ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <div className="relative flex-shrink-0">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          {!collapsed && <span className="text-sm font-medium">Notifications</span>}
        </button>

        {bellOpen && (
          <div className={`absolute bottom-full mb-1 bg-white rounded-xl shadow-card-lg border border-slate-100 z-50 max-h-72 flex flex-col overflow-hidden ${collapsed ? 'left-full ml-2 w-72' : 'left-2 right-2'}`}>
            <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
              <span className="text-xs font-semibold text-slate-700">Notifications</span>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAll} className="text-purple-500 hover:text-purple-700" title="Mark all read">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setBellOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifs.length === 0
                ? <p className="text-xs text-slate-400 text-center py-8">No notifications</p>
                : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left px-3 py-2.5 border-b last:border-0 transition-colors ${!n.isRead ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />}
                      <div className={!n.isRead ? '' : 'pl-3.5'}>
                        <p className="text-xs font-medium text-slate-800 leading-snug">{n.title}</p>
                        {n.message && <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>}
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Get App link */}
      <div className={`flex-shrink-0 ${collapsed ? 'px-1.5' : 'px-2'} pb-1`}>
        <a
          href="/downloads/totalstore-seller.apk"
          title={collapsed ? 'Get Mobile App' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-300 hover:bg-white/10 hover:text-emerald-200 transition-colors duration-150 ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Get Mobile App</span>}
        </a>
      </div>

      {/* User footer */}
      <div className="border-t border-white/10 flex-shrink-0 p-2">
        <div className={`flex items-center rounded-xl bg-white/5 border border-white/10 ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2.5'}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-none">{user?.name}</p>
                <p className="text-[10px] text-indigo-400 truncate mt-0.5">{user?.phone}</p>
              </div>
              <button onClick={logout} className="text-indigo-400 hover:text-red-400 transition-colors flex-shrink-0" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 relative transition-all duration-300 ease-in-out
          bg-gradient-to-b from-[#1e1b4b] via-[#1e1b4b] to-[#312e81] border-r border-white/10
          ${collapsed ? 'w-[62px]' : 'w-[220px]'}`}
        style={{ height: '100vh' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col
          bg-gradient-to-b from-[#1e1b4b] via-[#1e1b4b] to-[#312e81] border-r border-white/10
          transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
