import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Keep the screen awake while `enabled` (web only — the app runs as a PWA on
 * the kitchen iPad, so the Screen Wake Lock API is the right tool; there's no
 * expo-keep-awake dep to cover native). The lock drops when the tab is
 * backgrounded, so we re-request it on visibilitychange.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let lock: any = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // User denied, low battery, or unsupported — silently no-op.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        lock?.release?.();
      } catch {
        /* already released */
      }
    };
  }, [enabled]);
}
