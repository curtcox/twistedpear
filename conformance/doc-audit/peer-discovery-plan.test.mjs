import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const planPath = join(repositoryRoot, "docs/local-peer-discovery-plan.md");
const plan = readFileSync(planPath, "utf8");

describe("local peer discovery plan", () => {
  it("keeps discovery mechanisms behind one platform contract", () => {
    expect(plan).toContain("interface PeerDiscoveryAdapter");
    expect(plan).toContain("peer:connect");
    expect(plan).toContain("opaque, authenticated peer handle");
    expect(plan).toContain("Peer Link");
  });

  it.each([
    ["Reticulum automatic", "AutoInterface"],
    ["QR / camera", "getUserMedia()"],
    ["Manual", "checksummed Base32"],
    ["Audio", "FSK/chirps"],
    ["Bluetooth", "BLE central/peripheral"],
    ["ntfy", "https://docs.ntfy.sh/subscribe/api/"],
    ["Local Peer-to-Peer API", "LP2PRequest"]
  ])("plans the %s adapter", (_mechanism, evidence) => {
    expect(plan).toContain(evidence);
  });

  it("defines cross-adapter and real two-host acceptance evidence", () => {
    expect(plan).toContain("One shared suite");
    expect(plan).toContain("Static deployment");
    expect(plan).toContain("true two-host test tier");
    expect(plan).toMatch(/CI neither\s+depends on nor sends traffic to the public service/);
  });
});
