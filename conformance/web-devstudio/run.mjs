#!/usr/bin/env node
/**
 * W3 Playwright: DevStudio workspace + package/sign/publish in browser through WS gateway.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  NodeCryptoProvider,
  Reticulum,
  nodeRuntime,
  registerWebSocketServerInterface
} from "../../packages/reticulum-ts/dist/index.js";

const devstudioRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(devstudioRoot, "../..");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-devstudio/build.mjs"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

async function startGateway() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const gatewayNode = Reticulum.create({ provider, runtime, transportEnabled: true });
  gatewayNode.start();

  const wsServer = await registerWebSocketServerInterface(gatewayNode, {
    name: "ws-gateway",
    listenHost: "127.0.0.1",
    listenPort: 0
  });

  const wsPort = wsServer.address?.port;
  if (wsPort === undefined) {
    throw new Error("expected websocket gateway to be listening");
  }

  return {
    wsUrl: `ws://127.0.0.1:${wsPort}`,
    async stop() {
      await wsServer.close();
      await gatewayNode.stop();
    }
  };
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
      await page.waitForFunction(() => globalThis.__WEB_DEVSTUDIO__?.status === "done", undefined, {
        timeout: 120_000
      });
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_DEVSTUDIO__ ?? null);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; snapshot=${JSON.stringify(snapshot)}`
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_DEVSTUDIO__);
    if (result?.status !== "done") {
      throw new Error(`web devstudio spike incomplete: ${JSON.stringify(result)}`);
    }

    return result;
  } finally {
    await browser.close();
  }
}

let staticServer = null;
let gateway = null;

try {
  runBuild();
  gateway = await startGateway();
  staticServer = await startStaticServer(devstudioRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/?ws=${encodeURIComponent(gateway.wsUrl)}`;
  const result = await runPlaywright(pageUrl);
  console.log(`web-devstudio: ${JSON.stringify({ steps: result.steps, packagedT256: result.packagedT256?.slice(0, 16) })}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-devstudio: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close().catch(() => {});
  }

  if (gateway !== null) {
    await gateway.stop().catch(() => {});
  }
}

console.log("web-devstudio: passed");
