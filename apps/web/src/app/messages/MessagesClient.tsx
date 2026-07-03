'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Send, Phone, Video, ArrowLeft, Search, User, Package, MoreVertical, Check, CheckCheck, PhoneCall } from 'lucide-react';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

type ConvType = 'BUYER_SELLER' | 'BUYER_RIDER' | 'ADMIN_SUPPORT' | 'ORDER_GROUP';

interface Participant { id: string; firstName: string; lastName: string; avatar?: string; role: string; phone?: string; }
interface Message { id: string; body: string; type: string; senderId: string; sender: Participant; createdAt: string; mediaUrl?: string; conversationId?: string; }
interface Conversation { id: string; type: ConvType; subject?: string; orderId?: string; lastMessageAt?: string; unreadCount: number; lastMessage: Message | null; otherParticipants: Participant[]; isResolved: boolean; }

const TYPE_LABELS: Record<ConvType, string> = {
  BUYER_SELLER:  'Seller Chat',
  BUYER_RIDER:   'Delivery Chat',
  ADMIN_SUPPORT: 'Support',
  ORDER_GROUP:   'Order Chat',
};

export default function MessagesClient() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get('conv'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherParticipants = activeConv?.otherParticipants ?? [];

  // Init socket
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const socket = io(`${WS_URL}/chat`, { transports: ['polling', 'websocket'], auth: { token } });
    socketRef.current = socket;

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? { ...c, lastMessage: msg, unreadCount: activeConvId === c.id ? 0 : c.unreadCount + 1 }
          : c,
      ).sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    socket.on('chat:typing', ({ isTyping }: { isTyping: boolean }) => setOtherTyping(isTyping));
    socket.on('chat:call', (data: { from: string; callType: string; conversationId: string }) => {
      const caller = conversations.find(c => c.id === data.conversationId)?.otherParticipants[0];
      if (window.confirm(`Incoming ${data.callType} call from ${caller?.firstName ?? 'someone'}. Accept?`)) {
        // In production: integrate WebRTC here
        alert('Voice/video calls require the mobile app for the best experience.');
      }
    });
    return () => { socket.disconnect(); };
  }, [isAuthenticated]);

  // Load conversations
  useEffect(() => {
    if (!isAuthenticated) return;
    chatApi.getConversations().then((r: any) => setConversations(r.data ?? []));
  }, [isAuthenticated]);

  // Load messages
  useEffect(() => {
    if (!activeConvId) return;
    chatApi.getMessages(activeConvId).then((r: any) => {
      setMessages(r.data?.data ?? r.data ?? []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    socketRef.current?.emit('chat:join', { conversationId: activeConvId });
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
  }, [activeConvId]);

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !activeConvId) return;
    const body = text.trim();
    setText('');
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:send', { conversationId: activeConvId, body });
    } else {
      await chatApi.sendMessage(activeConvId, body);
      const r: any = await chatApi.getMessages(activeConvId);
      setMessages(r.data?.data ?? r.data ?? []);
    }
  }, [text, activeConvId]);

  const handleTyping = (value: string) => {
    setText(value);
    if (!activeConvId || !socketRef.current) return;
    socketRef.current.emit('chat:typing', { conversationId: activeConvId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { conversationId: activeConvId, isTyping: false });
    }, 2000);
  };

  const requestCall = (callType: 'voice' | 'video') => {
    socketRef.current?.emit('chat:call_request', { conversationId: activeConvId, callType });
  };

  if (!isAuthenticated) {
    return (
      <div className="container-app py-20 text-center">
        <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">Sign in to access your messages</p>
        <button onClick={() => router.push('/auth/login')} className="btn-primary px-6 py-2.5 rounded-xl">Sign In</button>
      </div>
    );
  }

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    return c.otherParticipants.some(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
    ) || c.subject?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="container-app py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-5">Messages</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-80 shrink-0 border-r border-slate-100 flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…" className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-6">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm text-center">No conversations yet.<br />Start a chat from a product or order page.</p>
              </div>
            ) : filteredConvs.map(conv => {
              const other = conv.otherParticipants[0];
              const isActive = activeConvId === conv.id;
              return (
                <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition ${isActive ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-semibold overflow-hidden">
                      {other?.avatar
                        ? <Image src={other.avatar} alt="" width={44} height={44} className="w-full h-full object-cover" />
                        : (other?.firstName?.[0] ?? '?').toUpperCase()
                      }
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {other ? `${other.firstName} ${other.lastName}` : 'Support'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-sky-600 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                      {conv.lastMessage?.body ?? TYPE_LABELS[conv.type]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <MessageCircle className="w-12 h-12 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveConvId(null)} className="md:hidden text-slate-500 hover:text-sky-600">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-semibold text-sm overflow-hidden shrink-0">
                  {otherParticipants[0]?.avatar
                    ? <Image src={otherParticipants[0].avatar} alt="" width={36} height={36} className="w-full h-full object-cover" />
                    : (otherParticipants[0]?.firstName?.[0] ?? '?').toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {otherParticipants.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'Support'}
                  </p>
                  <p className="text-xs text-slate-500">{TYPE_LABELS[activeConv!.type]}</p>
                </div>
                {/* Call actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {otherParticipants[0]?.phone && (
                    <a href={`tel:${otherParticipants[0].phone}`} title={`Call ${otherParticipants[0].phone}`}
                      className="p-2 rounded-xl hover:bg-green-50 text-green-600 transition">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                  <button onClick={() => requestCall('video')} title="Request video call"
                    className="p-2 rounded-xl hover:bg-sky-50 text-sky-600 transition">
                    <Video className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map(msg => {
                  const isMe = msg.senderId === (user as any)?.id;
                  if (msg.type === 'CALL_REQUEST') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2 rounded-full flex items-center gap-2">
                          <PhoneCall className="w-3.5 h-3.5" />{msg.body}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                      {!isMe && (
                        <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 text-xs font-semibold shrink-0 mt-auto">
                          {msg.sender?.firstName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className={`max-w-sm lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMe && <p className="text-xs text-slate-500 mb-1 ml-1">{msg.sender?.firstName}</p>}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-sky-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-900 rounded-bl-md'}`}>
                          {msg.mediaUrl && <img src={msg.mediaUrl} alt="media" className="mb-2 rounded-lg max-w-xs max-h-48 object-cover" />}
                          <p className="break-words leading-relaxed">{msg.body}</p>
                        </div>
                        <p className={`text-xs mt-1 ${isMe ? 'text-right' : ''} text-slate-400`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {otherTyping && (
                  <div className="flex justify-start gap-2">
                    <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(delay => (
                          <span key={delay} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-100 shrink-0">
                {activeConv?.isResolved ? (
                  <p className="text-center text-sm text-slate-400 py-2">This conversation has been resolved.</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-4">
                      <input
                        type="text" value={text} onChange={e => handleTyping(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                        placeholder="Type a message…"
                        className="flex-1 bg-transparent py-3 text-sm outline-none"
                      />
                    </div>
                    <button onClick={sendMessage} disabled={!text.trim()}
                      className="w-10 h-10 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shrink-0">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
