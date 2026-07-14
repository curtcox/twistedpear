/**
 * Pure RNS resource advertisement msgpack codec and flag bits.
 * Hashing / link IO stay at the adapter edge.
 */
import {
  msgpackPackBin,
  msgpackPackNil,
  msgpackPackStringMap,
  msgpackPackUInt,
  msgpackUnpackStringKeyedMap,
  type MsgpackScalar
} from "./msgpack-core.js";

export interface ResourceAdvertisementFields {
  readonly t: number;
  readonly d: number;
  readonly n: number;
  readonly h: Uint8Array;
  readonly r: Uint8Array;
  readonly o: Uint8Array;
  readonly m: Uint8Array;
  readonly f: number;
  readonly i: number;
  readonly l: number;
  readonly q: Uint8Array | null;
}

export interface ResourceAdvertisementFlags {
  readonly e: boolean;
  readonly c: boolean;
  readonly s: boolean;
  readonly u: boolean;
  readonly p: boolean;
  readonly x: boolean;
}

export function encodeResourceAdvertisementFlags(flags: ResourceAdvertisementFlags): number {
  return (
    0x00 |
    (flags.x ? 1 << 5 : 0) |
    (flags.p ? 1 << 4 : 0) |
    (flags.u ? 1 << 3 : 0) |
    (flags.s ? 1 << 2 : 0) |
    (flags.c ? 1 << 1 : 0) |
    (flags.e ? 1 : 0)
  );
}

export function decodeResourceAdvertisementFlags(f: number): ResourceAdvertisementFlags {
  return {
    e: (f & 0x01) === 0x01,
    c: ((f >> 1) & 0x01) === 0x01,
    s: ((f >> 2) & 0x01) === 0x01,
    u: ((f >> 3) & 0x01) === 0x01,
    p: ((f >> 4) & 0x01) === 0x01,
    x: ((f >> 5) & 0x01) === 0x01
  };
}

export function packResourceAdvertisement(fields: ResourceAdvertisementFields): Uint8Array {
  return msgpackPackStringMap([
    ["t", msgpackPackUInt(fields.t)],
    ["d", msgpackPackUInt(fields.d)],
    ["n", msgpackPackUInt(fields.n)],
    ["h", msgpackPackBin(fields.h)],
    ["r", msgpackPackBin(fields.r)],
    ["o", msgpackPackBin(fields.o)],
    ["i", msgpackPackUInt(fields.i)],
    ["l", msgpackPackUInt(fields.l)],
    ["q", fields.q === null ? msgpackPackNil() : msgpackPackBin(fields.q)],
    ["f", msgpackPackUInt(fields.f)],
    ["m", msgpackPackBin(fields.m)]
  ]);
}

function readInt(value: MsgpackScalar | undefined): number {
  if (value === undefined || value.type !== "int") {
    throw new Error("Expected msgpack int");
  }
  return value.int;
}

function readBin(value: MsgpackScalar | undefined): Uint8Array {
  if (value === undefined || value.type !== "bin") {
    throw new Error("Expected msgpack bin");
  }
  return Uint8Array.from(value.bin);
}

function readOptionalBin(value: MsgpackScalar | undefined): Uint8Array | null {
  if (value === undefined || value.type === "nil") {
    return null;
  }
  return readBin(value);
}

export function unpackResourceAdvertisement(data: Uint8Array): ResourceAdvertisementFields {
  const map = msgpackUnpackStringKeyedMap(data);
  return {
    t: readInt(map.get("t")),
    d: readInt(map.get("d")),
    n: readInt(map.get("n")),
    h: readBin(map.get("h")),
    r: readBin(map.get("r")),
    o: readBin(map.get("o")),
    m: readBin(map.get("m")),
    f: readInt(map.get("f")),
    i: readInt(map.get("i")),
    l: readInt(map.get("l")),
    q: readOptionalBin(map.get("q"))
  };
}

export function isResourceAdvertisementRequest(fields: ResourceAdvertisementFields): boolean {
  const flags = decodeResourceAdvertisementFlags(fields.f);
  return fields.q !== null && flags.u;
}

export function isResourceAdvertisementResponse(fields: ResourceAdvertisementFields): boolean {
  const flags = decodeResourceAdvertisementFlags(fields.f);
  return fields.q !== null && flags.p;
}

/**
 * Plan request (u) / response (p) role flags for a resource advertisement.
 * Encoder packing stays at the adapter edge.
 */
export function planResourceAdvertisementRoleFlags(input: {
  readonly requestIdPresent: boolean;
  readonly isResponse: boolean;
}): { readonly u: boolean; readonly p: boolean } {
  return {
    u: input.requestIdPresent && !input.isResponse,
    p: input.requestIdPresent && input.isResponse
  };
}
