'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export function NotificationBell() {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s when logged in
  useEffect(() => {
    // Guard: only poll when user is set AND we have a token available
    const hasToken = typeof window !== 'undefined' && (
      !!localStorage.getItem('access_token') ||
      !!JSON.parse(localStorage.getItem('totalstore-auth') ?? '{}')?.state?.token
    );
    if (!user || !hasToken) { setUnread(0); return; }

    const fetchCount = () =>
      notificationsApi.list(1, 1)
        .then((r: any) => {
          const count = r?.data?.meta?.unreadCount ?? 0;
          setUnread(count);
        })
        .catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    setOpen(o => !o);
    if (!open) {
      notificationsApi.list(1, 10)
        .then((r: any) => setNotifs(r?.data?.data ?? []))
        .catch(() => {});
    }
  };

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <button
        onClick={openDropdown}
        className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors min-w-[58px]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="text-[11px] font-medium">Alerts</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800 text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {notifs.some(n => !n.isRead) && (
                <button
                  onClick={markAll}
                  className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
            ) : (
              notifs.map((n: any) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-sky-50/40' : ''}`}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-sky-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-sky-500 hover:text-sky-700 flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm text-sky-600 hover:text-sky-800 font-medium transition"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
