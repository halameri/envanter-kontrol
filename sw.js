const CACHE = "envanter-kontrol-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon.svg", "vendor/xlsx.full.min.js", "vendor/chart.umd.min.js"];

self.addEventListener("install", (e) => {
  // Tek tek eklenir: biri yoksa (ör. vendor henüz yok) diğerleri yine önbelleğe alınır
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önbellek önce, arkadan yenile. CDN yedek scriptleri de ilk çevrimiçi açılışta önbelleğe girer.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((res) => {
        if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      const res = await net;
      if (res) return res;
      if (e.request.mode === "navigate") return (await cache.match("index.html")) || Response.error();
      return Response.error();
    })
  );
});
