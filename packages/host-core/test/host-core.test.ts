import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../src/node-host.js";
import { decodeMessages, encodeMessage } from "../src/protocol.js";
import { defaultHostConfig } from "../src/types.js";

describe("host-core protocol", () => {
  it("round-trips newline-delimited JSON", () => {
    const encoded = encodeMessage({ type: "log", line: "hello" });
    const parsed = decodeMessages(encoded);
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0]).toEqual({ type: "log", line: "hello" });
  });
});

describe("host-core config", () => {
  it("defaults desktop roles with transport and seeder on", () => {
    const config = defaultHostConfig();
    expect(config.roles.transport).toBe(true);
    expect(config.roles.seeder).toBe(true);
  });
});

describe("host-core status endpoint", () => {
  it("serves localhost JSON when enabled", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-host-test-"));
    try {
      const session = await createNodeHost({
        config: defaultHostConfig({
          dataDir,
          roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          },
          statusEndpoint: true
        })
      });

      const response = await fetch("http://127.0.0.1:9473/status");
      expect(response.ok).toBe(true);
      const status = (await response.json()) as { running: boolean; transportEnabled: boolean };
      expect(status.running).toBe(true);
      expect(status.transportEnabled).toBe(false);
      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
