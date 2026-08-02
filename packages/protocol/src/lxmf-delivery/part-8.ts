/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LxmfUnverifiedReason,
  type LxmfUnverifiedReasonValue
} from "../lxmf-fields.js";
import { planLxmfDirectSend, shouldPlanLxmfDirectSendOk, shouldRejectLxmfDirectSendPlanMissingDestination, shouldRejectLxmfDirectSendPlanMissingPacked } from "./part-7.js";
import type { LxmfDirectSendEvent, LxmfDirectSendPlan, LxmfDirectSendPlanAction, LxmfDirectSendPlanEvent } from "./part-7.js";
/**
 * DIRECT send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDirectSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfDirectSendWithActions}.
 */
export type LxmfDirectSendPlanState = Record<string, never>;

export interface LxmfDirectSendPlanStepResult {
  readonly state: LxmfDirectSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDirectSendPlanAction[];
}

export function initialLxmfDirectSendPlanState(): LxmfDirectSendPlanState {
  return {};
}

export function stepLxmfDirectSendPlanWithActions(
  state: LxmfDirectSendPlanState,
  event: LxmfDirectSendPlanEvent
): LxmfDirectSendPlanStepResult {
  if (event.kind === "direct-send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfDirectSend({
            destinationPresent: event.destinationPresent,
            destinationIdentityPresent: event.destinationIdentityPresent,
            packed: event.packed
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the DIRECT send plan from actions; null when empty. */
export function lxmfDirectSendPlanFromActions(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>
): LxmfDirectSendPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "missing-destination" ||
      entry.kind === "missing-packed"
  );
  return action?.kind ?? null;
}

/**
 * DIRECT send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfDirectSendPlanWithActions}
 * (`ok`|`missing-destination`|`missing-packed`).
 */
export type LxmfDirectSendState = Record<string, never>;

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfDirectSendPlanWithActions}
 * (`ok`|`missing-destination`|`missing-packed`).
 */
export type LxmfDirectSendAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-destination" }
  | { readonly kind: "reject-missing-packed" };

export interface LxmfDirectSendStepResult {
  readonly state: LxmfDirectSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDirectSendAction[];
}

export function initialLxmfDirectSendState(): LxmfDirectSendState {
  return {};
}

export const stepLxmfDirectSend: StepFn<LxmfDirectSendState> = (state, event) => {
  const result = stepLxmfDirectSendInner(state, event as LxmfDirectSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfDirectSendWithActions(
  state: LxmfDirectSendState,
  event: LxmfDirectSendEvent
): LxmfDirectSendStepResult {
  return stepLxmfDirectSendInner(state, event);
}

export function shouldProceedLxmfDirectSend(
  actions: ReadonlyArray<LxmfDirectSendAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfDirectMissingDestination(
  actions: ReadonlyArray<LxmfDirectSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-destination");
}

export function shouldRejectLxmfDirectMissingPacked(
  actions: ReadonlyArray<LxmfDirectSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-packed");
}

function stepLxmfDirectSendInner(
  state: LxmfDirectSendState,
  event: LxmfDirectSendEvent
): LxmfDirectSendStepResult {
  if (event.kind === "direct-send/gate") {
    const planActions = stepLxmfDirectSendPlanWithActions(initialLxmfDirectSendPlanState(), {
      kind: "direct-send/plan-gate",
      destinationPresent: event.destinationPresent,
      destinationIdentityPresent: event.destinationIdentityPresent,
      packed: event.packed
    }).actions;
    if (shouldRejectLxmfDirectSendPlanMissingDestination(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-destination" }] };
    }
    if (shouldRejectLxmfDirectSendPlanMissingPacked(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-packed" }] };
    }
    if (!shouldPlanLxmfDirectSendOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfOpportunisticSendPlan = "ok" | "missing-destination";

/** Whether OPPORTUNISTIC send may proceed (destination present). */
export function planLxmfOpportunisticSend(input: {
  readonly destinationPresent: boolean;
}): LxmfOpportunisticSendPlan {
  if (!input.destinationPresent) {
    return "missing-destination";
  }
  return "ok";
}

/**
 * OPPORTUNISTIC send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfOpportunisticSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfOpportunisticSendWithActions}.
 */
export type LxmfOpportunisticSendPlanState = Record<string, never>;

export type LxmfOpportunisticSendPlanEvent =
  | Event
  | {
      readonly kind: "opportunistic-send/plan-gate";
      readonly destinationPresent: boolean;
    };

export type LxmfOpportunisticSendPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-destination" };

export interface LxmfOpportunisticSendPlanStepResult {
  readonly state: LxmfOpportunisticSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticSendPlanAction[];
}

export function initialLxmfOpportunisticSendPlanState(): LxmfOpportunisticSendPlanState {
  return {};
}

export function stepLxmfOpportunisticSendPlanWithActions(
  state: LxmfOpportunisticSendPlanState,
  event: LxmfOpportunisticSendPlanEvent
): LxmfOpportunisticSendPlanStepResult {
  if (event.kind === "opportunistic-send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfOpportunisticSend({
            destinationPresent: event.destinationPresent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow OPPORTUNISTIC send to proceed. */
export function shouldPlanLxmfOpportunisticSendOk(
  actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether plan actions reject a missing destination. */
export function shouldRejectLxmfOpportunisticSendPlanMissingDestination(
  actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-destination");
}

/** Extract the OPPORTUNISTIC send plan from actions; null when empty. */
export function lxmfOpportunisticSendPlanFromActions(
  actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>
): LxmfOpportunisticSendPlan | null {
  const action = actions.find(
    (entry) => entry.kind === "ok" || entry.kind === "missing-destination"
  );
  return action?.kind ?? null;
}

/**
 * OPPORTUNISTIC send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfOpportunisticSendPlanWithActions}
 * (`ok`|`missing-destination`).
 */
export type LxmfOpportunisticSendState = Record<string, never>;

export type LxmfOpportunisticSendEvent =
  | Event
  | {
      readonly kind: "opportunistic-send/gate";
      readonly destinationPresent: boolean;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfOpportunisticSendPlanWithActions}
 * (`ok`|`missing-destination`).
 */
export type LxmfOpportunisticSendAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-destination" };

export interface LxmfOpportunisticSendStepResult {
  readonly state: LxmfOpportunisticSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticSendAction[];
}

export function initialLxmfOpportunisticSendState(): LxmfOpportunisticSendState {
  return {};
}

export const stepLxmfOpportunisticSend: StepFn<LxmfOpportunisticSendState> = (state, event) => {
  const result = stepLxmfOpportunisticSendInner(state, event as LxmfOpportunisticSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfOpportunisticSendWithActions(
  state: LxmfOpportunisticSendState,
  event: LxmfOpportunisticSendEvent
): LxmfOpportunisticSendStepResult {
  return stepLxmfOpportunisticSendInner(state, event);
}

export function shouldProceedLxmfOpportunisticSend(
  actions: ReadonlyArray<LxmfOpportunisticSendAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfOpportunisticMissingDestination(
  actions: ReadonlyArray<LxmfOpportunisticSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-destination");
}

function stepLxmfOpportunisticSendInner(
  state: LxmfOpportunisticSendState,
  event: LxmfOpportunisticSendEvent
): LxmfOpportunisticSendStepResult {
  if (event.kind === "opportunistic-send/gate") {
    const planActions = stepLxmfOpportunisticSendPlanWithActions(
      initialLxmfOpportunisticSendPlanState(),
      {
        kind: "opportunistic-send/plan-gate",
        destinationPresent: event.destinationPresent
      }
    ).actions;
    if (shouldRejectLxmfOpportunisticSendPlanMissingDestination(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-destination" }] };
    }
    if (!shouldPlanLxmfOpportunisticSendOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxMessageInstancePackGate =
  | "ok"
  | "already-packed"
  | "missing-endpoints"
  | "missing-timestamp";

/** Whether an LXMessage instance may pack (already-packed / endpoints / timestamp). */
export function planLxMessageInstancePack(input: {
  readonly alreadyPacked: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxMessageInstancePackGate {
  if (input.alreadyPacked) {
    return "already-packed";
  }
  if (
    !input.destinationPresent ||
    !input.sourcePresent ||
    !input.sourceIdentityPresent
  ) {
    return "missing-endpoints";
  }
  if (!input.timestampPresent) {
    return "missing-timestamp";
  }
  return "ok";
}

export type LxMessageInstancePackPlanEvent =
  | Event
  | {
      readonly kind: "instance-pack/plan-gate";
      readonly alreadyPacked: boolean;
      readonly destinationPresent: boolean;
      readonly sourcePresent: boolean;
      readonly sourceIdentityPresent: boolean;
      readonly timestampPresent: boolean;
    };

export type LxMessageInstancePackPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "already-packed" }
  | { readonly kind: "missing-endpoints" }
  | { readonly kind: "missing-timestamp" };

/** Whether instance-pack-plan actions allow packing to proceed. */
export function shouldPlanLxMessageInstancePackOk(
  actions: ReadonlyArray<LxMessageInstancePackPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether instance-pack-plan actions reject an already-packed message. */
export function shouldRejectLxMessageInstancePackPlanAlreadyPacked(
  actions: ReadonlyArray<LxMessageInstancePackPlanAction>
): boolean {
  return actions.some((action) => action.kind === "already-packed");
}

/** Whether instance-pack-plan actions reject missing endpoints. */
export function shouldRejectLxMessageInstancePackPlanMissingEndpoints(
  actions: ReadonlyArray<LxMessageInstancePackPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-endpoints");
}

/** Whether instance-pack-plan actions reject a missing timestamp. */
export function shouldRejectLxMessageInstancePackPlanMissingTimestamp(
  actions: ReadonlyArray<LxMessageInstancePackPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-timestamp");
}

export type LxMessageInstancePackEvent =
  | Event
  | {
      readonly kind: "instance-pack/gate";
      readonly alreadyPacked: boolean;
      readonly destinationPresent: boolean;
      readonly sourcePresent: boolean;
      readonly sourceIdentityPresent: boolean;
      readonly timestampPresent: boolean;
    };
