import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../src/node-host.js";
import { createFilePropagationPersistence } from "../src/propagation-persistence.js";
import { PropagationServer, DEFAULT_PROPAGATION_QUOTAS } from "@twistedpear/lxmf-ts";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
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

describe("host-core websocket gateway", () => {
  it("starts a WebSocket gateway and reports the listen port", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-host-ws-"));
    try {
      const session = await createNodeHost({
        config: defaultHostConfig({
          dataDir,
          roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            websocket: { enabled: true, listenHost: "127.0.0.1", listenPort: 0 },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        })
      });

      const status = session.getStatus();
      expect(status.websocketGatewayPort).toBeGreaterThan(0);
      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("host-core propagation persistence", () => {
  it("writes propagation store to disk and reloads it", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-prop-persist-"));
    try {
      const storePath = join(dataDir, "propagation", "store.json");
      const provider = new NodeCryptoProvider();
      const persistence = createFilePropagationPersistence(storePath);
      const first = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, { persistence });
      const payload = new Uint8Array(32);
      payload[0] = 7;
      first.storePropagationData(payload);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const restarted = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, { persistence });
      expect(restarted.stats.messageCount).toBe(1);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
