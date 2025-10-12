const RUNTIME_CACHE = 'runtime-v3';

// 接收前端要求跳過 waiting 的訊息（適用於 installing/installed 狀態）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const acceptHeader = request.headers.get('accept') || '';
  const isHTMLRequest = request.mode === 'navigate' || acceptHeader.includes('text/html');

  // 不快取 API 請求，避免資料陳舊
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) return;
  } catch {}

  // HTML 採網路優先：用於頁面更新即時
  if (isHTMLRequest) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch (err) {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(request);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 靜態資源採 SWR：先回舊快取，同步背景更新
  const swrDestinations = ['style', 'script', 'image', 'font', 'audio', 'video', 'manifest'];
  if (swrDestinations.includes(request.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => undefined);
        return cached || networkPromise || Response.error();
      })()
    );
    return;
  }

  // 其他請求：網路優先，離線回退到快取
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch (err) {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        return cached || Response.error();
      }
    })()
  );
});

// 處理推送通知
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {
    title: '新通知',
    body: '您有新的通知',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: {}
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Push data parse error:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.jpg',
    badge: data.badge || '/logo.jpg',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.data?.url ? [
      {
        action: 'open',
        title: '查看'
      },
      {
        action: 'close',
        title: '關閉'
      }
    ] : []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 處理通知點擊
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // 打開或聚焦到指定頁面
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // 嘗試聚焦已開啟的視窗
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 開啟新視窗
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


