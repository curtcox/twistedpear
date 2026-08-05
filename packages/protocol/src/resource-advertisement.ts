/**
 * Pure RNS resource advertisement msgpack codec and flag bits.
 * Hashing / link IO stay at the adapter edge.
 * Pack / unpack / role-flag / flag encode-decode / request-response classify
 * conclusions leave via machine actions (no ad-hoc
 * `packResourceAdvertisement` / `unpackResourceAdvertisement` /
 * `planResourceAdvertisementRoleFlags` / `encodeResourceAdvertisementFlags` /
 * `decodeResourceAdvertisementFlags` / `isResourceAdvertisementRequest` /
 * `isResourceAdvertisementResponse` reads beside the step).
 * Role-flag plan nested via {@link stepResourceAdvertisementRoleFlagsPlanWithActions}.
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
 * Resource advertisement flag encoding is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `encodeResourceAdvertisementFlags` reads beside the step).
 */
export type EncodeResourceAdvertisementFlagsState = Record<string, never>;

export type EncodeResourceAdvertisementFlagsEvent =
  | Event
  | {
      readonly kind: "resource-advertisement/encode-flags-gate";
      readonly flags: ResourceAdvertisementFlags;
    };

export type EncodeResourceAdvertisementFlagsAction = {
  readonly kind: "use-flags";
  readonly flags: number;
};

export interface EncodeResourceAdvertisementFlagsStepResult {
  readonly state: EncodeResourceAdvertisementFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeResourceAdvertisementFlagsAction[];
}

export function initialEncodeResourceAdvertisementFlagsState(): EncodeResourceAdvertisementFlagsState {
  return {};
}

export function stepEncodeResourceAdvertisementFlagsWithActions(
  state: EncodeResourceAdvertisementFlagsState,
  event: EncodeResourceAdvertisementFlagsEvent
): EncodeResourceAdvertisementFlagsStepResult {
  if (event.kind === "resource-advertisement/encode-flags-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-flags",
          flags: encodeResourceAdvertisementFlags(event.flags)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeResourceAdvertisementFlags(
  actions: ReadonlyArray<EncodeResourceAdvertisementFlagsAction>
): boolean {
  return actions.some((action) => action.kind === "use-flags");
}

/** Extract packed advertisement flags from step actions; null when no `use-flags`. */
export function encodeResourceAdvertisementFlagsFromActions(
  actions: ReadonlyArray<EncodeResourceAdvertisementFlagsAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-flags");
  return action?.kind === "use-flags" ? action.flags : null;
}

/**
 * Resource advertisement flag decoding is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `decodeResourceAdvertisementFlags` reads beside the step).
 */
export type DecodeResourceAdvertisementFlagsState = Record<string, never>;

export type DecodeResourceAdvertisementFlagsEvent =
  | Event
  | {
      readonly kind: "resource-advertisement/decode-flags-gate";
      readonly flags: number;
    };

export type DecodeResourceAdvertisementFlagsAction = {
  readonly kind: "use-fields";
  readonly fields: ResourceAdvertisementFlags;
};

export interface DecodeResourceAdvertisementFlagsStepResult {
  readonly state: DecodeResourceAdvertisementFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeResourceAdvertisementFlagsAction[];
}

export function initialDecodeResourceAdvertisementFlagsState(): DecodeResourceAdvertisementFlagsState {
  return {};
}

export function stepDecodeResourceAdvertisementFlagsWithActions(
  state: DecodeResourceAdvertisementFlagsState,
  event: DecodeResourceAdvertisementFlagsEvent
): DecodeResourceAdvertisementFlagsStepResult {
  if (event.kind === "resource-advertisement/decode-flags-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: decodeResourceAdvertisementFlags(event.flags)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeResourceAdvertisementFlags(
  actions: ReadonlyArray<DecodeResourceAdvertisementFlagsAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract decoded advertisement flag fields from step actions; null when no `use-fields`. */
export function resourceAdvertisementFlagFieldsFromActions(
  actions: ReadonlyArray<DecodeResourceAdvertisementFlagsAction>
): ResourceAdvertisementFlags | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Resource advertisement request/response classification is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `isResourceAdvertisementRequest` / `isResourceAdvertisementResponse` reads
 * beside the step).
 */
export type ClassifyResourceAdvertisementState = Record<string, never>;

export type ClassifyResourceAdvertisementEvent =
  | Event
  | {
      readonly kind: "resource-advertisement/classify-gate";
      readonly fields: ResourceAdvertisementFields;
    };

export type ClassifyResourceAdvertisementAction =
  | { readonly kind: "request" }
  | { readonly kind: "response" }
  | { readonly kind: "reject" };

export interface ClassifyResourceAdvertisementStepResult {
  readonly state: ClassifyResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClassifyResourceAdvertisementAction[];
}

export function initialClassifyResourceAdvertisementState(): ClassifyResourceAdvertisementState {
  return {};
}

export function stepClassifyResourceAdvertisementWithActions(
  state: ClassifyResourceAdvertisementState,
  event: ClassifyResourceAdvertisementEvent
): ClassifyResourceAdvertisementStepResult {
  if (event.kind === "resource-advertisement/classify-gate") {
    if (isResourceAdvertisementRequest(event.fields)) {
      return { state, intents: [], actions: [{ kind: "request" }] };
    }
    if (isResourceAdvertisementResponse(event.fields)) {
      return { state, intents: [], actions: [{ kind: "response" }] };
    }
    return { state, intents: [], actions: [{ kind: "reject" }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClassifyResourceAdvertisementRequest(
  actions: ReadonlyArray<ClassifyResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "request");
}

export function shouldClassifyResourceAdvertisementResponse(
  actions: ReadonlyArray<ClassifyResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "response");
}

export function shouldRejectClassifyResourceAdvertisement(
  actions: ReadonlyArray<ClassifyResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
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
 * Resource advertisement role-flag plan leaf is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `planResourceAdvertisementRoleFlags` reads beside the step). Nested under
 * {@link stepResourceAdvertisementRoleFlagsWithActions}.
 */
export type ResourceAdvertisementRoleFlagsPlanState = Record<string, never>;

export type ResourceAdvertisementRoleFlagsPlanEvent =
  | Event
  | {
      readonly kind: "resource/advertisement-role-flags-plan-gate";
      readonly requestIdPresent: boolean;
      readonly isResponse: boolean;
    };

export type ResourceAdvertisementRoleFlagsPlanAction = {
  readonly kind: "use-flags";
  readonly u: boolean;
  readonly p: boolean;
};

export interface ResourceAdvertisementRoleFlagsPlanStepResult {
  readonly state: ResourceAdvertisementRoleFlagsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertisementRoleFlagsPlanAction[];
}

export function initialResourceAdvertisementRoleFlagsPlanState(): ResourceAdvertisementRoleFlagsPlanState {
  return {};
}

export function stepResourceAdvertisementRoleFlagsPlanWithActions(
  state: ResourceAdvertisementRoleFlagsPlanState,
  event: ResourceAdvertisementRoleFlagsPlanEvent
): ResourceAdvertisementRoleFlagsPlanStepResult {
  if (event.kind === "resource/advertisement-role-flags-plan-gate") {
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

export function shouldUseResourceAdvertisementRoleFlagsPlan(
  actions: ReadonlyArray<ResourceAdvertisementRoleFlagsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "use-flags");
}

/** Extract role flags from plan actions; null when no `use-flags` action. */
export function resourceAdvertisementRoleFlagsPlanFromActions(
  actions: ReadonlyArray<ResourceAdvertisementRoleFlagsPlanAction>
): { readonly u: boolean; readonly p: boolean } | null {
  const action = actions.find((entry) => entry.kind === "use-flags");
  return action?.kind === "use-flags" ? { u: action.u, p: action.p } : null;
}

/**
 * Resource advertisement role-flag selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planResourceAdvertisementRoleFlags` reads beside the step).
 * Plan nested via {@link stepResourceAdvertisementRoleFlagsPlanWithActions}
 * (`use-flags`).
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
    const planActions = stepResourceAdvertisementRoleFlagsPlanWithActions(
      initialResourceAdvertisementRoleFlagsPlanState(),
      {
        kind: "resource/advertisement-role-flags-plan-gate",
        requestIdPresent: event.requestIdPresent,
        isResponse: event.isResponse
      }
    ).actions;
    const flags = resourceAdvertisementRoleFlagsPlanFromActions(planActions);
    if (flags === null) {
      return { state, intents: [], actions: [] };
    }
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
