"use strict";

const CACHE_NAME = "soc-hoc-chu-v15-auto-question-fireworks";

const LETTER_CODES = [
  "a", "aw", "aa", "b", "c", "d", "dd", "e", "ee", "g",
  "h", "i", "k", "l", "m", "n", "o", "oo", "ow", "p",
  "q", "r", "s", "t", "u", "uw", "v", "x", "y"
];

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./game.js",
  "./data/alphabet.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

const IMAGE_ASSETS = LETTER_CODES.map((code) => `./images/${code}.webp`);
const QUICK_AUDIO_ASSETS = [
  ...LETTER_CODES.map((code) => `./sounds/choices/${code}.mp3`),
  "./sounds/correct.mp3",
  "./sounds/wrong.mp3"
];

async function cacheFilesIndividually(cache, urls) {
  await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(new Request(url, { cache: "reload" }));
      if (response.ok && response.status === 200) {
        await cache.put(url, response);
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await cacheFilesIndividually(cache, [...IMAGE_ASSETS, ...QUICK_AUDIO_ASSETS]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function rangeResponse(request, cachedResponse) {
  const range = request.headers.get("range");
  if (!range || !cachedResponse) return cachedResponse || fetch(request);

  const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
  if (!match) return cachedResponse;

  const buffer = await cachedResponse.arrayBuffer();
  const size = buffer.byteLength;
  const start = Number(match[1]);
  const end = Math.min(match[2] ? Number(match[2]) : size - 1, size - 1);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const slice = buffer.slice(start, end + 1);
  const headers = new Headers(cachedResponse.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(slice.byteLength));
  headers.set("Accept-Ranges", "bytes");

  return new Response(slice, { status: 206, statusText: "Partial Content", headers });
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  const isQuickAudio = url.pathname.includes("/sounds/choices/") ||
    url.pathname.endsWith("/sounds/correct.mp3") ||
    url.pathname.endsWith("/sounds/wrong.mp3");

  if (isQuickAudio && request.headers.has("range")) {
    event.respondWith(
      caches.match(request.url).then((cached) => rangeResponse(request, cached))
    );
    return;
  }

  if (isQuickAudio || url.pathname.includes("/images/") ||
      url.pathname.endsWith(".css") || url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".json") || url.pathname.includes("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // File học chữ dài: tải khi cần, không làm chậm cài đặt PWA.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
