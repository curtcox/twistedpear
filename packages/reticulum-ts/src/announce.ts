import {
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE as PROTOCOL_ANNOUNCE_SIGNATURE_SIZE,
  announceDestinationHashMaterial,
  announceDestinationHashMatches,
  announceSignedMaterial,
  isAnnouncePacketType,
  packAnnouncePayload,
  parseAnnouncePayload,
  planAnnounceBuild,
  planAnnounceValidateOutcome,
  truncateToTruncatedHash
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
    const early = planAnnounceBuild({
      typeSingle: destination.type === DestinationType.SINGLE,
      directionIn: destination.direction === DestinationDirection.IN,
      identityPresent: destination.identity !== null,
      randomHashLength: ANNOUNCE_RANDOM_HASH_SIZE,
      ratchetPublicKeyLength: null
    });
    if (early === "not-announceable-type") {
      throw new Error("Only SINGLE destinations can be announced");
    }
    if (early === "not-announceable-direction") {
      throw new Error("Only IN destinations can be announced");
    }
    if (early === "missing-identity" || destination.identity === null) {
      throw new Error("Announce destination must hold an identity");
    }

    const randomHash =
      options.randomHash ??
      (options.entropy !== undefined
        ? options.entropy.randomBytes(ANNOUNCE_RANDOM_HASH_SIZE)
        : provider.randomBytes(ANNOUNCE_RANDOM_HASH_SIZE));

    const plan = planAnnounceBuild({
      typeSingle: true,
      directionIn: true,
      identityPresent: true,
      randomHashLength: randomHash.length,
      ratchetPublicKeyLength:
        options.ratchetPublicKey === undefined ? null : options.ratchetPublicKey.length
    });
    if (plan === "bad-random-hash") {
      throw new Error(`Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`);
    }
    if (plan === "bad-ratchet") {
      throw new Error(`Announce ratchet public key must be ${ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE} bytes`);
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
    const data = packAnnouncePayload({
      publicKey,
      nameHash: destination.nameHash,
      randomHash,
      ratchetPublicKey,
      signature,
      appData
    });

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

    const fields = parseAnnouncePayload(packet.data, packet.contextFlag === PacketContextFlag.SET);
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
    if (parsed !== null && identity !== null && publicKeyLoaded) {
      const signedData = announceSignedMaterial({
        destinationHash: parsed.destinationHash,
        publicKey: parsed.publicKey,
        nameHash: parsed.nameHash,
        randomHash: parsed.randomHash,
        ratchetPublicKey: parsed.ratchetPublicKey,
        appData: parsed.appData
      });
      signatureValid = identity.validate(parsed.signature, signedData);
    }

    let destinationHashMatches = false;
    if (parsed !== null && identity !== null && publicKeyLoaded && signatureValid && !onlyValidateSignature) {
      const expectedHash = truncateToTruncatedHash(
        Identity.fullHash(provider, announceDestinationHashMaterial(parsed.nameHash, identity.hash))
      );
      destinationHashMatches = announceDestinationHashMatches(parsed.destinationHash, expectedHash);
    }

    const plan = planAnnounceValidateOutcome({
      parsedOk: parsed !== null,
      publicKeyLoaded,
      signatureValid,
      onlyValidateSignature,
      destinationHashMatches
    });
    return plan === "accept" || plan === "accept-signature-only";
  }
}
