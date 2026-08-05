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
import { FreenetClientContractBackend } from "@twistedpear/bridge-freenet";

describe("node host MiniappHost wiring", () => {
  it("exposes InterfaceManager, freenetBackend, and DeviceManager on MiniappHost", async () => {
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
            rnode: { enabled: false },
            // URL alone wires freenet:contract; enabled would open the HDLC iface.
            freenet: {
              enabled: false,
              url: "ws://127.0.0.1:50509/v1/contract/command"
            }
          }
        })
      });

      expect(session.freenetBackend).toBeInstanceOf(FreenetClientContractBackend);

      const store = new MemoryKvStoreBackend();
      const host = new MiniappHost({
        backend: { name: "unused", async spawn() { throw new Error("not used"); } },
        grantStore: new GrantStore(store),
        kvBackend: store,
        relayService: session.interfaceManager,
        freenetBackend: {
          async get(keyHex) {
            return { keyHex, stateHex: "aa" };
          },
          async put() {
            return { keyHex: "bb" };
          },
          async update() {}
        },
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

      await host.setGrants("freenet-app", "publisher", ["freenet:contract"], ["freenet:contract"]);
      const freenetGet = await host.dispatchRaw(
        {
          id: "fn",
          namespace: "freenet",
          method: "get",
          payload: { keyHex: "ab".repeat(32) }
        },
        {
          name: "freenet-app",
          version: "1",
          entry: "bundle.js",
          publisherPublicKey: "publisher",
          capabilities: ["freenet:contract"]
        },
        ["freenet:contract"]
      );
      expect(freenetGet.ok).toBe(true);
      expect(freenetGet.result).toEqual({ keyHex: "ab".repeat(32), stateHex: "aa" });

      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it("leaves freenetBackend null when Freenet URL is unset", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-cli-wiring-off-"));
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
            rnode: { enabled: false },
            freenet: { enabled: false }
          }
        })
      });
      expect(session.freenetBackend).toBeNull();
      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
