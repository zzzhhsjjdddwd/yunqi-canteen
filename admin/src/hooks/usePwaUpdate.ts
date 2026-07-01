import { useEffect, useState } from 'react';

export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);

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

      let controllerchangeTimer: number | null = null;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (controllerchangeTimer) window.clearTimeout(controllerchangeTimer);
        controllerchangeTimer = window.setTimeout(() => {
          window.location.reload();
        }, 300);
      });

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
        if (controllerchangeTimer) window.clearTimeout(controllerchangeTimer);
      };
    }
  }, []);

  return { needRefresh };
}
