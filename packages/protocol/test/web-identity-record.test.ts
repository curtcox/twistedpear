import { describe, expect, it } from "vitest";
import {
  WEB_IDENTITY_IV_BYTES,
  WEB_IDENTITY_SALT_BYTES,
  initialPackWebIdentityRecordState,
  initialSplitWebIdentityRecordState,
  packWebIdentityRecord,
  packWebIdentityRecordRawFromActions,
  shouldRejectPackWebIdentityRecord,
  shouldRejectSplitWebIdentityRecord,
  shouldUsePackWebIdentityRecord,
  shouldUseSplitWebIdentityRecord,
  splitWebIdentityRecord,
  stepPackWebIdentityRecordWithActions,
  stepSplitWebIdentityRecordWithActions,
  webIdentityRecordFieldsFromActions,
} from "../src/web-identity-record.js";

describe("protocol web identity record", () => {
  it("packs and splits salt||iv||ciphertext", () => {
    const salt = new Uint8Array(WEB_IDENTITY_SALT_BYTES).fill(1);
    const iv = new Uint8Array(WEB_IDENTITY_IV_BYTES).fill(2);
    const ciphertext = new Uint8Array(24).fill(3);
    const packed = packWebIdentityRecord(salt, iv, ciphertext);
    const split = splitWebIdentityRecord(packed);
    expect([...split.salt]).toEqual([...salt]);
    expect([...split.iv]).toEqual([...iv]);
    expect([...split.ciphertext]).toEqual([...ciphertext]);
  });

  it("rejects truncated records", () => {
    expect(() => splitWebIdentityRecord(new Uint8Array(20))).toThrow(
      /truncated/,
    );
  });

  it("emits use-raw / reject from pack-gate", () => {
    const salt = new Uint8Array(WEB_IDENTITY_SALT_BYTES).fill(1);
    const iv = new Uint8Array(WEB_IDENTITY_IV_BYTES).fill(2);
    const ciphertext = new Uint8Array(24).fill(3);

    const ok = stepPackWebIdentityRecordWithActions(
      initialPackWebIdentityRecordState(),
      {
        kind: "web-identity/pack-gate",
        salt,
        iv,
        ciphertext,
      },
    );
    expect(shouldUsePackWebIdentityRecord(ok.actions)).toBe(true);
    expect(shouldRejectPackWebIdentityRecord(ok.actions)).toBe(false);
    const raw = packWebIdentityRecordRawFromActions(ok.actions);
    expect(raw).not.toBeNull();
    expect([...raw!]).toEqual([...packWebIdentityRecord(salt, iv, ciphertext)]);

    const badSalt = stepPackWebIdentityRecordWithActions(
      initialPackWebIdentityRecordState(),
      {
        kind: "web-identity/pack-gate",
        salt: new Uint8Array(8),
        iv,
        ciphertext,
      },
    );
    expect(shouldRejectPackWebIdentityRecord(badSalt.actions)).toBe(true);
    expect(shouldUsePackWebIdentityRecord(badSalt.actions)).toBe(false);
    expect(packWebIdentityRecordRawFromActions(badSalt.actions)).toBeNull();
  });

  it("emits use-fields / reject from split-gate", () => {
    const salt = new Uint8Array(WEB_IDENTITY_SALT_BYTES).fill(1);
    const iv = new Uint8Array(WEB_IDENTITY_IV_BYTES).fill(2);
    const ciphertext = new Uint8Array(24).fill(3);
    const packed = packWebIdentityRecord(salt, iv, ciphertext);

    const ok = stepSplitWebIdentityRecordWithActions(
      initialSplitWebIdentityRecordState(),
      {
        kind: "web-identity/split-gate",
        packed,
      },
    );
    expect(shouldUseSplitWebIdentityRecord(ok.actions)).toBe(true);
    expect(shouldRejectSplitWebIdentityRecord(ok.actions)).toBe(false);
    const fields = webIdentityRecordFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.salt]).toEqual([...salt]);
    expect([...fields!.iv]).toEqual([...iv]);
    expect([...fields!.ciphertext]).toEqual([...ciphertext]);

    const truncated = stepSplitWebIdentityRecordWithActions(
      initialSplitWebIdentityRecordState(),
      {
        kind: "web-identity/split-gate",
        packed: new Uint8Array(20),
      },
    );
    expect(shouldRejectSplitWebIdentityRecord(truncated.actions)).toBe(true);
    expect(shouldUseSplitWebIdentityRecord(truncated.actions)).toBe(false);
    expect(webIdentityRecordFieldsFromActions(truncated.actions)).toBeNull();
  });
});
