import { describe, expect, it } from "vitest";
import {
  TOKEN_HMAC_SIZE,
  TOKEN_IV_SIZE,
  TOKEN_OVERHEAD,
  initialAcceptTokenFrameState,
  initialPackTokenFrameState,
  initialSplitTokenFrameState,
  initialSplitTokenKeyState,
  initialTokenHmacMatchState,
  initialTokenIvLengthValidState,
  initialTokenSignedMaterialState,
  isValidTokenIvLength,
  packTokenFrame,
  packTokenFrameRawFromActions,
  shouldAcceptTokenFrame,
  shouldAcceptTokenFrameNow,
  shouldAcceptTokenIvLength,
  shouldMatchTokenHmac,
  shouldMismatchTokenHmac,
  shouldRejectPackTokenFrame,
  shouldRejectSplitTokenFrame,
  shouldRejectSplitTokenKey,
  shouldRejectTokenIvLength,
  shouldRejectTokenSignedMaterial,
  shouldSkipAcceptTokenFrame,
  shouldUsePackTokenFrame,
  shouldUseSplitTokenFrame,
  shouldUseSplitTokenKey,
  shouldUseTokenSignedMaterial,
  splitTokenFrame,
  splitTokenKey,
  stepAcceptTokenFrameWithActions,
  stepPackTokenFrameWithActions,
  stepSplitTokenFrameWithActions,
  stepSplitTokenKeyWithActions,
  stepTokenHmacMatchWithActions,
  stepTokenIvLengthValidWithActions,
  stepTokenSignedMaterialWithActions,
  tokenFrameFieldsFromActions,
  tokenHmacMatches,
  tokenKeyFieldsFromActions,
  tokenSignedMaterial,
  tokenSignedMaterialRawFromActions,
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

  it("emits key-split fields or reject from WithActions steps", () => {
    const key128 = new Uint8Array(32).map((_, i) => i);
    const ok = stepSplitTokenKeyWithActions(initialSplitTokenKeyState(), {
      kind: "token-framing/split-key-gate",
      key: key128,
    });
    expect(shouldUseSplitTokenKey(ok.actions)).toBe(true);
    expect(shouldRejectSplitTokenKey(ok.actions)).toBe(false);
    const fields = tokenKeyFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect(fields!.mode).toBe("aes128");
    expect([...fields!.signingKey]).toEqual([...key128.subarray(0, 16)]);
    expect([...fields!.encryptionKey]).toEqual([...key128.subarray(16, 32)]);

    const rejected = stepSplitTokenKeyWithActions(initialSplitTokenKeyState(), {
      kind: "token-framing/split-key-gate",
      key: new Uint8Array(10),
    });
    expect(shouldRejectSplitTokenKey(rejected.actions)).toBe(true);
    expect(shouldUseSplitTokenKey(rejected.actions)).toBe(false);
    expect(tokenKeyFieldsFromActions(rejected.actions)).toBeNull();
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
    expect([...split!.signedMaterial]).toEqual([
      ...tokenSignedMaterial(iv, ciphertext),
    ]);
    expect(tokenHmacMatches(split!.hmac, hmac)).toBe(true);
  });

  it("rejects short frames and bad key sizes", () => {
    expect(splitTokenFrame(new Uint8Array(TOKEN_OVERHEAD))).toBeNull();
    expect(() => splitTokenKey(new Uint8Array(10))).toThrow(/32 or 64/);
  });

  it("gates IV length and frame presence", () => {
    expect(isValidTokenIvLength(TOKEN_IV_SIZE)).toBe(true);
    expect(isValidTokenIvLength(8)).toBe(false);
    expect(shouldAcceptTokenFrame(true)).toBe(true);
    expect(shouldAcceptTokenFrame(false)).toBe(false);
  });

  it("emits IV-length valid or invalid from WithActions steps", () => {
    expect(
      shouldAcceptTokenIvLength(
        stepTokenIvLengthValidWithActions(initialTokenIvLengthValidState(), {
          kind: "token-framing/iv-length-valid-gate",
          length: TOKEN_IV_SIZE,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldRejectTokenIvLength(
        stepTokenIvLengthValidWithActions(initialTokenIvLengthValidState(), {
          kind: "token-framing/iv-length-valid-gate",
          length: 8,
        }).actions,
      ),
    ).toBe(true);
  });

  it("emits frame accept or skip from WithActions steps", () => {
    expect(
      shouldAcceptTokenFrameNow(
        stepAcceptTokenFrameWithActions(initialAcceptTokenFrameState(), {
          kind: "token-framing/accept-frame-gate",
          framePresent: true,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipAcceptTokenFrame(
        stepAcceptTokenFrameWithActions(initialAcceptTokenFrameState(), {
          kind: "token-framing/accept-frame-gate",
          framePresent: false,
        }).actions,
      ),
    ).toBe(true);
  });

  it("emits signed-material raw or reject from WithActions steps", () => {
    const iv = new Uint8Array(TOKEN_IV_SIZE).fill(1);
    const ciphertext = new Uint8Array([9, 8, 7, 6]);
    const ok = stepTokenSignedMaterialWithActions(
      initialTokenSignedMaterialState(),
      {
        kind: "token-framing/signed-material-gate",
        iv,
        ciphertext,
      },
    );
    expect(shouldUseTokenSignedMaterial(ok.actions)).toBe(true);
    expect(shouldRejectTokenSignedMaterial(ok.actions)).toBe(false);
    const material = tokenSignedMaterialRawFromActions(ok.actions);
    expect(material).not.toBeNull();
    expect([...material!]).toEqual([...tokenSignedMaterial(iv, ciphertext)]);

    const rejected = stepTokenSignedMaterialWithActions(
      initialTokenSignedMaterialState(),
      {
        kind: "token-framing/signed-material-gate",
        iv: new Uint8Array(8),
        ciphertext,
      },
    );
    expect(shouldRejectTokenSignedMaterial(rejected.actions)).toBe(true);
    expect(shouldUseTokenSignedMaterial(rejected.actions)).toBe(false);
    expect(tokenSignedMaterialRawFromActions(rejected.actions)).toBeNull();
  });

  it("emits match or mismatch from HMAC match WithActions steps", () => {
    const hmac = new Uint8Array(TOKEN_HMAC_SIZE).fill(2);
    const match = stepTokenHmacMatchWithActions(initialTokenHmacMatchState(), {
      kind: "token-framing/hmac-match-gate",
      received: hmac,
      expected: hmac,
    });
    expect(shouldMatchTokenHmac(match.actions)).toBe(true);
    expect(shouldMismatchTokenHmac(match.actions)).toBe(false);
    expect(tokenHmacMatches(hmac, hmac)).toBe(true);

    const other = new Uint8Array(TOKEN_HMAC_SIZE).fill(9);
    const mismatch = stepTokenHmacMatchWithActions(
      initialTokenHmacMatchState(),
      {
        kind: "token-framing/hmac-match-gate",
        received: hmac,
        expected: other,
      },
    );
    expect(shouldMatchTokenHmac(mismatch.actions)).toBe(false);
    expect(shouldMismatchTokenHmac(mismatch.actions)).toBe(true);
  });

  it("emits pack raw or reject from WithActions steps", () => {
    const iv = new Uint8Array(TOKEN_IV_SIZE).fill(1);
    const ciphertext = new Uint8Array([9, 8, 7, 6]);
    const hmac = new Uint8Array(TOKEN_HMAC_SIZE).fill(2);
    const ok = stepPackTokenFrameWithActions(initialPackTokenFrameState(), {
      kind: "token-framing/pack-gate",
      iv,
      ciphertext,
      hmac,
    });
    expect(shouldUsePackTokenFrame(ok.actions)).toBe(true);
    expect(shouldRejectPackTokenFrame(ok.actions)).toBe(false);
    const packed = packTokenFrameRawFromActions(ok.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packTokenFrame({ iv, ciphertext, hmac })]);

    const rejected = stepPackTokenFrameWithActions(
      initialPackTokenFrameState(),
      {
        kind: "token-framing/pack-gate",
        iv: new Uint8Array(8),
        ciphertext,
        hmac,
      },
    );
    expect(shouldRejectPackTokenFrame(rejected.actions)).toBe(true);
    expect(shouldUsePackTokenFrame(rejected.actions)).toBe(false);
    expect(packTokenFrameRawFromActions(rejected.actions)).toBeNull();
  });

  it("emits split fields or reject from WithActions steps", () => {
    const iv = new Uint8Array(TOKEN_IV_SIZE).fill(1);
    const ciphertext = new Uint8Array([9, 8, 7, 6]);
    const hmac = new Uint8Array(TOKEN_HMAC_SIZE).fill(2);
    const packed = packTokenFrame({ iv, ciphertext, hmac });
    const ok = stepSplitTokenFrameWithActions(initialSplitTokenFrameState(), {
      kind: "token-framing/split-gate",
      token: packed,
    });
    expect(shouldUseSplitTokenFrame(ok.actions)).toBe(true);
    expect(shouldRejectSplitTokenFrame(ok.actions)).toBe(false);
    const fields = tokenFrameFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.iv]).toEqual([...iv]);
    expect([...fields!.ciphertext]).toEqual([...ciphertext]);
    expect([...fields!.hmac]).toEqual([...hmac]);

    const rejected = stepSplitTokenFrameWithActions(
      initialSplitTokenFrameState(),
      {
        kind: "token-framing/split-gate",
        token: new Uint8Array(TOKEN_OVERHEAD),
      },
    );
    expect(shouldRejectSplitTokenFrame(rejected.actions)).toBe(true);
    expect(shouldUseSplitTokenFrame(rejected.actions)).toBe(false);
    expect(tokenFrameFieldsFromActions(rejected.actions)).toBeNull();
  });
});
