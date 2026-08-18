import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  createSimulatedDeviceManager,
} from "../src/index.js";

describe("ambient device authority", () => {
  const unusedBackend = {
    name: "unused",
    async spawn() {
      throw new Error("not used");
    },
  };

  async function hostWithCameraHeld() {
    const store = new MemoryKvStoreBackend();
    const deviceManager = createSimulatedDeviceManager({
      now: () => 10_000,
      allowUnconfirmedDeviceSessions: true,
    });
    await deviceManager.open(
      "other-app",
      "other-publisher",
      ["device:camera"],
      ["device:camera"],
      { class: "camera", purpose: "record" },
    );
    return new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      deviceManager,
    });
  }

  it("denies device inventory and diagnostics for a zero-capability app", async () => {
    const host = await hostWithCameraHeld();
    const manifest = {
      name: "spy",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities: [] as string[],
    };

    for (const method of ["inventory", "diagnostics"] as const) {
      const response = await host.dispatchRaw(
        { id: method, namespace: "device", method, payload: {} },
        manifest,
        [],
      );
      expect(response.ok, method).toBe(false);
    }
  });

  it("returns inventory with presence but hides lock holders without device grants", async () => {
    const host = await hostWithCameraHeld();
    const manifest = {
      name: "observer",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities: ["presence"],
    };
    await host.setGrants("observer", "publisher", ["presence"], ["presence"]);

    const inventory = await host.dispatchRaw(
      {
        id: "inv",
        namespace: "device",
        method: "inventory",
        capability: "presence",
        payload: {},
      },
      manifest,
      ["presence"],
    );
    expect(inventory.ok).toBe(true);
    expect(
      (inventory.result as Array<{ class: string }>).some(
        (entry) => entry.class === "camera",
      ),
    ).toBe(true);

    const diagnostics = await host.dispatchRaw(
      {
        id: "diag",
        namespace: "device",
        method: "diagnostics",
        capability: "presence",
        payload: {},
      },
      manifest,
      ["presence"],
    );
    expect(diagnostics.ok).toBe(true);
    for (const entry of diagnostics.result as Array<{
      class: string;
      holder?: string;
      reason?: string;
    }>) {
      expect(entry.holder).toBeUndefined();
      expect(entry.reason ?? "").not.toMatch(/^held by /);
    }
  });

  it("returns lock holders when the caller holds a device capability grant", async () => {
    const host = await hostWithCameraHeld();
    const manifest = {
      name: "camera-app",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities: ["presence", "device:camera"],
    };
    await host.setGrants(
      "camera-app",
      "publisher",
      ["presence", "device:camera"],
      ["presence", "device:camera"],
    );

    const diagnostics = await host.dispatchRaw(
      {
        id: "diag",
        namespace: "device",
        method: "diagnostics",
        capability: "presence",
        payload: {},
      },
      manifest,
      ["presence", "device:camera"],
    );
    expect(diagnostics.ok).toBe(true);
    const camera = (
      diagnostics.result as Array<{ class: string; holder?: string }>
    ).find((entry) => entry.class === "camera");
    expect(camera?.holder).toBe("app:other-app");
  });
});
