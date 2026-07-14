import { describe, expect, it } from "vitest";
import {
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
  decodeIdentityRatchetRecord,
  encodeIdentityRatchetRecord,
  identityRatchetStoreKey,
  isIdentityRatchetRecordUsable,
  planIdentityRatchetLookup,
  shouldPersistIdentityRatchet,
  shouldRestoreIdentityRatchetRecord
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

  it("plans ratchet lookup across cache and store", () => {
    expect(
      planIdentityRatchetLookup({
        cachedPresent: true,
        storePresent: false,
        storedPresent: false,
        usable: false
      })
    ).toBe("use-cache");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: false,
        storedPresent: false,
        usable: false
      })
    ).toBe("miss-no-store");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: true,
        storedPresent: false,
        usable: false
      })
    ).toBe("miss-store");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: false
      })
    ).toBe("reject-unusable");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: true
      })
    ).toBe("restore");
  });

  it("gates ratchet store persistence", () => {
    expect(shouldPersistIdentityRatchet(true)).toBe(true);
    expect(shouldPersistIdentityRatchet(false)).toBe(false);
    expect(
      shouldRestoreIdentityRatchetRecord({
        planRestore: true,
        recordPresent: true
      })
    ).toBe(true);
    expect(
      shouldRestoreIdentityRatchetRecord({
        planRestore: true,
        recordPresent: false
      })
    ).toBe(false);
  });
});
