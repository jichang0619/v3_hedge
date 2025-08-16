// v1.0.1 — gh-pages 하위 경로 대응 및 네비게이션 Fallback
const CACHE_NAME = 'v3-hedge-calculator-v1.0.1';
const BASE_PATH = '/v3_hedge';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/calculator.js`,
  `${BASE_PATH}/manifest.json`,
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  // 새 SW가 즉시 대기 해제되어 활성화되도록
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

// Fetch event - serve from cache when offline (BASE_PATH 하위만 처리)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) 동일 출처가 아니면 패스
  if (url.origin !== self.location.origin) {
    return; // 기본 fetch 동작
  }

  // 2) BASE_PATH 하위가 아니면 패스
  if (!url.pathname.startsWith(BASE_PATH)) {
    return; // 기본 fetch 동작
  }

  // 3) navigation 요청이면 오프라인 시 index.html로 fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 온라인 시 네트워크 우선(최신 index.html)
          const networkResp = await fetch(req);
          // 성공 응답만 캐시에 갱신
          if (networkResp && networkResp.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(`${BASE_PATH}/index.html`, networkResp.clone());
          }
          return networkResp;
        } catch (_) {
          // 오프라인 fallback
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match(`${BASE_PATH}/index.html`);
          if (cachedIndex) return cachedIndex;
          // 그래도 없으면 기존 요청에 대한 캐시를 시도
          const cached = await caches.match(req);
          if (cached) return cached;
          // 최후에는 네트워크(실패 시 브라우저 기본 에러)
          return fetch(req);
        }
      })(),
    );
    return;
  }

  // 4) 그 외 요청: 캐시 우선, 없으면 네트워크 후 캐싱
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((resp) => {
        // 유효한 응답만 캐시
        if (!resp || resp.status !== 200 || resp.type !== 'basic') {
          return resp;
        }
        const respToCache = resp.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, respToCache);
        });
        return resp;
      });
    }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 활성화 즉시 모든 클라이언트 제어
      self.clients.claim();

      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        }),
      );
    })(),
  );
});
