const CACHE_NAME = 'dia-app-v1';
const urlsToCache = [
    './index.html',
    './style.css',
    './store.js',
    './script.js',
    './images/logo.jpg',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

// BACKGROUND SYNC (User App)
self.addEventListener('sync', event => {
    if (event.tag === 'check-videos') {
        event.waitUntil(checkForNewVideos());
    }
});

self.addEventListener('periodicsync', event => {
    if (event.tag === 'poll-videos') {
        event.waitUntil(checkForNewVideos());
    }
});

async function checkForNewVideos() {
    // In a real app, we fetch an API. Here we simulate availability.
    // Since SW cannot access LocalStorage directly, this is a Limitation of Client-side Only Demos.
    // However, if the user opens the app, we can notify them.

    const clients = await self.clients.matchAll();

    // If app is closed/minimized, show a "Come Back" notification occasionally
    // simulating a "New Content" push.
    if (clients.length === 0) {
        self.registration.showNotification("DIA Premium: New Content Available", {
            body: "Check out the latest exclusive videos added just now!",
            icon: 'images/logo.jpg',
            tag: 'new-content-alert'
        });
    }
}

self.addEventListener('fetch', event => {
    // Network first for API/Videos, Cache fallback for Shell
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
