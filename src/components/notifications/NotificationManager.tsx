'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { DutyNotification } from '@/types';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationSound,
  triggerSystemNotification,
  getStoredDutyNotifications,
  markAllNotificationsAsRead,
  clearAllDutyNotifications,
  subscribeToDutyNotifications,
  broadcastDutyNotification,
} from '@/lib/notifications';
import { formatTimeIST, formatDateIST } from '@/lib/timezone';
import {
  Bell,
  Play,
  Square,
  Car,
  CheckCircle2,
  Clock,
  X,
  Smartphone,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';

interface ToastItem extends DutyNotification {
  toastId: string;
}

/**
 * Toast Container for In-App Live Popups
 */
export const NotificationToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const addToast = useCallback((notification: DutyNotification) => {
    const toastId = `${notification.id}-${Date.now()}`;
    setToasts((prev) => [
      { ...notification, toastId },
      ...prev.slice(0, 4), // max 5 simultaneous toasts
    ]);

    // Auto dismiss after 7 seconds
    setTimeout(() => {
      removeToast(toastId);
    }, 7000);
  }, [removeToast]);

  useEffect(() => {
    const unsubscribe = subscribeToDutyNotifications((notification) => {
      // Play audio chime
      playNotificationSound();

      // Trigger system / phone push notification
      triggerSystemNotification(notification);

      // Show in-app slide-in toast
      addToast(notification);
    });

    return () => {
      unsubscribe();
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isStarted = toast.type === 'DUTY_STARTED';
        return (
          <div
            key={toast.toastId}
            className={`pointer-events-auto rounded-2xl p-4 text-white shadow-2xl backdrop-blur-md border transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
              isStarted
                ? 'bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 border-emerald-500/40 shadow-emerald-900/30'
                : 'bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 border-rose-500/40 shadow-rose-900/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isStarted ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'
                  }`}
                >
                  {isStarted ? <Play className="w-5 h-5 fill-current" /> : <Square className="w-4 h-4 fill-current" />}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-sm tracking-tight text-white">
                      {toast.driver_name} {isStarted ? 'started session' : 'ended session'}
                    </span>
                  </div>

                  <p className="text-xs text-white/90 font-medium">
                    {isStarted ? (
                      <span>
                        Vehicle: <strong className="font-mono">{toast.vehicle_reg || 'Assigned Fleet'}</strong> &bull; Started at{' '}
                        {formatTimeIST(toast.timestamp)} (IST)
                      </span>
                    ) : (
                      <span>
                        Shift completed &bull; Duration:{' '}
                        <strong className="font-mono">{toast.duration_text || 'Completed'}</strong> &bull;{' '}
                        {formatTimeIST(toast.timestamp)} (IST)
                      </span>
                    )}
                  </p>

                  <div className="pt-1 flex items-center gap-3">
                    <Link
                      href="/admin/reports"
                      onClick={() => removeToast(toast.toastId)}
                      className="text-[11px] font-bold text-white underline underline-offset-2 hover:text-white/80"
                    >
                      View in Reports &rarr;
                    </Link>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.toastId)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Notification Bell icon with Unread Counter & Dropdown Drawer
 */
export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DutyNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const reloadNotifications = useCallback(() => {
    setNotifications(getStoredDutyNotifications());
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    reloadNotifications();

    const handleUpdate = () => reloadNotifications();
    window.addEventListener('fleet-notifications-updated', handleUpdate);

    // Also reload when new duty event arrives
    const unsubscribe = subscribeToDutyNotifications(() => {
      reloadNotifications();
    });

    return () => {
      window.removeEventListener('fleet-notifications-updated', handleUpdate);
      unsubscribe();
    };
  }, [reloadNotifications]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && unreadCount > 0) {
      // Mark as read when opened
      setTimeout(() => {
        markAllNotificationsAsRead();
      }, 1000);
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      playNotificationSound();
      triggerSystemNotification({
        id: `test-${Date.now()}`,
        type: 'DUTY_STARTED',
        driver_id: 'test',
        driver_name: 'FleetPro Test Alert',
        vehicle_reg: 'VERIFIED',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleSendTestAlert = async () => {
    playNotificationSound();
    const testNotification: DutyNotification = {
      id: `test-session-${Date.now()}`,
      type: 'DUTY_STARTED',
      driver_id: 'test-driver-id',
      driver_name: 'Rajesh Sharma',
      driver_username: 'rajesh.s',
      vehicle_reg: 'MH 02 EE 9012',
      session_id: 'sample-session',
      timestamp: new Date().toISOString(),
      notes: 'Test shift simulation',
    };
    await broadcastDutyNotification(testNotification);
  };

  const handleClearAll = () => {
    clearAllDutyNotifications();
    setNotifications([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        title="Driver Shift & Session Notifications"
        aria-label="Driver Shift Notifications"
        className={`relative p-2 rounded-xl border transition-all ${
          isOpen
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white font-mono text-[9px] font-black items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>Driver Session Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-300">Live alerts when drivers start or end duty</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Phone / Device Push Permission Banner */}
          {permission !== 'granted' ? (
            <div className="p-3 bg-amber-50 border-b border-amber-200/80 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 flex-1">
                <p className="font-bold">Enable Phone Push Alerts</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Receive lock-screen and banner notifications on your phone whenever a driver starts or ends a shift.
                </p>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                >
                  Enable Device Notifications
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px]">Phone &amp; browser alerts enabled</span>
              </div>
              <button
                type="button"
                onClick={handleSendTestAlert}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline"
              >
                Send Test Alert
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-700">No shift activity logged yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When a driver clicks &ldquo;Start Duty&rdquo; or &ldquo;End Duty&rdquo;, a live notification will appear here.
                </p>
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Simulate Driver Session</span>
                </button>
              </div>
            ) : (
              notifications.map((item) => {
                const isStarted = item.type === 'DUTY_STARTED';
                return (
                  <div
                    key={item.id}
                    className={`p-3 sm:p-3.5 transition-colors ${
                      !item.read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isStarted ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isStarted ? <Play className="w-3.5 h-3.5 fill-current" /> : <Square className="w-3 h-3 fill-current" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {item.driver_name} {isStarted ? 'started session' : 'ended session'}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {formatTimeIST(item.timestamp)}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                          {item.vehicle_reg && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                              <Car className="w-2.5 h-2.5 text-slate-400" />
                              {item.vehicle_reg}
                            </span>
                          )}
                          {item.duration_text && (
                            <span className="font-bold text-slate-800">
                              Duration: {item.duration_text}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-slate-400 truncate italic max-w-[140px]">
                              ({item.notes})
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 mt-1">
                          {formatDateIST(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>

              <Link
                href="/admin/reports"
                onClick={() => setIsOpen(false)}
                className="text-blue-600 hover:text-blue-800 font-bold"
              >
                Open Working Hours &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
