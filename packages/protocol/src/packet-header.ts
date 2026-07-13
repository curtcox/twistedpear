/**
 * Pure RNS packet header flag packing, raw encode/decode, and hashable-part framing.
 * Crypto hashing stays at the adapter edge.
 */
import {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT
} from "./transport-framing.js";

export {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT
};

export const PACKET_TYPE_DATA = 0x00;
export const PACKET_TYPE_ANNOUNCE = 0x01;
export const PACKET_TYPE_LINKREQUEST = 0x02;
export const PACKET_TYPE_PROOF = 0x03;

export const PACKET_CONTEXT_FLAG_UNSET = 0x00;
export const PACKET_CONTEXT_FLAG_SET = 0x01;

export const PACKET_DEST_TYPE_SINGLE = 0x00;
export const PACKET_DEST_TYPE_GROUP = 0x01;
export const PACKET_DEST_TYPE_PLAIN = 0x02;
export const PACKET_DEST_TYPE_LINK = 0x03;

/** Named packet-type codes (RNS Packet.types). */
export const PacketTypeCode = {
  DATA: PACKET_TYPE_DATA,
  ANNOUNCE: PACKET_TYPE_ANNOUNCE,
  LINKREQUEST: PACKET_TYPE_LINKREQUEST,
  PROOF: PACKET_TYPE_PROOF
} as const;

export type PacketTypeCodeValue = (typeof PacketTypeCode)[keyof typeof PacketTypeCode];

/** Named header-type codes (HEADER_1 / HEADER_2). */
export const PacketHeaderTypeCode = {
  HEADER_1: PACKET_HEADER_1,
  HEADER_2: PACKET_HEADER_2
} as const;

export type PacketHeaderTypeCodeValue =
  (typeof PacketHeaderTypeCode)[keyof typeof PacketHeaderTypeCode];

/** Named context-flag codes. */
export const PacketContextFlagCode = {
  UNSET: PACKET_CONTEXT_FLAG_UNSET,
  SET: PACKET_CONTEXT_FLAG_SET
} as const;

export type PacketContextFlagCodeValue =
  (typeof PacketContextFlagCode)[keyof typeof PacketContextFlagCode];

/** Named transport-type codes. */
export const TransportTypeCode = {
  BROADCAST: TRANSPORT_BROADCAST,
  TRANSPORT: TRANSPORT_TRANSPORT
} as const;

export type TransportTypeCodeValue = (typeof TransportTypeCode)[keyof typeof TransportTypeCode];

/** Named destination-type codes (RNS Destination.types). */
export const DestinationTypeCode = {
  SINGLE: PACKET_DEST_TYPE_SINGLE,
  GROUP: PACKET_DEST_TYPE_GROUP,
  PLAIN: PACKET_DEST_TYPE_PLAIN,
  LINK: PACKET_DEST_TYPE_LINK
} as const;

export type DestinationTypeCodeValue =
  (typeof DestinationTypeCode)[keyof typeof DestinationTypeCode];

/** Named destination-direction codes (RNS Destination.IN / OUT). */
export const DestinationDirectionCode = {
  IN: 0x11,
  OUT: 0x12
} as const;

export type DestinationDirectionCodeValue =
  (typeof DestinationDirectionCode)[keyof typeof DestinationDirectionCode];

export interface PacketHeaderFields {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly hops: number;
  readonly transportId: Uint8Array | null;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
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

export function packPacketFlags(input: {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
}): number {
  return (
    ((input.headerType & 0x03) << 6) |
    ((input.contextFlag & 0x01) << 5) |
    ((input.transportType & 0x01) << 4) |
    ((input.destinationType & 0x03) << 2) |
    (input.packetType & 0x03)
  );
}

export function unpackPacketFlags(flags: number): {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
} {
  return {
    headerType: (flags & 0b11000000) >> 6,
    contextFlag: (flags & 0b00100000) >> 5,
    transportType: (flags & 0b00010000) >> 4,
    destinationType: (flags & 0b00001100) >> 2,
    packetType: flags & 0b00000011
  };
}

function isHeaderType(value: number): boolean {
  return value === PACKET_HEADER_1 || value === PACKET_HEADER_2;
}

function isContextFlag(value: number): boolean {
  return value === PACKET_CONTEXT_FLAG_UNSET || value === PACKET_CONTEXT_FLAG_SET;
}

function isTransportType(value: number): boolean {
  return value === TRANSPORT_BROADCAST || value === TRANSPORT_TRANSPORT;
}

function isDestinationType(value: number): boolean {
  return (
    value === PACKET_DEST_TYPE_SINGLE ||
    value === PACKET_DEST_TYPE_GROUP ||
    value === PACKET_DEST_TYPE_PLAIN ||
    value === PACKET_DEST_TYPE_LINK
  );
}

function isPacketType(value: number): boolean {
  return (
    value === PACKET_TYPE_DATA ||
    value === PACKET_TYPE_ANNOUNCE ||
    value === PACKET_TYPE_LINKREQUEST ||
    value === PACKET_TYPE_PROOF
  );
}

export function encodePacketRaw(fields: {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly hops: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
  readonly transportId: Uint8Array | null;
}): Uint8Array {
  if (fields.destinationHash.length !== TRANSPORT_ID_BYTES) {
    throw new Error(`destination hash must be ${TRANSPORT_ID_BYTES} bytes`);
  }
  if (fields.headerType === PACKET_HEADER_2) {
    if (fields.transportId === null || fields.transportId.length !== TRANSPORT_ID_BYTES) {
      throw new Error(`HEADER_2 packets require a ${TRANSPORT_ID_BYTES}-byte transport id`);
    }
  }

  const flags = packPacketFlags(fields);
  const header =
    fields.headerType === PACKET_HEADER_2
      ? concatBytes(
          new Uint8Array([flags, fields.hops & 0xff]),
          fields.transportId!,
          fields.destinationHash
        )
      : concatBytes(new Uint8Array([flags, fields.hops & 0xff]), fields.destinationHash);

  return concatBytes(header, new Uint8Array([fields.context & 0xff]), fields.data);
}

export function decodePacketRaw(raw: Uint8Array): PacketHeaderFields | null {
  if (raw.length < 2 + TRANSPORT_ID_BYTES + 1) {
    return null;
  }

  const unpacked = unpackPacketFlags(raw[0]!);
  const hops = raw[1]!;

  if (
    !isHeaderType(unpacked.headerType) ||
    !isContextFlag(unpacked.contextFlag) ||
    !isTransportType(unpacked.transportType) ||
    !isDestinationType(unpacked.destinationType) ||
    !isPacketType(unpacked.packetType)
  ) {
    return null;
  }

  if (unpacked.headerType === PACKET_HEADER_2) {
    if (raw.length < 2 + TRANSPORT_ID_BYTES * 2 + 1) {
      return null;
    }
    return {
      ...unpacked,
      hops,
      transportId: raw.subarray(2, 2 + TRANSPORT_ID_BYTES),
      destinationHash: raw.subarray(2 + TRANSPORT_ID_BYTES, 2 + TRANSPORT_ID_BYTES * 2),
      context: raw[2 + TRANSPORT_ID_BYTES * 2]!,
      data: raw.subarray(3 + TRANSPORT_ID_BYTES * 2)
    };
  }

  return {
    ...unpacked,
    hops,
    transportId: null,
    destinationHash: raw.subarray(2, 2 + TRANSPORT_ID_BYTES),
    context: raw[2 + TRANSPORT_ID_BYTES]!,
    data: raw.subarray(3 + TRANSPORT_ID_BYTES)
  };
}

/** Bytes hashed for packet identity (low nibble of flags + body after header). */
export function packetHashablePart(raw: Uint8Array, headerType: number): Uint8Array {
  const maskedFlags = new Uint8Array([raw[0]! & 0b00001111]);
  if (headerType === PACKET_HEADER_2) {
    return concatBytes(maskedFlags, raw.subarray(TRANSPORT_ID_BYTES + 2));
  }
  return concatBytes(maskedFlags, raw.subarray(2));
}
