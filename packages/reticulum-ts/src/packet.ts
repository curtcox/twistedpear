import {
  encodePacketRawFromActions,
  initialDecodePacketRawState,
  initialEncodePacketRawState,
  initialPackPacketFlagsState,
  initialPackPacketProofState,
  initialPacketFromFieldsState,
  initialPacketHashablePartState,
  initialSplitPacketProofState,
  packPacketFlagsFromActions,
  packPacketProofRawFromActions,
  packetHashablePartRawFromActions,
  packetHeaderFieldsFromActions,
  packetProofFieldsFromActions,
  packetProofHashMatches,
  PacketContextCode,
  PacketContextFlagCode,
  PacketHeaderTypeCode,
  PacketTypeCode,
  TransportTypeCode,
  shouldProceedPacketFromFields,
  shouldRejectDecodePacketRaw,
  shouldRejectEncodePacketRaw,
  shouldRejectPacketFromFieldsBadContextFlag,
  shouldRejectPacketFromFieldsBadDestinationHash,
  shouldRejectPacketFromFieldsBadDestinationType,
  shouldRejectPacketFromFieldsBadHeaderType,
  shouldRejectPacketFromFieldsBadPacketType,
  shouldRejectPacketFromFieldsBadTransportId,
  shouldRejectPacketFromFieldsBadTransportType,
  shouldRejectPacketFromFieldsHeader2MissingTransportId,
  shouldRejectSplitPacketProof,
  shouldUseDecodePacketRaw,
  shouldUseEncodePacketRaw,
  shouldUsePackPacketFlags,
  shouldUsePackPacketProof,
  shouldUsePacketHashablePart,
  shouldUseSplitPacketProof,
  stepDecodePacketRawWithActions,
  stepEncodePacketRawWithActions,
  stepPackPacketFlagsWithActions,
  stepPackPacketProofWithActions,
  stepPacketFromFieldsWithActions,
  stepPacketHashablePartWithActions,
  stepSplitPacketProofWithActions,
  stepTruncateHashBytesWithActions,
  truncateHashBytesRawFromActions,
  shouldRejectTruncateHashBytes,
  shouldUseTruncateHashBytes,
  initialTruncateHashBytesState,
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
    const gate = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), {
      kind: "packet/from-fields-gate",
      headerType: fields.headerType,
      contextFlag,
      transportType: fields.transportType,
      destinationType: fields.destinationType,
      packetType: fields.packetType,
      destinationHashLength: fields.destinationHash.length,
      transportIdPresent: fields.transportId !== undefined,
      transportIdLength: fields.transportId?.length ?? 0
    });
    if (shouldRejectPacketFromFieldsBadHeaderType(gate.actions)) {
      throw new Error(`Unknown packet header type: ${fields.headerType}`);
    }
    if (shouldRejectPacketFromFieldsBadContextFlag(gate.actions)) {
      throw new Error(`Unknown packet context flag: ${fields.contextFlag}`);
    }
    if (shouldRejectPacketFromFieldsBadTransportType(gate.actions)) {
      throw new Error(`Unknown packet transport type: ${fields.transportType}`);
    }
    if (shouldRejectPacketFromFieldsBadDestinationType(gate.actions)) {
      throw new Error(`Unknown packet destination type: ${fields.destinationType}`);
    }
    if (shouldRejectPacketFromFieldsBadPacketType(gate.actions)) {
      throw new Error(`Unknown packet type: ${fields.packetType}`);
    }
    if (shouldRejectPacketFromFieldsBadDestinationHash(gate.actions)) {
      throw new Error(`destination hash must be ${TRUNCATED_HASH_BYTES} bytes`);
    }
    if (shouldRejectPacketFromFieldsHeader2MissingTransportId(gate.actions)) {
      throw new Error("HEADER_2 packets require a transport ID");
    }
    if (shouldRejectPacketFromFieldsBadTransportId(gate.actions)) {
      throw new Error(`transport ID must be ${TRUNCATED_HASH_BYTES} bytes`);
    }
    if (!shouldProceedPacketFromFields(gate.actions)) {
      throw new Error("Packet fromFields rejected");
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
    const stepped = stepDecodePacketRawWithActions(initialDecodePacketRawState(), {
      kind: "packet-header/decode-gate",
      raw
    });
    if (
      shouldRejectDecodePacketRaw(stepped.actions) ||
      !shouldUseDecodePacketRaw(stepped.actions)
    ) {
      return null;
    }
    const decoded = packetHeaderFieldsFromActions(stepped.actions);
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
    const stepped = stepPackPacketFlagsWithActions(initialPackPacketFlagsState(), {
      kind: "packet-header/pack-flags-gate",
      headerType: this.headerType,
      contextFlag: this.contextFlag,
      transportType: this.transportType,
      destinationType: this.destinationType,
      packetType: this.packetType
    });
    const flags =
      shouldUsePackPacketFlags(stepped.actions)
        ? packPacketFlagsFromActions(stepped.actions)
        : null;
    if (flags === null) {
      throw new Error("packedFlags: missing use-flags action");
    }
    return flags;
  }

  hash(): Uint8Array {
    return Identity.fullHash(this.provider, this.hashablePart());
  }

  truncatedHash(): Uint8Array {
    return Identity.truncatedHash(this.provider, this.hashablePart());
  }

  proofDestinationHash(): Uint8Array {
    const stepped = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
      kind: "hash-truncate/truncate-gate",
      digest: this.hash()
    });
    const raw = truncateHashBytesRawFromActions(stepped.actions);
    if (
      shouldRejectTruncateHashBytes(stepped.actions) ||
      !shouldUseTruncateHashBytes(stepped.actions) ||
      raw === null
    ) {
      throw new Error(`digest must be at least ${TRUNCATED_HASH_BYTES} bytes`);
    }
    return raw;
  }

  createProof(identity: Identity, options: PacketProofOptions = {}): Uint8Array {
    const packetHash = this.hash();
    const signature = identity.sign(packetHash);
    const stepped = stepPackPacketProofWithActions(initialPackPacketProofState(), {
      kind: "packet-proof/pack-gate",
      packetHash,
      signature,
      explicit: options.explicit !== false
    });
    const raw =
      shouldUsePackPacketProof(stepped.actions)
        ? packPacketProofRawFromActions(stepped.actions)
        : null;
    if (raw === null) {
      throw new Error("createProof: missing use-raw action");
    }
    return raw;
  }

  validateProof(identity: Identity, proof: Uint8Array): boolean {
    const packetHash = this.hash();
    const stepped = stepSplitPacketProofWithActions(initialSplitPacketProofState(), {
      kind: "packet-proof/split-gate",
      proof
    });
    if (shouldRejectSplitPacketProof(stepped.actions)) {
      return false;
    }
    const split =
      shouldUseSplitPacketProof(stepped.actions)
        ? packetProofFieldsFromActions(stepped.actions)
        : null;
    if (split === null || !packetProofHashMatches(split, packetHash)) {
      return false;
    }
    return identity.validate(split.signature, packetHash);
  }

  hashablePart(): Uint8Array {
    const stepped = stepPacketHashablePartWithActions(initialPacketHashablePartState(), {
      kind: "packet-header/hashable-part-gate",
      raw: this.raw,
      headerType: this.headerType
    });
    const raw =
      shouldUsePacketHashablePart(stepped.actions)
        ? packetHashablePartRawFromActions(stepped.actions)
        : null;
    if (raw === null) {
      throw new Error("hashablePart: missing use-raw action");
    }
    return raw;
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
    const stepped = stepEncodePacketRawWithActions(initialEncodePacketRawState(), {
      kind: "packet-header/encode-gate",
      ...fields
    });
    if (
      shouldRejectEncodePacketRaw(stepped.actions) ||
      !shouldUseEncodePacketRaw(stepped.actions)
    ) {
      throw new Error("Packet encode rejected");
    }
    const raw = encodePacketRawFromActions(stepped.actions);
    if (raw === null) {
      throw new Error("Packet encode missing use-raw action");
    }
    return raw;
  }
}
