'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, X, Send, Phone, ChevronLeft, MoreVertical, Image as ImageIcon, Video } from 'lucide-react';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

// Same origin by default: the web gateway proxies /socket.io to the API.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

interface Participant { id: string; firstName: string; lastName: string; avatar?: string; role: string; phone?: string; }
interface Message { id: string; body: string; type: string; senderId: string; sender: Participant; createdAt: string; mediaUrl?: string; conversationId?: string; }
interface Conversation { id: string; type: string; subject?: string; lastMessageAt?: string; unreadCount: number; lastMessage: Message | null; otherParticipants: Participant[]; isResolved: boolean; }

export function ChatWidget() {
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Init WebSocket
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket = io(`${WS_URL}/chat`, {
      transports: ['polling', 'websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? { ...c, lastMessage: msg, unreadCount: activeConvId === msg.conversationId ? 0 : c.unreadCount + 1 }
          : c,
      ));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    socket.on('chat:typing', ({ isTyping }: { isTyping: boolean }) => setOtherTyping(isTyping));

    return () => { socket.disconnect(); };
  }, [isAuthenticated]);

  // Load conversations on open
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    chatApi.getConversations().then((r: any) => {
      const convs = r.data ?? [];
      setConversations(convs);
      setUnreadTotal(convs.reduce((s: number, c: Conversation) => s + c.unreadCount, 0));
    }).catch(() => null);
  }, [open, isAuthenticated]);

  // Load messages when entering a conversation
  useEffect(() => {
    if (!activeConvId) return;
    chatApi.getMessages(activeConvId).then((r: any) => {
      setMessages(r.data?.data ?? r.data ?? []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }).catch(() => null);
    socketRef.current?.emit('chat:join', { conversationId: activeConvId });
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
  }, [activeConvId]);

  // Fetch unread on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    chatApi.getUnreadCount().then((r: any) => setUnreadTotal(r.data?.unread ?? 0)).catch(() => null);
  }, [isAuthenticated]);

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !activeConvId) return;
    const body = text.trim();
    setText('');
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:send', { conversationId: activeConvId, body });
    } else {
      await chatApi.sendMessage(activeConvId, body);
      chatApi.getMessages(activeConvId).then((r: any) => setMessages(r.data?.data ?? r.data ?? []));
    }
  }, [text, activeConvId]);

  const handleTyping = (value: string) => {
    setText(value);
    if (!activeConvId || !socketRef.current) return;
    if (!typing) { setTyping(true); socketRef.current.emit('chat:typing', { conversationId: activeConvId, isTyping: true }); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit('chat:typing', { conversationId: activeConvId, isTyping: false });
    }, 2000);
  };

  const requestCall = (callType: 'voice' | 'video') => {
    if (!activeConvId) return;
    socketRef.current?.emit('chat:call_request', { conversationId: activeConvId, callType });
  };

  if (!isAuthenticated) return null;

  const otherParticipants = activeConv?.otherParticipants ?? [];
  const callPhone = otherParticipants[0]?.phone;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-sky-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {activeConvId && (
                <button onClick={() => { setActiveConvId(null); setMessages([]); }} className="hover:opacity-80 mr-1">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <p className="font-semibold text-sm">
                  {activeConvId
                    ? otherParticipants.map(p => p.firstName).join(', ') || 'Support'
                    : 'Messages'}
                </p>
                {activeConvId && otherTyping && (
                  <p className="text-xs text-sky-200 animate-pulse">typing…</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeConvId && callPhone && (
                <a
                  href={`tel:${callPhone}`}
                  className="hover:opacity-80 p-1.5 rounded-lg bg-sky-500/40"
                  title={`Call ${callPhone}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {activeConvId && (
                <button
                  onClick={() => requestCall('video')}
                  className="hover:opacity-80 p-1.5 rounded-lg bg-sky-500/40"
                  title="Request video call"
                >
                  <Video className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="hover:opacity-80"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Conversation list */}
          {!activeConvId && (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-6">
                  <MessageCircle className="w-10 h-10 opacity-40" />
                  <p className="text-sm text-center">No messages yet.<br />Start a chat from a product or order page.</p>
                </div>
              ) : conversations.map(conv => {
                const other = conv.otherParticipants[0];
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition text-left"
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-semibold text-sm overflow-hidden">
                        {other?.avatar
                          ? <Image src={other.avatar} alt="" width={40} height={40} className="w-full h-full object-cover" />
                          : (other?.firstName?.[0] ?? '?').toUpperCase()
                        }
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {other ? `${other.firstName} ${other.lastName}` : 'Support'}
                        <span className="ml-1 text-xs font-normal text-slate-400">({other?.role ?? ''})</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">{conv.lastMessage?.body ?? 'No messages yet'}</p>
                    </div>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Message thread */}
          {activeConvId && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 flex flex-col">
              {messages.map(msg => {
                const isMe = msg.senderId === (user as any)?.id;
                if (msg.type === 'CALL_REQUEST') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />{msg.body}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-sky-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-900 rounded-bl-md'}`}>
                      {!isMe && <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.sender?.firstName}</p>}
                      {msg.mediaUrl && (
                        <img src={msg.mediaUrl} alt="media" className="mb-1 rounded max-w-full max-h-40 object-cover" />
                      )}
                      <p className="break-words">{msg.body}</p>
                      <p className={`text-xs mt-0.5 ${isMe ? 'text-sky-200' : 'text-slate-400'} text-right`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {otherTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Message input */}
          {activeConvId && (
            <div className="px-3 py-3 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3">
                <input
                  type="text"
                  value={text}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Type a message…"
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim()}
                  className="text-sky-600 hover:text-sky-700 disabled:opacity-40 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
