// @ts-nocheck
import { describe, expect, it } from "vitest";
import { DEVICE_REGISTER_IDS } from "./manifest.mjs";

describe("device evidence manifest", () => {
  for (const id of DEVICE_REGISTER_IDS) {
    it.todo(`register:${id} — device-gated evidence (manual runbook)`, () => {});
  }

  it("lists release-gating hardware IDs", () => {
    expect(DEVICE_REGISTER_IDS.length).toBeGreaterThan(10);
  });
});
