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
  planResourceReceivePart,
  planResourceRequestFulfill,
} from "./part-2.js";
import type { ResourcePartRequest } from "./part-1.js";
import type {
  ResourceHashmapUpdateAcceptPlan,
  ResourceReceivePartPlan,
  ResourceRequestFulfillHashmapUpdate,
  ResourceRequestFulfillPartAction,
  ResourceRequestFulfillPlan,
} from "./part-2.js";
import type {
  ResourceReceivePartAction,
  ResourceReceivePartEvent,
  ResourceReceivePartPlanAction,
  ResourceReceivePartPlanEvent,
} from "./part-3.js";
/**
 * Resource receive-part plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Nested under {@link stepResourceReceivePartWithActions}.
 */
export type ResourceReceivePartPlanState = Record<string, never>;

export interface ResourceReceivePartPlanStepResult {
  readonly state: ResourceReceivePartPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartPlanAction[];
}

export function initialResourceReceivePartPlanState(): ResourceReceivePartPlanState {
  return {};
}

export function stepResourceReceivePartPlanWithActions(
  state: ResourceReceivePartPlanState,
  event: ResourceReceivePartPlanEvent,
): ResourceReceivePartPlanStepResult {
  if (event.kind === "resource/receive-part-plan-gate") {
    const plan = planResourceReceivePart({
      partHash: event.partHash,
      hashmap: event.hashmap,
      receivedParts: event.receivedParts,
      consecutiveCompletedHeight: event.consecutiveCompletedHeight,
      window: event.window,
      receivedCount: event.receivedCount,
      outstandingParts: event.outstandingParts,
      totalParts: event.totalParts,
      assemblyStarted: event.assemblyStarted,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "receive",
          matched: plan.matched,
          slot: plan.slot,
          consecutiveCompletedHeight: plan.consecutiveCompletedHeight,
          receivedCount: plan.receivedCount,
          outstandingParts: plan.outstandingParts,
          progress: plan.progress,
          shouldAssemble: plan.shouldAssemble,
          shouldRequestNext: plan.shouldRequestNext,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyResourceReceivePartPlan(
  actions: ReadonlyArray<ResourceReceivePartPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "receive");
}

export function resourceReceivePartPlanFromActions(
  actions: ReadonlyArray<ResourceReceivePartPlanAction>,
): ResourceReceivePartPlan | null {
  for (const action of actions) {
    if (action.kind === "receive") {
      return {
        matched: action.matched,
        slot: action.slot,
        consecutiveCompletedHeight: action.consecutiveCompletedHeight,
        receivedCount: action.receivedCount,
        outstandingParts: action.outstandingParts,
        progress: action.progress,
        shouldAssemble: action.shouldAssemble,
        shouldRequestNext: action.shouldRequestNext,
      };
    }
  }
  return null;
}

/**
 * Resource receive-part planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceReceivePartPlanWithActions} (`receive`).
 */
export type ResourceReceivePartState = Record<string, never>;

export interface ResourceReceivePartStepResult {
  readonly state: ResourceReceivePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartAction[];
}

export function initialResourceReceivePartState(): ResourceReceivePartState {
  return {};
}

export const stepResourceReceivePart: StepFn<ResourceReceivePartState> = (
  state,
  event,
) => {
  const result = stepResourceReceivePartInner(
    state,
    event as ResourceReceivePartEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceReceivePartWithActions(
  state: ResourceReceivePartState,
  event: ResourceReceivePartEvent,
): ResourceReceivePartStepResult {
  return stepResourceReceivePartInner(state, event);
}

export function shouldApplyResourceReceivePart(
  actions: ReadonlyArray<ResourceReceivePartAction>,
): boolean {
  return actions.some((action) => action.kind === "receive");
}

export function resourceReceivePartFromActions(
  actions: ReadonlyArray<ResourceReceivePartAction>,
): ResourceReceivePartPlan | null {
  for (const action of actions) {
    if (action.kind === "receive") {
      return {
        matched: action.matched,
        slot: action.slot,
        consecutiveCompletedHeight: action.consecutiveCompletedHeight,
        receivedCount: action.receivedCount,
        outstandingParts: action.outstandingParts,
        progress: action.progress,
        shouldAssemble: action.shouldAssemble,
        shouldRequestNext: action.shouldRequestNext,
      };
    }
  }
  return null;
}

function stepResourceReceivePartInner(
  state: ResourceReceivePartState,
  event: ResourceReceivePartEvent,
): ResourceReceivePartStepResult {
  if (event.kind === "resource/receive-part-gate") {
    const planActions = stepResourceReceivePartPlanWithActions(
      initialResourceReceivePartPlanState(),
      {
        kind: "resource/receive-part-plan-gate",
        partHash: event.partHash,
        hashmap: event.hashmap,
        receivedParts: event.receivedParts,
        consecutiveCompletedHeight: event.consecutiveCompletedHeight,
        window: event.window,
        receivedCount: event.receivedCount,
        outstandingParts: event.outstandingParts,
        totalParts: event.totalParts,
        assemblyStarted: event.assemblyStarted,
      },
    ).actions;
    const plan = resourceReceivePartPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "receive",
          matched: plan.matched,
          slot: plan.slot,
          consecutiveCompletedHeight: plan.consecutiveCompletedHeight,
          receivedCount: plan.receivedCount,
          outstandingParts: plan.outstandingParts,
          progress: plan.progress,
          shouldAssemble: plan.shouldAssemble,
          shouldRequestNext: plan.shouldRequestNext,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Resource request-fulfill plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Nested under {@link stepResourceRequestFulfillWithActions}.
 */
export type ResourceRequestFulfillPlanState = Record<string, never>;

export type ResourceRequestFulfillPlanEvent =
  | Event
  | {
      readonly kind: "resource/request-fulfill-plan-gate";
      readonly request: ResourcePartRequest;
      readonly partMapHashes: ReadonlyArray<Uint8Array>;
      readonly partSent: ReadonlyArray<boolean>;
      readonly receiverMinConsecutiveHeight: number;
      readonly hashmapMaxLen: number;
      readonly windowMax: number;
      readonly totalParts: number;
      readonly sentParts: number;
    };

export type ResourceRequestFulfillPlanAction = {
  readonly kind: "fulfill";
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
};

export interface ResourceRequestFulfillPlanStepResult {
  readonly state: ResourceRequestFulfillPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestFulfillPlanAction[];
}

export function initialResourceRequestFulfillPlanState(): ResourceRequestFulfillPlanState {
  return {};
}

export function stepResourceRequestFulfillPlanWithActions(
  state: ResourceRequestFulfillPlanState,
  event: ResourceRequestFulfillPlanEvent,
): ResourceRequestFulfillPlanStepResult {
  if (event.kind === "resource/request-fulfill-plan-gate") {
    const plan = planResourceRequestFulfill({
      request: event.request,
      partMapHashes: event.partMapHashes,
      partSent: event.partSent,
      receiverMinConsecutiveHeight: event.receiverMinConsecutiveHeight,
      hashmapMaxLen: event.hashmapMaxLen,
      windowMax: event.windowMax,
      totalParts: event.totalParts,
      sentParts: event.sentParts,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "fulfill",
          partActions: plan.partActions,
          hashmapUpdate: plan.hashmapUpdate,
          nextSentParts: plan.nextSentParts,
          nextReceiverMinConsecutiveHeight:
            plan.nextReceiverMinConsecutiveHeight,
          status: plan.status,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldFulfillResourceRequestPlan(
  actions: ReadonlyArray<ResourceRequestFulfillPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "fulfill");
}

export function resourceRequestFulfillPlanFromActions(
  actions: ReadonlyArray<ResourceRequestFulfillPlanAction>,
): ResourceRequestFulfillPlan | null {
  for (const action of actions) {
    if (action.kind === "fulfill") {
      return {
        partActions: action.partActions,
        hashmapUpdate: action.hashmapUpdate,
        nextSentParts: action.nextSentParts,
        nextReceiverMinConsecutiveHeight:
          action.nextReceiverMinConsecutiveHeight,
        status: action.status,
      };
    }
  }
  return null;
}

/**
 * Resource request-fulfill planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceRequestFulfillPlanWithActions} (`fulfill`).
 */
export type ResourceRequestFulfillState = Record<string, never>;

export type ResourceRequestFulfillEvent =
  | Event
  | {
      readonly kind: "resource/request-fulfill-gate";
      readonly request: ResourcePartRequest;
      readonly partMapHashes: ReadonlyArray<Uint8Array>;
      readonly partSent: ReadonlyArray<boolean>;
      readonly receiverMinConsecutiveHeight: number;
      readonly hashmapMaxLen: number;
      readonly windowMax: number;
      readonly totalParts: number;
      readonly sentParts: number;
    };

export type ResourceRequestFulfillAction = {
  readonly kind: "fulfill";
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
};

export interface ResourceRequestFulfillStepResult {
  readonly state: ResourceRequestFulfillState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestFulfillAction[];
}

export function initialResourceRequestFulfillState(): ResourceRequestFulfillState {
  return {};
}

export const stepResourceRequestFulfill: StepFn<ResourceRequestFulfillState> = (
  state,
  event,
) => {
  const result = stepResourceRequestFulfillInner(
    state,
    event as ResourceRequestFulfillEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceRequestFulfillWithActions(
  state: ResourceRequestFulfillState,
  event: ResourceRequestFulfillEvent,
): ResourceRequestFulfillStepResult {
  return stepResourceRequestFulfillInner(state, event);
}

export function shouldFulfillResourceRequest(
  actions: ReadonlyArray<ResourceRequestFulfillAction>,
): boolean {
  return actions.some((action) => action.kind === "fulfill");
}

export function resourceRequestFulfillFromActions(
  actions: ReadonlyArray<ResourceRequestFulfillAction>,
): ResourceRequestFulfillPlan | null {
  for (const action of actions) {
    if (action.kind === "fulfill") {
      return {
        partActions: action.partActions,
        hashmapUpdate: action.hashmapUpdate,
        nextSentParts: action.nextSentParts,
        nextReceiverMinConsecutiveHeight:
          action.nextReceiverMinConsecutiveHeight,
        status: action.status,
      };
    }
  }
  return null;
}

function stepResourceRequestFulfillInner(
  state: ResourceRequestFulfillState,
  event: ResourceRequestFulfillEvent,
): ResourceRequestFulfillStepResult {
  if (event.kind === "resource/request-fulfill-gate") {
    const planActions = stepResourceRequestFulfillPlanWithActions(
      initialResourceRequestFulfillPlanState(),
      {
        kind: "resource/request-fulfill-plan-gate",
        request: event.request,
        partMapHashes: event.partMapHashes,
        partSent: event.partSent,
        receiverMinConsecutiveHeight: event.receiverMinConsecutiveHeight,
        hashmapMaxLen: event.hashmapMaxLen,
        windowMax: event.windowMax,
        totalParts: event.totalParts,
        sentParts: event.sentParts,
      },
    ).actions;
    const plan = resourceRequestFulfillPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "fulfill",
          partActions: plan.partActions,
          hashmapUpdate: plan.hashmapUpdate,
          nextSentParts: plan.nextSentParts,
          nextReceiverMinConsecutiveHeight:
            plan.nextReceiverMinConsecutiveHeight,
          status: plan.status,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export type ResourceHashmapUpdateAcceptPlanEvent =
  | Event
  | {
      readonly kind: "resource/hashmap-update-accept-plan-gate";
      readonly canContinue: boolean;
      readonly splitOk: boolean;
      readonly unpackOk: boolean;
    };

export type ResourceHashmapUpdateAcceptPlanAction = {
  readonly kind: ResourceHashmapUpdateAcceptPlan;
};

export function resourceHashmapUpdateAcceptPlanFromActions(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptPlanAction>,
): ResourceHashmapUpdateAcceptPlan | null {
  const action = actions.find(
    (entry) => entry.kind === "apply" || entry.kind === "ignore",
  );
  return action?.kind ?? null;
}

export type ResourceHashmapUpdateAcceptEvent =
  | Event
  | {
      readonly kind: "resource/hashmap-update-accept-gate";
      readonly canContinue: boolean;
      readonly splitOk: boolean;
      readonly unpackOk: boolean;
    };

export type ResourceHashmapUpdateAcceptAction = {
  readonly kind: ResourceHashmapUpdateAcceptPlan;
};
