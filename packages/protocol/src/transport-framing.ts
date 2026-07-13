/**
 * Pure RNS transport header wrap / strip / relay framing.
 * Packet construction and iface send stay at the adapter edge.
 */

export const PACKET_HEADER_1 = 0x00;
export const PACKET_HEADER_2 = 0x01;
export const TRANSPORT_BROADCAST = 0x00;
export const TRANSPORT_TRANSPORT = 0x01;
export const TRANSPORT_ID_BYTES = 16;

/** Low nibble of packed packet flags (destination type + packet type). */
export function packetFlagsLowNibble(packedFlags: number): number {
  return packedFlags & 0x0f;
}

export function wrapTransportPacketBytes(input: {
  readonly packedFlags: number;
  readonly hops: number;
  readonly raw: Uint8Array;
  readonly nextHop: Uint8Array;
}): Uint8Array {
  if (input.nextHop.length !== TRANSPORT_ID_BYTES) {
    throw new Error(`nextHop must be ${TRANSPORT_ID_BYTES} bytes`);
  }
  if (input.raw.length < 2) {
    throw new Error("packet raw too short");
  }

  const flags =
    (PACKET_HEADER_2 << 6) |
    (TRANSPORT_TRANSPORT << 4) |
    packetFlagsLowNibble(input.packedFlags);
  const header = new Uint8Array([flags, input.hops & 0xff]);
  const rest = input.raw.subarray(2);
  const wrapped = new Uint8Array(header.length + input.nextHop.length + rest.length);
  wrapped.set(header, 0);
  wrapped.set(input.nextHop, header.length);
  wrapped.set(rest, header.length + input.nextHop.length);
  return wrapped;
}

export function stripTransportHeadersBytes(raw: Uint8Array): Uint8Array {
  if (raw.length < 2 + TRANSPORT_ID_BYTES) {
    throw new Error("transport packet too short to strip");
  }

  const flags =
    ((raw[0]! & 0b00001111) | (PACKET_HEADER_1 << 6) | (TRANSPORT_BROADCAST << 4)) & 0xff;
  const output = new Uint8Array(raw.length - TRANSPORT_ID_BYTES);
  output[0] = flags;
  output[1] = raw[1]!;
  output.set(raw.subarray(2 + TRANSPORT_ID_BYTES), 2);
  return output;
}

export function relayTransportPacketBytes(input: {
  readonly raw: Uint8Array;
  readonly hops: number;
  readonly remainingHops: number;
  readonly nextHop: Uint8Array;
}): Uint8Array {
  if (input.remainingHops > 1) {
    if (input.nextHop.length !== TRANSPORT_ID_BYTES) {
      throw new Error(`nextHop must be ${TRANSPORT_ID_BYTES} bytes`);
    }
    if (input.raw.length < 2 + TRANSPORT_ID_BYTES) {
      throw new Error("transport packet too short to relay");
    }
    const raw = new Uint8Array(input.raw.length);
    raw[0] = input.raw[0]!;
    raw[1] = input.hops & 0xff;
    raw.set(input.nextHop, 2);
    raw.set(input.raw.subarray(2 + TRANSPORT_ID_BYTES), 2 + TRANSPORT_ID_BYTES);
    return raw;
  }

  if (input.remainingHops === 1) {
    return stripTransportHeadersBytes(input.raw);
  }

  if (input.raw.length < 2 + TRANSPORT_ID_BYTES) {
    throw new Error("transport packet too short to deliver");
  }
  const raw = new Uint8Array(input.raw.length - TRANSPORT_ID_BYTES);
  raw[0] = input.raw[0]!;
  raw[1] = input.hops & 0xff;
  raw.set(input.raw.subarray(2 + TRANSPORT_ID_BYTES), 2);
  return raw;
}

/** Rewrite only the hops byte of an already-framed packet (forward / reverse relay). */
export function rewritePacketHopsBytes(raw: Uint8Array, hops: number): Uint8Array {
  if (raw.length < 2) {
    throw new Error("packet raw too short");
  }
  const output = new Uint8Array(raw.length);
  output[0] = raw[0]!;
  output[1] = hops & 0xff;
  output.set(raw.subarray(2), 2);
  return output;
}
