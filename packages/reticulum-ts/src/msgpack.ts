/** Adapter-facing msgpack helpers; link request/response codecs live in protocol. */

export {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackPackFloat64 as msgpackPackFloat,
  msgpackPackLinkRequest as msgpackPackRequest,
  msgpackPackLinkResponse as msgpackPackResponse,
  msgpackUnpackLinkRequestTuple as msgpackUnpackRequest,
  msgpackUnpackLinkResponseTuple as msgpackUnpackResponse
} from "@twistedpear/protocol";

export function msgpackPackString(value: string): Uint8Array {
  const bytes = utf8Encode(value);
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

function utf8Encode(value: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i);
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const low = value.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i += 1;
        out.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
        continue;
      }
      out.push(0xef, 0xbf, 0xbd);
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return Uint8Array.from(out);
}

function utf8Decode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i]!;
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      const b1 = bytes[i + 1]!;
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      const b1 = bytes[i + 1]!;
      const b2 = bytes[i + 2]!;
      out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
      i += 3;
    } else if ((b0 & 0xf8) === 0xf0 && i + 3 < bytes.length) {
      const b1 = bytes[i + 1]!;
      const b2 = bytes[i + 2]!;
      const b3 = bytes[i + 3]!;
      let code =
        ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      code -= 0x10000;
      out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
      i += 4;
    } else {
      out += "\ufffd";
      i += 1;
    }
  }
  return out;
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
