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
  type MsgpackValue,
} from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";
import {
  planResourcePartRequest,
  shouldApplyResourceReceivePartSlot,
} from "./part-2.js";
import type { ResourcePartRequestPlan } from "./part-1.js";
/**
 * Resource receive-part slot-write gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyResourceReceivePartSlot` reads beside the step).
 */
export type ApplyResourceReceivePartSlotState = Record<string, never>;

export type ApplyResourceReceivePartSlotEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/apply-receive-part-slot-gate";
      readonly matched: boolean;
      readonly slotPresent: boolean;
    };

export type ApplyResourceReceivePartSlotAction =
  { readonly kind: "apply" } | { readonly kind: "skip" };

export interface ApplyResourceReceivePartSlotStepResult {
  readonly state: ApplyResourceReceivePartSlotState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyResourceReceivePartSlotAction[];
}

export function initialApplyResourceReceivePartSlotState(): ApplyResourceReceivePartSlotState {
  return {};
}

export function stepApplyResourceReceivePartSlotWithActions(
  state: ApplyResourceReceivePartSlotState,
  event: ApplyResourceReceivePartSlotEvent,
): ApplyResourceReceivePartSlotStepResult {
  if (event.kind === "resource-hashmap/apply-receive-part-slot-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyResourceReceivePartSlot({
            matched: event.matched,
            slotPresent: event.slotPresent,
          })
            ? "apply"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyResourceReceivePartSlotNow(
  actions: ReadonlyArray<ApplyResourceReceivePartSlotAction>,
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyResourceReceivePartSlot(
  actions: ReadonlyArray<ApplyResourceReceivePartSlotAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether fulfill should emit a hashmap-update frame. */
export function shouldSendResourceHashmapUpdate(
  hashmapUpdatePresent: boolean,
): boolean {
  return hashmapUpdatePresent;
}

/**
 * Resource fulfill hashmap-update emit gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldSendResourceHashmapUpdate` reads beside the step).
 */
export type SendResourceHashmapUpdateState = Record<string, never>;

export type SendResourceHashmapUpdateEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/send-hashmap-update-gate";
      readonly hashmapUpdatePresent: boolean;
    };

export type SendResourceHashmapUpdateAction =
  { readonly kind: "send" } | { readonly kind: "skip" };

export interface SendResourceHashmapUpdateStepResult {
  readonly state: SendResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendResourceHashmapUpdateAction[];
}

export function initialSendResourceHashmapUpdateState(): SendResourceHashmapUpdateState {
  return {};
}

export function stepSendResourceHashmapUpdateWithActions(
  state: SendResourceHashmapUpdateState,
  event: SendResourceHashmapUpdateEvent,
): SendResourceHashmapUpdateStepResult {
  if (event.kind === "resource-hashmap/send-hashmap-update-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldSendResourceHashmapUpdate(event.hashmapUpdatePresent)
            ? "send"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldSendResourceHashmapUpdateNow(
  actions: ReadonlyArray<SendResourceHashmapUpdateAction>,
): boolean {
  return actions.some((action) => action.kind === "send");
}

export function shouldSkipSendResourceHashmapUpdate(
  actions: ReadonlyArray<SendResourceHashmapUpdateAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether fulfill should advance status to awaiting-proof. */
export function shouldAdvanceResourceAwaitingProof(
  status: "transferring" | "awaiting-proof",
): boolean {
  return status === "awaiting-proof";
}

/**
 * Resource fulfill awaiting-proof advance gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAdvanceResourceAwaitingProof` reads beside the step).
 */
export type AdvanceResourceAwaitingProofState = Record<string, never>;

export type AdvanceResourceAwaitingProofEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/advance-awaiting-proof-gate";
      readonly status: "transferring" | "awaiting-proof";
    };

export type AdvanceResourceAwaitingProofAction =
  { readonly kind: "advance" } | { readonly kind: "skip" };

export interface AdvanceResourceAwaitingProofStepResult {
  readonly state: AdvanceResourceAwaitingProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AdvanceResourceAwaitingProofAction[];
}

export function initialAdvanceResourceAwaitingProofState(): AdvanceResourceAwaitingProofState {
  return {};
}

export function stepAdvanceResourceAwaitingProofWithActions(
  state: AdvanceResourceAwaitingProofState,
  event: AdvanceResourceAwaitingProofEvent,
): AdvanceResourceAwaitingProofStepResult {
  if (event.kind === "resource-hashmap/advance-awaiting-proof-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAdvanceResourceAwaitingProof(event.status)
            ? "advance"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAdvanceResourceAwaitingProofNow(
  actions: ReadonlyArray<AdvanceResourceAwaitingProofAction>,
): boolean {
  return actions.some((action) => action.kind === "advance");
}

export function shouldSkipAdvanceResourceAwaitingProof(
  actions: ReadonlyArray<AdvanceResourceAwaitingProofAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Resource part-request plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Nested under {@link stepResourcePartRequestWithActions}.
 */
export type ResourcePartRequestPlanState = Record<string, never>;

export type ResourcePartRequestPlanEvent =
  | Event
  | {
      readonly kind: "resource/part-request-plan-gate";
      readonly receivedParts: ReadonlyArray<Uint8Array | null>;
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly consecutiveCompletedHeight: number;
      readonly window: number;
      readonly hashmapHeight: number;
      readonly resourceHash: Uint8Array;
    };

export type ResourcePartRequestPlanAction = {
  readonly kind: "request";
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
};

export interface ResourcePartRequestPlanStepResult {
  readonly state: ResourcePartRequestPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartRequestPlanAction[];
}

export function initialResourcePartRequestPlanState(): ResourcePartRequestPlanState {
  return {};
}

export function stepResourcePartRequestPlanWithActions(
  state: ResourcePartRequestPlanState,
  event: ResourcePartRequestPlanEvent,
): ResourcePartRequestPlanStepResult {
  if (event.kind === "resource/part-request-plan-gate") {
    const plan = planResourcePartRequest({
      receivedParts: event.receivedParts,
      hashmap: event.hashmap,
      consecutiveCompletedHeight: event.consecutiveCompletedHeight,
      window: event.window,
      hashmapHeight: event.hashmapHeight,
      resourceHash: event.resourceHash,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "request",
          outstandingParts: plan.outstandingParts,
          waitingForHashmap: plan.waitingForHashmap,
          requestData: plan.requestData,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEmitResourcePartRequestPlan(
  actions: ReadonlyArray<ResourcePartRequestPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "request");
}

export function resourcePartRequestPlanFromActions(
  actions: ReadonlyArray<ResourcePartRequestPlanAction>,
): ResourcePartRequestPlan | null {
  for (const action of actions) {
    if (action.kind === "request") {
      return {
        outstandingParts: action.outstandingParts,
        waitingForHashmap: action.waitingForHashmap,
        requestData: action.requestData,
      };
    }
  }
  return null;
}

/**
 * Resource part-request planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourcePartRequestPlanWithActions} (`request`).
 */
export type ResourcePartRequestState = Record<string, never>;

export type ResourcePartRequestEvent =
  | Event
  | {
      readonly kind: "resource/part-request-gate";
      readonly receivedParts: ReadonlyArray<Uint8Array | null>;
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly consecutiveCompletedHeight: number;
      readonly window: number;
      readonly hashmapHeight: number;
      readonly resourceHash: Uint8Array;
    };

export type ResourcePartRequestAction = {
  readonly kind: "request";
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
};

export interface ResourcePartRequestStepResult {
  readonly state: ResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartRequestAction[];
}

export function initialResourcePartRequestState(): ResourcePartRequestState {
  return {};
}

export const stepResourcePartRequest: StepFn<ResourcePartRequestState> = (
  state,
  event,
) => {
  const result = stepResourcePartRequestInner(
    state,
    event as ResourcePartRequestEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourcePartRequestWithActions(
  state: ResourcePartRequestState,
  event: ResourcePartRequestEvent,
): ResourcePartRequestStepResult {
  return stepResourcePartRequestInner(state, event);
}

export function shouldEmitResourcePartRequest(
  actions: ReadonlyArray<ResourcePartRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "request");
}

export function resourcePartRequestFromActions(
  actions: ReadonlyArray<ResourcePartRequestAction>,
): ResourcePartRequestPlan | null {
  for (const action of actions) {
    if (action.kind === "request") {
      return {
        outstandingParts: action.outstandingParts,
        waitingForHashmap: action.waitingForHashmap,
        requestData: action.requestData,
      };
    }
  }
  return null;
}

function stepResourcePartRequestInner(
  state: ResourcePartRequestState,
  event: ResourcePartRequestEvent,
): ResourcePartRequestStepResult {
  if (event.kind === "resource/part-request-gate") {
    const planActions = stepResourcePartRequestPlanWithActions(
      initialResourcePartRequestPlanState(),
      {
        kind: "resource/part-request-plan-gate",
        receivedParts: event.receivedParts,
        hashmap: event.hashmap,
        consecutiveCompletedHeight: event.consecutiveCompletedHeight,
        window: event.window,
        hashmapHeight: event.hashmapHeight,
        resourceHash: event.resourceHash,
      },
    ).actions;
    const plan = resourcePartRequestPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "request",
          outstandingParts: plan.outstandingParts,
          waitingForHashmap: plan.waitingForHashmap,
          requestData: plan.requestData,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export type ResourceReceivePartPlanEvent =
  | Event
  | {
      readonly kind: "resource/receive-part-plan-gate";
      readonly partHash: Uint8Array;
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly receivedParts: ReadonlyArray<Uint8Array | null>;
      readonly consecutiveCompletedHeight: number;
      readonly window: number;
      readonly receivedCount: number;
      readonly outstandingParts: number;
      readonly totalParts: number;
      readonly assemblyStarted: boolean;
    };

export type ResourceReceivePartPlanAction = {
  readonly kind: "receive";
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
};

export type ResourceReceivePartEvent =
  | Event
  | {
      readonly kind: "resource/receive-part-gate";
      readonly partHash: Uint8Array;
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly receivedParts: ReadonlyArray<Uint8Array | null>;
      readonly consecutiveCompletedHeight: number;
      readonly window: number;
      readonly receivedCount: number;
      readonly outstandingParts: number;
      readonly totalParts: number;
      readonly assemblyStarted: boolean;
    };

export type ResourceReceivePartAction = {
  readonly kind: "receive";
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
};
