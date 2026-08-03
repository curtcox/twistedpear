// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  canIdentityHash,
  canIdentityUsePrivateKey,
  canIdentityUsePublicKey,
  canLoadIdentityKeyMaterial,
  identityCiphertextFieldsFromActions,
  identityDecryptOutcomePlanFromActions,
  identityRecallAppDataPlanFromActions,
  identityRecallPlanFromActions,
  initialAcceptIdentityCiphertextFrameState,
  initialAcceptIdentityDecryptPlaintextState,
  initialAttemptIdentityRatchetDecryptState,
  initialIdentityDecryptOutcomePlanState,
  initialIdentityDecryptState,
  initialIdentityHashAllowState,
  initialIdentityRecallAppDataPlanState,
  initialIdentityRecallAppDataState,
  initialIdentityRecallPlanState,
  initialIdentityRecallState,
  initialIdentityUsePrivateKeyState,
  initialIdentityUsePublicKeyState,
  initialLoadIdentityKeyMaterialState,
  initialPackIdentityCiphertextState,
  initialSplitIdentityCiphertextState,
  packIdentityCiphertext,
  packIdentityCiphertextRawFromActions,
  planIdentityDecryptOutcome,
  planIdentityRecall,
  planIdentityRecallAppData,
  shouldAcceptIdentityDecrypt,
  shouldAcceptIdentityDecryptOutcomePlan,
  shouldAllowIdentityHash,
  shouldAllowIdentityUsePrivateKey,
  shouldAllowIdentityUsePublicKey,
  shouldAllowLoadIdentityKeyMaterial,
  shouldAttemptIdentityRatchetDecrypt,
  shouldAttemptIdentityRatchetDecryptNow,
  shouldAcceptIdentityCiphertextFrame,
  shouldAcceptIdentityCiphertextFrameNow,
  shouldAcceptIdentityDecryptPlaintext,
  shouldAcceptIdentityDecryptPlaintextNow,
  shouldDenyIdentityHash,
  shouldDenyIdentityUsePrivateKey,
  shouldDenyIdentityUsePublicKey,
  shouldDenyLoadIdentityKeyMaterial,
  shouldHitIdentityRecall,
  shouldHitIdentityRecallAppData,
  shouldHitIdentityRecallAppDataPlan,
  shouldHitIdentityRecallPlan,
  shouldMissIdentityRecall,
  shouldMissIdentityRecallAppData,
  shouldMissIdentityRecallAppDataPlan,
  shouldMissIdentityRecallPlan,
  shouldRejectIdentityDecrypt,
  shouldRejectIdentityDecryptEnforced,
  shouldRejectIdentityDecryptFrame,
  shouldRejectIdentityDecryptOutcomePlan,
  shouldRejectIdentityDecryptOutcomePlanEnforced,
  shouldRejectIdentityDecryptOutcomePlanFrame,
  shouldRejectIdentityRecallKey,
  shouldRejectIdentityRecallPlanKey,
  shouldRejectPackIdentityCiphertext,
  shouldRejectSplitIdentityCiphertext,
  shouldSkipIdentityCiphertextFrameAccept,
  shouldSkipIdentityDecryptPlaintextAccept,
  shouldSkipIdentityRatchetDecrypt,
  shouldTryIdentityDecrypt,
  shouldTryIdentityDecryptOutcomePlan,
  shouldUsePackIdentityCiphertext,
  shouldUseSplitIdentityCiphertext,
  splitIdentityCiphertext,
  stepAcceptIdentityCiphertextFrameWithActions,
  stepAcceptIdentityDecryptPlaintextWithActions,
  stepAttemptIdentityRatchetDecryptWithActions,
  stepIdentityDecryptOutcomePlanWithActions,
  stepIdentityDecryptWithActions,
  stepIdentityHashAllowWithActions,
  stepIdentityRecallAppDataPlanWithActions,
  stepIdentityRecallAppDataWithActions,
  stepIdentityRecallPlanWithActions,
  stepIdentityRecallWithActions,
  stepIdentityUsePrivateKeyWithActions,
  stepIdentityUsePublicKeyWithActions,
  stepLoadIdentityKeyMaterialWithActions,
  stepPackIdentityCiphertextWithActions,
  stepSplitIdentityCiphertextWithActions
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

    const acceptFrame = stepAcceptIdentityCiphertextFrameWithActions(
      initialAcceptIdentityCiphertextFrameState(),
      {
        kind: "identity-ciphertext/accept-frame-gate",
        splitOk: true
      }
    );
    expect(shouldAcceptIdentityCiphertextFrameNow(acceptFrame.actions)).toBe(true);
    expect(shouldSkipIdentityCiphertextFrameAccept(acceptFrame.actions)).toBe(false);

    const skipFrame = stepAcceptIdentityCiphertextFrameWithActions(
      initialAcceptIdentityCiphertextFrameState(),
      {
        kind: "identity-ciphertext/accept-frame-gate",
        splitOk: false
      }
    );
    expect(shouldAcceptIdentityCiphertextFrameNow(skipFrame.actions)).toBe(false);
    expect(shouldSkipIdentityCiphertextFrameAccept(skipFrame.actions)).toBe(true);

    const acceptPlaintext = stepAcceptIdentityDecryptPlaintextWithActions(
      initialAcceptIdentityDecryptPlaintextState(),
      {
        kind: "identity-ciphertext/accept-plaintext-gate",
        planAccept: true
      }
    );
    expect(shouldAcceptIdentityDecryptPlaintextNow(acceptPlaintext.actions)).toBe(true);
    expect(shouldSkipIdentityDecryptPlaintextAccept(acceptPlaintext.actions)).toBe(false);

    const skipPlaintext = stepAcceptIdentityDecryptPlaintextWithActions(
      initialAcceptIdentityDecryptPlaintextState(),
      {
        kind: "identity-ciphertext/accept-plaintext-gate",
        planAccept: false
      }
    );
    expect(shouldAcceptIdentityDecryptPlaintextNow(skipPlaintext.actions)).toBe(false);
    expect(shouldSkipIdentityDecryptPlaintextAccept(skipPlaintext.actions)).toBe(true);
  });

  it("emits pack raw or reject from WithActions steps", () => {
    const ephemeral = new Uint8Array(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE).fill(1);
    const token = new Uint8Array([9, 8, 7, 6]);
    const ok = stepPackIdentityCiphertextWithActions(initialPackIdentityCiphertextState(), {
      kind: "identity-ciphertext/pack-gate",
      ephemeralPublicKey: ephemeral,
      tokenCiphertext: token
    });
    expect(shouldUsePackIdentityCiphertext(ok.actions)).toBe(true);
    expect(shouldRejectPackIdentityCiphertext(ok.actions)).toBe(false);
    const packed = packIdentityCiphertextRawFromActions(ok.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packIdentityCiphertext(ephemeral, token)]);

    const rejected = stepPackIdentityCiphertextWithActions(initialPackIdentityCiphertextState(), {
      kind: "identity-ciphertext/pack-gate",
      ephemeralPublicKey: new Uint8Array(8),
      tokenCiphertext: token
    });
    expect(shouldRejectPackIdentityCiphertext(rejected.actions)).toBe(true);
    expect(shouldUsePackIdentityCiphertext(rejected.actions)).toBe(false);
    expect(packIdentityCiphertextRawFromActions(rejected.actions)).toBeNull();
  });

  it("emits split fields or reject from WithActions steps", () => {
    const ephemeral = new Uint8Array(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE).fill(1);
    const token = new Uint8Array([9, 8, 7, 6]);
    const packed = packIdentityCiphertext(ephemeral, token);
    const ok = stepSplitIdentityCiphertextWithActions(initialSplitIdentityCiphertextState(), {
      kind: "identity-ciphertext/split-gate",
      ciphertextToken: packed
    });
    expect(shouldUseSplitIdentityCiphertext(ok.actions)).toBe(true);
    expect(shouldRejectSplitIdentityCiphertext(ok.actions)).toBe(false);
    const fields = identityCiphertextFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.ephemeralPublicKey]).toEqual([...ephemeral]);
    expect([...fields!.tokenCiphertext]).toEqual([...token]);

    const rejected = stepSplitIdentityCiphertextWithActions(initialSplitIdentityCiphertextState(), {
      kind: "identity-ciphertext/split-gate",
      ciphertextToken: new Uint8Array(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE)
    });
    expect(shouldRejectSplitIdentityCiphertext(rejected.actions)).toBe(true);
    expect(shouldUseSplitIdentityCiphertext(rejected.actions)).toBe(false);
    expect(identityCiphertextFieldsFromActions(rejected.actions)).toBeNull();
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

  it("emits identity decrypt-outcome-plan actions from PlanWithActions", () => {
    const rejectFrame = stepIdentityDecryptOutcomePlanWithActions(
      initialIdentityDecryptOutcomePlanState(),
      {
        kind: "identity/decrypt-outcome-plan-gate",
        frameOk: false,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      }
    );
    expect(shouldRejectIdentityDecryptOutcomePlanFrame(rejectFrame.actions)).toBe(true);
    expect(identityDecryptOutcomePlanFromActions(rejectFrame.actions)).toBe("reject-frame");

    const accept = stepIdentityDecryptOutcomePlanWithActions(
      initialIdentityDecryptOutcomePlanState(),
      {
        kind: "identity/decrypt-outcome-plan-gate",
        frameOk: true,
        ratchetPlaintextPresent: true,
        enforceRatchets: true,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      }
    );
    expect(shouldAcceptIdentityDecryptOutcomePlan(accept.actions)).toBe(true);
    expect(identityDecryptOutcomePlanFromActions(accept.actions)).toBe("accept");

    const rejectEnforced = stepIdentityDecryptOutcomePlanWithActions(
      initialIdentityDecryptOutcomePlanState(),
      {
        kind: "identity/decrypt-outcome-plan-gate",
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: true,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      }
    );
    expect(shouldRejectIdentityDecryptOutcomePlanEnforced(rejectEnforced.actions)).toBe(true);

    const tryIdentity = stepIdentityDecryptOutcomePlanWithActions(
      initialIdentityDecryptOutcomePlanState(),
      {
        kind: "identity/decrypt-outcome-plan-gate",
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: false,
        identityPlaintextPresent: false
      }
    );
    expect(shouldTryIdentityDecryptOutcomePlan(tryIdentity.actions)).toBe(true);

    const reject = stepIdentityDecryptOutcomePlanWithActions(
      initialIdentityDecryptOutcomePlanState(),
      {
        kind: "identity/decrypt-outcome-plan-gate",
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: true,
        identityPlaintextPresent: false
      }
    );
    expect(shouldRejectIdentityDecryptOutcomePlan(reject.actions)).toBe(true);
    expect(identityDecryptOutcomePlanFromActions(reject.actions)).toBe("reject");
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

  it("emits identity recall-plan actions from PlanWithActions", () => {
    const miss = stepIdentityRecallPlanWithActions(initialIdentityRecallPlanState(), {
      kind: "identity/recall-plan-gate",
      recordPresent: false,
      publicKeyLoaded: false
    });
    expect(shouldMissIdentityRecallPlan(miss.actions)).toBe(true);
    expect(identityRecallPlanFromActions(miss.actions)).toBe("miss");

    const rejectKey = stepIdentityRecallPlanWithActions(initialIdentityRecallPlanState(), {
      kind: "identity/recall-plan-gate",
      recordPresent: true,
      publicKeyLoaded: false
    });
    expect(shouldRejectIdentityRecallPlanKey(rejectKey.actions)).toBe(true);
    expect(identityRecallPlanFromActions(rejectKey.actions)).toBe("reject-key");

    const hit = stepIdentityRecallPlanWithActions(initialIdentityRecallPlanState(), {
      kind: "identity/recall-plan-gate",
      recordPresent: true,
      publicKeyLoaded: true
    });
    expect(shouldHitIdentityRecallPlan(hit.actions)).toBe(true);
    expect(identityRecallPlanFromActions(hit.actions)).toBe("hit");

    const appMiss = stepIdentityRecallAppDataPlanWithActions(
      initialIdentityRecallAppDataPlanState(),
      {
        kind: "identity/recall-app-data-plan-gate",
        recordPresent: true,
        appDataPresent: false
      }
    );
    expect(shouldMissIdentityRecallAppDataPlan(appMiss.actions)).toBe(true);
    expect(identityRecallAppDataPlanFromActions(appMiss.actions)).toBe("miss");

    const appHit = stepIdentityRecallAppDataPlanWithActions(
      initialIdentityRecallAppDataPlanState(),
      {
        kind: "identity/recall-app-data-plan-gate",
        recordPresent: true,
        appDataPresent: true
      }
    );
    expect(shouldHitIdentityRecallAppDataPlan(appHit.actions)).toBe(true);
    expect(identityRecallAppDataPlanFromActions(appHit.actions)).toBe("hit");
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

  it("emits hash / key-use / load / ratchet-decrypt actions from WithActions steps", () => {
    const hashAllow = stepIdentityHashAllowWithActions(initialIdentityHashAllowState(), {
      kind: "identity/hash-allow-gate",
      identityHashPresent: true
    });
    expect(hashAllow.actions).toEqual([{ kind: "allow" }]);
    expect(shouldAllowIdentityHash(hashAllow.actions)).toBe(true);

    const hashDeny = stepIdentityHashAllowWithActions(initialIdentityHashAllowState(), {
      kind: "identity/hash-allow-gate",
      identityHashPresent: false
    });
    expect(hashDeny.actions).toEqual([{ kind: "deny" }]);
    expect(shouldDenyIdentityHash(hashDeny.actions)).toBe(true);

    const privateAllow = stepIdentityUsePrivateKeyWithActions(
      initialIdentityUsePrivateKeyState(),
      {
        kind: "identity/use-private-key-gate",
        privateKeyPresent: true,
        signaturePrivatePresent: true
      }
    );
    expect(privateAllow.actions).toEqual([{ kind: "allow" }]);
    expect(shouldAllowIdentityUsePrivateKey(privateAllow.actions)).toBe(true);

    const privateDeny = stepIdentityUsePrivateKeyWithActions(
      initialIdentityUsePrivateKeyState(),
      {
        kind: "identity/use-private-key-gate",
        privateKeyPresent: true,
        signaturePrivatePresent: false
      }
    );
    expect(privateDeny.actions).toEqual([{ kind: "deny" }]);
    expect(shouldDenyIdentityUsePrivateKey(privateDeny.actions)).toBe(true);

    const publicAllow = stepIdentityUsePublicKeyWithActions(initialIdentityUsePublicKeyState(), {
      kind: "identity/use-public-key-gate",
      publicKeyPresent: true,
      signaturePublicPresent: true
    });
    expect(publicAllow.actions).toEqual([{ kind: "allow" }]);
    expect(shouldAllowIdentityUsePublicKey(publicAllow.actions)).toBe(true);

    const publicDeny = stepIdentityUsePublicKeyWithActions(initialIdentityUsePublicKeyState(), {
      kind: "identity/use-public-key-gate",
      publicKeyPresent: false,
      signaturePublicPresent: true
    });
    expect(publicDeny.actions).toEqual([{ kind: "deny" }]);
    expect(shouldDenyIdentityUsePublicKey(publicDeny.actions)).toBe(true);

    const loadAllow = stepLoadIdentityKeyMaterialWithActions(
      initialLoadIdentityKeyMaterialState(),
      {
        kind: "identity/load-key-material-gate",
        splitOk: true
      }
    );
    expect(loadAllow.actions).toEqual([{ kind: "allow" }]);
    expect(shouldAllowLoadIdentityKeyMaterial(loadAllow.actions)).toBe(true);

    const loadDeny = stepLoadIdentityKeyMaterialWithActions(
      initialLoadIdentityKeyMaterialState(),
      {
        kind: "identity/load-key-material-gate",
        splitOk: false
      }
    );
    expect(loadDeny.actions).toEqual([{ kind: "deny" }]);
    expect(shouldDenyLoadIdentityKeyMaterial(loadDeny.actions)).toBe(true);

    const attempt = stepAttemptIdentityRatchetDecryptWithActions(
      initialAttemptIdentityRatchetDecryptState(),
      {
        kind: "identity/attempt-ratchet-decrypt-gate",
        ratchetsPresent: true
      }
    );
    expect(attempt.actions).toEqual([{ kind: "attempt" }]);
    expect(shouldAttemptIdentityRatchetDecryptNow(attempt.actions)).toBe(true);

    const skip = stepAttemptIdentityRatchetDecryptWithActions(
      initialAttemptIdentityRatchetDecryptState(),
      {
        kind: "identity/attempt-ratchet-decrypt-gate",
        ratchetsPresent: false
      }
    );
    expect(skip.actions).toEqual([{ kind: "skip" }]);
    expect(shouldSkipIdentityRatchetDecrypt(skip.actions)).toBe(true);
  });

  it("is deterministic for identical identity key-access gate events", () => {
    const event = {
      kind: "identity/use-private-key-gate" as const,
      privateKeyPresent: true,
      signaturePrivatePresent: true
    };
    const a = stepIdentityUsePrivateKeyWithActions(initialIdentityUsePrivateKeyState(), event);
    const b = stepIdentityUsePrivateKeyWithActions(initialIdentityUsePrivateKeyState(), event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
