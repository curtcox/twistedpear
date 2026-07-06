#!/usr/bin/env node
/**
 * Phase 4 dev-loop conformance: create template, serve bundle, receive over TCP.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";
import { runCreate } from "../../packages/cli/dist/commands/index.js";
import { startDevServer } from "../../packages/cli/dist/dev/server.js";
import { readFileSync } from "node:fs";

async function main() {
  const workDir = mkdtempSync(join(tmpdir(), "tp-dev-loop-"));
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
      port: 34988,
      manifest: {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities ?? [],
        publisherPublicKey: "dev",
        minHostApi: manifest.minHostApi
      }
    });

    const payload = await new Promise((resolve, reject) => {
      const socket = createConnection({ host: "127.0.0.1", port: 34988 });
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        const newline = buffer.indexOf("\n");
        if (newline >= 0) {
          resolve(JSON.parse(buffer.slice(0, newline)));
          socket.end();
        }
      });
      socket.on("error", reject);
      setTimeout(() => reject(new Error("dev server timeout")), 5_000);
    });

    await server.close();

    if (payload.type !== "dev-bundle" || typeof payload.bundleHex !== "string") {
      throw new Error("unexpected dev payload");
    }

    console.log("dev-loop: create → dev server → bundle push passed");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
