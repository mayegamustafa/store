'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { Bell, Package, Tag, MessageCircle, CheckCheck, ShoppingCart, Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

const TYPE_ICON: Record<string, React.ReactNode> = {
  ORDER_PLACED:    <Package className="w-5 h-5 text-primary" />,
  ORDER_SHIPPED:   <Truck className="w-5 h-5 text-blue-500" />,
  ORDER_DELIVERED: <Package className="w-5 h-5 text-green-600" />,
  ORDER_CANCELLED: <Package className="w-5 h-5 text-red-500" />,
  PROMO:           <Tag className="w-5 h-5 text-accent" />,
  FLASH_SALE:      <Tag className="w-5 h-5 text-orange-500" />,
  MESSAGE:         <MessageCircle className="w-5 h-5 text-blue-500" />,
  CART_REMINDER:   <ShoppingCart className="w-5 h-5 text-purple-500" />,
};

const getIcon = (type: string) =>
  TYPE_ICON[type] ?? <Bell className="w-5 h-5 text-slate-500" />;

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1, 50).then((r: any) => r.data ?? r),
    enabled: !!user,
    staleTime: 30_000,
  });

  const notifications: any[] = data?.data ?? [];
  const unreadCount: number = data?.meta?.unreadCount ?? notifications.filter((n: any) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  if (!user) return null;

  return (
    <div className="container-app py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-sm text-primary font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-600">No notifications yet</h2>
          <p className="text-sm text-slate-500 mt-1">You are all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${
                n.isRead ? 'bg-white border-slate-100' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'
              }`}>
                {getIcon(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
              </div>
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

