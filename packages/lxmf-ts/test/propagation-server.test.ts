import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import { Identity } from "@twistedpear/reticulum-ts";
import { PropagationServer, DEFAULT_PROPAGATION_QUOTAS } from "../src/propagation-server.js";

describe("PropagationServer quotas", () => {
  it("evicts oldest messages when count quota is exceeded", () => {
    const provider = new NodeCryptoProvider();
    const server = new PropagationServer(provider, {
      ...DEFAULT_PROPAGATION_QUOTAS,
      maxMessages: 2,
      maxBytes: 10_000_000
    });

    const first = new Uint8Array(32);
    first[0] = 1;
    const second = new Uint8Array(32);
    second[0] = 2;
    const third = new Uint8Array(32);
    third[0] = 3;

    server.storePropagationData(first);
    server.storePropagationData(second);
    server.storePropagationData(third);

    expect(server.stats.messageCount).toBe(2);
    expect(server.stats.evictions).toBeGreaterThan(0);
  });

  it("rejects oversize messages", () => {
    const provider = new NodeCryptoProvider();
    const server = new PropagationServer(provider, {
      ...DEFAULT_PROPAGATION_QUOTAS,
      maxMessageBytes: 16
    });

    const oversized = new Uint8Array(32);
    oversized.fill(9);
    expect(server.storePropagationData(oversized)).toBeNull();
  });
});
