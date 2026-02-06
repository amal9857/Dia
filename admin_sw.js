const CACHE_NAME = 'dia-admin-v2';
const urlsToCache = [
    './admin.html',
    './style.css',
    './store.js',
    './images/logo.jpg',
    './admin_manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Update immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

// BACKGROUND SYNC (Wakes up SW when network returns)
self.addEventListener('sync', event => {
    if (event.tag === 'check-orders') {
        event.waitUntil(checkNewOrders());
    }
});

// PERIODIC BACKGROUND SYNC (Wakes up SW periodically - Requires PWA Install)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'poll-orders') {
        event.waitUntil(checkNewOrders());
    }
});

// Function to check orders and notify
async function checkNewOrders() {
    // Since LocalStorage is not accessible in SW, we usually need IndexedDB or network.
    // In this static demo, SW can't read the main page's localStorage easily.
    // We will simulate a "Keep Alive" notification instead.

    const clients = await self.clients.matchAll();

    // If no window is open, show a notification to bring user back
    if (clients.length === 0) {
        self.registration.showNotification("DIA Admin: Service Active", {
            body: "Tap to open and check for new payments.",
            icon: 'images/logo.jpg',
            tag: 'background-keep-alive'
        });
    }
}
