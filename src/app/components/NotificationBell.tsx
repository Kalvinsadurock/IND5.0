import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, ShieldAlert, Clock, X } from '@/shared/ui/icons';
import { supabase } from '@/shared/api/supabase';

interface AlertNotification {
  id: string | number;
  type: 'downtime' | 'defect' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications (downtime logs and failed QA checks)
  const fetchNotifications = async () => {
    try {
      const list: AlertNotification[] = [];

      // 1. Fetch recent downtime logs
      const { data: downtimes } = await supabase
        .from('downtime_events')
        .select('id, downtime_reasons(name), machines(name), started_at')
        .order('started_at', { ascending: false })
        .limit(3);

      if (downtimes) {
        downtimes.forEach((d: any) => {
          list.push({
            id: `downtime-${d.id}`,
            type: 'downtime',
            title: 'Machinery Breakdown Alert',
            description: `${d.machines?.name || 'Machine'} went down: ${d.downtime_reasons?.name || 'Unknown Reason'}`,
            time: new Date(d.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
          });
        });
      }

      // 2. Fetch failed QA checks from Express API
      const res = await fetch('/api/quality/defects');
      if (res.ok) {
        const defects = await res.json();
        defects.slice(0, 3).forEach((def: any) => {
          list.push({
            id: `defect-${def.id}`,
            type: 'defect',
            title: 'QA Inspection Defect',
            description: `Part ${def.partNumber} failed parameter check: ${def.checkpointName}`,
            time: new Date(def.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
          });
        });
      }

      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up Supabase real-time listener for new downtime logs
    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'downtime_events' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string | number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 relative transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-800 animate-pulse" />
        )}
      </button>

      {/* Dropdown Pane */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-slate-850 px-4 py-3 border-b border-slate-750 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Alerts Board</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-850">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-xs">
                All plants running smoothly. No new alerts.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 relative group transition-colors hover:bg-slate-850/50 ${
                    !notif.read ? 'bg-slate-950/20' : ''
                  }`}
                >
                  <div className="flex gap-2">
                    {notif.type === 'downtime' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-505 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-505 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 pr-4">
                      <p className={`text-xs font-bold text-slate-200 ${!notif.read ? 'text-white' : ''}`}>
                        {notif.title}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-normal">{notif.description}</p>
                      <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {notif.time}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeNotification(notif.id)}
                    className="absolute top-2 right-2 text-slate-600 hover:text-slate-450 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
