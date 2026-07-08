#!/usr/bin/env node
/**
 * W4 Playwright: web host mini-app launch/stop soak in the browser tab.
 * Set SOAK_DURATION_MS for longer nightly runs (default 15 s).
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const soakRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(soakRoot, "../..");
const SOAK_DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? "15000");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-soak/build.mjs"], {
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
  const relativePath = pathname === "/" ? "page.html" : pathname.replace(/^\/+/, "");
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
    default:
      return "application/octet-stream";
  }
}

async function runPlaywright(pageUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: "load", timeout: 60_000 });
    await page.waitForFunction(() => globalThis.__WEB_SOAK__?.status === "done", undefined, {
      timeout: Math.max(SOAK_DURATION_MS + 60_000, 120_000)
    });

    const result = await page.evaluate(() => globalThis.__WEB_SOAK__);
    if (result?.status !== "done") {
      throw new Error(`web soak incomplete: ${JSON.stringify(result)}`);
    }

    if ((result.cycles ?? 0) < 1) {
      throw new Error(`web soak completed zero cycles: ${JSON.stringify(result)}`);
    }

    return result;
  } finally {
    await browser.close();
  }
}

let staticServer = null;

try {
  runBuild();
  staticServer = await startStaticServer(soakRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/?duration=${SOAK_DURATION_MS}`;
  const result = await runPlaywright(pageUrl);
  console.log(
    `web-soak: ${result.cycles} launch cycles in ${result.elapsedMs}ms (${result.interfaceFlaps} interface flaps)`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-soak: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close().catch(() => {});
  }
}

console.log("web-soak: passed");
