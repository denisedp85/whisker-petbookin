import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, X, Send, Search, ChevronDown, Minus } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/* ─── Contact List Panel ─── */
function ContactsPanel({ contacts, conversations, onSelectContact, searchQuery, setSearchQuery, onClose }) {
  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const convoMap = {};
  conversations.forEach(c => {
    if (c.other_user) convoMap[c.other_user.user_id] = c;
  });

  // Sort: conversations with recent messages first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    const ca = convoMap[a.user_id];
    const cb = convoMap[b.user_id];
    if (ca && !cb) return -1;
    if (!ca && cb) return 1;
    if (ca && cb) {
      const ta = new Date(ca.updated_at || 0).getTime();
      const tb = new Date(cb.updated_at || 0).getTime();
      return tb - ta;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="w-[280px] h-[420px] bg-card border border-border rounded-t-xl shadow-2xl flex flex-col overflow-hidden" data-testid="chat-contacts-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#28211E] text-white">
        <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>Chat</span>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors" data-testid="close-contacts-btn">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="bg-transparent text-xs outline-none flex-1 placeholder:text-muted-foreground"
            data-testid="chat-search-input"
          />
        </div>
      </div>
      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No contacts found</p>
        ) : (
          sorted.map(contact => {
            const convo = convoMap[contact.user_id];
            return (
              <button
                key={contact.user_id}
                onClick={() => onSelectContact(contact)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                data-testid={`contact-${contact.user_id}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 overflow-hidden">
                  {contact.picture ? <img src={contact.picture} alt="" className="w-full h-full object-cover" /> : contact.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{contact.name}</p>
                  {convo?.last_message && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {convo.last_message.content?.substring(0, 30)}{convo.last_message.content?.length > 30 ? '...' : ''}
                    </p>
                  )}
                </div>
                {convo?.unread_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {convo.unread_count > 9 ? '9+' : convo.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Individual Chat Window ─── */
function ChatWindow({ conversation, currentUser, API, authHeaders, onClose, onMinimize, isMinimized }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const other = conversation.other_user;
  const convId = conversation.conversation_id;

  const fetchMessages = useCallback(async () => {
    if (!convId) return;
    try {
      const res = await fetch(`${API}/chat/conversations/${convId}/messages`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  }, [API, authHeaders, convId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isMinimized) inputRef.current?.focus();
  }, [isMinimized]);

  const handleSend = async () => {
    const text = newMsg.trim();
    if (!text || sending) return;
    setSending(true);
    setNewMsg('');
    try {
      const res = await fetch(`${API}/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
      }
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  if (isMinimized) {
    return (
      <button
        onClick={onMinimize}
        className="h-10 bg-[#28211E] text-white rounded-t-lg px-4 flex items-center gap-2 hover:bg-[#3a332e] transition-colors shadow-lg min-w-[160px]"
        data-testid={`chat-minimized-${convId}`}
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
          {other?.picture ? <img src={other.picture} alt="" className="w-full h-full object-cover" /> : other?.name?.charAt(0)}
        </div>
        <span className="text-xs font-medium truncate">{other?.name}</span>
      </button>
    );
  }

  return (
    <div className="w-[300px] h-[380px] bg-card border border-border rounded-t-xl shadow-2xl flex flex-col overflow-hidden" data-testid={`chat-window-${convId}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#28211E] text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
            {other?.picture ? <img src={other.picture} alt="" className="w-full h-full object-cover" /> : other?.name?.charAt(0)}
          </div>
          <span className="text-xs font-medium truncate">{other?.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMinimize} className="hover:bg-white/10 p-1 rounded transition-colors" data-testid={`minimize-chat-${convId}`}>
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors" data-testid={`close-chat-${convId}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-[#FAFAF8]">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Start a conversation!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.user_id;
          return (
            <div key={msg.message_id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[200px] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                isMine
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-white border border-border text-foreground rounded-bl-md shadow-sm'
              }`}>
                {msg.content}
                <div className={`text-[9px] mt-0.5 ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {timeAgo(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card flex-shrink-0">
        <input
          ref={inputRef}
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 text-xs bg-muted rounded-full px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30"
          data-testid={`chat-input-${convId}`}
        />
        <button
          onClick={handleSend}
          disabled={!newMsg.trim() || sending}
          className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0"
          data-testid={`chat-send-${convId}`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Chat Widget ─── */
export default function ChatWidget() {
  const { user, API, authHeaders } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/chat/conversations`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {}
  }, [API, authHeaders, user]);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/chat/unread-count`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUnreadTotal(data.unread_count || 0);
      }
    } catch {}
  }, [API, authHeaders, user]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/chat/contacts`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {}
  }, [API, authHeaders, user]);

  useEffect(() => {
    fetchContacts();
    fetchConversations();
    fetchUnread();
    const interval = setInterval(() => {
      fetchConversations();
      fetchUnread();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchContacts, fetchConversations, fetchUnread]);

  const handleSelectContact = async (contact) => {
    // Check if already open
    const existing = openChats.find(c => c.other_user?.user_id === contact.user_id);
    if (existing) {
      setMinimizedChats(prev => { const n = new Set(prev); n.delete(existing.conversation_id); return n; });
      return;
    }

    // Create or get conversation
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: contact.user_id }),
      });
      if (res.ok) {
        const convo = await res.json();
        setOpenChats(prev => {
          const filtered = prev.filter(c => c.conversation_id !== convo.conversation_id);
          return [...filtered, convo].slice(-3); // max 3 windows
        });
        setMinimizedChats(prev => { const n = new Set(prev); n.delete(convo.conversation_id); return n; });
      }
    } catch {}
  };

  const handleCloseChat = (convId) => {
    setOpenChats(prev => prev.filter(c => c.conversation_id !== convId));
    setMinimizedChats(prev => { const n = new Set(prev); n.delete(convId); return n; });
  };

  const handleMinimize = (convId) => {
    setMinimizedChats(prev => {
      const n = new Set(prev);
      if (n.has(convId)) n.delete(convId); else n.add(convId);
      return n;
    });
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 flex items-end gap-2 pr-4" data-testid="chat-widget">
      {/* Open chat windows */}
      {openChats.map((convo) => (
        <ChatWindow
          key={convo.conversation_id}
          conversation={convo}
          currentUser={user}
          API={API}
          authHeaders={authHeaders}
          onClose={() => handleCloseChat(convo.conversation_id)}
          onMinimize={() => handleMinimize(convo.conversation_id)}
          isMinimized={minimizedChats.has(convo.conversation_id)}
        />
      ))}

      {/* Contacts panel */}
      {isOpen && (
        <ContactsPanel
          contacts={contacts}
          conversations={conversations}
          onSelectContact={handleSelectContact}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onClose={() => setIsOpen(false)}
        />
      )}

      {/* Chat toggle button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); fetchContacts(); fetchConversations(); }}
          className="relative mb-0 h-10 bg-[#28211E] text-white rounded-t-lg px-4 flex items-center gap-2 hover:bg-[#3a332e] transition-colors shadow-lg"
          data-testid="chat-toggle-btn"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">Chat</span>
          {unreadTotal > 0 && (
            <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
