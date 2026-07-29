"use strict";

const CACHE_NAME = "so-hoc-chu-v3";

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

const IMAGE_ASSETS = LETTER_CODES.map(
  (code) => `./images/${code}.webp`
);

const AUDIO_ASSETS = [
  ...LETTER_CODES.map((code) => `./sounds/${code}.mp3`),
  "./sounds/correct.mp3",
  "./sounds/wrong.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Tài nguyên giao diện và hình ảnh phải được lưu đầy đủ.
      await cache.addAll([...CORE_ASSETS, ...IMAGE_ASSETS]);

      // Audio được tải riêng để phản hồi HTTP 206 không làm hỏng toàn bộ cài đặt.
      const audioResults = await Promise.allSettled(
        AUDIO_ASSETS.map(async (url) => {
          const response = await fetch(
            new Request(url, { cache: "reload" })
          );

          if (response.status !== 200) {
            console.warn(`Bỏ qua cache audio ${url}: HTTP ${response.status}`);
            return;
          }

          await cache.put(url, response);
        })
      );

      audioResults.forEach((result) => {
        if (result.status === "rejected") {
          console.warn("Không thể cache một file âm thanh:", result.reason);
        }
      });

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );

      await self.clients.claim();
    })()
  );
});

async function handleRangeRequest(request) {
  const cachedResponse = await caches.match(request.url);

  if (!cachedResponse) {
    return fetch(request);
  }

  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    return cachedResponse;
  }

  const rangeMatch = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader);

  if (!rangeMatch) {
    return cachedResponse;
  }

  const fullBuffer = await cachedResponse.arrayBuffer();
  const fileSize = fullBuffer.byteLength;
  const start = Number(rangeMatch[1]);
  const requestedEnd = rangeMatch[2]
    ? Number(rangeMatch[2])
    : fileSize - 1;
  const end = Math.min(requestedEnd, fileSize - 1);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start > end ||
    start >= fileSize
  ) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${fileSize}`
      }
    });
  }

  const slicedBuffer = fullBuffer.slice(start, end + 1);
  const headers = new Headers(cachedResponse.headers);

  headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  headers.set("Content-Length", String(slicedBuffer.byteLength));
  headers.set("Accept-Ranges", "bytes");

  return new Response(slicedBuffer, {
    status: 206,
    statusText: "Partial Content",
    headers
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  const isAudio = url.pathname.includes("/sounds/");
  const hasRange = request.headers.has("range");

  if (isAudio && hasRange) {
    event.respondWith(handleRangeRequest(request));
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);

        if (networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        if (request.mode === "navigate") {
          const fallback = await caches.match("./index.html");

          if (fallback) {
            return fallback;
          }
        }

        throw error;
      }
    })()
  );
});
