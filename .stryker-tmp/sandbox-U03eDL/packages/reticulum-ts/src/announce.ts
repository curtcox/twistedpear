// @ts-nocheck
import {
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE as PROTOCOL_ANNOUNCE_SIGNATURE_SIZE,
  announceDestinationHashMaterialRawFromActions,
  announcePayloadFieldsFromActions,
  announceSignedMaterialRawFromActions,
  initialAcceptAnnouncePayloadState,
  initialAnnounceBuildState,
  initialAnnounceDestinationHashMatchState,
  initialAnnounceDestinationHashMaterialState,
  initialAnnouncePacketTypeState,
  initialAnnounceSignedMaterialState,
  initialAnnounceValidateState,
  initialAttemptAnnounceSignatureValidateState,
  initialCheckAnnounceDestinationHashState,
  initialPackAnnouncePayloadState,
  initialParseAnnouncePayloadState,
  packAnnouncePayloadRawFromActions,
  shouldAcceptAnnouncePayloadNow,
  shouldAcceptAnnounceValidate,
  shouldAttemptAnnounceSignatureValidateNow,
  shouldCheckAnnounceDestinationHashNow,
  shouldMatchAnnounceDestinationHash,
  shouldProceedAnnounceBuild,
  shouldRejectAnnounceBuildBadRandomHash,
  shouldRejectAnnounceBuildBadRatchet,
  shouldRejectAnnounceBuildMissingIdentity,
  shouldRejectAnnounceBuildNotAnnounceableDirection,
  shouldRejectAnnounceBuildNotAnnounceableType,
  shouldRejectParseAnnouncePayload,
  shouldTreatAnnouncePacketType,
  shouldUseAnnounceDestinationHashMaterial,
  shouldUseAnnounceSignedMaterial,
  shouldUsePackAnnouncePayload,
  shouldUseParseAnnouncePayload,
  stepAcceptAnnouncePayloadWithActions,
  stepAnnounceBuildWithActions,
  stepAnnounceDestinationHashMatchWithActions,
  stepAnnounceDestinationHashMaterialWithActions,
  stepAnnouncePacketTypeWithActions,
  stepAnnounceSignedMaterialWithActions,
  stepAnnounceValidateWithActions,
  stepAttemptAnnounceSignatureValidateWithActions,
  stepCheckAnnounceDestinationHashWithActions,
  stepPackAnnouncePayloadWithActions,
  stepParseAnnouncePayloadWithActions,
  stepTruncateHashBytesWithActions,
  truncateHashBytesRawFromActions,
  shouldRejectTruncateHashBytes,
  shouldUseTruncateHashBytes,
  initialTruncateHashBytesState,
  TRUNCATED_HASH_BYTES
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { Destination, DestinationDirection, DestinationType } from "./destination.js";
import { Identity } from "./identity.js";
import type { Entropy } from "./runtime/runtime.js";
import {
  Packet,
  PacketContext,
  PacketContextFlag,
  PacketType,
  TransportType
} from "./packet.js";

export { ANNOUNCE_RANDOM_HASH_SIZE };
export const ANNOUNCE_SIGNATURE_SIZE = PROTOCOL_ANNOUNCE_SIGNATURE_SIZE;

export interface AnnounceBuildOptions {
  readonly appData?: Uint8Array;
  readonly randomHash?: Uint8Array;
  readonly ratchetPublicKey?: Uint8Array;
  readonly pathResponse?: boolean;
  /** Preferred entropy source when `randomHash` is omitted. */
  readonly entropy?: Entropy;
}

export interface ParsedAnnounce {
  readonly destinationHash: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly signature: Uint8Array;
  readonly appData: Uint8Array | null;
}

export class Announce {
  static buildPacket(
    provider: CryptoProvider,
    destination: Destination,
    options: AnnounceBuildOptions = {}
  ): Packet {
    const early = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: destination.type === DestinationType.SINGLE,
      directionIn: destination.direction === DestinationDirection.IN,
      identityPresent: destination.identity !== null,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    });
    if (shouldRejectAnnounceBuildNotAnnounceableType(early.actions)) {
      throw new Error("Only SINGLE destinations can be announced");
    }
    if (shouldRejectAnnounceBuildNotAnnounceableDirection(early.actions)) {
      throw new Error("Only IN destinations can be announced");
    }
    if (
      shouldRejectAnnounceBuildMissingIdentity(early.actions) ||
      destination.identity === null
    ) {
      throw new Error("Announce destination must hold an identity");
    }

    const randomHash =
      options.randomHash ??
      (options.entropy !== undefined
        ? options.entropy.randomBytes(ANNOUNCE_RANDOM_HASH_SIZE)
        : provider.randomBytes(ANNOUNCE_RANDOM_HASH_SIZE));

    const gate = stepAnnounceBuildWithActions(initialAnnounceBuildState(), {
      kind: "announce/build-gate",
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: randomHash.length,
      ratchetPublicKeyLength:
        options.ratchetPublicKey === undefined ? null : options.ratchetPublicKey.length
    });
    if (shouldRejectAnnounceBuildBadRandomHash(gate.actions)) {
      throw new Error(`Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`);
    }
    if (shouldRejectAnnounceBuildBadRatchet(gate.actions)) {
      throw new Error(`Announce ratchet public key must be ${ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE} bytes`);
    }
    if (!shouldProceedAnnounceBuild(gate.actions)) {
      throw new Error("Announce build rejected");
    }

    const publicKey = destination.identity.getPublicKey();
    const ratchetPublicKey = options.ratchetPublicKey ?? null;
    const appData = options.appData ?? null;
    const signedStepped = stepAnnounceSignedMaterialWithActions(
      initialAnnounceSignedMaterialState(),
      {
        kind: "announce/signed-material-gate",
        destinationHash: destination.hash,
        publicKey,
        nameHash: destination.nameHash,
        randomHash,
        ratchetPublicKey,
        appData
      }
    );
    const signedData =
      shouldUseAnnounceSignedMaterial(signedStepped.actions)
        ? announceSignedMaterialRawFromActions(signedStepped.actions)
        : null;
    if (signedData === null) {
      throw new Error("Announce signed material: missing use-raw action");
    }
    const signature = destination.identity.sign(signedData);
    const packStepped = stepPackAnnouncePayloadWithActions(initialPackAnnouncePayloadState(), {
      kind: "announce/pack-payload-gate",
      publicKey,
      nameHash: destination.nameHash,
      randomHash,
      ratchetPublicKey,
      signature,
      appData
    });
    const data =
      shouldUsePackAnnouncePayload(packStepped.actions)
        ? packAnnouncePayloadRawFromActions(packStepped.actions)
        : null;
    if (data === null) {
      throw new Error("Announce pack: missing use-raw action");
    }

    return Packet.fromFields(provider, {
      headerType: 0,
      contextFlag: options.ratchetPublicKey === undefined ? PacketContextFlag.UNSET : PacketContextFlag.SET,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.SINGLE,
      packetType: PacketType.ANNOUNCE,
      destinationHash: destination.hash,
      context: options.pathResponse === true ? PacketContext.PATH_RESPONSE : PacketContext.NONE,
      data
    });
  }

  static parse(packet: Packet): ParsedAnnounce | null {
    /** Adapt announce packet-type via protocol actions (no ad-hoc
     * `isAnnouncePacketType` reads). */
    const typeStepped = stepAnnouncePacketTypeWithActions(initialAnnouncePacketTypeState(), {
      kind: "announce/packet-type-gate",
      packetType: packet.packetType
    });
    if (!shouldTreatAnnouncePacketType(typeStepped.actions)) {
      return null;
    }

    const parseStepped = stepParseAnnouncePayloadWithActions(initialParseAnnouncePayloadState(), {
      kind: "announce/parse-payload-gate",
      data: packet.data,
      hasRatchet: packet.contextFlag === PacketContextFlag.SET
    });
    if (shouldRejectParseAnnouncePayload(parseStepped.actions)) {
      return null;
    }
    if (!shouldUseParseAnnouncePayload(parseStepped.actions)) {
      return null;
    }
    const fields = announcePayloadFieldsFromActions(parseStepped.actions);
    /** Adapt announce-payload accept via protocol actions (no ad-hoc
     * `shouldAcceptAnnouncePayload` reads). */
    const acceptStepped = stepAcceptAnnouncePayloadWithActions(
      initialAcceptAnnouncePayloadState(),
      {
        kind: "announce/accept-payload-gate",
        fieldsPresent: fields !== null
      }
    );
    if (!shouldAcceptAnnouncePayloadNow(acceptStepped.actions)) {
      return null;
    }

    return {
      destinationHash: packet.destinationHash,
      ...fields!
    };
  }

  static validate(provider: CryptoProvider, packet: Packet, onlyValidateSignature = false): boolean {
    const parsed = Announce.parse(packet);
    const identity = parsed === null ? null : new Identity(provider, false);
    const publicKeyLoaded =
      identity !== null && parsed !== null && identity.loadPublicKey(parsed.publicKey);

    let signatureValid = false;
    const attemptSignature = stepAttemptAnnounceSignatureValidateWithActions(
      initialAttemptAnnounceSignatureValidateState(),
      {
        kind: "announce/attempt-signature-validate-gate",
        parsedOk: parsed !== null,
        identityPresent: identity !== null,
        publicKeyLoaded
      }
    );
    if (shouldAttemptAnnounceSignatureValidateNow(attemptSignature.actions)) {
      const signedStepped = stepAnnounceSignedMaterialWithActions(
        initialAnnounceSignedMaterialState(),
        {
          kind: "announce/signed-material-gate",
          destinationHash: parsed!.destinationHash,
          publicKey: parsed!.publicKey,
          nameHash: parsed!.nameHash,
          randomHash: parsed!.randomHash,
          ratchetPublicKey: parsed!.ratchetPublicKey,
          appData: parsed!.appData
        }
      );
      const signedData =
        shouldUseAnnounceSignedMaterial(signedStepped.actions)
          ? announceSignedMaterialRawFromActions(signedStepped.actions)
          : null;
      signatureValid =
        signedData !== null && identity!.validate(parsed!.signature, signedData);
    }

    let destinationHashMatches = false;
    const checkDestHash = stepCheckAnnounceDestinationHashWithActions(
      initialCheckAnnounceDestinationHashState(),
      {
        kind: "announce/check-destination-hash-gate",
        parsedOk: parsed !== null,
        identityPresent: identity !== null,
        publicKeyLoaded,
        signatureValid,
        onlyValidateSignature
      }
    );
    if (shouldCheckAnnounceDestinationHashNow(checkDestHash.actions)) {
      const materialStepped = stepAnnounceDestinationHashMaterialWithActions(
        initialAnnounceDestinationHashMaterialState(),
        {
          kind: "announce/destination-hash-material-gate",
          nameHash: parsed!.nameHash,
          identityHash: identity!.hash
        }
      );
      const material =
        shouldUseAnnounceDestinationHashMaterial(materialStepped.actions)
          ? announceDestinationHashMaterialRawFromActions(materialStepped.actions)
          : null;
      if (material !== null) {
        const truncateStepped = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
          kind: "hash-truncate/truncate-gate",
          digest: Identity.fullHash(provider, material),
          length: TRUNCATED_HASH_BYTES
        });
        const expectedHash = truncateHashBytesRawFromActions(truncateStepped.actions);
        if (
          expectedHash !== null &&
          shouldUseTruncateHashBytes(truncateStepped.actions) &&
          !shouldRejectTruncateHashBytes(truncateStepped.actions)
        ) {
          const matchStepped = stepAnnounceDestinationHashMatchWithActions(
            initialAnnounceDestinationHashMatchState(),
            {
              kind: "announce/destination-hash-match-gate",
              destinationHash: parsed!.destinationHash,
              expectedTruncatedHash: expectedHash
            }
          );
          destinationHashMatches = shouldMatchAnnounceDestinationHash(matchStepped.actions);
        }
      }
    }

    const gate = stepAnnounceValidateWithActions(initialAnnounceValidateState(), {
      kind: "announce/validate-gate",
      parsedOk: parsed !== null,
      publicKeyLoaded,
      signatureValid,
      onlyValidateSignature,
      destinationHashMatches
    });
    return shouldAcceptAnnounceValidate(gate.actions);
  }
}
