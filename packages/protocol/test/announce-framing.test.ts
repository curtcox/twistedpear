import { describe, expect, it } from "vitest";
import {
  ANNOUNCE_NAME_HASH_SIZE,
  ANNOUNCE_PUBLIC_KEY_SIZE,
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE,
  announceDestinationHashMaterial,
  announceSignedMaterial,
  isAnnouncePacketType,
  packAnnouncePayload,
  parseAnnouncePayload,
  planAnnounceBuild,
  planAnnounceValidateOutcome,
  shouldAttemptAnnounceSignatureValidate,
  shouldAcceptAnnouncePayload,
  shouldAcceptParsedAnnounce,
  shouldCheckAnnounceDestinationHash
} from "../src/announce-framing.js";
import { PACKET_TYPE_ANNOUNCE, PACKET_TYPE_DATA } from "../src/packet-header.js";

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

  it("plans announce build gates", () => {
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null
      })
    ).toBe("ok");
    expect(
      planAnnounceBuild({
        typeSingle: false,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null
      })
    ).toBe("not-announceable-type");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: false,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null
      })
    ).toBe("not-announceable-direction");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: false,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null
      })
    ).toBe("missing-identity");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: 3,
        ratchetPublicKeyLength: null
      })
    ).toBe("bad-random-hash");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: 8
      })
    ).toBe("bad-ratchet");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE
      })
    ).toBe("ok");
  });

  it("recognizes announce packet types and plans validate outcomes", () => {
    expect(isAnnouncePacketType(PACKET_TYPE_ANNOUNCE)).toBe(true);
    expect(isAnnouncePacketType(PACKET_TYPE_DATA)).toBe(false);
    expect(
      planAnnounceValidateOutcome({
        parsedOk: false,
        publicKeyLoaded: false,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false
      })
    ).toBe("reject-parse");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: false,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false
      })
    ).toBe("reject-public-key");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false
      })
    ).toBe("reject-signature");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true,
        destinationHashMatches: false
      })
    ).toBe("accept-signature-only");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
        destinationHashMatches: false
      })
    ).toBe("reject-destination-hash");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
        destinationHashMatches: true
      })
    ).toBe("accept");
    expect(
      shouldAttemptAnnounceSignatureValidate({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true
      })
    ).toBe(true);
    expect(
      shouldAttemptAnnounceSignatureValidate({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: false
      })
    ).toBe(false);
    expect(
      shouldCheckAnnounceDestinationHash({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false
      })
    ).toBe(true);
    expect(
      shouldCheckAnnounceDestinationHash({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true
      })
    ).toBe(false);
    expect(shouldAcceptAnnouncePayload(true)).toBe(true);
    expect(shouldAcceptAnnouncePayload(false)).toBe(false);
    expect(shouldAcceptParsedAnnounce(true)).toBe(true);
    expect(shouldAcceptParsedAnnounce(false)).toBe(false);
  });
});
