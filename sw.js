const CACHE = 'neko-kcal-v52';
const ASSETS = ['./index.html', './manifest.json', './icon-180.png', './icon-512.png', './avatar.png', './tab-home.png', './tab-foods.png', './icons/cat.png', './icons/fish.png', './icons/can.png', './icons/bowl.png', './icons/paw.png', './icons/ribbon.png', './icons/lollipop.png', './icons/pouch.png', './icons/strip.png', './icons/scale.png', './icons/calendar.png', './'];

self.addEventListener('install', e => {
  // allSettled：单个资源失败（CDN 抖动/404）不再拖垮整个 SW 安装
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
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
  if (req.method !== 'GET') return;
  const isHtml = req.mode === 'navigate' || req.url.endsWith('.html') || req.url.endsWith('/');
  if (isHtml) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match('./index.html')))
    );
  } else {
    // 缓存优先；未命中回源成功则写回缓存（自愈：预缓存缺失/被系统清理的图标下次从缓存出）
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        if (hit) return hit;
        return fetch(req).then(resp => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return resp;
        });
      })
    );
  }
});
