import { describe, expect, it } from "vitest";
import {
  HARDWARE_ACCESS_PANEL_LABEL,
  nativeDriverKind,
  presentHardwareAccess,
} from "../src/hardware-access-chrome.js";

describe("Hardware access chrome", () => {
  it("labels the peripheral panel Hardware access, not Your devices", () => {
    const presented = presentHardwareAccess({
      host: "desktop",
      inventory: [
        { classId: "camera", availability: "available" },
        { classId: "nfc", availability: "unsupported" },
      ],
      sessions: [
        {
          handle: "s1",
          appId: "scan",
          classId: "camera",
          tierId: "derived",
          destination: "local",
        },
      ],
      disabledClasses: ["nfc"],
      remoteAcquisitionEnabled: false,
    });
    expect(presented.panelLabel).toBe(HARDWARE_ACCESS_PANEL_LABEL);
    expect(presented.panelLabel.toLowerCase()).not.toMatch(/your devices/);
    expect(presented.globalKill).toBe("sensor-kill");
    expect(presented.remoteAcquisitionEnabled).toBe(false);
    expect(presented.sessions).toHaveLength(1);
    const nfc = presented.inventory.find((row) => row.classId === "nfc");
    expect(nfc?.disabled).toBe(true);
    expect(nfc?.availability).toBe("policy-disabled");
    expect(nfc?.driver).toBe("simulated");
  });

  it("treats the per-host matrix as the native-driver contract", () => {
    expect(nativeDriverKind("android", "camera")).toBe("os");
    expect(nativeDriverKind("desktop", "motion")).toBe("unsupported");
    expect(nativeDriverKind("headless", "camera")).toBe("unsupported");
    expect(nativeDriverKind("ios", "nfc")).toBe("simulated");
    expect(nativeDriverKind("web", "location")).toBe("os");
  });
});
