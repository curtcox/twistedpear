import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const planPath = join(repositoryRoot, "docs/local-peer-discovery-plan.md");
const plan = readFileSync(planPath, "utf8");

describe("local peer discovery remaining plan", () => {
  it("routes implemented behavior to the live counterpart and external results to evidence", () => {
    expect(plan).toContain("lifecycle: planned");
    expect(plan).toContain("counterpart: docs/local-peer-discovery.md");
    expect(plan).toContain("current implementation](local-peer-discovery.md)");
    expect(plan).toContain("evidence register](local-peer-discovery-evidence.md)");
    expect(plan).toContain("only work that is not yet verified");
  });

  it.each(["Bluetooth", "audible FSK", "animated QR", "WebRTC", "TPN2", "Reticulum", "mixed-version"])("retains the %s external gate", (gate) => {
    expect(plan).toContain(gate);
  });

  it("keeps future LP2P behind the common production contract", () => {
    expect(plan).toContain("LP2PRequest");
    expect(plan).toContain("PeerDiscoveryAdapter");
    expect(plan).toContain("timeout, abort, cancellation, and replay budgets");
    expect(plan).toMatch(/Routine CI must never use the\s+public service/);
  });
});
