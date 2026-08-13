/** Extracted from resource-status.ts; the original module remains the public composition point. */
/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
 * Continue-transfer / receive-part / request-next / watchdog /
 * prove / advertise / incoming-adv / assemble / proof-accept
 * conclusions leave via machine actions (no ad-hoc plan /
 * `can*` / `should*` / `plan ===` reads beside the step).
 * Assemble, proof-accept, and advertise-phase plans nested via
 * {@link stepResourceAssembleOutcomePlanWithActions} /
 * {@link stepResourceProofAcceptPlanWithActions} /
 * {@link stepResourceAdvertisePhasePlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  ResourceStatus,
  type ResourceStatusValue,
} from "../resource-watchdog.js";
import { canValidateResourceProof } from "./part-1.js";
import type { ResourceStatusEvent, ResourceStatusState } from "./part-1.js";
/**
 * Sender proof validation → complete vs ignore.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceProofAcceptPlan = "complete" | "ignore";

export function planResourceProofAccept(input: {
  readonly status: ResourceStatusValue;
  readonly proofValid: boolean;
}): ResourceProofAcceptPlan {
  if (!canValidateResourceProof(input.status) || !input.proofValid) {
    return "ignore";
  }
  return "complete";
}

/**
 * Resource-proof-accept-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceProofAccept` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepResourceProofAcceptWithActions}.
 */
export type ResourceProofAcceptPlanState = Record<string, never>;

export type ResourceProofAcceptPlanEvent =
  | Event
  | {
      readonly kind: "resource/proof-accept-plan-gate";
      readonly status: ResourceStatusValue;
      readonly proofValid: boolean;
    };

export type ResourceProofAcceptPlanAction = {
  readonly kind: ResourceProofAcceptPlan;
};

export interface ResourceProofAcceptPlanStepResult {
  readonly state: ResourceProofAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceProofAcceptPlanAction[];
}

export function initialResourceProofAcceptPlanState(): ResourceProofAcceptPlanState {
  return {};
}

export function stepResourceProofAcceptPlanWithActions(
  state: ResourceProofAcceptPlanState,
  event: ResourceProofAcceptPlanEvent,
): ResourceProofAcceptPlanStepResult {
  if (event.kind === "resource/proof-accept-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planResourceProofAccept({
            status: event.status,
            proofValid: event.proofValid,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the proof-accept plan from actions; null when empty. */
export function resourceProofAcceptPlanFromActions(
  actions: ReadonlyArray<ResourceProofAcceptPlanAction>,
): ResourceProofAcceptPlan | null {
  return actions[0]?.kind ?? null;
}

export function shouldCompleteResourceProofAcceptPlan(
  actions: ReadonlyArray<ResourceProofAcceptPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "complete");
}

export function shouldIgnoreResourceProofAcceptPlan(
  actions: ReadonlyArray<ResourceProofAcceptPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

/**
 * Resource proof-accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceProofAcceptPlanWithActions}
 * (`complete`|`ignore`).
 */
export type ResourceProofAcceptState = Record<string, never>;

export type ResourceProofAcceptEvent =
  | Event
  | {
      readonly kind: "resource/proof-accept-gate";
      readonly status: ResourceStatusValue;
      readonly proofValid: boolean;
    };

/**
 * Adapter completes or ignores only from these actions.
 * Plan nested via {@link stepResourceProofAcceptPlanWithActions}
 * (`complete`|`ignore`).
 */
export type ResourceProofAcceptAction = {
  readonly kind: ResourceProofAcceptPlan;
};

export interface ResourceProofAcceptStepResult {
  readonly state: ResourceProofAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceProofAcceptAction[];
}

export function initialResourceProofAcceptState(): ResourceProofAcceptState {
  return {};
}

export const stepResourceProofAccept: StepFn<ResourceProofAcceptState> = (
  state,
  event,
) => {
  const result = stepResourceProofAcceptInner(
    state,
    event as ResourceProofAcceptEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceProofAcceptWithActions(
  state: ResourceProofAcceptState,
  event: ResourceProofAcceptEvent,
): ResourceProofAcceptStepResult {
  return stepResourceProofAcceptInner(state, event);
}

export function shouldCompleteResourceProofAccept(
  actions: ReadonlyArray<ResourceProofAcceptAction>,
): boolean {
  return actions.some((action) => action.kind === "complete");
}

export function shouldIgnoreResourceProofAccept(
  actions: ReadonlyArray<ResourceProofAcceptAction>,
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepResourceProofAcceptInner(
  state: ResourceProofAcceptState,
  event: ResourceProofAcceptEvent,
): ResourceProofAcceptStepResult {
  if (event.kind === "resource/proof-accept-gate") {
    const planActions = stepResourceProofAcceptPlanWithActions(
      initialResourceProofAcceptPlanState(),
      {
        kind: "resource/proof-accept-plan-gate",
        status: event.status,
        proofValid: event.proofValid,
      },
    ).actions;
    const plan = resourceProofAcceptPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function applyResourceStatusEvent(
  state: ResourceStatusState,
  event: ResourceStatusEvent,
): ResourceStatusState {
  return stepResourceStatusInner(state, event).state;
}

export const stepResourceStatus: StepFn<ResourceStatusState> = (state, event) =>
  stepResourceStatusInner(state, event as ResourceStatusEvent);

function stepResourceStatusInner(
  state: ResourceStatusState,
  event: ResourceStatusEvent,
): { state: ResourceStatusState; intents: Intent[] } {
  if (event.kind === "resource/queue") {
    return { state: { status: ResourceStatus.QUEUED }, intents: [] };
  }
  if (event.kind === "resource/advertise") {
    return { state: { status: ResourceStatus.ADVERTISED }, intents: [] };
  }
  if (event.kind === "resource/transferring") {
    return { state: { status: ResourceStatus.TRANSFERRING }, intents: [] };
  }
  if (event.kind === "resource/awaiting-proof") {
    return { state: { status: ResourceStatus.AWAITING_PROOF }, intents: [] };
  }
  if (event.kind === "resource/assemble") {
    return { state: { status: ResourceStatus.ASSEMBLING }, intents: [] };
  }
  if (event.kind === "resource/complete") {
    return { state: { status: ResourceStatus.COMPLETE }, intents: [] };
  }
  if (event.kind === "resource/corrupt") {
    return { state: { status: ResourceStatus.CORRUPT }, intents: [] };
  }
  if (event.kind === "resource/fail") {
    return { state: { status: ResourceStatus.FAILED }, intents: [] };
  }
  return { state, intents: [] };
}
