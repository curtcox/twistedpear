#!/usr/bin/env node
/**
 * Phase W4: offline app-shell (manifest + service worker) for `dist/web-host`.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SHELL_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".woff", ".woff2", ".ttf", ".png", ".ico", ".svg", ".webmanifest"]);

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

/**
 * @param {string} outputDir
 */
export function applyPwaShell(outputDir) {
  const shellAssets = collectShellAssets(outputDir);
  if (!shellAssets.includes("/index.html")) {
    throw new Error(`PWA shell expected index.html in ${outputDir}`);
  }

  const manifest = {
    name: "TwistedPear Host",
    short_name: "TwistedPear",
    description: "TwistedPear leaf host in the browser",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a"
  };

  writeFileSync(join(outputDir, "manifest.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);

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
  ];

  if (!indexHtml.includes('rel="manifest"')) {
    if (indexHtml.includes("</head>")) {
      indexHtml = indexHtml.replace("</head>", `    ${injection.join("\n    ")}\n  </head>`);
    } else {
      indexHtml = `${injection.join("\n")}\n${indexHtml}`;
    }
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
  console.log(`PWA shell: manifest + service worker (${shellAssets.length} precached assets)`);
}
