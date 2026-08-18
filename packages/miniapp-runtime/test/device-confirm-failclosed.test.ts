import { describe, expect, it } from "vitest";
import {
  DeviceError,
  DeviceManager,
  createSimulatedAmbientLightDriver,
  createSimulatedCameraDriver,
  createSimulatedLocationDriver,
} from "../src/index.js";

describe("device confirmation fail-closed", () => {
  it("denies elevated sessions when confirmation is not wired", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 1_000,
    });
    await expect(
      manager.open(
        "spy",
        "pub",
        ["device:camera:frames"],
        ["device:camera:frames"],
        { class: "camera", tier: "frames", purpose: "record" },
      ),
    ).rejects.toMatchObject({
      code: "DEVICE_DENIED",
      message: expect.stringContaining("Confirmation effects"),
    });
  });

  it("still opens low-consent sessions without confirmation", async () => {
    const manager = new DeviceManager({
      drivers: [
        createSimulatedLocationDriver(),
        createSimulatedAmbientLightDriver(40),
      ],
      now: () => 1_000,
    });
    const location = await manager.open(
      "nav",
      "pub",
      ["device:location"],
      ["device:location"],
      { class: "location", purpose: "show neighborhood" },
    );
    expect(location.tier).toBe("coarse");
  });

  it("allows elevated sessions only when the host names the exemption", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 1_000,
      allowUnconfirmedDeviceSessions: true,
    });
    const session = await manager.open(
      "cam",
      "pub",
      ["device:camera:frames"],
      ["device:camera:frames"],
      { class: "camera", tier: "frames", purpose: "record" },
    );
    expect(session.tier).toBe("frames");
  });

  it("surfaces DEVICE_DENIED rather than a generic error", () => {
    expect(new DeviceError("DEVICE_DENIED", "nope").code).toBe("DEVICE_DENIED");
  });
});
