import { describe, expect, it } from "vitest";
import {
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  canIdentityHash,
  packIdentityCiphertext,
  planIdentityDecryptOutcome,
  planIdentityRecall,
  splitIdentityCiphertext
} from "../src/identity-ciphertext.js";

describe("protocol identity ciphertext", () => {
  it("packs and splits ephemeral public || token", () => {
    const ephemeral = new Uint8Array(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE).fill(1);
    const token = new Uint8Array([9, 8, 7, 6]);
    const packed = packIdentityCiphertext(ephemeral, token);
    const split = splitIdentityCiphertext(packed);
    expect(split).not.toBeNull();
    expect([...split!.ephemeralPublicKey]).toEqual([...ephemeral]);
    expect([...split!.tokenCiphertext]).toEqual([...token]);
  });

  it("rejects short ciphertexts", () => {
    expect(splitIdentityCiphertext(new Uint8Array(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE))).toBeNull();
  });

  it("plans decrypt outcomes after frame / ratchet / identity fallback", () => {
    expect(
      planIdentityDecryptOutcome({
        frameOk: false,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      })
    ).toBe("reject-frame");
    expect(
      planIdentityDecryptOutcome({
        frameOk: true,
        ratchetPlaintextPresent: true,
        enforceRatchets: true,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      })
    ).toBe("accept");
    expect(
      planIdentityDecryptOutcome({
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: true,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      })
    ).toBe("reject-enforced");
    expect(
      planIdentityDecryptOutcome({
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      })
    ).toBe("try-identity");
    expect(
      planIdentityDecryptOutcome({
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: true,
        identityPlaintextPresent: true
      })
    ).toBe("accept");
    expect(
      planIdentityDecryptOutcome({
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: true,
        identityPlaintextPresent: false
      })
    ).toBe("reject");
  });

  it("plans recall and hash readiness", () => {
    expect(planIdentityRecall({ recordPresent: false, publicKeyLoaded: false })).toBe("miss");
    expect(planIdentityRecall({ recordPresent: true, publicKeyLoaded: false })).toBe(
      "reject-key"
    );
    expect(planIdentityRecall({ recordPresent: true, publicKeyLoaded: true })).toBe("hit");
    expect(canIdentityHash(true)).toBe(true);
    expect(canIdentityHash(false)).toBe(false);
  });
});
