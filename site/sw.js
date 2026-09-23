/* ============================================================
   عامل خدمة مساحتي — يجعل الموقع يفتح بلا إنترنت ويحدّث نفسه
   غيّر رقم VER عند كل رفع جديد ليُبدَّل المخزون القديم.
   ============================================================ */
const VER = 'masahati-v3.3.1';
const SHELL = VER + '-shell';
const RUNTIME = VER + '-runtime';
const PRECACHE = [
  './', './index.html', './manifest.webmanifest',
  './lib/pdf.min.js', './lib/pdf.worker.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('masahati-') && k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

const sameOrigin = u => u.origin === self.location.origin;
const isFont = u => /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
const isCDN = u => /cdn\.jsdelivr\.net$/.test(u.hostname);
/* نماذج التفريغ يخزّنها الموقع بنفسه في قاعدة بياناته — لا نكرّرها هنا */
const isModel = u => /huggingface\.co$|hf\.co$|cdn-lfs/.test(u.hostname);

async function networkFirst(req, cacheName, fallbackUrl, preload) {
  const c = await caches.open(cacheName);
  try {
    const pre = preload ? await preload : null;
    const res = pre || await fetch(req);
    if (res && res.ok) c.put(req, res.clone());
    return res;
  } catch (e) {
    return (await c.match(req)) || (fallbackUrl ? await c.match(fallbackUrl) : null) || Response.error();
  }
}
async function staleWhileRevalidate(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}
async function cacheFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req); if (hit) return hit;
  try { const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }
  catch (e) { return Response.error(); }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let u; try { u = new URL(req.url); } catch (err) { return; }

  /* الوسيط وتيليجرام ويوتيوب: شبكة فقط */
  if (sameOrigin(u) && /\/api\//.test(u.pathname)) return;
  if (/t\.me$|telegram\.org$|youtube\.com$|youtube-nocookie\.com$|googlevideo\.com$/.test(u.hostname)) return;
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
  if (isModel(u)) return;

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, './index.html', e.preloadResponse));
    return;
  }
  if (sameOrigin(u)) {
    if (u.pathname.endsWith('sw.js')) return;
    e.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }
  if (isFont(u)) { e.respondWith(staleWhileRevalidate(req, RUNTIME)); return; }
  if (isCDN(u)) { e.respondWith(cacheFirst(req, RUNTIME)); return; }
});
