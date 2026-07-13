import {
  decodePacketRaw,
  encodePacketRaw,
  packPacketFlags,
  packPacketProof,
  packetHashablePart,
  packetProofHashMatches,
  PacketContextCode,
  PacketContextFlagCode,
  PacketHeaderTypeCode,
  PacketTypeCode,
  TransportTypeCode,
  planPacketFromFields,
  splitPacketProof,
  truncateToTruncatedHash,
  TRUNCATED_HASH_BYTES
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import type { DestinationTypeValue } from "./destination.js";
import { Identity } from "./identity.js";

/** Mirrors RNS/Packet.py packet and header wire constants. */
export const PacketType = PacketTypeCode;

export type PacketTypeValue = (typeof PacketType)[keyof typeof PacketType];

export const PacketHeaderType = PacketHeaderTypeCode;

export type PacketHeaderTypeValue = (typeof PacketHeaderType)[keyof typeof PacketHeaderType];

export const PacketContext = PacketContextCode;

export const PacketContextFlag = PacketContextFlagCode;

export type PacketContextFlagValue = (typeof PacketContextFlag)[keyof typeof PacketContextFlag];

export const TransportType = TransportTypeCode;

export type TransportTypeValue = (typeof TransportType)[keyof typeof TransportType];

export interface PacketFields {
  readonly headerType: PacketHeaderTypeValue;
  readonly contextFlag?: PacketContextFlagValue;
  readonly transportType: TransportTypeValue;
  readonly destinationType: DestinationTypeValue;
  readonly packetType: PacketTypeValue;
  readonly hops?: number;
  readonly destinationHash: Uint8Array;
  readonly context?: number;
  readonly data?: Uint8Array;
  readonly transportId?: Uint8Array;
}

export interface PacketProofOptions {
  readonly explicit?: boolean;
}

export class Packet {
  readonly headerType: PacketHeaderTypeValue;
  readonly contextFlag: PacketContextFlagValue;
  readonly transportType: TransportTypeValue;
  readonly destinationType: DestinationTypeValue;
  readonly packetType: PacketTypeValue;
  readonly hops: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
  readonly transportId: Uint8Array | null;
  readonly raw: Uint8Array;

  private constructor(
    private readonly provider: CryptoProvider,
    fields: Required<Omit<PacketFields, "transportId" | "contextFlag" | "hops" | "context" | "data">> & {
      readonly contextFlag: PacketContextFlagValue;
      readonly hops: number;
      readonly context: number;
      readonly data: Uint8Array;
      readonly transportId: Uint8Array | null;
      readonly raw?: Uint8Array;
    }
  ) {
    this.headerType = fields.headerType;
    this.contextFlag = fields.contextFlag;
    this.transportType = fields.transportType;
    this.destinationType = fields.destinationType;
    this.packetType = fields.packetType;
    this.hops = fields.hops;
    this.destinationHash = fields.destinationHash;
    this.context = fields.context;
    this.data = fields.data;
    this.transportId = fields.transportId;
    this.raw = fields.raw ?? Packet.encodeRaw(fields);
  }

  static fromFields(provider: CryptoProvider, fields: PacketFields): Packet {
    const contextFlag = fields.contextFlag ?? PacketContextFlag.UNSET;
    const plan = planPacketFromFields({
      headerType: fields.headerType,
      contextFlag,
      transportType: fields.transportType,
      destinationType: fields.destinationType,
      packetType: fields.packetType,
      destinationHashLength: fields.destinationHash.length,
      transportIdPresent: fields.transportId !== undefined,
      transportIdLength: fields.transportId?.length ?? 0
    });
    if (plan === "bad-header-type") {
      throw new Error(`Unknown packet header type: ${fields.headerType}`);
    }
    if (plan === "bad-context-flag") {
      throw new Error(`Unknown packet context flag: ${fields.contextFlag}`);
    }
    if (plan === "bad-transport-type") {
      throw new Error(`Unknown packet transport type: ${fields.transportType}`);
    }
    if (plan === "bad-destination-type") {
      throw new Error(`Unknown packet destination type: ${fields.destinationType}`);
    }
    if (plan === "bad-packet-type") {
      throw new Error(`Unknown packet type: ${fields.packetType}`);
    }
    if (plan === "bad-destination-hash") {
      throw new Error(`destination hash must be ${TRUNCATED_HASH_BYTES} bytes`);
    }
    if (plan === "header2-missing-transport-id") {
      throw new Error("HEADER_2 packets require a transport ID");
    }
    if (plan === "bad-transport-id") {
      throw new Error(`transport ID must be ${TRUNCATED_HASH_BYTES} bytes`);
    }

    return new Packet(provider, {
      headerType: fields.headerType,
      contextFlag,
      transportType: fields.transportType,
      destinationType: fields.destinationType,
      packetType: fields.packetType,
      hops: fields.hops ?? 0,
      destinationHash: fields.destinationHash,
      context: fields.context ?? PacketContext.NONE,
      data: fields.data ?? new Uint8Array(),
      transportId: fields.transportId ?? null
    });
  }

  static decode(provider: CryptoProvider, raw: Uint8Array): Packet | null {
    const decoded = decodePacketRaw(raw);
    if (decoded === null) {
      return null;
    }

    return new Packet(provider, {
      headerType: decoded.headerType as PacketHeaderTypeValue,
      contextFlag: decoded.contextFlag as PacketContextFlagValue,
      transportType: decoded.transportType as TransportTypeValue,
      destinationType: decoded.destinationType as DestinationTypeValue,
      packetType: decoded.packetType as PacketTypeValue,
      hops: decoded.hops,
      transportId: decoded.transportId,
      destinationHash: decoded.destinationHash,
      context: decoded.context,
      data: decoded.data,
      raw
    });
  }

  packedFlags(): number {
    return packPacketFlags({
      headerType: this.headerType,
      contextFlag: this.contextFlag,
      transportType: this.transportType,
      destinationType: this.destinationType,
      packetType: this.packetType
    });
  }

  hash(): Uint8Array {
    return Identity.fullHash(this.provider, this.hashablePart());
  }

  truncatedHash(): Uint8Array {
    return Identity.truncatedHash(this.provider, this.hashablePart());
  }

  proofDestinationHash(): Uint8Array {
    return truncateToTruncatedHash(this.hash());
  }

  createProof(identity: Identity, options: PacketProofOptions = {}): Uint8Array {
    const packetHash = this.hash();
    const signature = identity.sign(packetHash);
    return packPacketProof(packetHash, signature, options.explicit !== false);
  }

  validateProof(identity: Identity, proof: Uint8Array): boolean {
    const packetHash = this.hash();
    const split = splitPacketProof(proof);
    if (split === null || !packetProofHashMatches(split, packetHash)) {
      return false;
    }
    return identity.validate(split.signature, packetHash);
  }

  hashablePart(): Uint8Array {
    return packetHashablePart(this.raw, this.headerType);
  }

  private static encodeRaw(fields: {
    readonly headerType: PacketHeaderTypeValue;
    readonly contextFlag: PacketContextFlagValue;
    readonly transportType: TransportTypeValue;
    readonly destinationType: DestinationTypeValue;
    readonly packetType: PacketTypeValue;
    readonly hops: number;
    readonly destinationHash: Uint8Array;
    readonly context: number;
    readonly data: Uint8Array;
    readonly transportId: Uint8Array | null;
  }): Uint8Array {
    return encodePacketRaw(fields);
  }
}
