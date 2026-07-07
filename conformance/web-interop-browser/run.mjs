#!/usr/bin/env node
/**
 * W-S1/W1 Playwright: reticulum-ts + lxmf-ts in a real browser tab through a WS gateway.
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
import {
  composeDown,
  interopReady,
  LEAF_ECHO_PORT,
  LXMF_ECHO_PORT,
  tryComposeUp,
  waitForTcp
} from "../scenarios/ts/harness.mjs";

const interopRoot = dirname(fileURLToPath(import.meta.url));

async function isTcpReady(host, port) {
  try {
    const { connect } = await import("node:net");
    await new Promise((resolve, reject) => {
      const socket = connect({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", reject);
      socket.setTimeout(1000);
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureInteropPeers() {
  const startedLeaf = tryComposeUp("leaf-echo");
  const startedLxmf = tryComposeUp("lxmf-echo");

  if (!startedLeaf && !(await isTcpReady("127.0.0.1", LEAF_ECHO_PORT))) {
    throw new Error(`No leaf-echo peer listening on 127.0.0.1:${LEAF_ECHO_PORT}`);
  }

  if (!startedLxmf && !(await isTcpReady("127.0.0.1", LXMF_ECHO_PORT))) {
    throw new Error(`No lxmf-echo peer listening on 127.0.0.1:${LXMF_ECHO_PORT}`);
  }

  await waitForTcp("127.0.0.1", LEAF_ECHO_PORT);
  await waitForTcp("127.0.0.1", LXMF_ECHO_PORT);
  return startedLeaf || startedLxmf;
}

if (!interopReady()) {
  console.log("web-interop-browser: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

function runBuild() {
  const build = spawnSync("node", ["conformance/web-interop-browser/build.mjs"], {
    cwd: join(interopRoot, "../.."),
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

async function startGateway() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const gateway = Reticulum.create({ provider, runtime, transportEnabled: true });
  gateway.start();

  await gateway.addTcpClientInterface({
    name: "python-leaf-echo",
    targetHost: "127.0.0.1",
    targetPort: LEAF_ECHO_PORT
  });
  await gateway.addTcpClientInterface({
    name: "python-lxmf-echo",
    targetHost: "127.0.0.1",
    targetPort: LXMF_ECHO_PORT
  });

  const wsServer = await registerWebSocketServerInterface(gateway, {
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
      await gateway.stop();
    }
  };
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
      await page.waitForFunction(() => globalThis.__WEB_INTEROP__?.status === "done", undefined, {
        timeout: 120_000
      });
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_INTEROP__ ?? null);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; snapshot=${JSON.stringify(snapshot)}`
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_INTEROP__);
    if (result?.webLeafHost !== "ok" || result?.packet !== "ok" || result?.lxmf !== "ok") {
      throw new Error(`browser interop incomplete: ${JSON.stringify(result)}`);
    }
  } finally {
    await browser.close();
  }
}

let startedCompose = false;
let staticServer = null;
let gateway = null;

try {
  startedCompose = await ensureInteropPeers();
  runBuild();

  gateway = await startGateway();
  staticServer = await startStaticServer(interopRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/?ws=${encodeURIComponent(gateway.wsUrl)}`;
  await runPlaywright(pageUrl);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-interop-browser: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close();
  }

  if (gateway !== null) {
    await gateway.stop();
  }

  if (startedCompose) {
    composeDown();
  }
}

console.log("web-interop-browser: passed");
