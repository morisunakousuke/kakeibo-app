// ============================
// ✅ 本番用 Service Worker（インストール再有効化＋cloneエラー対策）
// ============================

const CACHE_NAME = 'kakeibo-cache-v4'; // ← バージョン更新で強制更新

const urlsToCache = [
  '/kakeibo-app/',
  '/kakeibo-app/index.html',
  '/kakeibo-app/mobile.html',
  '/kakeibo-app/index.css',
  '/kakeibo-app/mobile.css',
  '/kakeibo-app/index.js',
  '/kakeibo-app/mobile.js',
  '/kakeibo-app/common.js',
  '/kakeibo-app/manifest.json',
  '/kakeibo-app/icons/icon-192.png',
  '/kakeibo-app/icons/icon-512.png',
];

// ============================
// install: キャッシュ登録 & 即時有効化
// ============================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // ✅ 新バージョンを即時適用
});

// ============================
// activate: 古いキャッシュ削除 & クライアント更新
// ============================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated new version');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldName) => caches.delete(oldName))
      )
    )
  );
  event.waitUntil(clients.claim());
});

// ============================
// fetch: キャッシュ優先 + ネット更新
// ============================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});
