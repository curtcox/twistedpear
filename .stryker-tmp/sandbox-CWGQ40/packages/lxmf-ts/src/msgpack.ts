/** Msgpack encode/decode for LXMF message payloads. Mirrors RNS.vendor.umsgpack usage in LXMF. */
// @ts-nocheck


import type { LXMessageFields } from "./constants.js";
export {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackUnpack
} from "@twistedpear/protocol";
export type { MsgpackValue } from "@twistedpear/protocol";

import {
  packLxmPayload,
  packPropagationEnvelope,
  packPropagationRequest,
  unpackBinList,
  unpackLxmPayload,
  unpackPropagationEnvelope,
  unpackPropagationRequest,
  packLxmFields
} from "@twistedpear/protocol";

export function msgpackPackFields(fields: LXMessageFields): Uint8Array {
  return packLxmFields(fields);
}

export function msgpackPackLxmPayload(
  timestamp: number,
  title: Uint8Array,
  content: Uint8Array,
  fields: LXMessageFields,
  stamp?: Uint8Array | null
): Uint8Array {
  return packLxmPayload(timestamp, title, content, fields, stamp);
}

export function msgpackUnpackLxmPayload(bytes: Uint8Array): {
  timestamp: number;
  title: Uint8Array;
  content: Uint8Array;
  fields: LXMessageFields;
  stamp: Uint8Array | null;
} {
  return unpackLxmPayload(bytes);
}

export function msgpackPackPropagationRequest(
  wants: ReadonlyArray<Uint8Array> | null,
  haves: ReadonlyArray<Uint8Array> | null,
  transferLimitKb?: number | null
): Uint8Array {
  return packPropagationRequest(wants, haves, transferLimitKb);
}

export function msgpackUnpackPropagationRequest(bytes: Uint8Array): [
  ReadonlyArray<Uint8Array> | null,
  ReadonlyArray<Uint8Array> | null,
  number | null
] {
  return unpackPropagationRequest(bytes);
}

export function msgpackUnpackTransientIdList(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  return unpackBinList(bytes, "transient id list");
}

export function msgpackUnpackMessageList(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  return unpackBinList(bytes, "message list response");
}

export function msgpackPackPropagationEnvelope(timestamp: number, messages: ReadonlyArray<Uint8Array>): Uint8Array {
  return packPropagationEnvelope(timestamp, messages);
}

export function msgpackUnpackPropagationEnvelope(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  return unpackPropagationEnvelope(bytes);
}
