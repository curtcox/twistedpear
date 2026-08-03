// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  initialRnsHkdfSha256State,
  normalizeRnsHkdfParams,
  rnsHkdfSha256,
  rnsHkdfSha256RawFromActions,
  shouldRejectRnsHkdfSha256,
  shouldUseRnsHkdfSha256,
  stepRnsHkdfSha256WithActions
} from "../src/rns-hkdf.js";
import {
  LINK_ENABLED_MODES,
  LINK_MODE_DEFAULT,
  LinkKeyMode,
  LinkMode,
  deriveRnsLinkKey,
  deriveRnsLinkKeyRawFromActions,
  initialDeriveRnsLinkKeyState,
  initialOrderIndependentSharedSecretState,
  isExpectedLinkMode,
  initialExpectedLinkModeState,
  initialLinkModeEnabledState,
  shouldMatchExpectedLinkMode,
  shouldMismatchExpectedLinkMode,
  shouldTreatLinkModeDisabled,
  shouldTreatLinkModeEnabled,
  stepExpectedLinkModeWithActions,
  stepLinkModeEnabledWithActions,
  isLinkModeEnabled,
  linkDerivedKeyLength,
  orderIndependentSharedSecret,
  orderIndependentSharedSecretRawFromActions,
  shouldRejectDeriveRnsLinkKey,
  shouldRejectOrderIndependentSharedSecret,
  shouldUseDeriveRnsLinkKey,
  shouldUseOrderIndependentSharedSecret,
  stepDeriveRnsLinkKeyWithActions,
  stepOrderIndependentSharedSecretWithActions
} from "../src/link-key-derive.js";

describe("protocol RNS HKDF / link key derive", () => {
  it("normalizes empty salt to 32 zero bytes", () => {
    const params = normalizeRnsHkdfParams({
      length: 32,
      deriveFrom: new Uint8Array([1, 2, 3]),
      salt: null,
      context: null
    });
    expect(params.salt).toHaveLength(32);
    expect(params.info).toHaveLength(0);
  });

  it("selects key length from link mode", () => {
    expect(linkDerivedKeyLength(LinkKeyMode.MODE_AES256_CBC)).toBe(64);
    expect(linkDerivedKeyLength(LinkKeyMode.MODE_AES128_CBC)).toBe(32);
  });

  it("aliases LinkMode and default enabled modes", () => {
    expect(LinkMode).toBe(LinkKeyMode);
    expect(LINK_MODE_DEFAULT).toBe(LinkKeyMode.MODE_AES256_CBC);
    expect(LINK_ENABLED_MODES).toEqual([
      LinkKeyMode.MODE_AES128_CBC,
      LinkKeyMode.MODE_AES256_CBC
    ]);
    expect(isLinkModeEnabled(LinkKeyMode.MODE_AES256_CBC)).toBe(true);
    expect(isLinkModeEnabled(LinkKeyMode.MODE_AES128_CBC)).toBe(true);
    expect(isLinkModeEnabled(LinkKeyMode.MODE_AES256_GCM)).toBe(false);
    expect(
      isExpectedLinkMode({
        expected: LinkKeyMode.MODE_AES256_CBC,
        received: LinkKeyMode.MODE_AES256_CBC
      })
    ).toBe(true);
    expect(
      isExpectedLinkMode({
        expected: LinkKeyMode.MODE_AES256_CBC,
        received: LinkKeyMode.MODE_AES128_CBC
      })
    ).toBe(false);

    const enabled = stepLinkModeEnabledWithActions(initialLinkModeEnabledState(), {
      kind: "link/mode-enabled-gate",
      mode: LinkKeyMode.MODE_AES256_CBC
    });
    expect(shouldTreatLinkModeEnabled(enabled.actions)).toBe(true);
    const aes128 = stepLinkModeEnabledWithActions(initialLinkModeEnabledState(), {
      kind: "link/mode-enabled-gate",
      mode: LinkKeyMode.MODE_AES128_CBC
    });
    expect(shouldTreatLinkModeEnabled(aes128.actions)).toBe(true);
    const gcm = stepLinkModeEnabledWithActions(initialLinkModeEnabledState(), {
      kind: "link/mode-enabled-gate",
      mode: LinkKeyMode.MODE_AES256_GCM
    });
    expect(shouldTreatLinkModeDisabled(gcm.actions)).toBe(true);

    const match = stepExpectedLinkModeWithActions(initialExpectedLinkModeState(), {
      kind: "link/expected-mode-gate",
      expected: LinkKeyMode.MODE_AES256_CBC,
      received: LinkKeyMode.MODE_AES256_CBC
    });
    expect(shouldMatchExpectedLinkMode(match.actions)).toBe(true);
    const mismatch = stepExpectedLinkModeWithActions(initialExpectedLinkModeState(), {
      kind: "link/expected-mode-gate",
      expected: LinkKeyMode.MODE_AES256_CBC,
      received: LinkKeyMode.MODE_AES128_CBC
    });
    expect(shouldMismatchExpectedLinkMode(mismatch.actions)).toBe(true);
  });

  it("derives link keys deterministically", () => {
    const shared = new Uint8Array(32).map((_, i) => i);
    const linkId = new Uint8Array(16).map((_, i) => 100 + i);
    const a = deriveRnsLinkKey(shared, linkId, LinkKeyMode.MODE_AES256_CBC);
    const b = deriveRnsLinkKey(shared, linkId, LinkKeyMode.MODE_AES256_CBC);
    expect(a).toHaveLength(64);
    expect([...a]).toEqual([...b]);
  });

  it("order-independent shared secrets match", () => {
    const x = new Uint8Array([1, 2, 3, 4]);
    const y = new Uint8Array([9, 8, 7, 6]);
    expect([...orderIndependentSharedSecret(x, y)]).toEqual([
      ...orderIndependentSharedSecret(y, x)
    ]);
  });

  it("rnsHkdfSha256 rejects empty material", () => {
    expect(() => rnsHkdfSha256({ length: 16, deriveFrom: new Uint8Array() })).toThrow(/empty/);
  });

  it("emits use-raw|reject actions for RNS HKDF", () => {
    const deriveFrom = new Uint8Array([1, 2, 3, 4]);
    const ok = stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), {
      kind: "rns-hkdf/derive-gate",
      length: 32,
      deriveFrom,
      salt: null,
      context: null
    });
    expect(shouldUseRnsHkdfSha256(ok.actions)).toBe(true);
    expect(shouldRejectRnsHkdfSha256(ok.actions)).toBe(false);
    const raw = rnsHkdfSha256RawFromActions(ok.actions)!;
    expect([...raw]).toEqual([
      ...rnsHkdfSha256({ length: 32, deriveFrom, salt: null, context: null })
    ]);

    const rejected = stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), {
      kind: "rns-hkdf/derive-gate",
      length: 16,
      deriveFrom: new Uint8Array()
    });
    expect(shouldRejectRnsHkdfSha256(rejected.actions)).toBe(true);
    expect(rnsHkdfSha256RawFromActions(rejected.actions)).toBeNull();
  });

  it("emits use-raw|reject actions for link key derive", () => {
    const shared = new Uint8Array(32).map((_, i) => i);
    const linkId = new Uint8Array(16).map((_, i) => 100 + i);
    const ok = stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), {
      kind: "link-key/derive-gate",
      sharedSecret: shared,
      linkId,
      mode: LinkKeyMode.MODE_AES256_CBC
    });
    expect(shouldUseDeriveRnsLinkKey(ok.actions)).toBe(true);
    expect(shouldRejectDeriveRnsLinkKey(ok.actions)).toBe(false);
    const raw = deriveRnsLinkKeyRawFromActions(ok.actions)!;
    expect([...raw]).toEqual([...deriveRnsLinkKey(shared, linkId, LinkKeyMode.MODE_AES256_CBC)]);

    const rejected = stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), {
      kind: "link-key/derive-gate",
      sharedSecret: new Uint8Array(),
      linkId
    });
    expect(shouldRejectDeriveRnsLinkKey(rejected.actions)).toBe(true);
    expect(deriveRnsLinkKeyRawFromActions(rejected.actions)).toBeNull();
  });

  it("emits use-raw|reject actions for order-independent shared secret", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([9, 8, 7, 6]);
    const ok = stepOrderIndependentSharedSecretWithActions(
      initialOrderIndependentSharedSecretState(),
      {
        kind: "link-key/order-independent-shared-secret-gate",
        a,
        b
      }
    );
    expect(shouldUseOrderIndependentSharedSecret(ok.actions)).toBe(true);
    expect(shouldRejectOrderIndependentSharedSecret(ok.actions)).toBe(false);
    const raw = orderIndependentSharedSecretRawFromActions(ok.actions)!;
    expect([...raw]).toEqual([...orderIndependentSharedSecret(a, b)]);
  });

  it("is deterministic for identical HKDF / derive events", () => {
    const shared = new Uint8Array(32).fill(7);
    const linkId = new Uint8Array(16).fill(3);
    const hkdfEvent = {
      kind: "rns-hkdf/derive-gate" as const,
      length: 32,
      deriveFrom: shared,
      salt: linkId,
      context: null
    };
    expect(
      stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), hkdfEvent)
    ).toEqual(stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), hkdfEvent));

    const deriveEvent = {
      kind: "link-key/derive-gate" as const,
      sharedSecret: shared,
      linkId,
      mode: LinkKeyMode.MODE_AES256_CBC
    };
    expect(
      stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), deriveEvent)
    ).toEqual(stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), deriveEvent));
  });
});
