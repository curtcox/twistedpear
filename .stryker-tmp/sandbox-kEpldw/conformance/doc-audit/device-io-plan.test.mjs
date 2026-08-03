// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const plan = readFileSync(join(repositoryRoot, "docs/device-io-plan.md"), "utf8");
const live = readFileSync(join(repositoryRoot, "docs/device-io.md"), "utf8");

describe("device I/O plan", () => {
  it("declares a tiered default with raw access as a separate tier", () => {
    expect(plan).toContain("derived results are the default tier");
    expect(plan).toContain("raw samples are a separate");
    expect(plan).toContain("device:<class>");
    expect(plan).toContain("device:<class>:<tier>");
  });

  it("defines a device-class registry and uniform session API", () => {
    expect(plan).toContain("DeviceClassEntry");
    expect(plan).toContain("device-class registry");
    // Shipped session surface lives in the live counterpart.
    expect(live).toContain("device.inventory()");
    expect(live).toContain("device.open(");
    expect(live).toContain("DeviceSession");
  });

  it("keeps streaming and remote acquisition as separate, explicitly-granted capabilities", () => {
    expect(plan).toContain("device:stream");
    expect(plan).toContain("device:remote");
    expect(plan).toContain("Remote acquisition");
  });

  it("requires a sidecar data plane instead of sending media through the broker", () => {
    expect(live).toMatch(/device stream\s+sidecar/);
    expect(live).toContain("never the broker");
    expect(plan).toContain("sidecar");
  });

  it("declares consent classes, active-use indicators, and host-rendered preview surfaces", () => {
    expect(plan).toContain("### Three consent classes");
    expect(plan).toContain("### Active-use indicators");
    expect(live).toContain("`camera-preview`");
    expect(live).toContain("Preview surfaces");
  });

  it("defines admission control and degradation ladders", () => {
    expect(plan).toContain("BandwidthProfile");
    expect(plan).toContain("degradation");
    expect(plan).toContain("admission control");
  });

  it("includes remaining phasing and a spec inventory", () => {
    expect(plan).toMatch(/## (Remaining )?[Pp]hasing/);
    expect(plan).toContain("## Specs to add");
    expect(plan).toContain("SPEC-DEVICE");
    expect(plan).toContain("specs/spec-device/");
  });
});
