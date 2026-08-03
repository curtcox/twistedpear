#!/usr/bin/env node
// @ts-nocheck
/**
 * W4: DHT relay smoke — gateway relay accepts a WebSocket client and supports Hyperswarm.
 */

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DHT from "@hyperswarm/dht-relay";
import WsStream from "@hyperswarm/dht-relay/ws";
import Hyperswarm from "hyperswarm";
import WebSocket from "ws";
import { attachDhtRelayServer, createGatewayBulkFetchHttpHandler } from "../../packages/bridge-hyper/dist/index.js";

const hyperRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(hyperRoot, "../..");

function runBuild() {
  const build = spawnSync("npm", ["run", "build", "--workspace=@twistedpear/bridge-hyper"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

let relaySession = null;
let httpServer = null;

try {
  runBuild();

  const fixtureArchive = new TextEncoder().encode("gateway-bulk-fetch-fixture");
  const bulkFetchHandler = createGatewayBulkFetchHttpHandler(async () => fixtureArchive);

  httpServer = createServer((request, response) => {
    void bulkFetchHandler(request, response).then(() => {
      if (!response.headersSent) {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("dht-relay");
      }
    });
  });
  relaySession = attachDhtRelayServer(httpServer);

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const address = httpServer.address();
  if (address === null || typeof address === "string") {
    throw new Error("Failed to determine relay server port");
  }

  const relayUrl = `ws://127.0.0.1:${address.port}/dht-relay`;
  const socket = await new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("relay websocket connect timeout"));
    }, 10_000);
    ws.once("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once("error", () => {
      clearTimeout(timer);
      reject(new Error("relay websocket failed"));
    });
  });

  const dht = new DHT(new WsStream(true, socket));
  const swarm = new Hyperswarm({ dht });
  await swarm.destroy();
  await dht.destroy();
  socket.close();

  console.log(`web-hyperdrive: relay client connected (${relayUrl})`);

  const bulkResponse = await fetch(
    `http://127.0.0.1:${address.port}/bulk-fetch?driveKey=${"aa".repeat(32)}&version=0.1.0`
  );
  if (!bulkResponse.ok) {
    throw new Error(`gateway bulk fetch failed (${bulkResponse.status})`);
  }

  const bulkArchive = new Uint8Array(await bulkResponse.arrayBuffer());
  if (bulkArchive.length !== fixtureArchive.length) {
    throw new Error("gateway bulk fetch archive length mismatch");
  }

  console.log(`web-hyperdrive: gateway bulk fetch returned ${bulkArchive.length} bytes`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`web-hyperdrive: failed — ${message}`);
  process.exit(1);
} finally {
  if (relaySession !== null) {
    await relaySession.close().catch(() => {});
  }

  if (httpServer !== null) {
    await new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
  }
}

console.log("web-hyperdrive: passed");
