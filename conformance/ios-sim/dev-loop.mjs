#!/usr/bin/env node
/**
 * iOS worklet dev-loop slice (Phase 5 M1): tp dev hot reload via dev channel + worklet host.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";
import { pathToFileURL } from "node:url";
import { runCreate } from "../../packages/cli/dist/commands/index.js";
import { startDevServer } from "../../packages/cli/dist/dev/server.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";
import { createWorkletMiniappHost } from "../../apps/harness-mobile/worklet/miniapp-host.mjs";
import { createDevChannelClient } from "../../packages/worklet-core/src/dev-channel.mjs";

const BUDGET_MS = 5_000;

class MemoryStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

function readDevPayload(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline >= 0) {
        socket.off("data", onData);
        resolve(JSON.parse(buffer.slice(0, newline)));
      }
    };

    socket.on("data", onData);
    socket.on("error", reject);
    setTimeout(() => reject(new Error("dev server timeout")), BUDGET_MS);
  });
}

export async function runIosDevLoop() {
  const started = Date.now();
  const workDir = mkdtempSync(join(tmpdir(), "tp-ios-dev-loop-"));
  const beeDir = mkdtempSync(join(tmpdir(), "tp-ios-dev-bee-"));
  const outbound = [];
  const kvStore = new MemoryStore();
  const provider = new NodeCryptoProvider();

  const miniappHost = createWorkletMiniappHost({
    provider,
    kvStore,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: beeDir,
    send: (message) => outbound.push(message),
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({ autoPeers: 0, onlineInterfaces: 0, preferredInterface: null })
  });

  try {
    const code = await runCreate({ cwd: workDir, args: ["hello"] });
    if (code !== 0) {
      throw new Error("tp create failed");
    }

    const appDir = join(workDir, "hello-miniapp");
    const manifest = JSON.parse(readFileSync(join(appDir, "app.manifest.json"), "utf8"));
    const server = await startDevServer({
      appDir,
      host: "127.0.0.1",
      port: 34989,
      manifest: {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities ?? [],
        publisherPublicKey: "dev",
        minHostApi: manifest.minHostApi
      }
    });

    const socket = createConnection({ host: "127.0.0.1", port: 34989 });
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });

    const first = await readDevPayload(socket);
    if (first.type !== "dev-bundle" || typeof first.bundleHex !== "string") {
      throw new Error("unexpected initial dev payload");
    }

    miniappHost.setDeveloperMode(true);
    await miniappHost.devSideLoad(first.manifest ?? manifest, Buffer.from(first.bundleHex, "hex"));
    const initialRuntime = outbound.findLast((message) => message.type === "miniapp-runtime");
    if (initialRuntime?.runtime?.devBadge !== true) {
      throw new Error("dev side-load did not set DEV badge");
    }

    const bundlePath = join(appDir, "bundle.js");
    writeFileSync(bundlePath, `${readFileSync(bundlePath, "utf8")}\n// hot reload marker\n`);

    const second = await readDevPayload(socket);
    socket.end();
    await server.close();

    if (second.type !== "dev-bundle" || second.bundleHex === first.bundleHex) {
      throw new Error("hot reload did not push an updated bundle");
    }

    await miniappHost.devSideLoad(second.manifest ?? manifest, Buffer.from(second.bundleHex, "hex"));

    const blocked = createDevChannelClient({
      isDeveloperMode: () => false,
      onBundle: async () => {}
    });
    try {
      await blocked.connect("127.0.0.1", 34989);
      throw new Error("dev channel connected while developer mode was disabled");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Developer mode is disabled")) {
        throw error;
      }
    }

    const elapsedMs = Date.now() - started;
    if (elapsedMs > BUDGET_MS) {
      throw new Error(`dev-loop exceeded ${BUDGET_MS}ms budget (${elapsedMs}ms)`);
    }

    console.log(`[ios-sim/dev-loop] create → dev server → side-load → hot reload passed in ${elapsedMs}ms`);
  } finally {
    await miniappHost.stop().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    rmSync(workDir, { recursive: true, force: true });
    rmSync(beeDir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIosDevLoop().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
