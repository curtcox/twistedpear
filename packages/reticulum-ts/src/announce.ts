import type { CryptoProvider } from "./crypto/provider.js";
import { Destination, DestinationDirection, DestinationType } from "./destination.js";
import { IDENTITY_KEY_SIZE, Identity, NAME_HASH_LENGTH, RATCHET_SIZE, TRUNCATED_HASH_LENGTH } from "./identity.js";
import {
  Packet,
  PacketContext,
  PacketContextFlag,
  PacketType,
  TransportType
} from "./packet.js";

export const ANNOUNCE_RANDOM_HASH_SIZE = 10;
export const ANNOUNCE_SIGNATURE_SIZE = 64;

export interface AnnounceBuildOptions {
  readonly appData?: Uint8Array;
  readonly randomHash?: Uint8Array;
  readonly ratchetPublicKey?: Uint8Array;
  readonly pathResponse?: boolean;
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
    if (destination.type !== DestinationType.SINGLE) {
      throw new Error("Only SINGLE destinations can be announced");
    }

    if (destination.direction !== DestinationDirection.IN) {
      throw new Error("Only IN destinations can be announced");
    }

    if (destination.identity === null) {
      throw new Error("Announce destination must hold an identity");
    }

    const randomHash = options.randomHash ?? provider.randomBytes(ANNOUNCE_RANDOM_HASH_SIZE);
    if (randomHash.length !== ANNOUNCE_RANDOM_HASH_SIZE) {
      throw new Error(`Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`);
    }

    if (
      options.ratchetPublicKey !== undefined &&
      options.ratchetPublicKey.length !== RATCHET_SIZE / 8
    ) {
      throw new Error(`Announce ratchet public key must be ${RATCHET_SIZE / 8} bytes`);
    }

    const publicKey = destination.identity.getPublicKey();
    const ratchet = options.ratchetPublicKey ?? new Uint8Array();
    const appData = options.appData ?? new Uint8Array();
    const signedData = concatBytes(destination.hash, publicKey, destination.nameHash, randomHash, ratchet, appData);
    const signature = destination.identity.sign(signedData);
    const data = concatBytes(publicKey, destination.nameHash, randomHash, ratchet, signature, appData);

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
    if (packet.packetType !== PacketType.ANNOUNCE) {
      return null;
    }

    const keySize = IDENTITY_KEY_SIZE;
    const nameHashSize = NAME_HASH_LENGTH / 8;
    const ratchetSize = RATCHET_SIZE / 8;
    const minimumLength = keySize + nameHashSize + ANNOUNCE_RANDOM_HASH_SIZE + ANNOUNCE_SIGNATURE_SIZE;
    const hasRatchet = packet.contextFlag === PacketContextFlag.SET;
    const ratchetLength = hasRatchet ? ratchetSize : 0;

    if (packet.data.length < minimumLength + ratchetLength) {
      return null;
    }

    let offset = 0;
    const publicKey = packet.data.subarray(offset, offset + keySize);
    offset += keySize;
    const nameHash = packet.data.subarray(offset, offset + nameHashSize);
    offset += nameHashSize;
    const randomHash = packet.data.subarray(offset, offset + ANNOUNCE_RANDOM_HASH_SIZE);
    offset += ANNOUNCE_RANDOM_HASH_SIZE;
    const ratchetPublicKey = hasRatchet ? packet.data.subarray(offset, offset + ratchetSize) : null;
    offset += ratchetLength;
    const signature = packet.data.subarray(offset, offset + ANNOUNCE_SIGNATURE_SIZE);
    offset += ANNOUNCE_SIGNATURE_SIZE;
    const appData = packet.data.length > offset ? packet.data.subarray(offset) : null;

    return {
      destinationHash: packet.destinationHash,
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey,
      signature,
      appData
    };
  }

  static validate(provider: CryptoProvider, packet: Packet, onlyValidateSignature = false): boolean {
    const parsed = Announce.parse(packet);
    if (parsed === null) {
      return false;
    }

    const identity = new Identity(provider, false);
    if (!identity.loadPublicKey(parsed.publicKey)) {
      return false;
    }

    const ratchet = parsed.ratchetPublicKey ?? new Uint8Array();
    const appData = parsed.appData ?? new Uint8Array();
    const signedData = concatBytes(
      parsed.destinationHash,
      parsed.publicKey,
      parsed.nameHash,
      parsed.randomHash,
      ratchet,
      appData
    );

    if (!identity.validate(parsed.signature, signedData)) {
      return false;
    }

    if (onlyValidateSignature) {
      return true;
    }

    const expectedHash = Identity.fullHash(provider, concatBytes(parsed.nameHash, identity.hash)).subarray(
      0,
      TRUNCATED_HASH_LENGTH / 8
    );
    return equalBytes(parsed.destinationHash, expectedHash);
  }
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }

  return diff === 0;
}
