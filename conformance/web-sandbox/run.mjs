#!/usr/bin/env node
/**
 * W-S2 Playwright: opaque-origin iframe worker sandbox isolation + busy-loop killability.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const sandboxRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(sandboxRoot, "../..");
const measuredPath = join(sandboxRoot, "measured-web.json");
const record = process.env.WEB_SANDBOX_RECORD === "1";

function runBuild() {
  const build = spawnSync("node", ["conformance/web-sandbox/build.mjs"], {
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
    page.on("console", (message) => {
      console.log(`browser:${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      console.error(`browser:pageerror: ${error.message}`);
    });
    await page.goto(pageUrl, { waitUntil: "load", timeout: 30_000 });

    try {
      await page.waitForFunction(() => globalThis.__WEB_SANDBOX__?.status === "done", undefined, {
        timeout: 30_000
      });
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_SANDBOX__ ?? null);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; snapshot=${JSON.stringify(snapshot)}`
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_SANDBOX__);
    if (result?.isolation !== "ok" || result?.escape !== "ok" || typeof result?.busyLoopKillMs !== "number") {
      throw new Error(`web sandbox spike incomplete: ${JSON.stringify(result)}`);
    }

    if (result.busyLoopKillMs >= 1_000) {
      throw new Error(`busy-loop kill exceeded 1s (${result.busyLoopKillMs}ms)`);
    }

    const tabAlive = await page.evaluate(() => document.title === "web-sandbox");
    if (!tabAlive) {
      throw new Error("browser tab was not responsive after busy-loop kill");
    }

    return result;
  } finally {
    await browser.close();
  }
}

let staticServer = null;

try {
  runBuild();
  staticServer = await startStaticServer(sandboxRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/`;
  const result = await runPlaywright(pageUrl);

  const summary = {
    measuredAt: new Date().toISOString().slice(0, 10),
    platform: "browser-playwright",
    backend: "web-iframe-worker",
    runtime: "chromium",
    busyLoopKillMs: result.busyLoopKillMs
  };

  if (record) {
    writeFileSync(measuredPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`web-sandbox: recorded ${measuredPath}`);
  } else {
    const baseline = JSON.parse(readFileSync(measuredPath, "utf8"));
    if (typeof baseline.busyLoopKillMs === "number" && baseline.busyLoopKillMs > 0) {
      const ratio = summary.busyLoopKillMs / baseline.busyLoopKillMs;
      if (ratio > 3) {
        throw new Error(
          `web sandbox busy-loop kill regression: ${summary.busyLoopKillMs}ms vs baseline ${baseline.busyLoopKillMs}ms`
        );
      }
    }
  }

  console.log(`web-sandbox: ${JSON.stringify(summary)}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-sandbox: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close();
  }
}

console.log("web-sandbox: passed");
