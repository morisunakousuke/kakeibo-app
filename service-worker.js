// ============================
// ✅ 最新反映対応 Service Worker
// ============================

// キャッシュ名にバージョンを付けて管理（更新時はここを変える）
const CACHE_NAME = 'kakeibo-cache-v2';

// キャッシュするファイル一覧
const urlsToCache = [
  '/kakeibo-app/',
  '/kakeibo-app/index.html',
  '/kakeibo-app/css/index.css',
  '/kakeibo-app/js/index.js',
  '/kakeibo-app/js/common.js',
  '/kakeibo-app/manifest.json',
];

// ============================
// 🔹 install: キャッシュ登録 & 即時有効化
// ============================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // ✅ 新バージョンを即座に有効化
});

// ============================
// 🔹 activate: 古いキャッシュ削除 & クライアント更新
// ============================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated new version');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldName) => caches.delete(oldName))
      );
    })
  );
  event.waitUntil(clients.claim()); // ✅ 開いている全タブに即時反映
});

// ============================
// 🔹 fetch: キャッシュ優先 + ネット更新
// ============================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // キャッシュ更新（GETのみ）
          if (event.request.method === 'GET' && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // オフライン時はキャッシュ返却
      return cachedResponse || fetchPromise;
    })
  );
});
