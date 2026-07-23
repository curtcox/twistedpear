import { describe, expect, it } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  DEVICE_CAPABILITY_DEFINITIONS,
  DeviceManager,
  HOST_API_VERSION,
  assertCapabilityAllowed,
  assertDeviceCapabilityAllowed,
  createSimulatedAmbientLightDriver,
  createSimulatedLocationDriver
} from "../src/index.js";

describe("device capabilities", () => {
  it("includes generated device:* ids in the closed set", () => {
    const ids = CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    expect(ids).toContain("device:location");
    expect(ids).toContain("device:location:precise");
    expect(ids).toContain("device:ambient-light");
    expect(ids).toContain("device:stream");
    expect(ids).toContain("device:remote");
    expect(DEVICE_CAPABILITY_DEFINITIONS.length).toBeGreaterThan(10);
  });

  it("lets precise grants satisfy the default location capability", () => {
    expect(() =>
      assertDeviceCapabilityAllowed({
        capability: "device:location",
        declared: ["device:location:precise"],
        granted: ["device:location:precise"]
      })
    ).not.toThrow();
  });

  it("does not let default grants satisfy precise", () => {
    expect(() =>
      assertDeviceCapabilityAllowed({
        capability: "device:location:precise",
        declared: ["device:location"],
        granted: ["device:location"]
      })
    ).toThrow();
  });

  it("still rejects unknown capabilities", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "device:telepathy",
        declared: ["device:telepathy"],
        granted: ["device:telepathy"]
      })
    ).toThrow(/Unknown capability/);
  });
});

describe("DeviceManager Phase 1", () => {
  it("inventories simulated drivers and reports unsupported otherwise", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedLocationDriver(), createSimulatedAmbientLightDriver(40)],
      now: () => 1_000
    });
    const inventory = await manager.inventory();
    const location = inventory.find((entry) => entry.class === "location");
    const ambient = inventory.find((entry) => entry.class === "ambient-light");
    const camera = inventory.find((entry) => entry.class === "camera");
    expect(location?.availability).toBe("available");
    expect(ambient?.availability).toBe("available");
    expect(camera?.availability).toBe("unsupported");
  });

  it("opens coarse location and ambient-light sessions end-to-end", async () => {
    const manager = new DeviceManager({
      drivers: [
        createSimulatedLocationDriver({ latitude: 37.7749, longitude: -122.4194, accuracyM: 5 }),
        createSimulatedAmbientLightDriver(40)
      ],
      now: () => 5_000
    });

    const location = await manager.open("nav", "pub", ["device:location"], ["device:location"], {
      class: "location",
      purpose: "show neighborhood"
    });
    expect(location.tier).toBe("coarse");
    const fix = await manager.read("nav", location.handle);
    expect(fix.kind).toBe("location");
    if (fix.kind === "location") {
      expect(fix.tier).toBe("coarse");
      expect(fix.accuracyM).toBe(1000);
      expect(fix.latitude).not.toBe(37.7749);
    }

    const light = await manager.open("nav", "pub", ["device:ambient-light"], ["device:ambient-light"], {
      class: "ambient-light",
      purpose: "adapt theme"
    });
    const sample = await manager.read("nav", light.handle);
    expect(sample).toEqual({
      kind: "ambient-light",
      tier: "quantized",
      at: 5_000,
      luxBucket: "dim"
    });

    await manager.close("nav", location.handle);
    await expect(manager.read("nav", location.handle)).rejects.toMatchObject({ code: "DEVICE_SESSION_EXPIRED" });
  });

  it("enforces arbitration locks between sessions", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedLocationDriver()],
      now: () => 1
    });
    await manager.open("a", "pub", ["device:location"], ["device:location"], {
      class: "location",
      purpose: "first"
    });
    await expect(
      manager.open("b", "pub", ["device:location"], ["device:location"], {
        class: "location",
        purpose: "second"
      })
    ).rejects.toMatchObject({ code: "DEVICE_BUSY" });
  });

  it("denies open without grant", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedLocationDriver()],
      now: () => 1
    });
    await expect(
      manager.open("a", "pub", ["device:location"], [], {
        class: "location",
        purpose: "no grant"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });
});

describe("host API version", () => {
  it("bumps to 0.10.0 for device I/O foundation", () => {
    expect(HOST_API_VERSION).toBe("0.10.0");
  });
});
