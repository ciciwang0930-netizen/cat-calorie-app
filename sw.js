const CACHE = 'neko-kcal-v57';
const ASSETS = ['./index.html', './manifest.json', './icon-180.png', './icon-512.png', './avatar.png', './tab-home.png', './tab-foods.png', './icons/cat.png', './icons/fish.png', './icons/can.png', './icons/bowl.png', './icons/paw.png', './icons/ribbon.png', './icons/lollipop.png', './icons/pouch.png', './icons/strip.png', './icons/scale.png', './icons/calendar.png', './'];
const REQUIRED_ASSETS = ASSETS.filter(asset=>asset!=='./');

self.addEventListener('install', e => {
  e.waitUntil((async()=>{
    const cache = await caches.open(CACHE);
    // 原子更新：页面和全部图标都下载成功后才激活，避免出现半套资源。
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),20000);
    try{
      const required = await Promise.all(REQUIRED_ASSETS.map(async asset=>{
        const response = await fetch(asset,{cache:'no-store',signal:controller.signal});
        if(!response.ok) throw new Error('Required asset download failed: '+asset);
        return [asset,response];
      }));
      for(const [asset,response] of required) await cache.put(asset,response);
    }finally{ clearTimeout(timer); }
    await self.skipWaiting();
  })());
});
self.addEventListener('message',e=>{
  if(e.data?.type==='GET_VERSION') e.ports[0]?.postMessage({version:CACHE.replace('neko-kcal-','')});
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('neko-kcal-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// 页面/HTML 走网络优先（保证更新及时），静态资源走缓存优先（离线可用）
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 显式检查更新和 SW 版本请求不得回落到旧缓存。
  if(req.cache==='no-store' || url.pathname.endsWith('/sw.js')){
    e.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }
  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHtml) {
    e.respondWith(
      fetch(req,{cache:'no-store'}).then(resp => {
        if(!resp.ok) throw new Error('Page unavailable');
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
