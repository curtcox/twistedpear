// @ts-nocheck
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import { runCreate } from "../src/commands/index.js";
import { startDevServer } from "../src/dev/server.js";
import { createConnection } from "node:net";

describe("tp create/dev", () => {
  it("scaffolds the hello template with the current host API", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-create-"));
    try {
      await expect(runCreate({ cwd, args: ["hello"] })).resolves.toBe(0);
      const manifest = JSON.parse(await readFile(join(cwd, "hello-miniapp", "app.manifest.json"), "utf8")) as {
        minHostApi: string;
        capabilities: string[];
      };
      expect(manifest.minHostApi).toBe(HOST_API_VERSION);
      expect(manifest.capabilities).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("serves a dev bundle over the local TCP channel", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-dev-"));
    try {
      await runCreate({ cwd, args: ["chat-min"] });
      const manifest = JSON.parse(await readFile(join(cwd, "chat-min", "app.manifest.json"), "utf8")) as {
        name: string;
        version: string;
        entry: string;
        capabilities: string[];
        minHostApi: string;
      };

      const server = await startDevServer({
        appDir: join(cwd, "chat-min"),
        host: "127.0.0.1",
        port: 0,
        manifest: {
          name: manifest.name,
          version: manifest.version,
          entry: manifest.entry,
          capabilities: manifest.capabilities,
          publisherPublicKey: "dev",
          minHostApi: manifest.minHostApi
        }
      });

      const [host, portString] = server.url.split(":");
      const port = Number(portString);
      const payload = await new Promise<{ type: string; bundleHex: string }>((resolve, reject) => {
        const socket = createConnection({ host, port });
        let buffer = "";
        socket.on("data", (chunk) => {
          buffer += chunk.toString();
          const newline = buffer.indexOf("\n");
          if (newline >= 0) {
            resolve(JSON.parse(buffer.slice(0, newline)) as { type: string; bundleHex: string });
            socket.end();
          }
        });
        socket.on("error", reject);
      });

      await server.close();
      expect(payload.type).toBe("dev-bundle");
      expect(payload.bundleHex.length).toBeGreaterThan(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
