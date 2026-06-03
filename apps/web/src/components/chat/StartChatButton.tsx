'use client';

import { useState } from 'react';
import { MessageCircle, Phone, Video, Loader2 } from 'lucide-react';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
  targetUserId: string;
  targetName: string;
  targetPhone?: string;
  type: 'BUYER_SELLER' | 'BUYER_RIDER' | 'ADMIN_SUPPORT' | 'ORDER_GROUP';
  orderId?: string;
  subject?: string;
  variant?: 'button' | 'icon' | 'full';
  className?: string;
}

export function StartChatButton({
  targetUserId,
  targetName,
  targetPhone,
  type,
  orderId,
  subject,
  variant = 'button',
  className = '',
}: Props) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChat = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    setLoading(true);
    try {
      const r: any = await chatApi.startConversation({
        targetUserId,
        type,
        orderId,
        subject: subject ?? `Chat with ${targetName}`,
      });
      const convId = r.data?.id;
      router.push(`/messages?conv=${convId}`);
    } catch {
      toast.error('Could not start conversation');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button onClick={handleChat} disabled={loading}
        className={`p-2 rounded-xl hover:bg-sky-50 text-sky-600 transition disabled:opacity-50 ${className}`}
        title={`Message ${targetName}`}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button onClick={handleChat} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
          Chat with {targetName}
        </button>
        {targetPhone && (
          <a href={`tel:${targetPhone}`} title={`Call ${targetName}`}
            className="flex items-center justify-center gap-2 border border-green-500 text-green-600 hover:bg-green-50 py-2.5 px-4 rounded-xl text-sm font-semibold transition"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button onClick={handleChat} disabled={loading}
        className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 text-sm font-medium transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
        Message
      </button>
      {targetPhone && (
        <a href={`tel:${targetPhone}`} className="flex items-center gap-1.5 text-green-600 hover:text-green-700 text-sm font-medium transition">
          <Phone className="w-4 h-4" />
          Call
        </a>
      )}
    </div>
  );
}
