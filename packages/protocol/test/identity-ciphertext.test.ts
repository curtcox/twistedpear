import { describe, expect, it } from "vitest";
import {
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  canIdentityHash,
  canIdentityUsePrivateKey,
  canIdentityUsePublicKey,
  canLoadIdentityKeyMaterial,
  initialIdentityDecryptState,
  initialIdentityRecallAppDataState,
  initialIdentityRecallState,
  packIdentityCiphertext,
  planIdentityDecryptOutcome,
  planIdentityRecall,
  planIdentityRecallAppData,
  shouldAcceptIdentityDecrypt,
  shouldAttemptIdentityRatchetDecrypt,
  shouldAcceptIdentityCiphertextFrame,
  shouldAcceptIdentityDecryptPlaintext,
  shouldHitIdentityRecall,
  shouldHitIdentityRecallAppData,
  shouldMissIdentityRecall,
  shouldMissIdentityRecallAppData,
  shouldRejectIdentityDecrypt,
  shouldRejectIdentityDecryptEnforced,
  shouldRejectIdentityDecryptFrame,
  shouldRejectIdentityRecallKey,
  shouldTryIdentityDecrypt,
  splitIdentityCiphertext,
  stepIdentityDecryptWithActions,
  stepIdentityRecallAppDataWithActions,
  stepIdentityRecallWithActions
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
    expect(shouldAcceptIdentityCiphertextFrame(true)).toBe(true);
    expect(shouldAcceptIdentityCiphertextFrame(false)).toBe(false);
    expect(shouldAcceptIdentityDecryptPlaintext(true)).toBe(true);
    expect(shouldAcceptIdentityDecryptPlaintext(false)).toBe(false);
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

  it("emits identity decrypt actions from stepIdentityDecryptWithActions", () => {
    const rejectFrame = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk: false,
      ratchetPlaintextPresent: false,
      enforceRatchets: false,
      identityFallbackDone: false,
      identityPlaintextPresent: false
    });
    expect(rejectFrame.actions).toEqual([{ kind: "reject-frame" }]);
    expect(shouldRejectIdentityDecryptFrame(rejectFrame.actions)).toBe(true);

    const accept = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk: true,
      ratchetPlaintextPresent: true,
      enforceRatchets: true,
      identityFallbackDone: false,
      identityPlaintextPresent: false
    });
    expect(accept.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptIdentityDecrypt(accept.actions)).toBe(true);

    const rejectEnforced = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk: true,
      ratchetPlaintextPresent: false,
      enforceRatchets: true,
      identityFallbackDone: false,
      identityPlaintextPresent: false
    });
    expect(rejectEnforced.actions).toEqual([{ kind: "reject-enforced" }]);
    expect(shouldRejectIdentityDecryptEnforced(rejectEnforced.actions)).toBe(true);

    const tryIdentity = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk: true,
      ratchetPlaintextPresent: false,
      enforceRatchets: false,
      identityFallbackDone: false,
      identityPlaintextPresent: false
    });
    expect(tryIdentity.actions).toEqual([{ kind: "try-identity" }]);
    expect(shouldTryIdentityDecrypt(tryIdentity.actions)).toBe(true);

    const reject = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk: true,
      ratchetPlaintextPresent: false,
      enforceRatchets: false,
      identityFallbackDone: true,
      identityPlaintextPresent: false
    });
    expect(reject.actions).toEqual([{ kind: "reject" }]);
    expect(shouldRejectIdentityDecrypt(reject.actions)).toBe(true);
  });

  it("is deterministic for identity decrypt gate events", () => {
    const state = initialIdentityDecryptState();
    const event = {
      kind: "identity/decrypt-gate" as const,
      frameOk: true,
      ratchetPlaintextPresent: false,
      enforceRatchets: false,
      identityFallbackDone: false,
      identityPlaintextPresent: false
    };
    const a = stepIdentityDecryptWithActions(state, event);
    const b = stepIdentityDecryptWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans recall and hash readiness", () => {
    expect(planIdentityRecall({ recordPresent: false, publicKeyLoaded: false })).toBe("miss");
    expect(planIdentityRecall({ recordPresent: true, publicKeyLoaded: false })).toBe(
      "reject-key"
    );
    expect(planIdentityRecall({ recordPresent: true, publicKeyLoaded: true })).toBe("hit");
    expect(
      planIdentityRecallAppData({ recordPresent: false, appDataPresent: false })
    ).toBe("miss");
    expect(planIdentityRecallAppData({ recordPresent: true, appDataPresent: false })).toBe(
      "miss"
    );
    expect(planIdentityRecallAppData({ recordPresent: true, appDataPresent: true })).toBe(
      "hit"
    );
    expect(shouldAttemptIdentityRatchetDecrypt(true)).toBe(true);
    expect(shouldAttemptIdentityRatchetDecrypt(false)).toBe(false);
    expect(canIdentityHash(true)).toBe(true);
    expect(canIdentityHash(false)).toBe(false);
  });

  it("emits identity recall actions from stepIdentityRecallWithActions", () => {
    const miss = stepIdentityRecallWithActions(initialIdentityRecallState(), {
      kind: "identity/recall-gate",
      recordPresent: false,
      publicKeyLoaded: false
    });
    expect(miss.actions).toEqual([{ kind: "miss" }]);
    expect(shouldMissIdentityRecall(miss.actions)).toBe(true);

    const rejectKey = stepIdentityRecallWithActions(initialIdentityRecallState(), {
      kind: "identity/recall-gate",
      recordPresent: true,
      publicKeyLoaded: false
    });
    expect(rejectKey.actions).toEqual([{ kind: "reject-key" }]);
    expect(shouldRejectIdentityRecallKey(rejectKey.actions)).toBe(true);

    const hit = stepIdentityRecallWithActions(initialIdentityRecallState(), {
      kind: "identity/recall-gate",
      recordPresent: true,
      publicKeyLoaded: true
    });
    expect(hit.actions).toEqual([{ kind: "hit" }]);
    expect(shouldHitIdentityRecall(hit.actions)).toBe(true);

    const appMiss = stepIdentityRecallAppDataWithActions(initialIdentityRecallAppDataState(), {
      kind: "identity/recall-app-data-gate",
      recordPresent: true,
      appDataPresent: false
    });
    expect(appMiss.actions).toEqual([{ kind: "miss" }]);
    expect(shouldMissIdentityRecallAppData(appMiss.actions)).toBe(true);

    const appHit = stepIdentityRecallAppDataWithActions(initialIdentityRecallAppDataState(), {
      kind: "identity/recall-app-data-gate",
      recordPresent: true,
      appDataPresent: true
    });
    expect(appHit.actions).toEqual([{ kind: "hit" }]);
    expect(shouldHitIdentityRecallAppData(appHit.actions)).toBe(true);
  });

  it("is deterministic for identical identity recall events", () => {
    const event = {
      kind: "identity/recall-gate" as const,
      recordPresent: true,
      publicKeyLoaded: true
    };
    const a = stepIdentityRecallWithActions(initialIdentityRecallState(), event);
    const b = stepIdentityRecallWithActions(initialIdentityRecallState(), event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("gates private/public key use and key-material load", () => {
    expect(
      canIdentityUsePrivateKey({ privateKeyPresent: true, signaturePrivatePresent: true })
    ).toBe(true);
    expect(
      canIdentityUsePrivateKey({ privateKeyPresent: true, signaturePrivatePresent: false })
    ).toBe(false);
    expect(
      canIdentityUsePublicKey({ publicKeyPresent: true, signaturePublicPresent: true })
    ).toBe(true);
    expect(
      canIdentityUsePublicKey({ publicKeyPresent: false, signaturePublicPresent: true })
    ).toBe(false);
    expect(canLoadIdentityKeyMaterial(true)).toBe(true);
    expect(canLoadIdentityKeyMaterial(false)).toBe(false);
  });
});
