// ============================
// ✅ 安定版 Service Worker（clone & addAll エラー修正版）
// ============================

const CACHE_NAME = 'kakeibo-cache-v5'; // ← バージョン更新で旧キャッシュ削除
const CACHE_FILES = [
  '/kakeibo-app/',
  '/kakeibo-app/index.html',
  '/kakeibo-app/mobile.html',
  '/kakeibo-app/css/index.css',
  '/kakeibo-app/css/mobile.css',
  '/kakeibo-app/js/index.js',
  '/kakeibo-app/js/mobile.js',
  '/kakeibo-app/js/common.js',
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
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of CACHE_FILES) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          } else {
            console.warn(`[Service Worker] Skip caching (not ok): ${url}`);
          }
        } catch (err) {
          console.warn(`[Service Worker] Failed to cache ${url}:`, err);
        }
      }
      self.skipWaiting(); // ✅ 新SWを即有効化
    })()
  );
});

// ============================
// activate: 古いキャッシュ削除 & クライアント更新
// ============================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated new version');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
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
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const cloned = response.clone(); // ✅ clone はここで安全に
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
