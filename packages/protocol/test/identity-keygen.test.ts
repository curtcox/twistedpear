import { describe, expect, it } from "vitest";
import {
  IDENTITY_KEY_ENTROPY_SIZE,
  splitIdentityEntropy
} from "../src/identity-keygen.js";

describe("protocol identity keygen entropy", () => {
  it("splits 64-byte entropy into two 32-byte keys", () => {
    const entropy = new Uint8Array(IDENTITY_KEY_ENTROPY_SIZE).map((_, i) => i + 1);
    const keys = splitIdentityEntropy(entropy);
    expect([...keys.privateKey]).toEqual([...entropy.subarray(0, 32)]);
    expect([...keys.signaturePrivateKey]).toEqual([...entropy.subarray(32, 64)]);
  });

  it("rejects short entropy", () => {
    expect(() => splitIdentityEntropy(new Uint8Array(63))).toThrow(/at least 64/);
  });
});
