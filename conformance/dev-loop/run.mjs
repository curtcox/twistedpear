#!/usr/bin/env node
/**
 * Phase 4 dev-loop conformance: create template, serve bundle, receive over TCP, hot reload.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";
import { runCreate } from "../../packages/cli/dist/commands/index.js";
import { startDevServer } from "../../packages/cli/dist/dev/server.js";

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
    setTimeout(() => reject(new Error("dev server timeout")), 5_000);
  });
}

import { createDevChannelClient } from "../../packages/worklet-core/src/dev-channel.mjs";

async function main() {
  const workDir = mkdtempSync(join(tmpdir(), "tp-dev-loop-"));
  try {
    const code = await runCreate({ cwd: workDir, args: ["hello"] });
    if (code !== 0) {
      throw new Error("tp create failed");
    }

    const appDir = join(workDir, "hello-miniapp");
    const manifest = JSON.parse(
      readFileSync(join(appDir, "app.manifest.json"), "utf8"),
    );
    const server = await startDevServer({
      appDir,
      host: "127.0.0.1",
      port: 34988,
      manifest: {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities ?? [],
        publisherPublicKey: "dev",
        minHostApi: manifest.minHostApi,
      },
    });

    const socket = createConnection({ host: "127.0.0.1", port: 34988 });
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });

    const first = await readDevPayload(socket);
    if (first.type !== "dev-bundle" || typeof first.bundleHex !== "string") {
      throw new Error("unexpected initial dev payload");
    }

    const bundlePath = join(appDir, "bundle.js");
    const edited = `${readFileSync(bundlePath, "utf8")}\n// hot reload marker\n`;
    writeFileSync(bundlePath, edited);

    const second = await readDevPayload(socket);
    socket.end();
    await server.close();

    if (second.type !== "dev-bundle" || second.bundleHex === first.bundleHex) {
      throw new Error("hot reload did not push an updated bundle");
    }

    console.log(
      "dev-loop: create → dev server → bundle push → hot reload passed",
    );

    const blocked = createDevChannelClient({
      isDeveloperMode: () => false,
      onBundle: async () => {},
    });
    try {
      await blocked.connect("127.0.0.1", 34988);
      throw new Error(
        "dev channel connected while developer mode was disabled",
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("Developer mode is disabled")
      ) {
        throw error;
      }
    }

    console.log(
      "dev-loop: dev channel refuses connections when developer mode is off",
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
