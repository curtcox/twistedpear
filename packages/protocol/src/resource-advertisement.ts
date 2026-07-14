/**
 * Pure RNS resource advertisement msgpack codec and flag bits.
 * Hashing / link IO stay at the adapter edge.
 * Pack / unpack / role-flag conclusions leave via machine actions (no ad-hoc
 * `packResourceAdvertisement` / `unpackResourceAdvertisement` /
 * `planResourceAdvertisementRoleFlags` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
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

/**
 * Resource advertisement role-flag selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planResourceAdvertisementRoleFlags` reads beside the step).
 */
export type ResourceAdvertisementRoleFlagsState = Record<string, never>;

export type ResourceAdvertisementRoleFlagsEvent =
  | Event
  | {
      readonly kind: "resource/advertisement-role-flags-gate";
      readonly requestIdPresent: boolean;
      readonly isResponse: boolean;
    };

export type ResourceAdvertisementRoleFlagsAction = {
  readonly kind: "use-flags";
  readonly u: boolean;
  readonly p: boolean;
};

export interface ResourceAdvertisementRoleFlagsStepResult {
  readonly state: ResourceAdvertisementRoleFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertisementRoleFlagsAction[];
}

export function initialResourceAdvertisementRoleFlagsState(): ResourceAdvertisementRoleFlagsState {
  return {};
}

export function stepResourceAdvertisementRoleFlagsWithActions(
  state: ResourceAdvertisementRoleFlagsState,
  event: ResourceAdvertisementRoleFlagsEvent
): ResourceAdvertisementRoleFlagsStepResult {
  if (event.kind === "resource/advertisement-role-flags-gate") {
    const flags = planResourceAdvertisementRoleFlags({
      requestIdPresent: event.requestIdPresent,
      isResponse: event.isResponse
    });
    return {
      state,
      intents: [],
      actions: [{ kind: "use-flags", u: flags.u, p: flags.p }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseResourceAdvertisementRoleFlags(
  actions: ReadonlyArray<ResourceAdvertisementRoleFlagsAction>
): boolean {
  return actions.some((action) => action.kind === "use-flags");
}

/** Extract role flags from step actions; null when no `use-flags` action. */
export function resourceAdvertisementRoleFlagsFromActions(
  actions: ReadonlyArray<ResourceAdvertisementRoleFlagsAction>
): { readonly u: boolean; readonly p: boolean } | null {
  const action = actions.find((entry) => entry.kind === "use-flags");
  return action?.kind === "use-flags" ? { u: action.u, p: action.p } : null;
}

/**
 * Resource advertisement pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceAdvertisement`
 * reads beside the step).
 */
export type PackResourceAdvertisementState = Record<string, never>;

export type PackResourceAdvertisementEvent =
  | Event
  | {
      readonly kind: "resource-advertisement/pack-gate";
      readonly fields: ResourceAdvertisementFields;
    };

export type PackResourceAdvertisementAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackResourceAdvertisementStepResult {
  readonly state: PackResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceAdvertisementAction[];
}

export function initialPackResourceAdvertisementState(): PackResourceAdvertisementState {
  return {};
}

export function stepPackResourceAdvertisementWithActions(
  state: PackResourceAdvertisementState,
  event: PackResourceAdvertisementEvent
): PackResourceAdvertisementStepResult {
  if (event.kind === "resource-advertisement/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packResourceAdvertisement(event.fields)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackResourceAdvertisement(
  actions: ReadonlyArray<PackResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract advertisement pack bytes from step actions; null when no `use-raw`. */
export function packResourceAdvertisementRawFromActions(
  actions: ReadonlyArray<PackResourceAdvertisementAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource advertisement unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackResourceAdvertisement`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackResourceAdvertisementState = Record<string, never>;

export type UnpackResourceAdvertisementEvent =
  | Event
  | {
      readonly kind: "resource-advertisement/unpack-gate";
      readonly data: Uint8Array;
    };

export type UnpackResourceAdvertisementAction =
  | { readonly kind: "use-fields"; readonly fields: ResourceAdvertisementFields }
  | { readonly kind: "reject" };

export interface UnpackResourceAdvertisementStepResult {
  readonly state: UnpackResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackResourceAdvertisementAction[];
}

export function initialUnpackResourceAdvertisementState(): UnpackResourceAdvertisementState {
  return {};
}

export function stepUnpackResourceAdvertisementWithActions(
  state: UnpackResourceAdvertisementState,
  event: UnpackResourceAdvertisementEvent
): UnpackResourceAdvertisementStepResult {
  if (event.kind === "resource-advertisement/unpack-gate") {
    try {
      const fields = unpackResourceAdvertisement(event.data);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackResourceAdvertisement(
  actions: ReadonlyArray<UnpackResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackResourceAdvertisement(
  actions: ReadonlyArray<UnpackResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked advertisement fields from step actions; null when no `use-fields`. */
export function resourceAdvertisementFieldsFromActions(
  actions: ReadonlyArray<UnpackResourceAdvertisementAction>
): ResourceAdvertisementFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
