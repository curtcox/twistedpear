import { describe, expect, it } from "vitest";
import {
  ANNOUNCE_NAME_HASH_SIZE,
  ANNOUNCE_PUBLIC_KEY_SIZE,
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE,
  announceDestinationHashMaterial,
  announcePayloadFieldsFromActions,
  announceSignedMaterial,
  initialAnnounceBuildState,
  initialAnnounceValidateState,
  initialPackAnnouncePayloadState,
  initialParseAnnouncePayloadState,
  isAnnouncePacketType,
  packAnnouncePayload,
  packAnnouncePayloadRawFromActions,
  parseAnnouncePayload,
  planAnnounceBuild,
  planAnnounceValidateOutcome,
  shouldAcceptAnnouncePayload,
  shouldAcceptAnnounceValidate,
  shouldAcceptParsedAnnounce,
  shouldAttemptAnnounceSignatureValidate,
  shouldCheckAnnounceDestinationHash,
  shouldProceedAnnounceBuild,
  shouldRejectAnnounceBuildBadRandomHash,
  shouldRejectAnnounceBuildBadRatchet,
  shouldRejectAnnounceBuildMissingIdentity,
  shouldRejectAnnounceBuildNotAnnounceableDirection,
  shouldRejectAnnounceBuildNotAnnounceableType,
  shouldRejectParseAnnouncePayload,
  shouldUsePackAnnouncePayload,
  shouldUseParseAnnouncePayload,
  stepAnnounceBuildWithActions,
  stepAnnounceValidateWithActions,
  stepPackAnnouncePayloadWithActions,
  stepParseAnnouncePayloadWithActions
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

  it("emits announce build actions from stepAnnounceBuildWithActions", () => {
    const proceed = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    });
    expect(proceed.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedAnnounceBuild(proceed.actions)).toBe(true);

    const typeReject = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: false,
      directionIn: true,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    });
    expect(typeReject.actions).toEqual([{ kind: "reject-not-announceable-type" }]);
    expect(shouldRejectAnnounceBuildNotAnnounceableType(typeReject.actions)).toBe(true);

    const directionReject = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: false,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    });
    expect(directionReject.actions).toEqual([{ kind: "reject-not-announceable-direction" }]);
    expect(shouldRejectAnnounceBuildNotAnnounceableDirection(directionReject.actions)).toBe(
      true
    );

    const missingIdentity = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: false,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    });
    expect(missingIdentity.actions).toEqual([{ kind: "reject-missing-identity" }]);
    expect(shouldRejectAnnounceBuildMissingIdentity(missingIdentity.actions)).toBe(true);

    const badHash = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: 3,
      ratchetPublicKeyLength: null
    });
    expect(badHash.actions).toEqual([{ kind: "reject-bad-random-hash" }]);
    expect(shouldRejectAnnounceBuildBadRandomHash(badHash.actions)).toBe(true);

    const badRatchet = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: 8
    });
    expect(badRatchet.actions).toEqual([{ kind: "reject-bad-ratchet" }]);
    expect(shouldRejectAnnounceBuildBadRatchet(badRatchet.actions)).toBe(true);
  });

  it("is deterministic for announce build gate events", () => {
    const state = initialAnnounceBuildState();
    const event = {
      kind: "announce/build-gate" as const,
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    };
    const a = stepAnnounceBuildWithActions(state, event);
    const b = stepAnnounceBuildWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
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

    const accept = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: false,
      destinationHashMatches: true
    });
    expect(accept.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptAnnounceValidate(accept.actions)).toBe(true);

    const signatureOnly = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: true,
      destinationHashMatches: false
    });
    expect(signatureOnly.actions).toEqual([{ kind: "accept-signature-only" }]);
    expect(shouldAcceptAnnounceValidate(signatureOnly.actions)).toBe(true);

    const rejectParse = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: false,
      publicKeyLoaded: false,
      signatureValid: false,
      onlyValidateSignature: false,
      destinationHashMatches: false
    });
    expect(rejectParse.actions).toEqual([{ kind: "reject-parse" }]);
    expect(shouldAcceptAnnounceValidate(rejectParse.actions)).toBe(false);

    const a = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: false,
      destinationHashMatches: true
    });
    const b = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: false,
      destinationHashMatches: true
    });
    expect(a).toEqual(b);

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

  it("emits pack framing bytes from WithActions step", () => {
    const stepped = stepPackAnnouncePayloadWithActions(initialPackAnnouncePayloadState(), {
      kind: "announce/pack-payload-gate",
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: ratchet,
      signature,
      appData
    });
    expect(shouldUsePackAnnouncePayload(stepped.actions)).toBe(true);
    const packed = packAnnouncePayloadRawFromActions(stepped.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([
      ...packAnnouncePayload({
        publicKey,
        nameHash,
        randomHash,
        ratchetPublicKey: ratchet,
        signature,
        appData
      })
    ]);
  });

  it("emits parse fields or reject from WithActions step", () => {
    const packed = packAnnouncePayload({
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: ratchet,
      signature,
      appData
    });
    const ok = stepParseAnnouncePayloadWithActions(initialParseAnnouncePayloadState(), {
      kind: "announce/parse-payload-gate",
      data: packed,
      hasRatchet: true
    });
    expect(shouldUseParseAnnouncePayload(ok.actions)).toBe(true);
    expect(shouldRejectParseAnnouncePayload(ok.actions)).toBe(false);
    const fields = announcePayloadFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.publicKey]).toEqual([...publicKey]);
    expect([...fields!.ratchetPublicKey!]).toEqual([...ratchet]);
    expect([...fields!.appData!]).toEqual([...appData]);

    const rejected = stepParseAnnouncePayloadWithActions(initialParseAnnouncePayloadState(), {
      kind: "announce/parse-payload-gate",
      data: new Uint8Array(8),
      hasRatchet: true
    });
    expect(shouldRejectParseAnnouncePayload(rejected.actions)).toBe(true);
    expect(shouldUseParseAnnouncePayload(rejected.actions)).toBe(false);
    expect(announcePayloadFieldsFromActions(rejected.actions)).toBeNull();
  });
});
