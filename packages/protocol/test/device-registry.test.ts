import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEVICE_CLASS_REGISTRY,
  DEVICE_REGISTRY_HOST_API,
  allDeviceClassIds,
  defaultTierForClass,
  deviceCapabilityId,
  deviceClassById,
  type DeviceClassEntry,
} from "../src/index.js";
import { collectDeviceCapabilities } from "../../../scripts/generate-device-registry.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const REGISTRY_PATH = join(
  ROOT,
  "specs/spec-device/registry/device-classes.json",
);

interface RegistryFile {
  readonly hostApiVersion: string;
  readonly classes: ReadonlyArray<DeviceClassEntry>;
  readonly crossCutting: ReadonlyArray<{
    readonly id: string;
    readonly consentClass: string;
  }>;
}

const SOURCE = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as RegistryFile;

/** Classes that landed through the add-a-class runbook, after the 0.10.0 set. */
const GROWTH_CLASSES = [
  "proximity",
  "barometer",
  "thermometer",
  "hygrometer",
  "thermal",
] as const;

function compareSemver(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

describe("device-class registry", () => {
  it("matches the normative JSON and pins hostApiVersion", () => {
    expect(DEVICE_REGISTRY_HOST_API).toBe(SOURCE.hostApiVersion);
    expect(DEVICE_CLASS_REGISTRY).toEqual(SOURCE.classes);
    expect(allDeviceClassIds()).toEqual(SOURCE.classes.map((entry) => entry.id));
  });

  it("requires bandwidth, ladder, consent, and a single default tier per class", () => {
    const ids = new Set<string>();
    for (const entry of DEVICE_CLASS_REGISTRY) {
      expect(ids.has(entry.id), entry.id).toBe(false);
      ids.add(entry.id);
      expect(entry.consentClass).toMatch(/^(low|elevated|sensitive)$/);
      expect(entry.degradationLadder.length).toBeGreaterThan(0);
      expect(compareSemver(entry.addedInHostApi, DEVICE_REGISTRY_HOST_API)).toBeLessThanOrEqual(
        0,
      );
      const defaults = entry.tiers.filter((tier) => tier.default);
      expect(defaults, entry.id).toHaveLength(1);
      expect(defaults[0]?.capabilitySuffix).toBeNull();
      const tierIds = new Set(entry.tiers.map((tier) => tier.id));
      for (const tierId of Object.keys(entry.bandwidth)) {
        expect(tierIds.has(tierId), `${entry.id}:${tierId}`).toBe(true);
      }
      for (const tier of entry.tiers) {
        expect(entry.bandwidth[tier.id], `${entry.id}:${tier.id}`).toBeDefined();
      }
    }
  });

  it("generates capability ids from the registry with no per-class special case", () => {
    const generated = collectDeviceCapabilities(SOURCE);
    const fromRegistry = DEVICE_CLASS_REGISTRY.flatMap((entry) =>
      entry.tiers.map((tier) => deviceCapabilityId(entry.id, tier.id)),
    );
    const classIds = new Set(
      generated.filter((row) => row.classId !== null).map((row) => row.id),
    );
    expect([...classIds]).toEqual(fromRegistry);
    for (const entry of DEVICE_CLASS_REGISTRY) {
      const defaultTier = defaultTierForClass(entry);
      expect(deviceCapabilityId(entry.id)).toBe(`device:${entry.id}`);
      expect(deviceCapabilityId(entry.id, defaultTier.id)).toBe(
        `device:${entry.id}`,
      );
      for (const tier of entry.tiers) {
        if (tier.capabilitySuffix === null) continue;
        expect(deviceCapabilityId(entry.id, tier.id)).toBe(
          `device:${entry.id}:${tier.capabilitySuffix}`,
        );
      }
    }
    for (const cross of SOURCE.crossCutting) {
      expect(deviceClassById(cross.id)).toBeUndefined();
      expect(generated.some((row) => row.id === cross.id)).toBe(true);
    }
  });

  it("treats runbook growth classes as ordinary registry rows", () => {
    for (const classId of GROWTH_CLASSES) {
      const entry = deviceClassById(classId);
      expect(entry, classId).toBeDefined();
      expect(entry?.id).toBe(classId);
      expect(deviceCapabilityId(classId)).toBe(`device:${classId}`);
      expect(entry?.tiers).toHaveLength(1);
      expect(defaultTierForClass(entry!).capabilitySuffix).toBeNull();
    }
  });

  it("fails closed on a class the registry does not know", () => {
    expect(deviceClassById("lidar")).toBeUndefined();
    expect(() => deviceCapabilityId("lidar")).toThrow(/unknown device class/);
    expect(() => deviceCapabilityId("location", "lidar")).toThrow(
      /unknown tier lidar/,
    );
  });
});
