#!/usr/bin/env node
// @ts-nocheck
/**
 * Phase W4: offline app-shell (manifest + service worker + install icons) for `dist/web-host`.
 */

import { deflateSync } from "node:zlib";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SHELL_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".woff", ".woff2", ".ttf", ".png", ".ico", ".svg", ".webmanifest"]);
const ICON_SIZES = [192, 512];

function collectShellAssets(rootDir) {
  const assets = [];

  function walk(currentDir) {
    for (const entry of readdirSync(currentDir)) {
      const absolutePath = join(currentDir, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      const extension = entry.includes(".") ? entry.slice(entry.lastIndexOf(".")) : "";
      if (!SHELL_EXTENSIONS.has(extension)) {
        continue;
      }

      const urlPath = `/${relative(rootDir, absolutePath).split("\\").join("/")}`;
      if (urlPath.endsWith("sw.js")) {
        continue;
      }

      assets.push(urlPath);
    }
  }

  walk(rootDir);
  return [...new Set(assets)].sort();
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

/**
 * Minimal opaque PNG (solid slate + lighter center disc) — enough for installability criteria.
 * @param {number} size
 */
export function createPwaIconPng(size) {
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  const bg = [15, 23, 42, 255];
  const fg = [56, 189, 248, 255];
  const center = (size - 1) / 2;
  const radius = size * 0.28;

  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const color = dx * dx + dy * dy <= radius * radius ? fg : bg;
      const offset = row + 1 + x * 4;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function writePwaIcons(outputDir) {
  const icons = [];
  for (const size of ICON_SIZES) {
    const filename = `icon-${size}.png`;
    writeFileSync(join(outputDir, filename), createPwaIconPng(size));
    icons.push({
      src: `/${filename}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any"
    });
  }
  return icons;
}

/**
 * @param {string} outputDir
 */
export function applyPwaShell(outputDir) {
  if (!collectShellAssets(outputDir).includes("/index.html")) {
    throw new Error(`PWA shell expected index.html in ${outputDir}`);
  }

  const icons = writePwaIcons(outputDir);

  const manifest = {
    name: "TwistedPear Host",
    short_name: "TwistedPear",
    description: "TwistedPear leaf host in the browser",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons
  };

  writeFileSync(join(outputDir, "manifest.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);

  const shellAssets = collectShellAssets(outputDir);
  const precacheJson = JSON.stringify(shellAssets);
  const serviceWorker = `const PRECACHE = ${precacheJson};
const CACHE_NAME = "twistedpear-web-host-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached !== undefined) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response.ok || response.type === "opaque") {
            return response;
          }

          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
`;

  writeFileSync(join(outputDir, "sw.js"), serviceWorker);

  const indexPath = join(outputDir, "index.html");
  let indexHtml = readFileSync(indexPath, "utf8");
  const injection = [
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<meta name="theme-color" content="#0f172a" />',
    '<link rel="apple-touch-icon" href="/icon-192.png" />'
  ];

  if (!indexHtml.includes('rel="manifest"')) {
    if (indexHtml.includes("</head>")) {
      indexHtml = indexHtml.replace("</head>", `    ${injection.join("\n    ")}\n  </head>`);
    } else {
      indexHtml = `${injection.join("\n")}\n${indexHtml}`;
    }
  } else if (!indexHtml.includes("apple-touch-icon")) {
    indexHtml = indexHtml.replace(
      '<link rel="manifest" href="/manifest.webmanifest" />',
      '<link rel="manifest" href="/manifest.webmanifest" />\n    <link rel="apple-touch-icon" href="/icon-192.png" />'
    );
  }

  const registration = `<script>
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
</script>`;

  if (!indexHtml.includes("serviceWorker.register")) {
    if (indexHtml.includes("</body>")) {
      indexHtml = indexHtml.replace("</body>", `    ${registration}\n  </body>`);
    } else {
      indexHtml = `${indexHtml}\n${registration}\n`;
    }
  }

  writeFileSync(indexPath, indexHtml);
  console.log(`PWA shell: manifest + icons + service worker (${shellAssets.length} precached assets)`);
}
