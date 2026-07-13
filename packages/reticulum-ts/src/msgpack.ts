/** Adapter-facing msgpack helpers; codecs live in protocol. */

import { utf8Decode } from "@twistedpear/protocol";

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
  utf8Encode
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

export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
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
    return [{ type: "string", string: utf8Decode(stringBytes) }, offset + 1 + length];
  }

  if (tag === 0xd9) {
    const length = bytes[offset + 1]!;
    const stringBytes = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "string", string: utf8Decode(stringBytes) }, offset + 2 + length];
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
