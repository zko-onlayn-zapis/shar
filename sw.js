/* Миллион шаров v2.1.0 — кэш оболочки; запросы к облачному шлюзу НИКОГДА не кэшируются.
   Новая версия сама докачивает свежие файлы в фоне и ждёт: страница показывает плашку «Доступно обновление». */
const CACHE = 'shar-v2.1.0';
const SHELL = ['./', './index.html', './style.css', './app.js', './admin.js', './config.json', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok ? c.put(u, r) : null).catch(() => null)))));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith('millionsharov-') || k.startsWith('shar-')) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(x => x || caches.match('./index.html'))));
});
