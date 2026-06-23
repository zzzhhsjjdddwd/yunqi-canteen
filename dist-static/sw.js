/*!
 * 云栖浅食 · 根级 Service Worker
 * 仅作为占位 / 离线占位，不接管任何路由。
 * 真正的 SW 位于 /client/sw.js 和 /admin/sw.js，分别处理各自子路径。
 */
self.addEventListener('install', () => {
  // 立即激活，不等待旧 SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 不接管任何 client
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 透传所有请求，不缓存，不拦截
  return;
});
