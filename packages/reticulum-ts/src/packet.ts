import {
  packPacketProof,
  packetProofHashMatches,
  splitPacketProof
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { DestinationType, type DestinationTypeValue } from "./destination.js";
import { Identity, TRUNCATED_HASH_LENGTH } from "./identity.js";

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

export const PacketContext = {
  NONE: 0x00,
  RESOURCE: 0x01,
  RESOURCE_ADV: 0x02,
  RESOURCE_REQ: 0x03,
  RESOURCE_HMU: 0x04,
  RESOURCE_PRF: 0x05,
  RESOURCE_ICL: 0x06,
  RESOURCE_RCL: 0x07,
  CACHE_REQUEST: 0x08,
  REQUEST: 0x09,
  RESPONSE: 0x0a,
  PATH_RESPONSE: 0x0b,
  COMMAND: 0x0c,
  COMMAND_STATUS: 0x0d,
  CHANNEL: 0x0e,
  KEEPALIVE: 0xfa,
  LINKIDENTIFY: 0xfb,
  LINKCLOSE: 0xfc,
  LINKPROOF: 0xfd,
  LRRTT: 0xfe,
  LRPROOF: 0xff
} as const;

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
    try {
      if (raw.length < 2 + TRUNCATED_HASH_LENGTH / 8 + 1) {
        return null;
      }

      const flags = raw[0]!;
      const headerType = ((flags & 0b01000000) >> 6) as PacketHeaderTypeValue;
      const contextFlag = ((flags & 0b00100000) >> 5) as PacketContextFlagValue;
      const transportType = ((flags & 0b00010000) >> 4) as TransportTypeValue;
      const destinationType = ((flags & 0b00001100) >> 2) as DestinationTypeValue;
      const packetType = (flags & 0b00000011) as PacketTypeValue;
      const hops = raw[1]!;
      const hashLength = TRUNCATED_HASH_LENGTH / 8;

      if (
        !isHeaderType(headerType) ||
        !isContextFlag(contextFlag) ||
        !isTransportType(transportType) ||
        !isDestinationType(destinationType) ||
        !isPacketType(packetType)
      ) {
        return null;
      }

      if (headerType === PacketHeaderType.HEADER_2) {
        if (raw.length < 2 + hashLength * 2 + 1) {
          return null;
        }

        return new Packet(provider, {
          headerType,
          contextFlag,
          transportType,
          destinationType,
          packetType,
          hops,
          transportId: raw.subarray(2, 2 + hashLength),
          destinationHash: raw.subarray(2 + hashLength, 2 + hashLength * 2),
          context: raw[2 + hashLength * 2]!,
          data: raw.subarray(3 + hashLength * 2),
          raw
        });
      }

      return new Packet(provider, {
        headerType,
        contextFlag,
        transportType,
        destinationType,
        packetType,
        hops,
        transportId: null,
        destinationHash: raw.subarray(2, 2 + hashLength),
        context: raw[2 + hashLength]!,
        data: raw.subarray(3 + hashLength),
        raw
      });
    } catch {
      return null;
    }
  }

  packedFlags(): number {
    return (
      (this.headerType << 6) |
      (this.contextFlag << 5) |
      (this.transportType << 4) |
      (this.destinationType << 2) |
      this.packetType
    );
  }

  hash(): Uint8Array {
    return Identity.fullHash(this.provider, this.hashablePart());
  }

  truncatedHash(): Uint8Array {
    return Identity.truncatedHash(this.provider, this.hashablePart());
  }

  proofDestinationHash(): Uint8Array {
    return this.hash().subarray(0, TRUNCATED_HASH_LENGTH / 8);
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
    const maskedFlags = new Uint8Array([this.raw[0]! & 0b00001111]);
    if (this.headerType === PacketHeaderType.HEADER_2) {
      return concatBytes(maskedFlags, this.raw.subarray(TRUNCATED_HASH_LENGTH / 8 + 2));
    }

    return concatBytes(maskedFlags, this.raw.subarray(2));
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
    const flags =
      (fields.headerType << 6) |
      (fields.contextFlag << 5) |
      (fields.transportType << 4) |
      (fields.destinationType << 2) |
      fields.packetType;
    const header =
      fields.headerType === PacketHeaderType.HEADER_2
        ? concatBytes(new Uint8Array([flags, fields.hops]), fields.transportId!, fields.destinationHash)
        : concatBytes(new Uint8Array([flags, fields.hops]), fields.destinationHash);

    return concatBytes(header, new Uint8Array([fields.context]), fields.data);
  }
}

function validateHash(value: Uint8Array, label: string): void {
  if (value.length !== TRUNCATED_HASH_LENGTH / 8) {
    throw new Error(`${label} must be ${TRUNCATED_HASH_LENGTH / 8} bytes`);
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
