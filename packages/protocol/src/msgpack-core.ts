/**
 * Shared pure msgpack primitives (no TextEncoder / DOM).
 * Higher-level RNS/LXMF codecs build on these in their packages.
 */
import { utf8Decode, utf8Encode } from "./utf8.js";

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

/** Decode msgpack float32 or float64 (RNS link RTT payloads). */
export function msgpackUnpackFloat(bytes: Uint8Array): number {
  if (bytes.length >= 9 && bytes[0] === 0xcb) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(1, false);
  }

  if (bytes.length >= 5 && bytes[0] === 0xca) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat32(1, false);
  }

  throw new Error("Expected msgpack float");
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

/** Pack a small map with integer keys (LXMF fields). */
export function msgpackPackIntMap(entries: ReadonlyArray<[number, Uint8Array]>): Uint8Array {
  if (entries.length > 15) {
    throw new Error("msgpackPackIntMap supports at most 15 entries");
  }

  const parts = entries.flatMap(([key, value]) => [msgpackPackUInt(key), msgpackPackBin(value)]);
  const body = concatBytes(...parts);
  const output = new Uint8Array(1 + body.length);
  output[0] = 0x80 | entries.length;
  output.set(body, 1);
  return output;
}

export function msgpackPackString(value: string): Uint8Array {
  const bytes = utf8Encode(value);
  if (bytes.length <= 31) {
    const output = new Uint8Array(1 + bytes.length);
    output[0] = 0xa0 | bytes.length;
    output.set(bytes, 1);
    return output;
  }

  if (bytes.length > 0xff) {
    throw new Error("msgpackPackString supports at most 255 UTF-8 bytes");
  }

  const output = new Uint8Array(2 + bytes.length);
  output[0] = 0xd9;
  output[1] = bytes.length;
  output.set(bytes, 2);
  return output;
}

/** Pack a small map with string keys (RNS resource advertisements). */
export function msgpackPackStringMap(entries: ReadonlyArray<[string, Uint8Array]>): Uint8Array {
  if (entries.length > 15) {
    throw new Error("msgpackPackStringMap supports at most 15 entries");
  }

  const parts = entries.flatMap(([key, value]) => [msgpackPackString(key), value]);
  const body = concatBytes(...parts);
  const output = new Uint8Array(1 + body.length);
  output[0] = 0x80 | entries.length;
  output.set(body, 1);
  return output;
}

export type MsgpackValue =
  | { readonly type: "nil" }
  | { readonly type: "int"; readonly int: number }
  | { readonly type: "bin"; readonly bin: Uint8Array }
  | { readonly type: "float"; readonly float: number }
  | { readonly type: "array"; readonly array: ReadonlyArray<MsgpackValue> }
  | { readonly type: "map"; readonly map: ReadonlyMap<number, MsgpackValue> };

export type MsgpackScalar =
  | { readonly type: "nil" }
  | { readonly type: "int"; readonly int: number }
  | { readonly type: "bin"; readonly bin: Uint8Array }
  | { readonly type: "float"; readonly float: number };

export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
}

export function msgpackUnpackScalar(bytes: Uint8Array): MsgpackScalar {
  const value = msgpackUnpack(bytes);
  if (value.type === "array" || value.type === "map") {
    throw new Error("expected msgpack scalar");
  }
  return value;
}

function unpackStringAt(bytes: Uint8Array, offset: number): [string, number] {
  const tag = bytes[offset];
  if (tag === undefined) {
    throw new Error("Unexpected end of msgpack input");
  }

  if ((tag & 0xe0) === 0xa0) {
    const length = tag & 0x1f;
    const stringBytes = bytes.subarray(offset + 1, offset + 1 + length);
    return [utf8Decode(stringBytes), offset + 1 + length];
  }

  if (tag === 0xd9) {
    const length = bytes[offset + 1]!;
    const stringBytes = bytes.subarray(offset + 2, offset + 2 + length);
    return [utf8Decode(stringBytes), offset + 2 + length];
  }

  throw new Error(`Expected msgpack string tag, got 0x${tag.toString(16)}`);
}

function unpackScalarAt(bytes: Uint8Array, offset: number): [MsgpackScalar, number] {
  const [value, next] = msgpackUnpackAt(bytes, offset);
  if (value.type === "array" || value.type === "map") {
    throw new Error("expected msgpack scalar");
  }
  return [value, next];
}

/** Unpack a fixmap with string keys and scalar values. */
export function msgpackUnpackStringKeyedMap(bytes: Uint8Array): ReadonlyMap<string, MsgpackScalar> {
  const tag = bytes[0];
  if (tag === undefined || (tag & 0xf0) !== 0x80) {
    throw new Error("Expected msgpack fixmap");
  }

  const count = tag & 0x0f;
  const map = new Map<string, MsgpackScalar>();
  let offset = 1;
  for (let index = 0; index < count; index += 1) {
    const [key, keyOffset] = unpackStringAt(bytes, offset);
    const [value, valueOffset] = unpackScalarAt(bytes, keyOffset);
    map.set(key, value);
    offset = valueOffset;
  }
  return map;
}

export function msgpackUnpackAt(bytes: Uint8Array, offset: number): [MsgpackValue, number] {
  const tag = bytes[offset];
  if (tag === undefined) {
    throw new Error("Unexpected end of msgpack input");
  }

  if (tag === 0xc0) {
    return [{ type: "nil" }, offset + 1];
  }

  if (tag === 0xcb) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "float", float: view.getFloat64(1, false) }, offset + 9];
  }

  if (tag === 0xc4) {
    const length = bytes[offset + 1]!;
    const bin = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 2 + length];
  }

  if (tag === 0xc5) {
    const length = (bytes[offset + 1]! << 8) | bytes[offset + 2]!;
    const bin = bytes.subarray(offset + 3, offset + 3 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 3 + length];
  }

  if ((tag & 0xf0) === 0x90) {
    const count = tag & 0x0f;
    const array: MsgpackValue[] = [];
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [item, itemOffset] = msgpackUnpackAt(bytes, nextOffset);
      array.push(item);
      nextOffset = itemOffset;
    }
    return [{ type: "array", array }, nextOffset];
  }

  if ((tag & 0xf0) === 0x80) {
    const count = tag & 0x0f;
    const map = new Map<number, MsgpackValue>();
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [keyValue, keyOffset] = msgpackUnpackAt(bytes, nextOffset);
      const [entryValue, entryOffset] = msgpackUnpackAt(bytes, keyOffset);
      if (keyValue.type === "int") {
        map.set(keyValue.int, entryValue);
      }
      nextOffset = entryOffset;
    }
    return [{ type: "map", map }, nextOffset];
  }

  if (tag === 0xcc) {
    return [{ type: "int", int: bytes[offset + 1]! }, offset + 2];
  }

  if (tag === 0xcd) {
    const value = (bytes[offset + 1]! << 8) | bytes[offset + 2]!;
    return [{ type: "int", int: value }, offset + 3];
  }

  if (tag === 0xce) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "int", int: view.getUint32(1, false) }, offset + 5];
  }

  if (tag <= 0x7f) {
    return [{ type: "int", int: tag }, offset + 1];
  }

  throw new Error(`Unsupported msgpack tag 0x${tag.toString(16)}`);
}
