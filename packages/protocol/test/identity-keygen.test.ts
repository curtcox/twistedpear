import { describe, expect, it } from "vitest";
import {
  IDENTITY_HALF_KEY_SIZE,
  IDENTITY_KEY_ENTROPY_SIZE,
  IDENTITY_KEY_SIZE,
  packIdentityPrivateKey,
  packIdentityPublicKey,
  splitIdentityEntropy,
  splitIdentityPrivateKey,
  splitIdentityPublicKey
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

  it("packs and splits identity key material", () => {
    const left = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(1);
    const right = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(2);
    const packedPrivate = packIdentityPrivateKey(left, right);
    expect(packedPrivate.length).toBe(IDENTITY_KEY_SIZE);
    const splitPrivate = splitIdentityPrivateKey(packedPrivate);
    expect(splitPrivate).not.toBeNull();
    expect([...splitPrivate!.privateKey]).toEqual([...left]);
    expect([...splitPrivate!.signaturePrivateKey]).toEqual([...right]);

    const packedPublic = packIdentityPublicKey(left, right);
    const splitPublic = splitIdentityPublicKey(packedPublic);
    expect(splitPublic).not.toBeNull();
    expect([...splitPublic!.publicKey]).toEqual([...left]);
    expect([...splitPublic!.signaturePublicKey]).toEqual([...right]);
    expect(splitIdentityPrivateKey(new Uint8Array(8))).toBeNull();
  });
});
