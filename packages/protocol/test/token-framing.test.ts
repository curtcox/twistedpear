import { describe, expect, it } from "vitest";
import {
  TOKEN_HMAC_SIZE,
  TOKEN_IV_SIZE,
  TOKEN_OVERHEAD,
  packTokenFrame,
  splitTokenFrame,
  splitTokenKey,
  tokenHmacMatches,
  tokenSignedMaterial
} from "../src/token-framing.js";

describe("protocol token framing", () => {
  it("splits 32- and 64-byte keys", () => {
    const key128 = new Uint8Array(32).map((_, i) => i);
    const parts128 = splitTokenKey(key128);
    expect(parts128.mode).toBe("aes128");
    expect(parts128.signingKey.length).toBe(16);
    expect(parts128.encryptionKey.length).toBe(16);

    const key256 = new Uint8Array(64).map((_, i) => i);
    const parts256 = splitTokenKey(key256);
    expect(parts256.mode).toBe("aes256");
    expect(parts256.signingKey.length).toBe(32);
  });

  it("packs and splits token frames", () => {
    const iv = new Uint8Array(TOKEN_IV_SIZE).fill(1);
    const ciphertext = new Uint8Array([9, 8, 7, 6]);
    const hmac = new Uint8Array(TOKEN_HMAC_SIZE).fill(2);
    const packed = packTokenFrame({ iv, ciphertext, hmac });
    expect(packed.length).toBe(TOKEN_OVERHEAD + ciphertext.length);
    const split = splitTokenFrame(packed);
    expect(split).not.toBeNull();
    expect([...split!.iv]).toEqual([...iv]);
    expect([...split!.ciphertext]).toEqual([...ciphertext]);
    expect([...split!.hmac]).toEqual([...hmac]);
    expect([...split!.signedMaterial]).toEqual([...tokenSignedMaterial(iv, ciphertext)]);
    expect(tokenHmacMatches(split!.hmac, hmac)).toBe(true);
  });

  it("rejects short frames and bad key sizes", () => {
    expect(splitTokenFrame(new Uint8Array(TOKEN_OVERHEAD))).toBeNull();
    expect(() => splitTokenKey(new Uint8Array(10))).toThrow(/32 or 64/);
  });
});
