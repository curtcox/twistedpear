// @ts-nocheck
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evictSeederToQuota,
  pinSeederVersion,
  registerDriveWithSeeder,
  registerDriveWithSeederQuota,
  totalSeederBytes,
  loadSeederState
} from "../src/seeder-state.js";

describe("seeder quota eviction", () => {
  it("evicts oldest archives when over quota and keeps pinned versions", () => {
    const stateDir = mkdtempSync(join(tmpdir(), "tp-seeder-"));
    try {
      const archive = new Uint8Array(100);
      registerDriveWithSeeder(stateDir, "drive-a", "1.0.0", "hash-a", archive);
      registerDriveWithSeeder(stateDir, "drive-a", "1.1.0", "hash-b", archive);
      registerDriveWithSeeder(stateDir, "drive-a", "1.2.0", "hash-c", archive);
      pinSeederVersion(stateDir, "1.2.0");

      const evicted = evictSeederToQuota(stateDir, 150);
      expect(evicted).toBeGreaterThan(0);

      const state = loadSeederState(stateDir);
      expect(totalSeederBytes(state)).toBeLessThanOrEqual(150);
      expect(state.drives[0]?.versions["1.2.0"]).toBeDefined();
      expect(state.drives[0]?.versions["1.0.0"]).toBeUndefined();
    } finally {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });

  it("registerDriveWithSeederQuota enforces quota on publish", () => {
    const stateDir = mkdtempSync(join(tmpdir(), "tp-seeder-quota-"));
    try {
      const archive = new Uint8Array(80);
      registerDriveWithSeederQuota(stateDir, "drive-a", "1.0.0", "hash-a", archive, 100);
      registerDriveWithSeederQuota(stateDir, "drive-a", "1.1.0", "hash-b", archive, 100);

      const state = loadSeederState(stateDir);
      expect(totalSeederBytes(state)).toBeLessThanOrEqual(100);
      expect(Object.keys(state.drives[0]?.versions ?? {}).length).toBe(1);
    } finally {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });
});
