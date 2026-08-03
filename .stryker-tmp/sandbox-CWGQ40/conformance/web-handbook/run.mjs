#!/usr/bin/env node
// @ts-nocheck
/**
 * Phase D Playwright: Handbook install + chapters + applets + report export in browser.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const handbookRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(handbookRoot, "../..");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-handbook/build.mjs"], {
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

    await page.goto(pageUrl, { waitUntil: "load", timeout: 60_000 });
    try {
      await page.waitForFunction(() => globalThis.__WEB_HANDBOOK__?.status === "done", undefined, {
        timeout: 300_000
      });
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_HANDBOOK__ ?? null);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; snapshot=${JSON.stringify(snapshot)}`
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_HANDBOOK__);
    if (result?.status !== "done") {
      throw new Error(`web handbook incomplete: ${JSON.stringify(result)}`);
    }

    if (!Array.isArray(result.passedApplets) || result.passedApplets.length === 0) {
      throw new Error(`expected applets to pass: ${JSON.stringify(result)}`);
    }

    if (typeof result.reportId !== "string" || result.reportId.length !== 94) {
      throw new Error(`expected report 256t id: ${JSON.stringify(result.reportId)}`);
    }

    return result;
  } finally {
    await browser.close();
  }
}

let staticServer = null;

try {
  runBuild();
  staticServer = await startStaticServer(handbookRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/`;
  const result = await runPlaywright(pageUrl);
  console.log(
    `web-handbook: ${JSON.stringify({
      chapters: result.chapters,
      applets: result.passedApplets?.length,
      reportId: result.reportId?.slice(0, 12),
      steps: result.steps?.length
    })}`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-handbook: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close().catch(() => {});
  }
}

console.log("web-handbook: passed");
