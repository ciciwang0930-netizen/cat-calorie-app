const CACHE = 'neko-kcal-v39';
const ASSETS = ['./index.html', './manifest.json', './icon-180.png', './icon-512.png', './avatar.png', './tab-home.png', './tab-foods.png', './icons/cat.png', './icons/fish.png', './icons/can.png', './icons/bowl.png', './icons/paw.png', './icons/ribbon.png', './icons/lollipop.png', './icons/pouch.png', './icons/strip.png', './icons/scale.png', './icons/calendar.png', './'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// 页面/HTML 走网络优先（保证更新及时），静态资源走缓存优先（离线可用）
self.addEventListener('fetch', e => {
  const req = e.request;
  const isHtml = req.mode === 'navigate' || req.url.endsWith('.html') || req.url.endsWith('/');
  if (isHtml) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
  } else {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req))
    );
  }
});
