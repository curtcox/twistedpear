import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost, defaultHostConfig } from "@twistedpear/host-core";
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  createSimulatedDeviceManager
} from "@twistedpear/miniapp-runtime";

describe("node host MiniappHost wiring", () => {
  it("exposes InterfaceManager as relayService and simulated DeviceManager on MiniappHost", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-cli-wiring-"));
    try {
      const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
        config: defaultHostConfig({
          dataDir,
          roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
          relay: { mode: "off" },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        })
      });

      const store = new MemoryKvStoreBackend();
      const host = new MiniappHost({
        backend: { name: "unused", async spawn() { throw new Error("not used"); } },
        grantStore: new GrantStore(store),
        kvBackend: store,
        relayService: session.interfaceManager,
        deviceManager: createSimulatedDeviceManager({ now: () => 1_000 })
      });

      const relayManifest = {
        name: "node-relay",
        version: "1",
        entry: "bundle.js",
        publisherPublicKey: "publisher",
        capabilities: ["relay:configure", "relay:read"]
      };
      await host.setGrants("node-relay", "publisher", ["relay:read", "relay:configure"], [
        "relay:read",
        "relay:configure"
      ]);
      const status = await host.dispatchRaw(
        { id: "status", namespace: "relay", method: "status", payload: {} },
        relayManifest,
        ["relay:read"]
      );
      expect(status.ok).toBe(true);
      expect(status.result).toMatchObject({ mode: "off" });

      const setMode = await host.dispatchRaw(
        { id: "mode", namespace: "relay", method: "setMode", payload: { mode: "bridge" } },
        relayManifest,
        ["relay:configure"]
      );
      expect(setMode.ok).toBe(true);
      expect(session.interfaceManager.status().mode).toBe("bridge");

      const inventory = await host.dispatchRaw(
        { id: "inv", namespace: "device", method: "inventory", payload: {} },
        {
          name: "node-device",
          version: "1",
          entry: "bundle.js",
          publisherPublicKey: "publisher",
          capabilities: []
        },
        []
      );
      expect(inventory.ok).toBe(true);
      const entries = inventory.result as Array<{ class: string; availability: string }>;
      expect(entries.find((entry) => entry.class === "location")?.availability).toBe("available");

      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
