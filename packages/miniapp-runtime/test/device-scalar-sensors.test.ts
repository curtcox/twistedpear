import { describe, expect, it } from "vitest";
import {
  DEVICE_CAPABILITY_DEFINITIONS,
  DeviceManager,
  createSimulatedScalarDriver,
  validateManifestCapabilities,
} from "../src/index.js";

const SCALAR_CLASSES = [
  {
    classId: "proximity",
    reading: { near: true },
    sample: {
      kind: "proximity",
      tier: "near-far",
      at: 8_000,
      near: true,
    },
  },
  {
    classId: "barometer",
    reading: { hPa: 1013.25 },
    sample: {
      kind: "barometer",
      tier: "pressure",
      at: 8_000,
      hPa: 1013.3,
    },
  },
  {
    classId: "thermometer",
    reading: { celsius: 22.4 },
    sample: {
      kind: "thermometer",
      tier: "celsius",
      at: 8_000,
      celsius: 22.4,
    },
  },
  {
    classId: "hygrometer",
    reading: { relativeHumidity: 45.2 },
    sample: {
      kind: "hygrometer",
      tier: "humidity",
      at: 8_000,
      relativeHumidity: 45,
    },
  },
] as const;

describe("scalar sensor classes", () => {
  it("registers generated device:* ids for the registry-only scalars", () => {
    const ids = DEVICE_CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    for (const { classId } of SCALAR_CLASSES) {
      expect(ids).toContain(`device:${classId}`);
    }
  });

  it("opens and reads each class without a new SDK method", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: SCALAR_CLASSES.map((entry) =>
        createSimulatedScalarDriver(entry.classId, entry.reading),
      ),
      now: () => 8_000,
    });

    for (const entry of SCALAR_CLASSES) {
      const capability = `device:${entry.classId}`;
      const session = await manager.open(
        "weather",
        "pub",
        [capability],
        [capability],
        {
          class: entry.classId,
          purpose: "sense",
        },
      );
      expect(session.tier).toBe(entry.sample.tier);
      expect(await manager.read("weather", session.handle)).toEqual(
        entry.sample,
      );
      await manager.close("weather", session.handle);
    }
  });

  it("still fails closed on a class the registry does not know", () => {
    expect(() => validateManifestCapabilities(["device:lidar"])).toThrow(
      /minHostApi/,
    );
  });
});
