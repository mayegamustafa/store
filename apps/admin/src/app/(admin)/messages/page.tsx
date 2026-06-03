'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Send, Phone, Search, ArrowLeft, CheckCircle, Users, PhoneCall, Video, Filter } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminStore } from '@/stores/admin.store';
import { getRuntimeApiBaseUrl, getRuntimeWsBaseUrl } from '@/lib/runtime-config';

interface Participant { id: string; firstName: string; lastName: string; avatar?: string; role: string; phone?: string; }
interface Message { id: string; body: string; type: string; senderId: string; sender: Participant; createdAt: string; conversationId?: string; }
interface Conversation { id: string; type: string; subject?: string; lastMessageAt?: string; unreadCount: number; lastMessage: Message | null; participants: { user: Participant; role: string }[]; isResolved: boolean; orderId?: string; }

const TYPE_COLORS: Record<string, string> = {
  BUYER_SELLER: 'badge-info',
  BUYER_RIDER: 'badge-purple',
  ADMIN_SUPPORT: 'badge-warning',
  ORDER_GROUP: 'badge-success',
};
const TYPE_LABELS: Record<string, string> = {
  BUYER_SELLER: 'Buyer↔Seller',
  BUYER_RIDER: 'Buyer↔Rider',
  ADMIN_SUPPORT: 'Support',
  ORDER_GROUP: 'Order Group',
};

async function apiGet(path: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const res = await fetch(`${getRuntimeApiBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}
async function apiPost(path: string, body: any) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const res = await fetch(`${getRuntimeApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function apiPatch(path: string, body?: any) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const res = await fetch(`${getRuntimeApiBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export default function AdminMessagesPage() {
  const { admin } = useAdminStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showResolved, setShowResolved] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const socket = io(`${getRuntimeWsBaseUrl()}/chat`, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;
    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId ? { ...c, lastMessage: msg } : c,
      ));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    socket.on('chat:typing', ({ isTyping }: any) => setOtherTyping(isTyping));
    return () => { socket.disconnect(); };
  }, []);

  const loadConversations = () => {
    const params = new URLSearchParams();
    if (filterType !== 'ALL') params.append('type', filterType);
    params.append('resolved', showResolved ? 'true' : 'false');
    apiGet(`/chat/admin/conversations?${params}`).then((data: any) => {
      setConversations(data?.data ?? (Array.isArray(data) ? data : []));
    });
  };

  useEffect(() => { loadConversations(); }, [filterType, showResolved]);

  useEffect(() => {
    if (!activeConvId) return;
    setLoading(true);
    apiGet(`/chat/conversations/${activeConvId}/messages`).then(data => {
      const msgs = Array.isArray(data) ? data : data?.data ?? data?.data?.data ?? [];
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    socketRef.current?.emit('chat:join', { conversationId: activeConvId });
  }, [activeConvId]);

  const joinAndSend = async () => {
    if (!activeConvId) return;
    await apiPost(`/chat/admin/conversations/${activeConvId}/join`, {}).catch(() => null);
  };

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !activeConvId) return;
    const body = text.trim();
    setText('');
    await joinAndSend();
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:send', { conversationId: activeConvId, body });
    } else {
      await apiPost(`/chat/conversations/${activeConvId}/messages`, { body });
      apiGet(`/chat/conversations/${activeConvId}/messages`).then(data => {
        setMessages(Array.isArray(data) ? data : data?.data ?? []);
      });
    }
  }, [text, activeConvId]);

  const resolveConversation = async (id: string) => {
    await apiPatch(`/chat/admin/conversations/${id}/resolve`);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isResolved: true } : c));
    if (activeConvId === id) setActiveConvId(null);
  };

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    return c.participants?.some(p =>
      `${p.user.firstName} ${p.user.lastName}`.toLowerCase().includes(search.toLowerCase())
    ) || c.subject?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="ALL">All types</option>
            <option value="ADMIN_SUPPORT">Support</option>
            <option value="BUYER_SELLER">Buyer↔Seller</option>
            <option value="BUYER_RIDER">Buyer↔Rider</option>
            <option value="ORDER_GROUP">Order Group</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className={`w-80 shrink-0 border-r border-slate-100 flex flex-col ${activeConvId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…" className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 gap-3">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm text-center">No conversations</p>
              </div>
            ) : filteredConvs.map(conv => {
              const others = (conv.participants ?? []).filter(p => p.role !== 'ADMIN');
              const name = others.slice(0, 2).map(p => p.user.firstName).join(' & ') || 'Unknown';
              return (
                <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition ${activeConvId === conv.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-semibold text-xs shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[conv.type] ?? 'badge-neutral'}`}>
                        {TYPE_LABELS[conv.type] ?? conv.type}
                      </span>
                      {conv.isResolved && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full badge-success font-medium">Resolved</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage?.body ?? 'No messages'}</p>
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
              <p className="text-sm">Select a conversation to monitor or respond</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveConvId(null)} className="lg:hidden text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      {(activeConv?.participants ?? []).filter(p => p.role !== 'ADMIN').map(p => `${p.user.firstName} ${p.user.lastName}`).join(' & ') || 'Conversation'}
                    </p>
                    <p className="text-xs text-slate-400">{TYPE_LABELS[activeConv!.type] ?? activeConv!.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Call buttons for all phone-capable participants */}
                  {(activeConv?.participants ?? []).filter(p => p.user.phone).map(p => (
                    <a key={p.user.id} href={`tel:${p.user.phone}`} title={`Call ${p.user.firstName}`}
                      className="flex items-center gap-1.5 border border-green-300 text-green-600 hover:bg-green-50 text-xs px-2.5 py-1.5 rounded-lg transition">
                      <Phone className="w-3.5 h-3.5" />
                      {p.user.firstName}
                    </a>
                  ))}
                  {!activeConv?.isResolved && (
                    <button onClick={() => resolveConversation(activeConvId)}
                      className="flex items-center gap-1.5 border border-green-500 text-green-600 hover:bg-green-50 text-xs px-3 py-1.5 rounded-lg transition font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Participant info bar */}
              {activeConv && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3 overflow-x-auto shrink-0">
                  {(activeConv.participants ?? []).map(p => (
                    <div key={p.user.id} className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
                      <div className="w-5 h-5 bg-sky-200 rounded-full flex items-center justify-center text-sky-800 font-bold text-xs">
                        {p.user.firstName[0]}
                      </div>
                      <span className="font-medium">{p.user.firstName} {p.user.lastName}</span>
                      <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{p.role}</span>
                      {p.user.phone && (
                        <a href={`tel:${p.user.phone}`} className="text-green-600 hover:underline">{p.user.phone}</a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : messages.map(msg => {
                  const isAdmin = msg.sender?.role === 'ADMIN' || msg.sender?.role === 'SUPER_ADMIN' || msg.sender?.role === 'STAFF';
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
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} gap-2`}>
                      {!isAdmin && (
                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 text-xs font-semibold shrink-0 mt-auto">
                          {msg.sender?.firstName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-sm flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        {!isAdmin && <p className="text-xs text-slate-400 mb-0.5 ml-1">{msg.sender?.firstName} <span className="text-slate-300">({msg.sender?.role})</span></p>}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isAdmin ? 'bg-sky-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-900 rounded-bl-md'}`}>
                          <p className="break-words leading-relaxed">{msg.body}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-100 shrink-0">
                {activeConv?.isResolved ? (
                  <p className="text-center text-sm text-slate-400 py-1.5">This conversation has been resolved.</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="text" value={text} onChange={e => setText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                      placeholder="Reply as admin support…"
                      className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none"
                    />
                    <button onClick={sendMessage} disabled={!text.trim()}
                      className="w-10 h-10 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-40">
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
