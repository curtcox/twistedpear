/**
 * Shared pure msgpack primitives (no TextEncoder / DOM).
 * Higher-level RNS/LXMF codecs build on these in their packages.
 */

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

export function msgpackPackNil(): Uint8Array {
  return new Uint8Array([0xc0]);
}

export function msgpackPackUInt(value: number): Uint8Array {
  if (value >= 0 && value <= 0x7f) {
    return new Uint8Array([value]);
  }

  if (value <= 0xff) {
    return new Uint8Array([0xcc, value]);
  }

  if (value <= 0xffff) {
    const output = new Uint8Array(3);
    output[0] = 0xcd;
    output[1] = (value >> 8) & 0xff;
    output[2] = value & 0xff;
    return output;
  }

  const output = new Uint8Array(5);
  output[0] = 0xce;
  output[1] = (value >>> 24) & 0xff;
  output[2] = (value >>> 16) & 0xff;
  output[3] = (value >>> 8) & 0xff;
  output[4] = value & 0xff;
  return output;
}

export function msgpackPackBin(bytes: Uint8Array): Uint8Array {
  const length = bytes.length;
  if (length <= 0xff) {
    const output = new Uint8Array(2 + length);
    output[0] = 0xc4;
    output[1] = length;
    output.set(bytes, 2);
    return output;
  }

  const output = new Uint8Array(3 + length);
  output[0] = 0xc5;
  output[1] = (length >> 8) & 0xff;
  output[2] = length & 0xff;
  output.set(bytes, 3);
  return output;
}

export function msgpackPackFloat64(value: number): Uint8Array {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 0xcb);
  view.setFloat64(1, value, false);
  return new Uint8Array(buffer);
}

export function msgpackPackArray(items: ReadonlyArray<Uint8Array>): Uint8Array {
  if (items.length > 15) {
    throw new Error("msgpackPackArray supports at most 15 items");
  }

  const body = concatBytes(...items);
  const output = new Uint8Array(1 + body.length);
  output[0] = 0x90 | items.length;
  output.set(body, 1);
  return output;
}

export type MsgpackScalar =
  | { readonly type: "nil" }
  | { readonly type: "int"; readonly int: number }
  | { readonly type: "bin"; readonly bin: Uint8Array }
  | { readonly type: "float"; readonly float: number };

export function msgpackUnpackScalar(bytes: Uint8Array): MsgpackScalar {
  if (bytes.length === 0) {
    throw new Error("empty msgpack");
  }

  const tag = bytes[0]!;
  if (tag === 0xc0) {
    return { type: "nil" };
  }

  if (tag <= 0x7f) {
    return { type: "int", int: tag };
  }

  if (tag === 0xcc && bytes.length >= 2) {
    return { type: "int", int: bytes[1]! };
  }

  if (tag === 0xcd && bytes.length >= 3) {
    return { type: "int", int: (bytes[1]! << 8) | bytes[2]! };
  }

  if (tag === 0xce && bytes.length >= 5) {
    return {
      type: "int",
      int:
        ((bytes[1]! << 24) >>> 0) +
        (bytes[2]! << 16) +
        (bytes[3]! << 8) +
        bytes[4]!
    };
  }

  if (tag === 0xc4 && bytes.length >= 2) {
    const length = bytes[1]!;
    return { type: "bin", bin: bytes.subarray(2, 2 + length) };
  }

  if (tag === 0xc5 && bytes.length >= 3) {
    const length = (bytes[1]! << 8) | bytes[2]!;
    return { type: "bin", bin: bytes.subarray(3, 3 + length) };
  }

  if (tag === 0xcb && bytes.length >= 9) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { type: "float", float: view.getFloat64(1, false) };
  }

  throw new Error(`unsupported msgpack scalar tag 0x${tag.toString(16)}`);
}
