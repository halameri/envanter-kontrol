const CACHE = "envanter-kontrol-v4";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon.svg", "vendor/xlsx.full.min.js", "vendor/chart.umd.min.js"];
// Yerel kopyası olmayan kütüphane için CDN yedeği de ilk açılışta önbelleğe alınır
const CDN = ["https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"];

self.addEventListener("install", (e) => {
  // Tek tek eklenir: biri yoksa (ör. vendor henüz yok) diğerleri yine önbelleğe alınır
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all([
      ...CORE.map((u) => c.add(u).catch(() => {})),
      ...CDN.map((u) => fetch(u, { mode: "no-cors" }).then((r) => c.put(u, r)).catch(() => {}))
    ]))
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
