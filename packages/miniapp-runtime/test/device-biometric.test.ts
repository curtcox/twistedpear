import { describe, expect, it } from "vitest";
import {
  DEVICE_CAPABILITY_DEFINITIONS,
  DeviceManager,
  createSimulatedBiometricDriver,
  validateManifestCapabilities,
} from "../src/index.js";

describe("biometric device class", () => {
  it("registers a single assertion-only capability", () => {
    const ids = DEVICE_CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    expect(ids).toContain("device:biometric");
    expect(ids.some((id) => id.startsWith("device:biometric:"))).toBe(false);
    const entry = DEVICE_CAPABILITY_DEFINITIONS.find(
      (item) => item.id === "device:biometric",
    );
    expect(entry?.consentClass).toBe("elevated");
  });

  it("returns a host-signed pass/fail assertion and never a template", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedBiometricDriver(true)],
      now: () => 51_000,
    });
    const session = await manager.open(
      "lock",
      "pub",
      ["device:biometric"],
      ["device:biometric"],
      { class: "biometric", purpose: "unlock" },
    );
    const sample = await manager.read("lock", session.handle);
    expect(sample).toEqual({
      kind: "biometric",
      tier: "assertion",
      at: 51_000,
      passed: true,
      assertion: {
        alg: "host-assert-v1",
        payload: "pass",
        signature: "host-assert-v1:pass:51000",
      },
    });
    expect(JSON.stringify(sample)).not.toMatch(/template|enroll|raw/i);
  });

  it("drops a driver that tries to exfiltrate a template", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        {
          classId: "biometric",
          availability: () => "available",
          sense: () =>
            Promise.resolve({ passed: true, template: "secret-bytes" }),
        },
      ],
      now: () => 52_000,
    });
    const session = await manager.open(
      "lock",
      "pub",
      ["device:biometric"],
      ["device:biometric"],
      { class: "biometric", purpose: "unlock" },
    );
    await expect(manager.read("lock", session.handle)).rejects.toMatchObject({
      code: "DEVICE_BAD_REQUEST",
    });
  });

  it("has no raw biometric capability string", () => {
    expect(() =>
      validateManifestCapabilities(["device:biometric:raw"]),
    ).toThrow(/minHostApi/);
  });
});
