#!/usr/bin/env node
// @ts-nocheck
/**
 * W4 Playwright: PWA app-shell loads offline after service worker install,
 * and the in-app Install CTA accepts a deferred beforeinstallprompt.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const pwaRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(pwaRoot, "../..");
const webHostDir = join(repoRoot, "dist/web-host");

function runBuild() {
  const build = spawnSync("npm", ["run", "build:web-host"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

function startStaticServer(root) {
  const server = createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }

    serveStatic(root, request.url ?? "/", request.method === "HEAD", response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to determine static server port"));
        return;
      }

      resolve({
        port: address.port,
        async close() {
          await new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error === undefined) {
                closeResolve();
              } else {
                closeReject(error);
              }
            });
          });
        }
      });
    });
  });
}

function serveStatic(staticRoot, requestPath, headOnly, response) {
  const pathname = new URL(requestPath, "http://localhost").pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolvedRoot = normalize(staticRoot);
  const resolvedPath = normalize(join(resolvedRoot, relativePath));

  if (!resolvedPath.startsWith(resolvedRoot + sep) && resolvedPath !== resolvedRoot) {
    response.writeHead(403);
    response.end();
    return;
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.writeHead(200, { "content-type": staticContentType(extname(resolvedPath)) });
  if (headOnly) {
    response.end();
    return;
  }

  createReadStream(resolvedPath).pipe(response);
}

function staticContentType(extension) {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".png":
      return "image/png";
    case ".webmanifest":
      return "application/manifest+json";
    default:
      return "application/octet-stream";
  }
}

async function runPlaywright(pageUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      class FakeBeforeInstallPromptEvent extends Event {
        constructor() {
          super("beforeinstallprompt", { cancelable: true });
          this.userChoice = Promise.resolve({ outcome: "accepted" });
        }

        prompt() {
          return Promise.resolve();
        }
      }

      window.__dispatchFakeInstallPrompt = () => {
        window.dispatchEvent(new FakeBeforeInstallPromptEvent());
      };
    });

    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
      timeout: 60_000
    });

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    if (manifestHref === null || manifestHref.length === 0) {
      throw new Error("expected web app manifest link in index.html");
    }

    await page.waitForSelector('[data-testid="pwa-install"]', { timeout: 60_000 });
    await page.evaluate(() => {
      window.__dispatchFakeInstallPrompt?.();
    });
    await page.waitForFunction(
      () => {
        const status = document.querySelector('[data-testid="pwa-install-status"]');
        return status?.textContent?.includes("ready") === true;
      },
      undefined,
      { timeout: 15_000 }
    );

    const installButton = page.getByTestId("pwa-install");
    if (await installButton.isDisabled()) {
      throw new Error("expected Install TwistedPear button to enable after beforeinstallprompt");
    }

    await installButton.click();
    await page.waitForFunction(
      () => {
        const status = document.querySelector('[data-testid="pwa-install-status"]');
        return status?.textContent?.includes("installed") === true;
      },
      undefined,
      { timeout: 15_000 }
    );

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByText("Reticulum leaf peer in the browser").waitFor({ timeout: 30_000 });
    return { manifestHref };
  } finally {
    await browser.close();
  }
}

let staticServer = null;

try {
  runBuild();

  for (const required of [
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    "web-core.worker.js",
    "icon-192.png",
    "icon-512.png"
  ]) {
    if (!existsSync(join(webHostDir, required))) {
      throw new Error(`web-host build missing ${required}`);
    }
  }

  const manifest = JSON.parse(readFileSync(join(webHostDir, "manifest.webmanifest"), "utf8"));
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
    throw new Error("web app manifest missing install icons");
  }

  staticServer = await startStaticServer(webHostDir);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/`;
  const result = await runPlaywright(pageUrl);
  console.log(`web-pwa: offline shell + install prompt (manifest ${result.manifestHref})`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-pwa: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close().catch(() => {});
  }
}

console.log("web-pwa: passed");
