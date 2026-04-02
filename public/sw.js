const CACHE_NAME = 'sepatifay-static-v1';
const MEDIA_CACHE_NAME = 'sepatifay-media-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest', // Next.js generates this path by default
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MEDIA_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Handle Audio Media requests (Support Range Requests)
  if (url.pathname.startsWith('/uploads/') && event.request.destination === 'audio') {
    event.respondWith(handleMediaRequest(event.request));
    return;
  }

  // 2. Handle API calls (Network Only)
  if (url.pathname.startsWith('/api/')) {
    // Let it fall through to network, no caching for API
    return;
  }

  // 3. Handle Static Assets and Pages (Stale-While-Revalidate or Cache First)
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
           // Don't cache opaque responses or errors for static assets if possible
           if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                 cache.put(event.request, networkResponse.clone());
              });
           }
           return networkResponse;
        }).catch(() => {
           // Network failed, we just return the cached response (if available) handled below
        });

        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Implementation for handling Media requests with Range support
async function handleMediaRequest(request) {
  const cache = await caches.open(MEDIA_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // If it's a range request, we need to construct a 206 Partial Content response
    if (request.headers.has('range')) {
      const rangeHeader = request.headers.get('range');
      const blob = await cachedResponse.blob();
      const bytes = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      const start = Number(bytes[1]);
      const end = bytes[2] ? Number(bytes[2]) : blob.size - 1;
      const chunkSize = end - start + 1;

      const slicedBlob = blob.slice(start, end + 1, blob.type);
      return new Response(slicedBlob, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Type': blob.type,
          'Content-Length': String(chunkSize),
          'Content-Range': \`bytes \${start}-\${end}/\${blob.size}\`,
          'Accept-Ranges': 'bytes'
        }
      });
    }

    // If no range requested but we have it cached, return the whole 200 OK
    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);

    // Only cache if we got a successful 200 OK (don't cache 206 partials directly as full cache!)
    // Wait, browsers often do 206 for audio even initially.
    // To safely cache media, we should fetch it fully once if we want offline support.
    // For now, if we get a 200, we cache it. If we get a 206, we can't easily cache the whole file
    // unless we make a separate background fetch without a Range header.

    // To properly cache media for offline: If a 206 is returned, we should probably fetch the whole
    // thing in the background to store it in cache for later.
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    } else if (networkResponse.status === 206) {
      // Trigger a background fetch for the full file to cache it
      const fullRequest = new Request(request.url, {
        headers: new Headers() // strip Range header
      });
      fetch(fullRequest).then(fullResponse => {
        if(fullResponse.status === 200) {
           cache.put(fullRequest, fullResponse);
        }
      }).catch(err => console.error("Failed to background cache media", err));
    }

    return networkResponse;
  } catch (error) {
    console.error('Media fetch failed', error);
    throw error;
  }
}

// Listen for messages from client to manually cache media or get cached items
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHED_URLS') {
    caches.open(MEDIA_CACHE_NAME).then(cache => {
      cache.keys().then(requests => {
         const urls = requests.map(req => new URL(req.url).pathname);
         event.source.postMessage({ type: 'CACHED_URLS', urls });
      });
    });
  }
});
