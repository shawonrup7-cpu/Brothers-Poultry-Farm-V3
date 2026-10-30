/* ব্রাদার্স পোল্ট্রি ফার্ম — অফলাইন সার্ভিস ওয়ার্কার
   নতুন সংস্করণ দিলে শুধু VERSION বদলান। */
const VERSION = "v12";
const CORE = "bpf-core-" + VERSION;
const RUNTIME = "bpf-runtime-" + VERSION;
const PRECACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./logo.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CORE).then((c) =>
      // একটি ফাইল না থাকলেও বাকিগুলো ক্যাশ হবে
      Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CORE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google লগইন/ড্রাইভ API সবসময় সরাসরি নেটওয়ার্কে (ক্যাশ নয়)
  if (url.hostname === "accounts.google.com" || (url.hostname.endsWith("googleapis.com") && url.hostname !== "fonts.googleapis.com")) return;
  if (url.hostname === "wa.me") return;

  // পেজ খোলা: নেটওয়ার্ক আগে (সর্বশেষ সংস্করণ), না পেলে ক্যাশ থেকে — অফলাইনেও চলবে
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CORE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  // অ্যাপের কোড (js/html/json): নেটওয়ার্ক আগে — নতুন সংস্করণ সঙ্গে সঙ্গে আসে; নেট না থাকলে ক্যাশ থেকে
  if (sameOrigin && /\.(js|json|html)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CORE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ফন্ট ও ছবি: ক্যাশ আগে, পেছনে আপডেট
  if (sameOrigin || isFont) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) {
              const copy = res.clone();
              caches.open(sameOrigin ? CORE : RUNTIME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
});

// নোটিফিকেশনে ট্যাপ করলে অ্যাপ খুলবে
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./index.html");
    })
  );
});
