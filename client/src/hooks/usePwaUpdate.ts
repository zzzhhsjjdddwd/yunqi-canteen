import { useEffect, useState, useRef } from 'react';

export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      let registration: ServiceWorkerRegistration | null = null;

      const checkUpdate = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          registration = reg || null;
          if (registration) {
            registration.addEventListener('updatefound', () => {
              const newWorker = registration?.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setNeedRefresh(true);
                  }
                });
              }
            });

            if (registration.waiting) {
              setNeedRefresh(true);
            }
          }
        } catch {
          // ignore
        }
      };

      checkUpdate();

      const handleOnline = () => {
        registration?.update();
      };
      window.addEventListener('online', handleOnline);

      const interval = window.setInterval(() => {
        registration?.update();
      }, 10 * 60 * 1000);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.clearInterval(interval);
      };
    }
  }, []);

  const refreshAndUpdate = () => {
    if (isUpdating || refreshAttemptedRef.current) return;
    setIsUpdating(true);
    refreshAttemptedRef.current = true;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }).catch(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return { needRefresh, isUpdating, refreshAndUpdate };
}
