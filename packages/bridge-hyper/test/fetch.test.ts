import { describe, expect, it } from "vitest";
import type { PacketInterface } from "@twistedpear/reticulum-ts";
import { assessFetchBudget, BULK_BLOCK_RNODE_BYTES } from "../src/fetch.js";

function mockIface(name: string, online: boolean): PacketInterface {
  return {
    name,
    mtu: 500,
    bitrate: null,
    incoming: true,
    outgoing: true,
    online,
    packets: (async function* () {})(),
    async send() {},
    async close() {}
  };
}

describe("fetch budget rules", () => {
  it("blocks bulk fetch over RNode-only links", () => {
    const assessment = assessFetchBudget(
      {
        appId: "a",
        publisherPublicKey: "b",
        name: "app",
        version: "1.0.0",
        packageSize: BULK_BLOCK_RNODE_BYTES + 1,
        packageHash: "hash",
        driveKey: "d".repeat(64),
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: null
      },
      [mockIface("rnode", true)]
    );

    expect(assessment.allowed).toBe(false);
  });

  it("warns on large BLE transfers", () => {
    const assessment = assessFetchBudget(
      {
        appId: "a",
        publisherPublicKey: "b",
        name: "app",
        version: "1.0.0",
        packageSize: 300_000,
        packageHash: "hash",
        driveKey: "d".repeat(64),
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: null
      },
      [mockIface("ble", true)]
    );

    expect(assessment.allowed).toBe(true);
    expect(assessment.warning).toContain("BLE");
  });
});
