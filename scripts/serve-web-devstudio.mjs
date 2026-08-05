#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NodeCryptoProvider,
  Reticulum,
  nodeRuntime,
  registerWebSocketServerInterface,
} from "../packages/reticulum-ts/dist/index.js";
import { openBrowser } from "./open-browser.mjs";
import { startStaticServer } from "./static-server.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const devstudioRoot = join(repoRoot, "conformance/web-devstudio");
const port = Number(process.env.TP_DEVSTUDIO_PORT ?? "9483");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-devstudio/build.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

async function startGateway() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const gatewayNode = Reticulum.create({
    provider,
    runtime,
    transportEnabled: true,
  });
  gatewayNode.start();

  const wsServer = await registerWebSocketServerInterface(gatewayNode, {
    name: "ws-gateway",
    listenHost: "127.0.0.1",
    listenPort: 0,
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
    },
  };
}

let staticServer = null;
let gateway = null;

async function shutdown() {
  if (staticServer !== null) {
    await staticServer.close().catch(() => {});
    staticServer = null;
  }

  if (gateway !== null) {
    await gateway.stop().catch(() => {});
    gateway = null;
  }

  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

runBuild();
gateway = await startGateway();
staticServer = await startStaticServer(devstudioRoot, {
  host: "127.0.0.1",
  port,
});
const pageUrl = `${staticServer.url}?ws=${encodeURIComponent(gateway.wsUrl)}`;

console.log(`DevStudio (web) ready at ${pageUrl}`);
console.log(`WebSocket gateway: ${gateway.wsUrl}`);
console.log("Press Ctrl+C to stop.");

openBrowser(pageUrl);

await new Promise(() => {});
