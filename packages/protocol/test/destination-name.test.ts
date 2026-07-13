import { describe, expect, it } from "vitest";
import {
  DESTINATION_IDENTITY_HASH_BYTES,
  DESTINATION_NAME_HASH_BYTES,
  destinationHashMaterial,
  destinationNameHashMaterial,
  expandDestinationName,
  validateDestinationNamePart
} from "../src/destination-name.js";
import { utf8Decode, utf8Encode } from "../src/utf8.js";

describe("protocol utf8", () => {
  it("round-trips ascii and multi-byte", () => {
    const samples = ["hello", "café", "𝄞"];
    for (const sample of samples) {
      expect(utf8Decode(utf8Encode(sample))).toBe(sample);
    }
  });
});

describe("protocol destination name", () => {
  it("expands app and aspects without identity", () => {
    expect(expandDestinationName(null, "lxmf", ["delivery"])).toBe("lxmf.delivery");
  });

  it("appends identity hex when present", () => {
    const identity = new Uint8Array(DESTINATION_IDENTITY_HASH_BYTES).map((_, i) => i);
    const name = expandDestinationName(identity, "app", ["a", "b"]);
    expect(name.startsWith("app.a.b.")).toBe(true);
    expect(name.endsWith("000102030405060708090a0b0c0d0e0f")).toBe(true);
  });

  it("rejects empty or dotted name parts", () => {
    expect(() => validateDestinationNamePart("", "app name")).toThrow(/empty/);
    expect(() => validateDestinationNamePart("a.b", "aspect")).toThrow(/Dots/);
  });

  it("builds deterministic name-hash material", () => {
    const material = destinationNameHashMaterial("rnstest", ["aspect"]);
    expect([...material]).toEqual([...utf8Encode("rnstest.aspect")]);
    expect(DESTINATION_NAME_HASH_BYTES).toBe(10);
  });

  it("concatenates name and identity hashes for destination material", () => {
    const nameHash = new Uint8Array(DESTINATION_NAME_HASH_BYTES).fill(1);
    const identity = new Uint8Array(DESTINATION_IDENTITY_HASH_BYTES).fill(2);
    const material = destinationHashMaterial(nameHash, identity);
    expect(material.length).toBe(DESTINATION_NAME_HASH_BYTES + DESTINATION_IDENTITY_HASH_BYTES);
    expect([...material.subarray(0, DESTINATION_NAME_HASH_BYTES)]).toEqual([...nameHash]);
    expect([...destinationHashMaterial(nameHash, null)]).toEqual([...nameHash]);
  });
});
