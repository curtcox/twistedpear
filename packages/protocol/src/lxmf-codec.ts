/**
 * Pure LXMF msgpack payload codecs built on msgpack-core.
 */
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackIntMap,
  msgpackPackNil,
  msgpackUnpack,
  type MsgpackValue
} from "./msgpack-core.js";

export type LxmFields = Readonly<Record<number, Uint8Array>>;

export function packLxmFields(fields: LxmFields): Uint8Array {
  const entries = Object.entries(fields).map(
    ([key, value]) => [Number.parseInt(key, 10), value] as [number, Uint8Array]
  );
  return msgpackPackIntMap(entries);
}

export function packLxmPayload(
  timestamp: number,
  title: Uint8Array,
  content: Uint8Array,
  fields: LxmFields,
  stamp?: Uint8Array | null
): Uint8Array {
  const items = [
    msgpackPackFloat64(timestamp),
    msgpackPackBin(title),
    msgpackPackBin(content),
    packLxmFields(fields)
  ];
  if (stamp !== undefined && stamp !== null) {
    items.push(msgpackPackBin(stamp));
  }
  return msgpackPackArray(items);
}

export interface UnpackedLxmPayload {
  readonly timestamp: number;
  readonly title: Uint8Array;
  readonly content: Uint8Array;
  readonly fields: LxmFields;
  readonly stamp: Uint8Array | null;
}

export function unpackLxmPayload(bytes: Uint8Array): UnpackedLxmPayload {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length < 4) {
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
    contentValue.type !== "bin" ||
    fieldsValue.type !== "map"
  ) {
    throw new Error("Invalid LXMF payload fields");
  }

  const fields: Record<number, Uint8Array> = {};
  for (const [key, entryValue] of fieldsValue.map) {
    if (entryValue.type === "bin") {
      fields[key] = Uint8Array.from(entryValue.bin);
    }
  }

  const stamp =
    stampValue === undefined || stampValue.type === "nil"
      ? null
      : stampValue.type === "bin"
        ? Uint8Array.from(stampValue.bin)
        : null;

  return {
    timestamp: timestampValue.float,
    title: Uint8Array.from(titleValue.bin),
    content: Uint8Array.from(contentValue.bin),
    fields,
    stamp
  };
}

export function packPropagationRequest(
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

export function unpackPropagationRequest(bytes: Uint8Array): [
  ReadonlyArray<Uint8Array> | null,
  ReadonlyArray<Uint8Array> | null,
  number | null
] {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length < 2) {
    throw new Error("Invalid propagation request payload");
  }

  const [wantsValue, havesValue, limitValue] = value.array;
  const decodeList = (entry: MsgpackValue | undefined): ReadonlyArray<Uint8Array> | null => {
    if (entry === undefined || entry.type === "nil") {
      return null;
    }
    if (entry.type !== "array") {
      throw new Error("Invalid propagation request list");
    }
    return entry.array.map((item) => {
      if (item.type !== "bin") {
        throw new Error("Invalid propagation request list entry");
      }
      return Uint8Array.from(item.bin);
    });
  };

  const transferLimit =
    limitValue === undefined || limitValue.type === "nil"
      ? null
      : limitValue.type === "float"
        ? limitValue.float
        : null;

  return [decodeList(wantsValue), decodeList(havesValue), transferLimit];
}

export function packPropagationEnvelope(timestamp: number, messages: ReadonlyArray<Uint8Array>): Uint8Array {
  return msgpackPackArray([
    msgpackPackFloat64(timestamp),
    msgpackPackArray(messages.map((message) => msgpackPackBin(message)))
  ]);
}

export function unpackPropagationEnvelope(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length !== 2) {
    throw new Error("Invalid propagation envelope");
  }
  const messagesValue = value.array[1];
  if (messagesValue === undefined || messagesValue.type !== "array") {
    throw new Error("Invalid propagation envelope messages");
  }
  return messagesValue.array.map((item) => {
    if (item.type !== "bin") {
      throw new Error("Invalid propagation envelope message");
    }
    return Uint8Array.from(item.bin);
  });
}

export function unpackBinList(bytes: Uint8Array, label: string): ReadonlyArray<Uint8Array> {
  const value = msgpackUnpack(bytes);
  if (value.type === "int") {
    throw new Error(`${label} returned an error code`);
  }
  if (value.type !== "array") {
    throw new Error(`Invalid ${label}`);
  }
  return value.array.map((item) => {
    if (item.type !== "bin") {
      throw new Error(`Invalid ${label} entry`);
    }
    return Uint8Array.from(item.bin);
  });
}
