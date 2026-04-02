'use client';

import { useEffect } from 'react';
import { useOfflineStore } from '@/store/offlineStore';

export function PWAListener() {
  const { isOffline, setOfflineStatus, setCachedUrls } = useOfflineStore();

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
             console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch((error) => {
             console.error('ServiceWorker registration failed: ', error);
          });

        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CACHED_URLS') {
            setCachedUrls(event.data.urls);
          }
        });

        // Periodically ask the SW for cached URLs
        const requestCachedUrls = () => {
           if (navigator.serviceWorker.controller) {
             navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHED_URLS' });
           }
        };

        requestCachedUrls();
        const intervalId = setInterval(requestCachedUrls, 10000); // Check every 10 seconds

        return () => clearInterval(intervalId);
      });
    }

    // Set initial network status
    setOfflineStatus(!navigator.onLine);

    // Listen for network status changes
    const handleOnline = () => setOfflineStatus(false);
    const handleOffline = () => setOfflineStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineStatus, setCachedUrls]);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] flex justify-center pt-2 pointer-events-none transition-all duration-300">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 text-white px-6 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-2 pointer-events-auto">
         <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
         <span className="text-sm font-medium tracking-wide">Offline Mode</span>
      </div>
    </div>
  );
}
