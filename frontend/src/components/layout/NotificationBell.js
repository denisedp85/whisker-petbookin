import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, MessageCircle, ShoppingBag, Trophy, Check, X } from 'lucide-react';

const ICON_MAP = {
  message: MessageCircle,
  inquiry: ShoppingBag,
  game: Trophy,
  checkin: Check,
};

export default function NotificationBell() {
  const { user, API, authHeaders } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/notifications?limit=20`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unread_count || 0);
      }
    } catch {}
  }, [API, authHeaders, user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notifications/mark-read`, { method: 'POST', headers: authHeaders() });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-foreground/70 hover:text-foreground hover:bg-muted/80 w-full"
        data-testid="notification-bell"
      >
        <Bell className="w-[18px] h-[18px]" />
        <span>Notifications</span>
        {unread > 0 && (
          <span className="ml-auto w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 max-h-[400px] overflow-hidden flex flex-col" data-testid="notification-panel">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-primary font-medium hover:underline" data-testid="mark-all-read-btn">
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_MAP[n.icon] || ICON_MAP[n.type] || Bell;
                return (
                  <div
                    key={n.notification_id}
                    className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                      n.read ? 'bg-background' : 'bg-primary/5'
                    }`}
                    data-testid={`notif-${n.notification_id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-muted' : 'bg-primary/10'}`}>
                      <Icon className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${n.read ? 'text-muted-foreground' : 'font-medium'}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{n.body}</p>}
                      <p className="text-[9px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
