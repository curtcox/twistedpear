import { describe, expect, it } from "vitest";
import { enumerateCells } from "@twistedpear/effects";
import {
  deviceSessionMachine,
  initialDeviceSessionState,
  quantizeAmbientLux,
  quantizeLocationCoarse,
  stepDeviceSession,
  DEVICE_CLASS_REGISTRY,
  DEVICE_REGISTRY_HOST_API,
  deviceCapabilityId
} from "../src/index.js";
import vectors from "../../../conformance/vectors/device-session.json";

describe("device session machine", () => {
  it("opens, degrades, restores, and closes", () => {
    let state = initialDeviceSessionState({
      classId: "location",
      tierId: "coarse",
      appId: "app",
      holder: "app:app",
      openedAt: 0
    });
    state = stepDeviceSession(state, { kind: "device/open", at: 10, ttlMs: 1000 }).state;
    expect(state.phase).toBe("active");
    expect(state.expiresAt).toBe(1010);

    state = stepDeviceSession(state, { kind: "device/degrade", at: 20, rung: 1 }).state;
    expect(state.phase).toBe("degraded");
    expect(state.degradationRung).toBe(1);

    state = stepDeviceSession(state, { kind: "device/restore", at: 30, rung: 0 }).state;
    expect(state.phase).toBe("active");

    state = stepDeviceSession(state, { kind: "device/close", at: 40 }).state;
    expect(state.phase).toBe("closed");
    expect(state.closedAt).toBe(40);
  });

  it("expires and refuses revival", () => {
    let state = initialDeviceSessionState({
      classId: "ambient-light",
      tierId: "quantized",
      appId: "app",
      holder: "app:app"
    });
    state = stepDeviceSession(state, { kind: "device/open", at: 0, ttlMs: 10 }).state;
    state = stepDeviceSession(state, { kind: "device/ttl", at: 10 }).state;
    expect(state.phase).toBe("expired");
    const revived = stepDeviceSession(state, { kind: "device/open", at: 20, ttlMs: 100 });
    expect(revived.state.phase).toBe("expired");
  });

  it("enumerates the legal transition table", () => {
    expect(deviceSessionMachine.table.map((row) => `${row.from}:${row.on.name}->${row.to}`)).toEqual([
      "requested:open->active",
      "active:degrade->degraded",
      "degraded:restore->active",
      "degraded:degrade->degraded",
      "active:close->closed",
      "degraded:close->closed",
      "active:ttl/expired->expired",
      "degraded:ttl/expired->expired",
      "active:revoke->revoked",
      "degraded:revoke->revoked"
    ]);
  });

  it("checks in a Layer-3 vector for every table cell", () => {
    expect(vectors.cells).toHaveLength(enumerateCells(deviceSessionMachine).length);
    expect(vectors.cells).toHaveLength(deviceSessionMachine.states.length * deviceSessionMachine.events.length);
    expect(vectors.cells.filter((cell) => cell.legal)).toHaveLength(deviceSessionMachine.table.length);
  });
});

describe("device quantize", () => {
  it("quantizes location to ~1 km cells", () => {
    const coarse = quantizeLocationCoarse({ latitude: 37.7749, longitude: -122.4194 });
    expect(coarse.accuracyM).toBe(1000);
    expect(Math.abs(coarse.latitude - 37.7749)).toBeLessThan(0.01);
    const again = quantizeLocationCoarse({
      latitude: 37.7749 + 0.002,
      longitude: -122.4194 + 0.002
    });
    expect(again.latitude).toBe(coarse.latitude);
    expect(again.longitude).toBe(coarse.longitude);
  });

  it("buckets ambient lux", () => {
    expect(quantizeAmbientLux(0)).toBe("dark");
    expect(quantizeAmbientLux(25)).toBe("dim");
    expect(quantizeAmbientLux(200)).toBe("indoor");
    expect(quantizeAmbientLux(2000)).toBe("bright");
    expect(quantizeAmbientLux(20000)).toBe("sunlit");
  });
});

describe("device registry", () => {
  it("pins host API 0.10.0 and includes Phase 1 classes", () => {
    expect(DEVICE_REGISTRY_HOST_API).toBe("0.10.0");
    const ids = DEVICE_CLASS_REGISTRY.map((entry) => entry.id);
    expect(ids).toContain("location");
    expect(ids).toContain("ambient-light");
    expect(deviceCapabilityId("location")).toBe("device:location");
    expect(deviceCapabilityId("location", "precise")).toBe("device:location:precise");
    expect(deviceCapabilityId("ambient-light")).toBe("device:ambient-light");
  });
});
