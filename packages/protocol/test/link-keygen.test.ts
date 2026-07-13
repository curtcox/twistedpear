import { describe, expect, it } from "vitest";
import {
  LINK_INITIATOR_ENTROPY_SIZE,
  LINK_RESPONDER_ENTROPY_SIZE,
  splitInitiatorLinkEntropy,
  splitResponderLinkEntropy
} from "../src/link-keygen.js";

describe("protocol link keygen entropy", () => {
  it("splits initiator entropy into two keys", () => {
    const entropy = new Uint8Array(LINK_INITIATOR_ENTROPY_SIZE).map((_, i) => i + 1);
    const keys = splitInitiatorLinkEntropy(entropy);
    expect(keys.privateKey).toHaveLength(32);
    expect(keys.signaturePrivateKey).toHaveLength(32);
    expect([...keys.privateKey]).toEqual([...entropy.subarray(0, 32)]);
    expect([...keys.signaturePrivateKey]).toEqual([...entropy.subarray(32, 64)]);
  });

  it("splits responder entropy into one key", () => {
    const entropy = new Uint8Array(LINK_RESPONDER_ENTROPY_SIZE).map((_, i) => 200 - i);
    const keys = splitResponderLinkEntropy(entropy);
    expect([...keys.privateKey]).toEqual([...entropy]);
  });

  it("rejects short entropy", () => {
    expect(() => splitInitiatorLinkEntropy(new Uint8Array(63))).toThrow(/at least 64/);
    expect(() => splitResponderLinkEntropy(new Uint8Array(31))).toThrow(/at least 32/);
  });
});
