// Service Worker for Chatrr
// This is a minimal service worker to prevent 404 errors

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let all requests pass through - no caching for now
  event.respondWith(fetch(event.request));
});

