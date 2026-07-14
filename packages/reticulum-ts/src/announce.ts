import {
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE as PROTOCOL_ANNOUNCE_SIGNATURE_SIZE,
  announceDestinationHashMaterial,
  announceDestinationHashMatches,
  announcePayloadFieldsFromActions,
  announceSignedMaterial,
  initialAnnounceBuildState,
  initialAnnounceValidateState,
  initialPackAnnouncePayloadState,
  initialParseAnnouncePayloadState,
  isAnnouncePacketType,
  packAnnouncePayloadRawFromActions,
  shouldAcceptAnnounceValidate,
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
    const signedData = announceSignedMaterial({
      destinationHash: destination.hash,
      publicKey,
      nameHash: destination.nameHash,
      randomHash,
      ratchetPublicKey,
      appData
    });
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
    if (!isAnnouncePacketType(packet.packetType)) {
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
    if (fields === null) {
      return null;
    }

    return {
      destinationHash: packet.destinationHash,
      ...fields
    };
  }

  static validate(provider: CryptoProvider, packet: Packet, onlyValidateSignature = false): boolean {
    const parsed = Announce.parse(packet);
    const identity = parsed === null ? null : new Identity(provider, false);
    const publicKeyLoaded =
      identity !== null && parsed !== null && identity.loadPublicKey(parsed.publicKey);

    let signatureValid = false;
    if (
      shouldAttemptAnnounceSignatureValidate({
        parsedOk: parsed !== null,
        identityPresent: identity !== null,
        publicKeyLoaded
      })
    ) {
      const signedData = announceSignedMaterial({
        destinationHash: parsed!.destinationHash,
        publicKey: parsed!.publicKey,
        nameHash: parsed!.nameHash,
        randomHash: parsed!.randomHash,
        ratchetPublicKey: parsed!.ratchetPublicKey,
        appData: parsed!.appData
      });
      signatureValid = identity!.validate(parsed!.signature, signedData);
    }

    let destinationHashMatches = false;
    if (
      shouldCheckAnnounceDestinationHash({
        parsedOk: parsed !== null,
        identityPresent: identity !== null,
        publicKeyLoaded,
        signatureValid,
        onlyValidateSignature
      })
    ) {
      const truncateStepped = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
        kind: "hash-truncate/truncate-gate",
        digest: Identity.fullHash(
          provider,
          announceDestinationHashMaterial(parsed!.nameHash, identity!.hash)
        ),
        length: TRUNCATED_HASH_BYTES
      });
      const expectedHash = truncateHashBytesRawFromActions(truncateStepped.actions);
      destinationHashMatches =
        expectedHash !== null &&
        shouldUseTruncateHashBytes(truncateStepped.actions) &&
        !shouldRejectTruncateHashBytes(truncateStepped.actions) &&
        announceDestinationHashMatches(parsed!.destinationHash, expectedHash);
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
