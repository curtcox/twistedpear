import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const planPath = join(repositoryRoot, "docs/device-io-plan.md");
const plan = readFileSync(planPath, "utf8");

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
    expect(plan).toContain("device.inventory()");
    expect(plan).toContain("device.open(");
    expect(plan).toContain("DeviceSession");
  });

  it("keeps streaming and remote acquisition as separate, explicitly-granted capabilities", () => {
    expect(plan).toContain("device:stream");
    expect(plan).toContain("device:remote");
    expect(plan).toContain("Remote acquisition");
  });

  it("requires a sidecar data plane instead of sending media through the broker", () => {
    expect(plan).toContain("broker is not a media bus");
    expect(plan).toContain("device stream sidecar");
  });

  it("declares consent classes, active-use indicators, and host-rendered preview surfaces", () => {
    expect(plan).toContain("### Three consent classes");
    expect(plan).toContain("### Active-use indicators");
    expect(plan).toContain("`camera-preview`");
    expect(plan).toContain("### Preview surfaces");
  });

  it("defines admission control and degradation ladders", () => {
    expect(plan).toContain("BandwidthProfile");
    expect(plan).toContain("degradation");
    expect(plan).toContain("admission control");
  });

  it("includes a phased delivery roadmap and spec inventory", () => {
    expect(plan).toContain("## Phasing");
    expect(plan).toContain("## Specs to add");
    expect(plan).toContain("SPEC-DEVICE");
    expect(plan).toContain("specs/spec-device/");
  });
});
