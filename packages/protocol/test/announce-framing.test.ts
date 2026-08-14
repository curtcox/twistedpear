import { describe, expect, it } from "vitest";
import {
  ANNOUNCE_NAME_HASH_SIZE,
  ANNOUNCE_PUBLIC_KEY_SIZE,
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE,
  announceBuildPlanFromActions,
  announceDestinationHashMaterial,
  announceDestinationHashMaterialRawFromActions,
  announceDestinationHashMatches,
  announcePayloadFieldsFromActions,
  announceSignedMaterial,
  announceSignedMaterialRawFromActions,
  announceValidateOutcomePlanFromActions,
  initialAcceptAnnouncePayloadState,
  initialAcceptParsedAnnounceState,
  initialAnnounceBuildPlanState,
  initialAnnounceBuildState,
  initialAnnounceDestinationHashMatchState,
  initialAnnounceDestinationHashMaterialState,
  initialAnnouncePacketTypeState,
  initialAnnounceSignedMaterialState,
  initialAnnounceValidateOutcomePlanState,
  initialAnnounceValidateState,
  initialAttemptAnnounceSignatureValidateState,
  initialCheckAnnounceDestinationHashState,
  initialPackAnnouncePayloadState,
  initialParseAnnouncePayloadState,
  isAnnouncePacketType,
  packAnnouncePayload,
  packAnnouncePayloadRawFromActions,
  parseAnnouncePayload,
  planAnnounceBuild,
  planAnnounceValidateOutcome,
  shouldAcceptAnnouncePayload,
  shouldAcceptAnnouncePayloadNow,
  shouldAcceptAnnounceValidate,
  shouldAcceptAnnounceValidateOutcomePlan,
  shouldAcceptParsedAnnounce,
  shouldAcceptParsedAnnounceNow,
  shouldAttemptAnnounceSignatureValidate,
  shouldAttemptAnnounceSignatureValidateNow,
  shouldCheckAnnounceDestinationHash,
  shouldCheckAnnounceDestinationHashNow,
  shouldMatchAnnounceDestinationHash,
  shouldMismatchAnnounceDestinationHash,
  shouldOkAnnounceBuildPlan,
  shouldProceedAnnounceBuild,
  shouldRejectAnnounceBuildBadRandomHash,
  shouldRejectAnnounceBuildBadRatchet,
  shouldRejectAnnounceBuildMissingIdentity,
  shouldRejectAnnounceBuildNotAnnounceableDirection,
  shouldRejectAnnounceBuildNotAnnounceableType,
  shouldRejectAnnounceBuildPlanBadRandomHash,
  shouldRejectAnnounceBuildPlanBadRatchet,
  shouldRejectAnnounceBuildPlanMissingIdentity,
  shouldRejectAnnounceBuildPlanNotAnnounceableDirection,
  shouldRejectAnnounceBuildPlanNotAnnounceableType,
  shouldRejectParseAnnouncePayload,
  shouldSkipAnnounceDestinationHashCheck,
  shouldSkipAnnouncePayloadAccept,
  shouldSkipAnnounceSignatureValidate,
  shouldSkipParsedAnnounceAccept,
  shouldTreatAnnouncePacketType,
  shouldTreatAnnouncePacketTypeOther,
  shouldUseAnnounceDestinationHashMaterial,
  shouldUseAnnounceSignedMaterial,
  shouldUsePackAnnouncePayload,
  shouldUseParseAnnouncePayload,
  stepAcceptAnnouncePayloadWithActions,
  stepAcceptParsedAnnounceWithActions,
  stepAnnounceBuildPlanWithActions,
  stepAnnounceBuildWithActions,
  stepAnnounceDestinationHashMatchWithActions,
  stepAnnounceDestinationHashMaterialWithActions,
  stepAnnouncePacketTypeWithActions,
  stepAnnounceSignedMaterialWithActions,
  stepAnnounceValidateOutcomePlanWithActions,
  stepAnnounceValidateWithActions,
  stepAttemptAnnounceSignatureValidateWithActions,
  stepCheckAnnounceDestinationHashWithActions,
  stepPackAnnouncePayloadWithActions,
  stepParseAnnouncePayloadWithActions,
} from "../src/announce-framing.js";
import {
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
} from "../src/packet-header.js";

const publicKey = new Uint8Array(ANNOUNCE_PUBLIC_KEY_SIZE).fill(1);
const nameHash = new Uint8Array(ANNOUNCE_NAME_HASH_SIZE).fill(2);
const randomHash = new Uint8Array(ANNOUNCE_RANDOM_HASH_SIZE).fill(3);
const ratchet = new Uint8Array(ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE).fill(4);
const signature = new Uint8Array(ANNOUNCE_SIGNATURE_SIZE).fill(5);
const appData = new Uint8Array([9, 8, 7]);
const destinationHash = new Uint8Array(16).fill(6);

describe("protocol announce framing", () => {
  it("round-trips announce payloads with ratchet and app data", () => {
    const packed = packAnnouncePayload({
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: ratchet,
      signature,
      appData,
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
      appData: null,
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
      appData,
    });
    expect(signed.length).toBe(
      destinationHash.length +
        publicKey.length +
        nameHash.length +
        randomHash.length +
        ratchet.length +
        appData.length,
    );

    const signedStepped = stepAnnounceSignedMaterialWithActions(
      initialAnnounceSignedMaterialState(),
      {
        kind: "announce/signed-material-gate",
        destinationHash,
        publicKey,
        nameHash,
        randomHash,
        ratchetPublicKey: ratchet,
        appData,
      },
    );
    expect(shouldUseAnnounceSignedMaterial(signedStepped.actions)).toBe(true);
    const signedFromActions = announceSignedMaterialRawFromActions(
      signedStepped.actions,
    );
    expect(signedFromActions).not.toBeNull();
    expect([...signedFromActions!]).toEqual([...signed]);

    const material = announceDestinationHashMaterial(nameHash, destinationHash);
    expect(material.length).toBe(nameHash.length + destinationHash.length);

    const materialStepped = stepAnnounceDestinationHashMaterialWithActions(
      initialAnnounceDestinationHashMaterialState(),
      {
        kind: "announce/destination-hash-material-gate",
        nameHash,
        identityHash: destinationHash,
      },
    );
    expect(
      shouldUseAnnounceDestinationHashMaterial(materialStepped.actions),
    ).toBe(true);
    const materialFromActions = announceDestinationHashMaterialRawFromActions(
      materialStepped.actions,
    );
    expect(materialFromActions).not.toBeNull();
    expect([...materialFromActions!]).toEqual([...material]);

    const expected = material.subarray(0, nameHash.length);
    expect(announceDestinationHashMatches(nameHash, expected)).toBe(true);
    const matchStepped = stepAnnounceDestinationHashMatchWithActions(
      initialAnnounceDestinationHashMatchState(),
      {
        kind: "announce/destination-hash-match-gate",
        destinationHash: nameHash,
        expectedTruncatedHash: expected,
      },
    );
    expect(shouldMatchAnnounceDestinationHash(matchStepped.actions)).toBe(true);
    expect(shouldMismatchAnnounceDestinationHash(matchStepped.actions)).toBe(
      false,
    );

    const mismatchStepped = stepAnnounceDestinationHashMatchWithActions(
      initialAnnounceDestinationHashMatchState(),
      {
        kind: "announce/destination-hash-match-gate",
        destinationHash: nameHash,
        expectedTruncatedHash: new Uint8Array(ANNOUNCE_NAME_HASH_SIZE).fill(9),
      },
    );
    expect(shouldMatchAnnounceDestinationHash(mismatchStepped.actions)).toBe(
      false,
    );
    expect(shouldMismatchAnnounceDestinationHash(mismatchStepped.actions)).toBe(
      true,
    );
  });
});

describe("protocol announce framing (continued)", () => {
  it("plans announce build gates", () => {
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      }),
    ).toBe("ok");
    expect(
      planAnnounceBuild({
        typeSingle: false,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      }),
    ).toBe("not-announceable-type");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: false,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      }),
    ).toBe("not-announceable-direction");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: false,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      }),
    ).toBe("missing-identity");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: 3,
        ratchetPublicKeyLength: null,
      }),
    ).toBe("bad-random-hash");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: 8,
      }),
    ).toBe("bad-ratchet");
    expect(
      planAnnounceBuild({
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
      }),
    ).toBe("ok");
  });
});

describe("protocol announce framing (continued)", () => {
  it("emits announce build plan-gate actions from stepAnnounceBuildPlanWithActions", () => {
    const ok = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(shouldOkAnnounceBuildPlan(ok.actions)).toBe(true);
    expect(announceBuildPlanFromActions(ok.actions)).toBe("ok");

    const typeReject = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: false,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(
      shouldRejectAnnounceBuildPlanNotAnnounceableType(typeReject.actions),
    ).toBe(true);
    expect(announceBuildPlanFromActions(typeReject.actions)).toBe(
      "not-announceable-type",
    );

    const directionReject = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: true,
        directionIn: false,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(
      shouldRejectAnnounceBuildPlanNotAnnounceableDirection(
        directionReject.actions,
      ),
    ).toBe(true);

    const missingIdentity = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: true,
        directionIn: true,
        identityPresent: false,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(
      shouldRejectAnnounceBuildPlanMissingIdentity(missingIdentity.actions),
    ).toBe(true);

    const badHash = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: 3,
        ratchetPublicKeyLength: null,
      },
    );
    expect(shouldRejectAnnounceBuildPlanBadRandomHash(badHash.actions)).toBe(
      true,
    );

    const badRatchet = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: 8,
      },
    );
    expect(shouldRejectAnnounceBuildPlanBadRatchet(badRatchet.actions)).toBe(
      true,
    );
    expect(
      announceBuildPlanFromActions(
        stepAnnounceBuildPlanWithActions(initialAnnounceBuildPlanState(), {
          kind: "timer/fired",
          timer: { id: "x" },
        }).actions,
      ),
    ).toBeNull();

    const state = initialAnnounceBuildPlanState();
    const event = {
      kind: "announce/build-plan-gate" as const,
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null,
    };
    const a = stepAnnounceBuildPlanWithActions(state, event);
    const b = stepAnnounceBuildPlanWithActions(state, event);
    expect(a).toEqual(b);
  });
});

describe("protocol announce framing (continued)", () => {
  it("emits announce build actions from stepAnnounceBuildWithActions", () => {
    const proceed = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null,
    });
    expect(proceed.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedAnnounceBuild(proceed.actions)).toBe(true);

    const typeReject = stepAnnounceBuildWithActions(
      initialAnnounceBuildState(),
      {
        kind: "announce/build-gate",
        typeSingle: false,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(typeReject.actions).toEqual([
      { kind: "reject-not-announceable-type" },
    ]);
    expect(
      shouldRejectAnnounceBuildNotAnnounceableType(typeReject.actions),
    ).toBe(true);

    const directionReject = stepAnnounceBuildWithActions(
      initialAnnounceBuildState(),
      {
        kind: "announce/build-gate",
        typeSingle: true,
        directionIn: false,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(directionReject.actions).toEqual([
      { kind: "reject-not-announceable-direction" },
    ]);
    expect(
      shouldRejectAnnounceBuildNotAnnounceableDirection(
        directionReject.actions,
      ),
    ).toBe(true);

    const missingIdentity = stepAnnounceBuildWithActions(
      initialAnnounceBuildState(),
      {
        kind: "announce/build-gate",
        typeSingle: true,
        directionIn: true,
        identityPresent: false,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: null,
      },
    );
    expect(missingIdentity.actions).toEqual([
      { kind: "reject-missing-identity" },
    ]);
    expect(
      shouldRejectAnnounceBuildMissingIdentity(missingIdentity.actions),
    ).toBe(true);

    const badHash = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: 3,
      ratchetPublicKeyLength: null,
    });
    expect(badHash.actions).toEqual([{ kind: "reject-bad-random-hash" }]);
    expect(shouldRejectAnnounceBuildBadRandomHash(badHash.actions)).toBe(true);

    const badRatchet = stepAnnounceBuildWithActions(
      initialAnnounceBuildState(),
      {
        kind: "announce/build-gate",
        typeSingle: true,
        directionIn: true,
        identityPresent: true,
        randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
        ratchetPublicKeyLength: 8,
      },
    );
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
      ratchetPublicKeyLength: null,
    };
    const a = stepAnnounceBuildWithActions(state, event);
    const b = stepAnnounceBuildWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("emits announce packet-type only from announce/other actions", () => {
    const announce = stepAnnouncePacketTypeWithActions(
      initialAnnouncePacketTypeState(),
      {
        kind: "announce/packet-type-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
      },
    );
    expect(shouldTreatAnnouncePacketType(announce.actions)).toBe(true);
    expect(shouldTreatAnnouncePacketTypeOther(announce.actions)).toBe(false);

    const other = stepAnnouncePacketTypeWithActions(
      initialAnnouncePacketTypeState(),
      {
        kind: "announce/packet-type-gate",
        packetType: PACKET_TYPE_DATA,
      },
    );
    expect(shouldTreatAnnouncePacketType(other.actions)).toBe(false);
    expect(shouldTreatAnnouncePacketTypeOther(other.actions)).toBe(true);

    const empty = stepAnnouncePacketTypeWithActions(
      initialAnnouncePacketTypeState(),
      {
        kind: "timer/fired",
        timer: { id: "x" },
      },
    );
    expect(shouldTreatAnnouncePacketType(empty.actions)).toBe(false);
    expect(shouldTreatAnnouncePacketTypeOther(empty.actions)).toBe(false);
  });
});

describe("protocol announce framing (continued)", () => {
  it("recognizes announce packet types and plans validate outcomes", () => {
    expect(isAnnouncePacketType(PACKET_TYPE_ANNOUNCE)).toBe(true);
    expect(isAnnouncePacketType(PACKET_TYPE_DATA)).toBe(false);
    expect(
      planAnnounceValidateOutcome({
        parsedOk: false,
        publicKeyLoaded: false,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false,
      }),
    ).toBe("reject-parse");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: false,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false,
      }),
    ).toBe("reject-public-key");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false,
      }),
    ).toBe("reject-signature");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true,
        destinationHashMatches: false,
      }),
    ).toBe("accept-signature-only");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
        destinationHashMatches: false,
      }),
    ).toBe("reject-destination-hash");
    expect(
      planAnnounceValidateOutcome({
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
        destinationHashMatches: true,
      }),
    ).toBe("accept");

    const planAccept = stepAnnounceValidateOutcomePlanWithActions(
      initialAnnounceValidateOutcomePlanState(),
      {
        kind: "announce/validate-outcome-plan-gate",
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
        destinationHashMatches: true,
      },
    );
    expect(shouldAcceptAnnounceValidateOutcomePlan(planAccept.actions)).toBe(
      true,
    );
    expect(announceValidateOutcomePlanFromActions(planAccept.actions)).toBe(
      "accept",
    );

    const planSignatureOnly = stepAnnounceValidateOutcomePlanWithActions(
      initialAnnounceValidateOutcomePlanState(),
      {
        kind: "announce/validate-outcome-plan-gate",
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true,
        destinationHashMatches: false,
      },
    );
    expect(
      shouldAcceptAnnounceValidateOutcomePlan(planSignatureOnly.actions),
    ).toBe(true);
    expect(
      announceValidateOutcomePlanFromActions(planSignatureOnly.actions),
    ).toBe("accept-signature-only");

    const planRejectParse = stepAnnounceValidateOutcomePlanWithActions(
      initialAnnounceValidateOutcomePlanState(),
      {
        kind: "announce/validate-outcome-plan-gate",
        parsedOk: false,
        publicKeyLoaded: false,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false,
      },
    );
    expect(
      shouldAcceptAnnounceValidateOutcomePlan(planRejectParse.actions),
    ).toBe(false);
    expect(
      announceValidateOutcomePlanFromActions(planRejectParse.actions),
    ).toBe("reject-parse");
    expect(
      announceValidateOutcomePlanFromActions(
        stepAnnounceValidateOutcomePlanWithActions(
          initialAnnounceValidateOutcomePlanState(),
          {
            kind: "timer/fired",
            timer: { id: "x" },
          },
        ).actions,
      ),
    ).toBeNull();

    const planState = initialAnnounceValidateOutcomePlanState();
    const planEvent = {
      kind: "announce/validate-outcome-plan-gate" as const,
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: false,
      destinationHashMatches: true,
    };
    expect(
      stepAnnounceValidateOutcomePlanWithActions(planState, planEvent),
    ).toEqual(stepAnnounceValidateOutcomePlanWithActions(planState, planEvent));

    const accept = stepAnnounceValidateWithActions(
      initialAnnounceValidateState(),
      {
        kind: "announce/validate-gate",
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
        destinationHashMatches: true,
      },
    );
    expect(accept.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptAnnounceValidate(accept.actions)).toBe(true);

    const signatureOnly = stepAnnounceValidateWithActions(
      initialAnnounceValidateState(),
      {
        kind: "announce/validate-gate",
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true,
        destinationHashMatches: false,
      },
    );
    expect(signatureOnly.actions).toEqual([{ kind: "accept-signature-only" }]);
    expect(shouldAcceptAnnounceValidate(signatureOnly.actions)).toBe(true);

    const rejectParse = stepAnnounceValidateWithActions(
      initialAnnounceValidateState(),
      {
        kind: "announce/validate-gate",
        parsedOk: false,
        publicKeyLoaded: false,
        signatureValid: false,
        onlyValidateSignature: false,
        destinationHashMatches: false,
      },
    );
    expect(rejectParse.actions).toEqual([{ kind: "reject-parse" }]);
    expect(shouldAcceptAnnounceValidate(rejectParse.actions)).toBe(false);

    const a = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: false,
      destinationHashMatches: true,
    });
    const b = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: true,
      publicKeyLoaded: true,
      signatureValid: true,
      onlyValidateSignature: false,
      destinationHashMatches: true,
    });
    expect(a).toEqual(b);
  });
});

describe("protocol announce framing (continued)", () => {
  it("gates announce signature validation and destination-hash checks", () => {
    expect(
      shouldAttemptAnnounceSignatureValidate({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
      }),
    ).toBe(true);
    expect(
      shouldAttemptAnnounceSignatureValidate({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: false,
      }),
    ).toBe(false);
    expect(
      shouldCheckAnnounceDestinationHash({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
      }),
    ).toBe(true);
    expect(
      shouldCheckAnnounceDestinationHash({
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true,
      }),
    ).toBe(false);
    expect(shouldAcceptAnnouncePayload(true)).toBe(true);
    expect(shouldAcceptAnnouncePayload(false)).toBe(false);
    expect(shouldAcceptParsedAnnounce(true)).toBe(true);
    expect(shouldAcceptParsedAnnounce(false)).toBe(false);

    const attemptSig = stepAttemptAnnounceSignatureValidateWithActions(
      initialAttemptAnnounceSignatureValidateState(),
      {
        kind: "announce/attempt-signature-validate-gate",
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
      },
    );
    expect(attemptSig.actions).toEqual([{ kind: "attempt" }]);
    expect(shouldAttemptAnnounceSignatureValidateNow(attemptSig.actions)).toBe(
      true,
    );
    expect(shouldSkipAnnounceSignatureValidate(attemptSig.actions)).toBe(false);

    const skipSig = stepAttemptAnnounceSignatureValidateWithActions(
      initialAttemptAnnounceSignatureValidateState(),
      {
        kind: "announce/attempt-signature-validate-gate",
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: false,
      },
    );
    expect(skipSig.actions).toEqual([{ kind: "skip" }]);
    expect(shouldAttemptAnnounceSignatureValidateNow(skipSig.actions)).toBe(
      false,
    );
    expect(shouldSkipAnnounceSignatureValidate(skipSig.actions)).toBe(true);

    const checkHash = stepCheckAnnounceDestinationHashWithActions(
      initialCheckAnnounceDestinationHashState(),
      {
        kind: "announce/check-destination-hash-gate",
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: false,
      },
    );
    expect(checkHash.actions).toEqual([{ kind: "check" }]);
    expect(shouldCheckAnnounceDestinationHashNow(checkHash.actions)).toBe(true);
    expect(shouldSkipAnnounceDestinationHashCheck(checkHash.actions)).toBe(
      false,
    );

    const skipHash = stepCheckAnnounceDestinationHashWithActions(
      initialCheckAnnounceDestinationHashState(),
      {
        kind: "announce/check-destination-hash-gate",
        parsedOk: true,
        identityPresent: true,
        publicKeyLoaded: true,
        signatureValid: true,
        onlyValidateSignature: true,
      },
    );
    expect(skipHash.actions).toEqual([{ kind: "skip" }]);
    expect(shouldCheckAnnounceDestinationHashNow(skipHash.actions)).toBe(false);
    expect(shouldSkipAnnounceDestinationHashCheck(skipHash.actions)).toBe(true);

    const acceptPayload = stepAcceptAnnouncePayloadWithActions(
      initialAcceptAnnouncePayloadState(),
      {
        kind: "announce/accept-payload-gate",
        fieldsPresent: true,
      },
    );
    expect(shouldAcceptAnnouncePayloadNow(acceptPayload.actions)).toBe(true);
    expect(shouldSkipAnnouncePayloadAccept(acceptPayload.actions)).toBe(false);

    const skipPayload = stepAcceptAnnouncePayloadWithActions(
      initialAcceptAnnouncePayloadState(),
      {
        kind: "announce/accept-payload-gate",
        fieldsPresent: false,
      },
    );
    expect(shouldAcceptAnnouncePayloadNow(skipPayload.actions)).toBe(false);
    expect(shouldSkipAnnouncePayloadAccept(skipPayload.actions)).toBe(true);

    const acceptParsed = stepAcceptParsedAnnounceWithActions(
      initialAcceptParsedAnnounceState(),
      {
        kind: "announce/accept-parsed-gate",
        parsedPresent: true,
      },
    );
    expect(shouldAcceptParsedAnnounceNow(acceptParsed.actions)).toBe(true);
    expect(shouldSkipParsedAnnounceAccept(acceptParsed.actions)).toBe(false);

    const skipParsed = stepAcceptParsedAnnounceWithActions(
      initialAcceptParsedAnnounceState(),
      {
        kind: "announce/accept-parsed-gate",
        parsedPresent: false,
      },
    );
    expect(shouldAcceptParsedAnnounceNow(skipParsed.actions)).toBe(false);
    expect(shouldSkipParsedAnnounceAccept(skipParsed.actions)).toBe(true);
  });
});

describe("protocol announce framing (continued)", () => {
  it("emits pack framing bytes from WithActions step", () => {
    const stepped = stepPackAnnouncePayloadWithActions(
      initialPackAnnouncePayloadState(),
      {
        kind: "announce/pack-payload-gate",
        publicKey,
        nameHash,
        randomHash,
        ratchetPublicKey: ratchet,
        signature,
        appData,
      },
    );
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
        appData,
      }),
    ]);
  });

  it("emits parse fields or reject from WithActions step", () => {
    const packed = packAnnouncePayload({
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey: ratchet,
      signature,
      appData,
    });
    const ok = stepParseAnnouncePayloadWithActions(
      initialParseAnnouncePayloadState(),
      {
        kind: "announce/parse-payload-gate",
        data: packed,
        hasRatchet: true,
      },
    );
    expect(shouldUseParseAnnouncePayload(ok.actions)).toBe(true);
    expect(shouldRejectParseAnnouncePayload(ok.actions)).toBe(false);
    const fields = announcePayloadFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.publicKey]).toEqual([...publicKey]);
    expect([...fields!.ratchetPublicKey!]).toEqual([...ratchet]);
    expect([...fields!.appData!]).toEqual([...appData]);

    const rejected = stepParseAnnouncePayloadWithActions(
      initialParseAnnouncePayloadState(),
      {
        kind: "announce/parse-payload-gate",
        data: new Uint8Array(8),
        hasRatchet: true,
      },
    );
    expect(shouldRejectParseAnnouncePayload(rejected.actions)).toBe(true);
    expect(shouldUseParseAnnouncePayload(rejected.actions)).toBe(false);
    expect(announcePayloadFieldsFromActions(rejected.actions)).toBeNull();
  });
});
