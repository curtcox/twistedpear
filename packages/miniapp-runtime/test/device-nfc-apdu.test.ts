import { describe, expect, it } from "vitest";
import {
  DEVICE_CAPABILITY_DEFINITIONS,
  DeviceManager,
  createSimulatedNfcDriver,
  validateManifestCapabilities,
} from "../src/index.js";

describe("nfc:apdu tier", () => {
  it("registers the sensitive APDU capability separately from ndef", () => {
    const ids = DEVICE_CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    expect(ids).toContain("device:nfc");
    expect(ids).toContain("device:nfc:apdu");
    const apdu = DEVICE_CAPABILITY_DEFINITIONS.find(
      (entry) => entry.id === "device:nfc:apdu",
    );
    expect(apdu?.consentClass).toBe("sensitive");
  });

  it("blocklists payment applet AIDs at the driver, not the app", async () => {
    const log = { commands: [] as unknown[], stopped: 0 };
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedNfcDriver(log)],
      now: () => 50_000,
    });
    const session = await manager.open(
      "wallet",
      "pub",
      ["device:nfc:apdu"],
      ["device:nfc:apdu"],
      { class: "nfc", tier: "apdu", purpose: "transit" },
    );
    await expect(
      manager.write("wallet", "pub", session.handle, {
        kind: "nfc",
        action: "apdu",
        aid: "A0000000031010",
        apdu: "00A4040000",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    await manager.write("wallet", "pub", session.handle, {
      kind: "nfc",
      action: "apdu",
      aid: "F001020304",
      apdu: "00A4040000",
    });
    expect(log.commands).toHaveLength(1);
  });

  it("refuses APDU on an ndef-tier session", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedNfcDriver()],
      now: () => 51_000,
    });
    const session = await manager.open(
      "tags",
      "pub",
      ["device:nfc"],
      ["device:nfc"],
      { class: "nfc", purpose: "read a tag" },
    );
    expect(session.tier).toBe("ndef");
    await expect(
      manager.write("tags", "pub", session.handle, {
        kind: "nfc",
        action: "apdu",
        aid: "F001020304",
        apdu: "00A4040000",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });

  it("still fails closed on an unknown NFC capability string", () => {
    expect(() => validateManifestCapabilities(["device:nfc:emv"])).toThrow(
      /minHostApi/,
    );
  });
});
