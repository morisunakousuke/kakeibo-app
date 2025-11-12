const CACHE_NAME = 'kakeibo-cache-v1';
const urlsToCache = [
  '/kakeibo-app/',
  '/kakeibo-app/index.html',
  '/kakeibo-app/css/index.css',
  '/kakeibo-app/js/index.js',
  '/kakeibo-app/js/common.js',
  '/kakeibo-app/manifest.json'
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