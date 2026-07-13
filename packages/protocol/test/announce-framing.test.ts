import { describe, expect, it } from "vitest";
import {
  ANNOUNCE_NAME_HASH_SIZE,
  ANNOUNCE_PUBLIC_KEY_SIZE,
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE,
  announceDestinationHashMaterial,
  announceSignedMaterial,
  packAnnouncePayload,
  parseAnnouncePayload
} from "../src/announce-framing.js";

describe("protocol announce framing", () => {
  const publicKey = new Uint8Array(ANNOUNCE_PUBLIC_KEY_SIZE).fill(1);
  const nameHash = new Uint8Array(ANNOUNCE_NAME_HASH_SIZE).fill(2);
  const randomHash = new Uint8Array(ANNOUNCE_RANDOM_HASH_SIZE).fill(3);
  const ratchet = new Uint8Array(ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE).fill(4);
  const signature = new Uint8Array(ANNOUNCE_SIGNATURE_SIZE).fill(5);
  const appData = new Uint8Array([9, 8, 7]);
  const destinationHash = new Uint8Array(16).fill(6);

  it("round-trips announce payloads with ratchet and app data", () => {
    const packed = packAnnouncePayload({
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: ratchet,
      signature,
      appData
    });
    const parsed = parseAnnouncePayload(packed, true);
    expect(parsed).not.toBeNull();
    expect([...parsed!.publicKey]).toEqual([...publicKey]);
    expect([...parsed!.ratchetPublicKey!]).toEqual([...ratchet]);
    expect([...parsed!.appData!]).toEqual([...appData]);
  });

  it("parses announces without ratchet", () => {
    const packed = packAnnouncePayload({
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: null,
      signature,
      appData: null
    });
    const parsed = parseAnnouncePayload(packed, false);
    expect(parsed!.ratchetPublicKey).toBeNull();
    expect(parsed!.appData).toBeNull();
  });

  it("builds signed and destination-hash material deterministically", () => {
    const signed = announceSignedMaterial({
      destinationHash,
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: ratchet,
      appData
    });
    expect(signed.length).toBe(
      destinationHash.length +
        publicKey.length +
        nameHash.length +
        randomHash.length +
        ratchet.length +
        appData.length
    );
    const material = announceDestinationHashMaterial(nameHash, destinationHash);
    expect(material.length).toBe(nameHash.length + destinationHash.length);
  });
});
