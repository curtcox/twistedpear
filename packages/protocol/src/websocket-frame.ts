/**
 * Pure binary frame encode/decode for the RNS WS interface.
 * Socket IO stays at the adapter edge.
 */

export const WS_OPCODE_BINARY = 0x2;
export const WS_OPCODE_CLOSE = 0x8;
export const WS_FIN_BINARY = 0x82;

export interface WsBinaryFrame {
  readonly opcode: number;
  readonly payload: Uint8Array;
  readonly consumed: number;
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

/** Encode an unmasked server→client binary frame. */
export function encodeWsBinaryFrame(data: Uint8Array): Uint8Array {
  if (data.length < 126) {
    return concatBytes(new Uint8Array([WS_FIN_BINARY, data.length]), data);
  }

  if (data.length <= 0xffff) {
    const header = new Uint8Array(4);
    header[0] = WS_FIN_BINARY;
    header[1] = 126;
    header[2] = (data.length >> 8) & 0xff;
    header[3] = data.length & 0xff;
    return concatBytes(header, data);
  }

  const header = new Uint8Array(10);
  header[0] = WS_FIN_BINARY;
  header[1] = 127;
  const view = new DataView(header.buffer);
  view.setBigUint64(2, BigInt(data.length), false);
  return concatBytes(header, data);
}

/** Decode a masked client→server frame; returns null if incomplete. */
export function decodeWsClientFrame(buffer: Uint8Array): WsBinaryFrame | null {
  if (buffer.length < 2) {
    return null;
  }

  const opcode = buffer[0]! & 0x0f;
  const masked = (buffer[1]! & 0x80) !== 0;
  let length = buffer[1]! & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < offset + 2) {
      return null;
    }
    length = (buffer[offset]! << 8) | buffer[offset + 1]!;
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) {
      return null;
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
    const bigLength = view.getBigUint64(0, false);
    if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("binary frame too large");
    }
    length = Number(bigLength);
    offset += 8;
  }

  if (!masked || buffer.length < offset + 4 + length) {
    return null;
  }

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;
  const payload = Uint8Array.from(buffer.subarray(offset, offset + length));
  for (let index = 0; index < payload.length; index += 1) {
    payload[index] = payload[index]! ^ mask[index % 4]!;
  }

  return { opcode, payload, consumed: offset + length };
}
