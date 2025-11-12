// service-worker.js

const CACHE_NAME = 'kakeibo-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './index.js',
  './common.js',
  './manifest.json'
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// リクエスト時にキャッシュ利用
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
