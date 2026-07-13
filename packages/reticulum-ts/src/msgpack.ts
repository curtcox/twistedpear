/** Minimal msgpack encode/decode for RNS link request/response payloads. */

export {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackPackFloat64 as msgpackPackFloat
} from "@twistedpear/protocol";

import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64 as msgpackPackFloat,
  msgpackPackNil
} from "@twistedpear/protocol";

export function msgpackPackString(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length <= 31) {
    const output = new Uint8Array(1 + bytes.length);
    output[0] = 0xa0 | bytes.length;
    output.set(bytes, 1);
    return output;
  }

  const output = new Uint8Array(2 + bytes.length);
  output[0] = 0xd9;
  output[1] = bytes.length;
  output.set(bytes, 2);
  return output;
}

export function msgpackPackMap(entries: ReadonlyArray<[string, Uint8Array]>): Uint8Array {
  if (entries.length > 15) {
    throw new Error("msgpackPackMap supports at most 15 entries");
  }

  const parts = entries.flatMap(([key, value]) => [msgpackPackString(key), value]);
  const body = concatBytes(...parts);
  const output = new Uint8Array(1 + body.length);
  output[0] = 0x80 | entries.length;
  output.set(body, 1);
  return output;
}

export interface MsgpackMapValue {
  readonly [key: string]: MsgpackValue | undefined;
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

export function msgpackPackRequest(
  requestedAt: number,
  pathHash: Uint8Array,
  data: Uint8Array | null
): Uint8Array {
  return msgpackPackArray([
    msgpackPackFloat(requestedAt),
    msgpackPackBin(pathHash),
    data === null ? msgpackPackNil() : msgpackPackBin(data)
  ]);
}

export function msgpackPackResponse(requestId: Uint8Array, response: Uint8Array | null): Uint8Array {
  return msgpackPackArray([
    msgpackPackBin(requestId),
    response === null ? msgpackPackNil() : msgpackPackBin(response)
  ]);
}

export interface MsgpackValue {
  readonly type: "float" | "bin" | "nil" | "array" | "int" | "map" | "string";
  readonly float?: number;
  readonly int?: number;
  readonly bin?: Uint8Array;
  readonly string?: string;
  readonly array?: ReadonlyArray<MsgpackValue>;
  readonly map?: MsgpackMapValue;
}

export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
}

export function msgpackUnpackRequest(bytes: Uint8Array): [number, Uint8Array, Uint8Array | null] {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length !== 3) {
    throw new Error("Invalid request payload");
  }

  const [requestedAtValue, pathHashValue, dataValue] = value.array;
  if (
    requestedAtValue === undefined ||
    pathHashValue === undefined ||
    dataValue === undefined ||
    requestedAtValue.type !== "float" ||
    pathHashValue.type !== "bin" ||
    pathHashValue.bin === undefined
  ) {
    throw new Error("Invalid request payload fields");
  }

  const data =
    dataValue.type === "nil" ? null : dataValue.type === "bin" ? dataValue.bin ?? null : null;
  return [requestedAtValue.float ?? 0, Uint8Array.from(pathHashValue.bin), data === null ? null : Uint8Array.from(data)];
}

export function msgpackUnpackResponse(bytes: Uint8Array): [Uint8Array, Uint8Array | null] {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length !== 2) {
    throw new Error("Invalid response payload");
  }

  const [requestIdValue, responseValue] = value.array;
  if (
    requestIdValue === undefined ||
    responseValue === undefined ||
    requestIdValue.type !== "bin" ||
    requestIdValue.bin === undefined
  ) {
    throw new Error("Invalid response payload fields");
  }

  const response =
    responseValue.type === "nil"
      ? null
      : responseValue.type === "bin"
        ? responseValue.bin ?? null
        : null;
  return [
    Uint8Array.from(requestIdValue.bin),
    response === null ? null : Uint8Array.from(response)
  ];
}

function msgpackUnpackAt(bytes: Uint8Array, offset: number): [MsgpackValue, number] {
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
    const map: Record<string, MsgpackValue> = {};
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [keyValue, keyOffset] = msgpackUnpackAt(bytes, nextOffset);
      const [entryValue, entryOffset] = msgpackUnpackAt(bytes, keyOffset);
      if (keyValue.type === "string" && keyValue.string !== undefined) {
        map[keyValue.string] = entryValue;
      }
      nextOffset = entryOffset;
    }

    return [{ type: "map", map }, nextOffset];
  }

  if ((tag & 0xe0) === 0xa0) {
    const length = tag & 0x1f;
    const stringBytes = bytes.subarray(offset + 1, offset + 1 + length);
    return [{ type: "string", string: new TextDecoder().decode(stringBytes) }, offset + 1 + length];
  }

  if (tag === 0xd9) {
    const length = bytes[offset + 1]!;
    const stringBytes = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "string", string: new TextDecoder().decode(stringBytes) }, offset + 2 + length];
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
