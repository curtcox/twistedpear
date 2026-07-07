#!/usr/bin/env node
/**
 * W-S3 Playwright: react-native-web widget renderer golden trees + event wiring.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rendererRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(rendererRoot, "../..");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-widget-renderer/build.mjs"], {
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
      await page.waitForFunction(() => globalThis.__WEB_WIDGET__?.status === "done", undefined, {
        timeout: 30_000
      });
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_WIDGET__ ?? null);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; snapshot=${JSON.stringify(snapshot)}`
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_WIDGET__);
    if (result?.hello !== "ok" || result?.chat !== "ok" || result?.event !== "ok") {
      throw new Error(`widget renderer incomplete: ${JSON.stringify(result)}`);
    }

    await page.getByText("Hello", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("Tap me", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("Chat", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("Send hello").waitFor({ state: "visible" });
    await page.getByPlaceholder("Peer app id").waitFor({ state: "visible" });
    await page.getByText("No messages yet").waitFor({ state: "visible" });
  } finally {
    await browser.close();
  }
}

let staticServer = null;

try {
  runBuild();
  staticServer = await startStaticServer(rendererRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/`;
  await runPlaywright(pageUrl);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-widget-renderer: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close();
  }
}

console.log("web-widget-renderer: passed");
