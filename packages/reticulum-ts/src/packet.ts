import {
  decodePacketRaw,
  encodePacketRaw,
  packPacketFlags,
  packPacketProof,
  packetHashablePart,
  packetProofHashMatches,
  PacketContextCode,
  splitPacketProof,
  truncateToTruncatedHash,
  TRUNCATED_HASH_BYTES
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { DestinationType, type DestinationTypeValue } from "./destination.js";
import { Identity } from "./identity.js";

/** Mirrors RNS/Packet.py packet and header wire constants. */
export const PacketType = {
  DATA: 0x00,
  ANNOUNCE: 0x01,
  LINKREQUEST: 0x02,
  PROOF: 0x03
} as const;

export type PacketTypeValue = (typeof PacketType)[keyof typeof PacketType];

export const PacketHeaderType = {
  HEADER_1: 0x00,
  HEADER_2: 0x01
} as const;

export type PacketHeaderTypeValue = (typeof PacketHeaderType)[keyof typeof PacketHeaderType];

export const PacketContext = PacketContextCode;

export const PacketContextFlag = {
  UNSET: 0x00,
  SET: 0x01
} as const;

export type PacketContextFlagValue = (typeof PacketContextFlag)[keyof typeof PacketContextFlag];

export const TransportType = {
  BROADCAST: 0x00,
  TRANSPORT: 0x01
} as const;

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
    if (!isHeaderType(fields.headerType)) {
      throw new Error(`Unknown packet header type: ${fields.headerType}`);
    }

    if (!isContextFlag(fields.contextFlag ?? PacketContextFlag.UNSET)) {
      throw new Error(`Unknown packet context flag: ${fields.contextFlag}`);
    }

    if (!isTransportType(fields.transportType)) {
      throw new Error(`Unknown packet transport type: ${fields.transportType}`);
    }

    if (!isDestinationType(fields.destinationType)) {
      throw new Error(`Unknown packet destination type: ${fields.destinationType}`);
    }

    if (!isPacketType(fields.packetType)) {
      throw new Error(`Unknown packet type: ${fields.packetType}`);
    }

    validateHash(fields.destinationHash, "destination hash");
    if (fields.headerType === PacketHeaderType.HEADER_2) {
      if (fields.transportId === undefined) {
        throw new Error("HEADER_2 packets require a transport ID");
      }
      validateHash(fields.transportId, "transport ID");
    }

    return new Packet(provider, {
      headerType: fields.headerType,
      contextFlag: fields.contextFlag ?? PacketContextFlag.UNSET,
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

function validateHash(value: Uint8Array, label: string): void {
  if (value.length !== TRUNCATED_HASH_BYTES) {
    throw new Error(`${label} must be ${TRUNCATED_HASH_BYTES} bytes`);
  }
}

function isHeaderType(value: number): value is PacketHeaderTypeValue {
  return value === PacketHeaderType.HEADER_1 || value === PacketHeaderType.HEADER_2;
}

function isContextFlag(value: number): value is PacketContextFlagValue {
  return value === PacketContextFlag.UNSET || value === PacketContextFlag.SET;
}

function isTransportType(value: number): value is TransportTypeValue {
  return value === TransportType.BROADCAST || value === TransportType.TRANSPORT;
}

function isDestinationType(value: number): value is DestinationTypeValue {
  return (
    value === DestinationType.SINGLE ||
    value === DestinationType.GROUP ||
    value === DestinationType.PLAIN ||
    value === DestinationType.LINK
  );
}

function isPacketType(value: number): value is PacketTypeValue {
  return (
    value === PacketType.DATA ||
    value === PacketType.ANNOUNCE ||
    value === PacketType.LINKREQUEST ||
    value === PacketType.PROOF
  );
}
