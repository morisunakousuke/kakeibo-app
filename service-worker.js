// ============================
// ✅ 最新反映対応 Service Worker（cloneエラー対策版）
// ============================

const CACHE_NAME = 'kakeibo-cache-v3';

const urlsToCache = [
  '/kakeibo-app/',
  '/kakeibo-app/index.html',
  '/kakeibo-app/css/index.css',
  '/kakeibo-app/js/index.js',
  '/kakeibo-app/js/common.js',
  '/kakeibo-app/manifest.json',
];

// ============================
// install: キャッシュ登録 & 即時有効化
// ============================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // ✅ 新バージョンを即座に有効化
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
  // POSTやPUTなどはキャッシュしない
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ネットワークから取得
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone(); // ✅ cloneはここで安全に実施
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // オフライン時はキャッシュを返す

      // キャッシュがあれば即返す、なければネットワーク
      return cachedResponse || fetchPromise;
    })
  );
});
