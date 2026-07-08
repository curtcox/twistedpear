#!/usr/bin/env node
/**
 * W4 Playwright: install a signed package from 256t via Hyperdrive-over-relay in browser.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { unpackPackage } from "../../packages/app-registry/dist/index.js";
import {
  casAnnounceAspects,
  encodeCasLocator,
  signCasLocator,
  verify256t
} from "../../packages/cas-256t/dist/index.js";
import {
  attachDhtRelayServer,
  createGatewayBulkFetchHttpHandler,
  createSwarm,
  DriveManager,
  fetchDriveVersionViaHyperswarm
} from "../../packages/bridge-hyper/dist/index.js";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  Reticulum,
  nodeRuntime,
  registerWebSocketServerInterface
} from "../../packages/reticulum-ts/dist/index.js";

const hyperdriveRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(hyperdriveRoot, "../..");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-hyperdrive-browser/build.mjs"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

async function startHyperdrivePublisher(staticRoot) {
  const { PUBLISHER_DATA } = await import("./publisher-data.mjs");
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const identity = Identity.fromBytes(provider, hexToBytes(PUBLISHER_DATA.privateKeyHex));
  if (identity === null) {
    throw new Error("Could not load publisher identity");
  }

  const archive = hexToBytes(PUBLISHER_DATA.archiveHex);
  const verified = unpackPackage(provider, archive, { hostApiVersion: "0.1.0" });
  if (!verify256t(PUBLISHER_DATA.t256, archive, (data) => provider.sha512(data))) {
    throw new Error("publisher archive does not match fixture t256");
  }

  const publisherDir = mkdtempSync(join(tmpdir(), "tp-web-hyperdrive-pub-"));
  const pubSwarm = createSwarm();
  const publisherDrive = new DriveManager({
    storagePath: join(publisherDir, "drives"),
    swarm: pubSwarm
  });
  await publisherDrive.ready();
  const { keyHex } = await publisherDrive.createDrive();
  await publisherDrive.publishVersion(verified.manifest.version, archive, verified.packageHash);

  const publisherNode = Reticulum.create({ provider, runtime, transportEnabled: true });
  publisherNode.start();

  const locator = signCasLocator(identity, {
    t256: PUBLISHER_DATA.t256,
    appId: verified.manifest.name,
    version: verified.manifest.version,
    driveKey: keyHex,
    packageHash: verified.packageHash,
    packageSize: archive.length
  });
  const casDestination = publisherNode.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: casAnnounceAspects(PUBLISHER_DATA.t256)
  });
  await casDestination.announce({ appData: encodeCasLocator(locator) });

  const reannounceTimer = setInterval(() => {
    void casDestination.announce({ appData: encodeCasLocator(locator) }).catch(() => {});
  }, 2_000);

  const bulkFetchHandler = createGatewayBulkFetchHttpHandler(async (driveKeyHex, version) => {
    if (driveKeyHex === keyHex) {
      return publisherDrive.fetchVersion(version);
    }

    return fetchDriveVersionViaHyperswarm({ driveKeyHex, version, timeoutMs: 60_000 });
  });

  const wsServer = await registerWebSocketServerInterface(publisherNode, {
    name: "ws-gateway",
    listenHost: "127.0.0.1",
    listenPort: 0,
    serveHttp: bulkFetchHandler,
    staticRoot
  });

  const httpServer = wsServer.httpServer;
  if (httpServer === null) {
    throw new Error("expected websocket gateway HTTP server");
  }

  const relaySession = attachDhtRelayServer(httpServer, { dht: pubSwarm.swarm.dht });

  const wsPort = wsServer.address?.port;
  if (wsPort === undefined) {
    throw new Error("expected websocket gateway to be listening");
  }

  return {
    wsUrl: `ws://127.0.0.1:${wsPort}`,
    pageUrl: `http://127.0.0.1:${wsPort}/page.html`,
    appId: verified.manifest.name,
    driveKey: keyHex,
    async stop() {
      clearInterval(reannounceTimer);
      await relaySession.close();
      await wsServer.close();
      await publisherDrive.close();
      await pubSwarm.destroy();
      await publisherNode.stop();
      rmSync(publisherDir, { recursive: true, force: true });
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
      await page.waitForFunction(() => globalThis.__WEB_HYPERDRIVE__?.status === "done", undefined, {
        timeout: 120_000
      });
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_HYPERDRIVE__ ?? null);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; snapshot=${JSON.stringify(snapshot)}`
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_HYPERDRIVE__);
    if (result?.status !== "done") {
      throw new Error(`web hyperdrive spike incomplete: ${JSON.stringify(result)}`);
    }

    return result;
  } finally {
    await browser.close();
  }
}

let gateway = null;

try {
  runBuild();
  gateway = await startHyperdrivePublisher(hyperdriveRoot);
  const pageUrl = `${gateway.pageUrl}?ws=${encodeURIComponent(gateway.wsUrl)}`;
  const result = await runPlaywright(pageUrl);
  console.log(
    `web-hyperdrive-browser: ${JSON.stringify({
      appId: result.appId,
      version: result.version,
      fetchPath: result.fetchPath
    })}`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-hyperdrive-browser: failed — ${message}`);
  process.exit(1);
} finally {
  if (gateway !== null) {
    await gateway.stop().catch(() => {});
  }
}

console.log("web-hyperdrive-browser: passed");
