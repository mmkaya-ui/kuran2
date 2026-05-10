const CACHE_NAME = 'quran-v4';
const DYNAMIC_CACHE_NAME = 'quran-app-dynamic-v4';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.png',
    './icon-192.png',
    './icon-512.png'
];

// Install Event - Precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Precaching App Shell');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Handle requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API Requests (api.alquran.cloud)
    // Strategy: Network First, fallback to Cache (or Stale-While-Revalidate)
    if (url.origin === 'https://api.alquran.cloud') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // 2. Audio Files (cdn.islamic.network)
    // Strategy: Cache First, fallback to Network
    if (url.origin === 'https://cdn.islamic.network') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse; // Return cached audio
                }
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 3. Static Assets & App Shell (HTML, CSS, JS)
    // Strategy: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET' && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            }).catch(() => {
                // Return cached response or fallback page if offline
            });

            return cachedResponse || networkFetch;
        })
    );
});
