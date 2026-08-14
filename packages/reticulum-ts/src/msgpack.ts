/** Adapter-facing msgpack helpers; codecs live in protocol. */

import {
  initialUtf8DecodeState,
  shouldUseUtf8Decode,
  stepUtf8DecodeWithActions,
  utf8DecodeTextFromActions,
} from "@twistedpear/protocol";

export {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackPackFloat64 as msgpackPackFloat,
  msgpackPackLinkRequest as msgpackPackRequest,
  msgpackPackLinkResponse as msgpackPackResponse,
  msgpackPackString,
  msgpackPackStringMap as msgpackPackMap,
  msgpackUnpackLinkRequestTuple as msgpackUnpackRequest,
  msgpackUnpackLinkResponseTuple as msgpackUnpackResponse,
  utf8Decode,
  utf8Encode,
} from "@twistedpear/protocol";

export interface MsgpackMapValue {
  readonly [key: string]: MsgpackValue | undefined;
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

type MsgpackUnpacker = (
  bytes: Uint8Array,
  offset: number,
) => [MsgpackValue, number];

export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
}

function viewAt(bytes: Uint8Array, offset: number): DataView {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    bytes.byteLength - offset,
  );
}

function unpackNil(_bytes: Uint8Array, offset: number): [MsgpackValue, number] {
  return [{ type: "nil" }, offset + 1];
}

function unpackFloat64(
  bytes: Uint8Array,
  offset: number,
): [MsgpackValue, number] {
  return [
    { type: "float", float: viewAt(bytes, offset).getFloat64(1, false) },
    offset + 9,
  ];
}

function unpackBin8(bytes: Uint8Array, offset: number): [MsgpackValue, number] {
  const length = bytes[offset + 1]!;
  const bin = bytes.subarray(offset + 2, offset + 2 + length);
  return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 2 + length];
}

function unpackBin16(
  bytes: Uint8Array,
  offset: number,
): [MsgpackValue, number] {
  const length = (bytes[offset + 1]! << 8) | bytes[offset + 2]!;
  const bin = bytes.subarray(offset + 3, offset + 3 + length);
  return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 3 + length];
}

function unpackStr8(bytes: Uint8Array, offset: number): [MsgpackValue, number] {
  const length = bytes[offset + 1]!;
  const stringBytes = bytes.subarray(offset + 2, offset + 2 + length);
  return [
    { type: "string", string: utf8DecodeViaActions(stringBytes) },
    offset + 2 + length,
  ];
}

function unpackUInt8(
  bytes: Uint8Array,
  offset: number,
): [MsgpackValue, number] {
  return [{ type: "int", int: bytes[offset + 1]! }, offset + 2];
}

function unpackUInt16(
  bytes: Uint8Array,
  offset: number,
): [MsgpackValue, number] {
  const value = (bytes[offset + 1]! << 8) | bytes[offset + 2]!;
  return [{ type: "int", int: value }, offset + 3];
}

function unpackUInt32(
  bytes: Uint8Array,
  offset: number,
): [MsgpackValue, number] {
  return [
    { type: "int", int: viewAt(bytes, offset).getUint32(1, false) },
    offset + 5,
  ];
}

function unpackFixArray(
  bytes: Uint8Array,
  offset: number,
  tag: number,
): [MsgpackValue, number] {
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

function unpackFixMap(
  bytes: Uint8Array,
  offset: number,
  tag: number,
): [MsgpackValue, number] {
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

function unpackFixStr(
  bytes: Uint8Array,
  offset: number,
  tag: number,
): [MsgpackValue, number] {
  const length = tag & 0x1f;
  const stringBytes = bytes.subarray(offset + 1, offset + 1 + length);
  return [
    { type: "string", string: utf8DecodeViaActions(stringBytes) },
    offset + 1 + length,
  ];
}

const MSGPACK_EXACT: Partial<Record<number, MsgpackUnpacker>> = {
  0xc0: unpackNil,
  0xcb: unpackFloat64,
  0xc4: unpackBin8,
  0xc5: unpackBin16,
  0xd9: unpackStr8,
  0xcc: unpackUInt8,
  0xcd: unpackUInt16,
  0xce: unpackUInt32,
};

function msgpackUnpackAt(
  bytes: Uint8Array,
  offset: number,
): [MsgpackValue, number] {
  const tag = bytes[offset];
  if (tag === undefined) {
    throw new Error("Unexpected end of msgpack input");
  }

  const exact = MSGPACK_EXACT[tag];
  if (exact !== undefined) {
    return exact(bytes, offset);
  }
  if ((tag & 0xf0) === 0x90) {
    return unpackFixArray(bytes, offset, tag);
  }
  if ((tag & 0xf0) === 0x80) {
    return unpackFixMap(bytes, offset, tag);
  }
  if ((tag & 0xe0) === 0xa0) {
    return unpackFixStr(bytes, offset, tag);
  }
  if (tag <= 0x7f) {
    return [{ type: "int", int: tag }, offset + 1];
  }

  throw new Error(`Unsupported msgpack tag 0x${tag.toString(16)}`);
}

function utf8DecodeViaActions(bytes: Uint8Array): string {
  const stepped = stepUtf8DecodeWithActions(initialUtf8DecodeState(), {
    kind: "utf8/decode-gate",
    bytes,
  });
  const text = utf8DecodeTextFromActions(stepped.actions);
  if (!shouldUseUtf8Decode(stepped.actions) || text === null) {
    throw new Error("msgpackUnpackAt: missing utf8 use-fields action");
  }
  return text;
}
