import { describe, expect, it } from "vitest";
import { Identity, PureCryptoProvider } from "@twistedpear/reticulum-ts";

function deriveMulticastAddress(groupId: string): string {
  const provider = new PureCryptoProvider();
  const groupHash = Identity.fullHash(provider, new TextEncoder().encode(groupId));
  const parts = [
    "0",
    hexPair(groupHash[3] ?? 0, groupHash[2] ?? 0),
    hexPair(groupHash[5] ?? 0, groupHash[4] ?? 0),
    hexPair(groupHash[7] ?? 0, groupHash[6] ?? 0),
    hexPair(groupHash[9] ?? 0, groupHash[8] ?? 0),
    hexPair(groupHash[11] ?? 0, groupHash[10] ?? 0),
    hexPair(groupHash[13] ?? 0, groupHash[12] ?? 0)
  ];

  return `ff12:${parts.join(":")}`;
}

function hexPair(low: number, high: number): string {
  return ((high << 8) | low).toString(16).padStart(4, "0");
}

describe("AutoInterface helpers", () => {
  it("derives stable multicast addresses from group id", () => {
    const first = deriveMulticastAddress("reticulum");
    const second = deriveMulticastAddress("reticulum");
    const other = deriveMulticastAddress("custom");
    expect(first).toBe(second);
    expect(first.startsWith("ff12:")).toBe(true);
    expect(other).not.toBe(first);
  });
});
