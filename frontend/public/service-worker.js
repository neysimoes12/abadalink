const CACHE_NAME = 'abadalink-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install & Cache
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Activate & Clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch with cache fallback
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// ========== PUSH NOTIFICATIONS ==========

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};

    const title = data.title || 'AbadáLink';
    const options = {
        body: data.body || 'Você tem uma nova notificação!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            type: data.type
        },
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Check if there is already a window/tab open
                for (let client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
