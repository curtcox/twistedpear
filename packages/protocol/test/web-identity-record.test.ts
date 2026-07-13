import { describe, expect, it } from "vitest";
import {
  WEB_IDENTITY_IV_BYTES,
  WEB_IDENTITY_SALT_BYTES,
  packWebIdentityRecord,
  splitWebIdentityRecord
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
    expect(() => splitWebIdentityRecord(new Uint8Array(20))).toThrow(/truncated/);
  });
});
