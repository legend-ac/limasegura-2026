import { useState, useEffect, useCallback } from 'react';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'danger';
}

function getSafeNotificationPermission(): NotificationPermission {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
  } catch {
    // Access denied in restricted iframe or sandbox
  }
  return 'default';
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => getSafeNotificationPermission());
  const [isSupported, setIsSupported] = useState(false);
  const [notificationsHistory, setNotificationsHistory] = useState<PushNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setIsSupported(true);
        setPermission(Notification.permission);
      }
    } catch {
      setIsSupported(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function') {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result === 'granted';
      }
    } catch {
      // Permission request blocked by browser policy/iframe
    }
    return false;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        // Do not force resume if autoplay blocked
        audioCtx.close().catch(() => {});
        return;
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);

      setTimeout(() => {
        try {
          audioCtx.close().catch(() => {});
        } catch {}
      }, 500);
    } catch {
      // Audio context might be restricted before gesture
    }
  }, [soundEnabled]);

  const sendPushNotification = useCallback((title: string, body: string, severity: 'info' | 'warning' | 'danger' = 'warning') => {
    const newNotif: PushNotification = {
      id: `notif_${Date.now()}`,
      title,
      body,
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      severity,
    };

    setNotificationsHistory((prev) => [newNotif, ...prev.slice(0, 19)]);
    playNotificationSound();

    // Trigger mobile vibration if available
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        if (severity === 'danger') {
          navigator.vibrate([150, 75, 150]);
        } else {
          navigator.vibrate([100]);
        }
      }
    } catch {
      // vibration unsupported or blocked
    }

    // Native Browser Notification if granted
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'lima-segura-alert',
        });
      }
    } catch {
      // Notifications in iframe can throw SecurityError in some sandbox configs
    }

    return newNotif;
  }, [playNotificationSound]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendPushNotification,
    notificationsHistory,
    soundEnabled,
    setSoundEnabled,
  };
}
