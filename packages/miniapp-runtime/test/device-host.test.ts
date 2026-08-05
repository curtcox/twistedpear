import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  createSimulatedDeviceManager
} from "../src/index.js";

describe("MiniappHost device broker path", () => {
  const unusedBackend = { name: "unused", async spawn() { throw new Error("not used"); } };
  const manifest = {
    name: "device-app",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities: ["device:location", "device:ambient-light"]
  };

  it("returns DEVICE_UNCONFIGURED when deviceManager is not injected", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({ backend: unusedBackend, grantStore: new GrantStore(store), kvBackend: store });
    const response = await host.dispatchRaw(
      { id: "1", namespace: "device", method: "inventory", payload: {} },
      manifest,
      []
    );
    expect(response.error?.code).toBe("DEVICE_UNCONFIGURED");
  });

  it("inventories simulated drivers and opens a granted location session", async () => {
    const store = new MemoryKvStoreBackend();
    const deviceManager = createSimulatedDeviceManager({ now: () => 10_000 });
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      deviceManager
    });

    const inventory = await host.dispatchRaw(
      { id: "inv", namespace: "device", method: "inventory", payload: {} },
      manifest,
      []
    );
    expect(inventory.ok).toBe(true);
    const entries = inventory.result as Array<{ class: string; availability: string }>;
    expect(entries.find((entry) => entry.class === "location")?.availability).toBe("available");
    expect(entries.find((entry) => entry.class === "ambient-light")?.availability).toBe("available");

    const denied = await host.dispatchRaw(
      {
        id: "denied",
        namespace: "device",
        method: "open",
        payload: { class: "location", purpose: "Show nearby peers" }
      },
      manifest,
      []
    );
    expect(denied.error?.code).toBe("DEVICE_DENIED");

    await host.setGrants("device-app", "publisher", ["device:location"], ["device:location"]);
    const opened = await host.dispatchRaw(
      {
        id: "open",
        namespace: "device",
        method: "open",
        payload: { class: "location", purpose: "Show nearby peers" }
      },
      { ...manifest, capabilities: ["device:location"] },
      ["device:location"]
    );
    expect(opened.ok).toBe(true);
    const session = opened.result as { handle: string; class: string };
    expect(session.class).toBe("location");

    const sample = await host.dispatchRaw(
      { id: "read", namespace: "device", method: "read", payload: { handle: session.handle } },
      { ...manifest, capabilities: ["device:location"] },
      ["device:location"]
    );
    expect(sample.ok).toBe(true);
    expect(sample.result).toMatchObject({
      kind: "location",
      latitude: expect.any(Number),
      longitude: expect.any(Number)
    });
  });
});
