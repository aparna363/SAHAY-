import React, { useEffect, useState } from 'react';
import { Bell, Check, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { fetchUserNotifications, markNotificationReadApi, markAllNotificationsReadApi } from '../services/api';
import type { NotificationItem } from '../services/api';

interface NotificationBellProps {
  onSelectNotification?: (referenceId?: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onSelectNotification }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchUserNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds for live status updates
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await markNotificationReadApi(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const success = await markAllNotificationsReadApi();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-full transition-all active:scale-95 border border-slate-300"
        title="Incident Status Notifications"
      >
        <Bell className="w-5 h-5 text-slate-800" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Window */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[999] overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-[#043e2e] text-white p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black tracking-wide">Citizen Status Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] bg-emerald-800 hover:bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded-lg font-bold transition-all"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                <p className="font-semibold">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Status updates on your reported incidents will appear here.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectNotification && item.reference_id) {
                      onSelectNotification(item.reference_id);
                      setIsOpen(false);
                    }
                  }}
                  className={`p-3.5 text-xs transition-all cursor-pointer hover:bg-emerald-50/50 flex items-start justify-between gap-3 ${
                    !item.is_read ? 'bg-emerald-50/40 border-l-4 border-emerald-600' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`font-black text-slate-900 ${!item.is_read ? 'text-emerald-950' : 'text-slate-700'}`}>
                      {item.title}
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium">{item.message}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {!item.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      title="Mark as read"
                      className="text-slate-400 hover:text-emerald-600 p-1 rounded-full hover:bg-slate-200/50 transition-all shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
