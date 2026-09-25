import { DutyNotification } from '@/types';
import { createClient, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { formatTimeIST } from '@/lib/timezone';

const STORAGE_KEY_NOTIFICATIONS = 'fleet_duty_notifications';

/**
 * Check if the browser or PWA supports Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
}

/**
 * Current notification permission: 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Notifications] Permission request error:', err);
    return 'denied';
  }
}

/**
 * Synthesize a modern, pleasant two-tone audio chime (587Hz -> 880Hz) via Web Audio API.
 * Works natively on mobile and desktop without requiring external MP3 files.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First tone (D5 ~ 587 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Second tone (A5 ~ 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.48);
  } catch (err) {
    // Non-fatal if audio context is blocked
  }
}

/**
 * Trigger native mobile / system push notification (lock screen & banner)
 */
export async function triggerSystemNotification(notification: DutyNotification): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const isStarted = notification.type === 'DUTY_STARTED';
  const title = isStarted
    ? `🚗 ${notification.driver_name} started session`
    : `🏁 ${notification.driver_name} ended session`;

  const timeFormatted = formatTimeIST(notification.timestamp);
  const body = isStarted
    ? `Vehicle: ${notification.vehicle_reg || 'Assigned Fleet'} • Started at ${timeFormatted} (IST)`
    : `Duration: ${notification.duration_text || 'Completed'} • Ended at ${timeFormatted} (IST)`;

  const options: any = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: `duty-${notification.session_id || notification.id}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/admin/reports' },
  };

  // Try Service Worker registration first (standard for mobile PWAs)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (err) {
      console.warn('[Notifications] ServiceWorker showNotification failed:', err);
    }
  }

  // Fallback to Window Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, options);
      return true;
    } catch (err) {
      console.warn('[Notifications] Window Notification fallback failed:', err);
    }
  }

  return false;
}

/**
 * Get stored duty session notifications from localStorage
 */
export function getStoredDutyNotifications(): DutyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save notification locally
 */
export function saveDutyNotification(notification: DutyNotification): DutyNotification[] {
  if (typeof window === 'undefined') return [notification];
  try {
    const existing = getStoredDutyNotifications();
    const updated = [notification, ...existing.filter((n) => n.id !== notification.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    return updated;
  } catch {
    return [notification];
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(): DutyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getStoredDutyNotifications();
    const updated = existing.map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fleet-notifications-updated'));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Clear all duty notifications
 */
export function clearAllDutyNotifications(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    window.dispatchEvent(new CustomEvent('fleet-notifications-updated'));
  } catch {}
}

/**
 * Broadcast duty session event across all devices:
 * 1. Supabase Realtime WebSocket Broadcast (works across internet on admin's phone / desktop)
 * 2. BroadcastChannel (cross-tab sync on same machine)
 * 3. LocalStorage persistence
 * 4. Local CustomEvent
 */
export async function broadcastDutyNotification(notification: DutyNotification): Promise<void> {
  // 1. Save locally
  saveDutyNotification(notification);

  // 2. Dispatch local DOM custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fleet-duty-notification', { detail: notification }));
    window.dispatchEvent(new CustomEvent('fleet-notifications-updated'));
  }

  // 3. BroadcastChannel (for other tabs / windows on same device)
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('fleet_duty_alerts');
      bc.postMessage(notification);
      bc.close();
    }
  } catch (err) {
    console.warn('[Notifications] BroadcastChannel postMessage error:', err);
  }

  // 4. Supabase Realtime broadcast (across the internet to all connected admins)
  if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const channel = supabase.channel('fleet_duty_realtime');
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel
            .send({
              type: 'broadcast',
              event: 'duty_session_change',
              payload: notification,
            })
            .catch((err) => console.warn('[Notifications] send broadcast error:', err))
            .finally(() => {
              setTimeout(() => {
                supabase.removeChannel(channel);
              }, 4000);
            });
        }
      });
    } catch (err) {
      console.warn('[Notifications] Supabase Realtime broadcast error:', err);
    }
  }
}

/**
 * Subscribe to duty session changes across Supabase Realtime, BroadcastChannel, and DOM
 */
export function subscribeToDutyNotifications(
  onNotification: (notification: DutyNotification) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const seenIds = new Set<string>();

  const handleIncoming = (n: DutyNotification) => {
    if (!n || !n.id) return;
    if (seenIds.has(n.id)) return;
    seenIds.add(n.id);
    if (seenIds.size > 200) {
      const oldest = Array.from(seenIds).slice(0, 50);
      oldest.forEach((id) => seenIds.delete(id));
    }
    saveDutyNotification(n);
    onNotification(n);
  };

  // 1. Local DOM CustomEvent listener
  const domListener = (e: Event) => {
    const custom = e as CustomEvent<DutyNotification>;
    if (custom.detail) handleIncoming(custom.detail);
  };
  window.addEventListener('fleet-duty-notification', domListener);

  // 2. BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('fleet_duty_alerts');
      bc.onmessage = (event) => {
        if (event.data) handleIncoming(event.data);
      };
    } catch (err) {
      console.warn('[Notifications] BroadcastChannel listener error:', err);
    }
  }

  // 3. Supabase Realtime broadcast listener
  let supabaseChannel: any = null;
  let supabaseInstance: any = null;
  if (isLiveSupabaseConfigured()) {
    try {
      supabaseInstance = createClient();
      supabaseChannel = supabaseInstance.channel('fleet_duty_realtime');
      supabaseChannel
        .on('broadcast', { event: 'duty_session_change' }, (response: any) => {
          if (response?.payload) {
            handleIncoming(response.payload);
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[Notifications] Supabase Realtime listener error:', err);
    }
  }

  return () => {
    window.removeEventListener('fleet-duty-notification', domListener);
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    if (supabaseChannel && supabaseInstance) {
      try {
        supabaseInstance.removeChannel(supabaseChannel);
      } catch {}
    }
  };
}
