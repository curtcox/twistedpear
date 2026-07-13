import { describe, expect, it } from "vitest";
import {
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
  decodeIdentityRatchetRecord,
  encodeIdentityRatchetRecord,
  identityRatchetStoreKey,
  isIdentityRatchetRecordUsable
} from "../src/identity-ratchet-record.js";

describe("protocol identity ratchet record", () => {
  it("round-trips JSON records", () => {
    const ratchet = new Uint8Array(IDENTITY_RATCHET_BYTES).fill(0xab);
    const encoded = encodeIdentityRatchetRecord({ ratchet, received: 1_700_000_000 });
    const decoded = decodeIdentityRatchetRecord(encoded);
    expect([...decoded.ratchet]).toEqual([...ratchet]);
    expect(decoded.received).toBe(1_700_000_000);
  });

  it("builds store keys and checks usability", () => {
    expect(identityRatchetStoreKey("deadbeef")).toBe("ratchets/deadbeef");
    const good = {
      ratchet: new Uint8Array(IDENTITY_RATCHET_BYTES).fill(1),
      received: 100
    };
    expect(isIdentityRatchetRecordUsable(good, 100)).toBe(true);
    expect(
      isIdentityRatchetRecordUsable(good, 100 + IDENTITY_RATCHET_EXPIRY_SECONDS)
    ).toBe(false);
    expect(
      isIdentityRatchetRecordUsable(
        { ratchet: new Uint8Array(8), received: 100 },
        100
      )
    ).toBe(false);
  });
});
