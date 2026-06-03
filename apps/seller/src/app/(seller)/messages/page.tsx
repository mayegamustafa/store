'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Send, Phone, Video, Search, ArrowLeft, PhoneCall } from 'lucide-react';
import { useSellerStore } from '@/stores/seller.store';
import { sellerApi } from '@/lib/api';
import { getRuntimeApiBaseUrl, getRuntimeWsBaseUrl } from '@/lib/runtime-config';
import { formatDistanceToNow } from 'date-fns';

interface Participant { id: string; firstName: string; lastName: string; avatar?: string; role: string; phone?: string; }
interface Message { id: string; body: string; type: string; senderId: string; sender: Participant; createdAt: string; conversationId?: string; }
interface Conversation { id: string; type: string; subject?: string; lastMessageAt?: string; unreadCount: number; lastMessage: Message | null; otherParticipants: Participant[]; isResolved: boolean; }

// Re-use the API against the same backend
async function apiGet(path: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sellerToken') : null;
  const res = await fetch(`${getRuntimeApiBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}
async function apiPost(path: string, body: any) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sellerToken') : null;
  const res = await fetch(`${getRuntimeApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

const TYPE_LABELS: Record<string, string> = {
  BUYER_SELLER: 'Buyer',
  ADMIN_SUPPORT: 'Support',
  ORDER_GROUP: 'Order',
};

export default function SellerMessagesPage() {
  const { user } = useSellerStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherParticipants = activeConv?.otherParticipants ?? [];

  useEffect(() => {
    const token = localStorage.getItem('sellerToken');
    if (!token) return;
    const socket = io(`${getRuntimeWsBaseUrl()}/chat`, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? { ...c, lastMessage: msg, unreadCount: activeConvId === c.id ? 0 : c.unreadCount + 1 }
          : c,
      ));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    socket.on('chat:typing', ({ isTyping }: { isTyping: boolean }) => setOtherTyping(isTyping));
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    apiGet('/chat/conversations').then(data => setConversations(Array.isArray(data) ? data : data?.data ?? []));
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    apiGet(`/chat/conversations/${activeConvId}/messages`).then(data => {
      const msgs = Array.isArray(data) ? data : data?.data ?? data?.data?.data ?? [];
      setMessages(msgs);
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
      await apiPost(`/chat/conversations/${activeConvId}/messages`, { body });
      apiGet(`/chat/conversations/${activeConvId}/messages`).then(data => {
        setMessages(Array.isArray(data) ? data : data?.data ?? []);
      });
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

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    return c.otherParticipants.some(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-64px)]">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Messages</h1>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className={`w-72 shrink-0 border-r border-slate-100 flex flex-col ${activeConvId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 gap-3">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm text-center">No messages yet</p>
              </div>
            ) : filteredConvs.map(conv => {
              const other = conv.otherParticipants[0];
              return (
                <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition ${activeConvId === conv.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-semibold text-sm shrink-0 relative">
                    {(other?.firstName?.[0] ?? '?').toUpperCase()}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-900">
                      {other ? `${other.firstName} ${other.lastName}` : 'Support'}
                      <span className="ml-1 text-xs font-normal text-slate-400">{TYPE_LABELS[conv.type] ?? ''}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage?.body ?? 'Start a conversation'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activeConvId ? 'hidden lg:flex' : 'flex'}`}>
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <MessageCircle className="w-12 h-12 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveConvId(null)} className="lg:hidden text-slate-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-semibold text-sm shrink-0">
                  {(otherParticipants[0]?.firstName?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {otherParticipants.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'Support'}
                  </p>
                  <p className="text-xs text-slate-400">{otherTyping ? 'typing…' : (TYPE_LABELS[activeConv!.type] ?? '')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {otherParticipants[0]?.phone && (
                    <a href={`tel:${otherParticipants[0].phone}`} title="Call"
                      className="p-2 rounded-xl hover:bg-green-50 text-green-600 transition">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.map(msg => {
                  const isMe = msg.senderId === (user as any)?.id;
                  if (msg.type === 'CALL_REQUEST') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <PhoneCall className="w-3 h-3" />{msg.body}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-sky-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-900 rounded-bl-md'}`}>
                        {!isMe && <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.sender?.firstName}</p>}
                        <p className="break-words">{msg.body}</p>
                        <p className={`text-xs mt-0.5 ${isMe ? 'text-sky-200' : 'text-slate-400'} text-right`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text" value={text} onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Type a message…"
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none"
                  />
                  <button onClick={sendMessage} disabled={!text.trim()}
                    className="w-10 h-10 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-40">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
