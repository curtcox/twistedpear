/** Msgpack encode/decode for LXMF message payloads. Mirrors RNS.vendor.umsgpack usage in LXMF. */

import type { LXMessageFields } from "./constants.js";
export {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackNil,
  msgpackPackUInt
} from "@twistedpear/protocol";

import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackNil,
  msgpackPackUInt
} from "@twistedpear/protocol";

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

export function msgpackPackFields(fields: LXMessageFields): Uint8Array {
  const entries = Object.entries(fields);
  if (entries.length > 15) {
    throw new Error("msgpackPackFields supports at most 15 entries");
  }

  const parts = entries.flatMap(([key, value]) => [
    msgpackPackUInt(Number.parseInt(key, 10)),
    msgpackPackBin(value)
  ]);
  const body = concatBytes(...parts);
  const output = new Uint8Array(1 + body.length);
  output[0] = 0x80 | entries.length;
  output.set(body, 1);
  return output;
}

export function msgpackPackLxmPayload(
  timestamp: number,
  title: Uint8Array,
  content: Uint8Array,
  fields: LXMessageFields,
  stamp?: Uint8Array | null
): Uint8Array {
  const items = [
    msgpackPackFloat64(timestamp),
    msgpackPackBin(title),
    msgpackPackBin(content),
    msgpackPackFields(fields)
  ];

  if (stamp !== undefined && stamp !== null) {
    items.push(msgpackPackBin(stamp));
  }

  return msgpackPackArray(items);
}

export interface MsgpackValue {
  readonly type: "float" | "bin" | "nil" | "array" | "int" | "map";
  readonly float?: number;
  readonly int?: number;
  readonly bin?: Uint8Array;
  readonly array?: ReadonlyArray<MsgpackValue>;
  readonly map?: ReadonlyMap<number, MsgpackValue>;
}

export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
}

export function msgpackUnpackLxmPayload(bytes: Uint8Array): {
  timestamp: number;
  title: Uint8Array;
  content: Uint8Array;
  fields: LXMessageFields;
  stamp: Uint8Array | null;
} {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length < 4) {
    throw new Error("Invalid LXMF payload");
  }

  const [timestampValue, titleValue, contentValue, fieldsValue, stampValue] = value.array;
  if (
    timestampValue === undefined ||
    titleValue === undefined ||
    contentValue === undefined ||
    fieldsValue === undefined ||
    timestampValue.type !== "float" ||
    titleValue.type !== "bin" ||
    titleValue.bin === undefined ||
    contentValue.type !== "bin" ||
    contentValue.bin === undefined ||
    fieldsValue.type !== "map"
  ) {
    throw new Error("Invalid LXMF payload fields");
  }

  const fields: Record<number, Uint8Array> = {};
  if (fieldsValue.map !== undefined) {
    for (const [key, entryValue] of fieldsValue.map) {
      if (entryValue.type === "bin" && entryValue.bin !== undefined) {
        fields[key] = Uint8Array.from(entryValue.bin);
      }
    }
  }

  const stamp =
    stampValue === undefined || stampValue.type === "nil"
      ? null
      : stampValue.type === "bin" && stampValue.bin !== undefined
        ? Uint8Array.from(stampValue.bin)
        : null;

  return {
    timestamp: timestampValue.float ?? 0,
    title: Uint8Array.from(titleValue.bin),
    content: Uint8Array.from(contentValue.bin),
    fields,
    stamp
  };
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
    const map = new Map<number, MsgpackValue>();
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [keyValue, keyOffset] = msgpackUnpackAt(bytes, nextOffset);
      const [entryValue, entryOffset] = msgpackUnpackAt(bytes, keyOffset);
      if (keyValue.type === "int" && keyValue.int !== undefined) {
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

export function msgpackPackPropagationRequest(
  wants: ReadonlyArray<Uint8Array> | null,
  haves: ReadonlyArray<Uint8Array> | null,
  transferLimitKb?: number | null
): Uint8Array {
  const items = [
    wants === null ? msgpackPackNil() : msgpackPackArray(wants.map((entry) => msgpackPackBin(entry))),
    haves === null ? msgpackPackNil() : msgpackPackArray(haves.map((entry) => msgpackPackBin(entry)))
  ];

  if (transferLimitKb !== undefined && transferLimitKb !== null) {
    items.push(msgpackPackFloat64(transferLimitKb));
  }

  return msgpackPackArray(items);
}

export function msgpackUnpackPropagationRequest(bytes: Uint8Array): [
  ReadonlyArray<Uint8Array> | null,
  ReadonlyArray<Uint8Array> | null,
  number | null
] {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length < 2) {
    throw new Error("Invalid propagation request payload");
  }

  const [wantsValue, havesValue, limitValue] = value.array;
  const decodeList = (entry: MsgpackValue | undefined): ReadonlyArray<Uint8Array> | null => {
    if (entry === undefined || entry.type === "nil") {
      return null;
    }

    if (entry.type !== "array" || entry.array === undefined) {
      throw new Error("Invalid propagation request list");
    }

    return entry.array.map((item) => {
      if (item.type !== "bin" || item.bin === undefined) {
        throw new Error("Invalid propagation request list entry");
      }

      return Uint8Array.from(item.bin);
    });
  };

  const transferLimit =
    limitValue === undefined || limitValue.type === "nil"
      ? null
      : limitValue.type === "float"
        ? limitValue.float ?? null
        : null;

  return [decodeList(wantsValue), decodeList(havesValue), transferLimit];
}

export function msgpackUnpackTransientIdList(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  const value = msgpackUnpack(bytes);
  if (value.type === "int") {
    throw new Error("Propagation node returned an error code");
  }

  if (value.type !== "array" || value.array === undefined) {
    throw new Error("Invalid transient id list");
  }

  return value.array.map((item) => {
    if (item.type !== "bin" || item.bin === undefined) {
      throw new Error("Invalid transient id entry");
    }

    return Uint8Array.from(item.bin);
  });
}

export function msgpackUnpackMessageList(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined) {
    throw new Error("Invalid message list response");
  }

  return value.array.map((item) => {
    if (item.type !== "bin" || item.bin === undefined) {
      throw new Error("Invalid message list entry");
    }

    return Uint8Array.from(item.bin);
  });
}

export function msgpackPackPropagationEnvelope(timestamp: number, messages: ReadonlyArray<Uint8Array>): Uint8Array {
  return msgpackPackArray([
    msgpackPackFloat64(timestamp),
    msgpackPackArray(messages.map((message) => msgpackPackBin(message)))
  ]);
}

export function msgpackUnpackPropagationEnvelope(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length !== 2) {
    throw new Error("Invalid propagation envelope");
  }

  const messagesValue = value.array[1];
  if (messagesValue === undefined || messagesValue.type !== "array" || messagesValue.array === undefined) {
    throw new Error("Invalid propagation envelope messages");
  }

  return messagesValue.array.map((item) => {
    if (item.type !== "bin" || item.bin === undefined) {
      throw new Error("Invalid propagation envelope message");
    }

    return Uint8Array.from(item.bin);
  });
}
