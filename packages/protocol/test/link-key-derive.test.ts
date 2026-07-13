import { describe, expect, it } from "vitest";
import { normalizeRnsHkdfParams, rnsHkdfSha256 } from "../src/rns-hkdf.js";
import {
  LINK_ENABLED_MODES,
  LINK_MODE_DEFAULT,
  LinkKeyMode,
  LinkMode,
  deriveRnsLinkKey,
  linkDerivedKeyLength,
  orderIndependentSharedSecret
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
    expect(LINK_ENABLED_MODES).toEqual([LinkKeyMode.MODE_AES256_CBC]);
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
});
