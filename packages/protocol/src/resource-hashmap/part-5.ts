/** Extracted from resource-hashmap.ts; the original module remains the public composition point. */
/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 * Pack / unpack / split / parse / collision-guard / membership / assemble /
 * request-hash conclusions leave via machine actions (no ad-hoc
 * `packResourceHashmapUpdate` / `unpackResourceHashmapUpdate` /
 * `packResourceHashmapUpdatePacket` / `splitResourceHashmapUpdatePacket` /
 * `parseResourcePartRequest` / `appendResourceMapHashCollisionGuard` /
 * `containsResourceHash` / `indexOfResourceHash` /
 * `assembleResourceHashmapBytes` / `readResourceRequestHash` reads beside
 * the step). Slot-write plan nested via
 * {@link stepResourceHashmapSlotWritesPlanWithActions}.
 * Part-request / receive-part / request-fulfill / HMU-accept plans nest via
 * {@link stepResourcePartRequestPlanWithActions} /
 * {@link stepResourceReceivePartPlanWithActions} /
 * {@link stepResourceRequestFulfillPlanWithActions} /
 * {@link stepResourceHashmapUpdateAcceptPlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { assembleByteArrays, concatByteArrays } from "../bytes.js";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackUInt,
  msgpackUnpack,
  type MsgpackValue
} from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";
import { packResourceHashmapUpdate, packResourceHashmapUpdatePacket, parseResourcePartRequest, splitResourceHashmapUpdatePacket, unpackResourceHashmapUpdate } from "./part-1.js";
import { planResourceHashmapUpdateAccept } from "./part-2.js";
import { resourceHashmapUpdateAcceptPlanFromActions } from "./part-4.js";
import type { ResourcePartRequest } from "./part-1.js";
import type { ResourceHashmapUpdateAcceptAction, ResourceHashmapUpdateAcceptEvent, ResourceHashmapUpdateAcceptPlanAction, ResourceHashmapUpdateAcceptPlanEvent } from "./part-4.js";
/**
 * Resource hashmap-update accept plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc plan reads beside
 * the step). Nested under {@link stepResourceHashmapUpdateAcceptWithActions}.
 */
export type ResourceHashmapUpdateAcceptPlanState = Record<string, never>;

export interface ResourceHashmapUpdateAcceptPlanStepResult {
  readonly state: ResourceHashmapUpdateAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapUpdateAcceptPlanAction[];
}

export function initialResourceHashmapUpdateAcceptPlanState(): ResourceHashmapUpdateAcceptPlanState {
  return {};
}

export function stepResourceHashmapUpdateAcceptPlanWithActions(
  state: ResourceHashmapUpdateAcceptPlanState,
  event: ResourceHashmapUpdateAcceptPlanEvent
): ResourceHashmapUpdateAcceptPlanStepResult {
  if (event.kind === "resource/hashmap-update-accept-plan-gate") {
    const plan = planResourceHashmapUpdateAccept({
      canContinue: event.canContinue,
      splitOk: event.splitOk,
      unpackOk: event.unpackOk
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyResourceHashmapUpdateAcceptPlan(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptPlanAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldIgnoreResourceHashmapUpdateAcceptPlan(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

/**
 * Resource hashmap-update accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceHashmapUpdateAcceptPlanWithActions}
 * (`apply`|`ignore`).
 */
export type ResourceHashmapUpdateAcceptState = Record<string, never>;

export interface ResourceHashmapUpdateAcceptStepResult {
  readonly state: ResourceHashmapUpdateAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapUpdateAcceptAction[];
}

export function initialResourceHashmapUpdateAcceptState(): ResourceHashmapUpdateAcceptState {
  return {};
}

export const stepResourceHashmapUpdateAccept: StepFn<ResourceHashmapUpdateAcceptState> = (
  state,
  event
) => {
  const result = stepResourceHashmapUpdateAcceptInner(
    state,
    event as ResourceHashmapUpdateAcceptEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceHashmapUpdateAcceptWithActions(
  state: ResourceHashmapUpdateAcceptState,
  event: ResourceHashmapUpdateAcceptEvent
): ResourceHashmapUpdateAcceptStepResult {
  return stepResourceHashmapUpdateAcceptInner(state, event);
}

export function shouldApplyResourceHashmapUpdateAccept(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldIgnoreResourceHashmapUpdateAccept(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepResourceHashmapUpdateAcceptInner(
  state: ResourceHashmapUpdateAcceptState,
  event: ResourceHashmapUpdateAcceptEvent
): ResourceHashmapUpdateAcceptStepResult {
  if (event.kind === "resource/hashmap-update-accept-gate") {
    const planActions = stepResourceHashmapUpdateAcceptPlanWithActions(
      initialResourceHashmapUpdateAcceptPlanState(),
      {
        kind: "resource/hashmap-update-accept-plan-gate",
        canContinue: event.canContinue,
        splitOk: event.splitOk,
        unpackOk: event.unpackOk
      }
    ).actions;
    const plan = resourceHashmapUpdateAcceptPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export interface ResourceHashmapUpdateFields {
  readonly segment: number;
  readonly hashmap: Uint8Array;
}

export interface ResourceHashmapUpdatePacketFields {
  readonly resourceHash: Uint8Array;
  readonly updateBytes: Uint8Array;
}

/**
 * Resource hashmap-update pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceHashmapUpdate`
 * reads beside the step).
 */
export type PackResourceHashmapUpdateState = Record<string, never>;

export type PackResourceHashmapUpdateEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/pack-update-gate";
      readonly segment: number;
      readonly hashmap: Uint8Array;
    };

export type PackResourceHashmapUpdateAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackResourceHashmapUpdateStepResult {
  readonly state: PackResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceHashmapUpdateAction[];
}

export function initialPackResourceHashmapUpdateState(): PackResourceHashmapUpdateState {
  return {};
}

export function stepPackResourceHashmapUpdateWithActions(
  state: PackResourceHashmapUpdateState,
  event: PackResourceHashmapUpdateEvent
): PackResourceHashmapUpdateStepResult {
  if (event.kind === "resource-hashmap/pack-update-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packResourceHashmapUpdate(event.segment, event.hashmap)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackResourceHashmapUpdate(
  actions: ReadonlyArray<PackResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract hashmap-update pack bytes from step actions; null when no `use-raw`. */
export function packResourceHashmapUpdateRawFromActions(
  actions: ReadonlyArray<PackResourceHashmapUpdateAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource hashmap-update unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackResourceHashmapUpdate`
 * reads beside the step).
 */
export type UnpackResourceHashmapUpdateState = Record<string, never>;

export type UnpackResourceHashmapUpdateEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/unpack-update-gate";
      readonly bytes: Uint8Array;
    };

export type UnpackResourceHashmapUpdateAction =
  | { readonly kind: "use-fields"; readonly fields: ResourceHashmapUpdateFields }
  | { readonly kind: "reject" };

export interface UnpackResourceHashmapUpdateStepResult {
  readonly state: UnpackResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackResourceHashmapUpdateAction[];
}

export function initialUnpackResourceHashmapUpdateState(): UnpackResourceHashmapUpdateState {
  return {};
}

export function stepUnpackResourceHashmapUpdateWithActions(
  state: UnpackResourceHashmapUpdateState,
  event: UnpackResourceHashmapUpdateEvent
): UnpackResourceHashmapUpdateStepResult {
  if (event.kind === "resource-hashmap/unpack-update-gate") {
    const fields = unpackResourceHashmapUpdate(event.bytes);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackResourceHashmapUpdate(
  actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackResourceHashmapUpdate(
  actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked hashmap-update fields from step actions; null when no `use-fields`. */
export function resourceHashmapUpdateFieldsFromActions(
  actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>
): ResourceHashmapUpdateFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Resource hashmap-update packet pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceHashmapUpdatePacket`
 * reads beside the step).
 */
export type PackResourceHashmapUpdatePacketState = Record<string, never>;

export type PackResourceHashmapUpdatePacketEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/pack-packet-gate";
      readonly resourceHash: Uint8Array;
      readonly updateBytes: Uint8Array;
    };

export type PackResourceHashmapUpdatePacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackResourceHashmapUpdatePacketStepResult {
  readonly state: PackResourceHashmapUpdatePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceHashmapUpdatePacketAction[];
}

export function initialPackResourceHashmapUpdatePacketState(): PackResourceHashmapUpdatePacketState {
  return {};
}

export function stepPackResourceHashmapUpdatePacketWithActions(
  state: PackResourceHashmapUpdatePacketState,
  event: PackResourceHashmapUpdatePacketEvent
): PackResourceHashmapUpdatePacketStepResult {
  if (event.kind === "resource-hashmap/pack-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packResourceHashmapUpdatePacket(event.resourceHash, event.updateBytes)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackResourceHashmapUpdatePacket(
  actions: ReadonlyArray<PackResourceHashmapUpdatePacketAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract hashmap-update packet bytes from step actions; null when no `use-raw`. */
export function packResourceHashmapUpdatePacketRawFromActions(
  actions: ReadonlyArray<PackResourceHashmapUpdatePacketAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource hashmap-update packet split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResourceHashmapUpdatePacket`
 * reads beside the step).
 */
export type SplitResourceHashmapUpdatePacketState = Record<string, never>;

export type SplitResourceHashmapUpdatePacketEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/split-packet-gate";
      readonly plaintext: Uint8Array;
    };

export type SplitResourceHashmapUpdatePacketAction =
  | {
      readonly kind: "use-fields";
      readonly fields: ResourceHashmapUpdatePacketFields;
    }
  | { readonly kind: "reject" };

export interface SplitResourceHashmapUpdatePacketStepResult {
  readonly state: SplitResourceHashmapUpdatePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceHashmapUpdatePacketAction[];
}

export function initialSplitResourceHashmapUpdatePacketState(): SplitResourceHashmapUpdatePacketState {
  return {};
}

export function stepSplitResourceHashmapUpdatePacketWithActions(
  state: SplitResourceHashmapUpdatePacketState,
  event: SplitResourceHashmapUpdatePacketEvent
): SplitResourceHashmapUpdatePacketStepResult {
  if (event.kind === "resource-hashmap/split-packet-gate") {
    const fields = splitResourceHashmapUpdatePacket(event.plaintext);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitResourceHashmapUpdatePacket(
  actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitResourceHashmapUpdatePacket(
  actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split hashmap-update packet fields from step actions; null when no `use-fields`. */
export function resourceHashmapUpdatePacketFieldsFromActions(
  actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>
): ResourceHashmapUpdatePacketFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Resource part-request parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseResourcePartRequest`
 * reads beside the step).
 */
export type ParseResourcePartRequestState = Record<string, never>;

export type ParseResourcePartRequestEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/parse-part-request-gate";
      readonly requestData: Uint8Array;
    };

export type ParseResourcePartRequestAction =
  | { readonly kind: "use-fields"; readonly fields: ResourcePartRequest }
  | { readonly kind: "reject" };

export interface ParseResourcePartRequestStepResult {
  readonly state: ParseResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseResourcePartRequestAction[];
}

export function initialParseResourcePartRequestState(): ParseResourcePartRequestState {
  return {};
}

export function stepParseResourcePartRequestWithActions(
  state: ParseResourcePartRequestState,
  event: ParseResourcePartRequestEvent
): ParseResourcePartRequestStepResult {
  if (event.kind === "resource-hashmap/parse-part-request-gate") {
    const fields = parseResourcePartRequest(event.requestData);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}
