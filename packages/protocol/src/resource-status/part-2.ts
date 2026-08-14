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
import { planResourceAdvertisePhase } from "./part-1.js";
import type { ResourceAdvertisePhasePlan } from "./part-1.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Resource-advertise-phase plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceAdvertisePhase` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepResourceAdvertiseWaitWithActions}.
 */
export type ResourceAdvertisePhasePlanState = Record<string, never>;

export type ResourceAdvertisePhasePlanEvent =
  | Event
  | {
      readonly kind: "resource/advertise-phase-plan-gate";
      readonly linkReady: boolean;
    };

export type ResourceAdvertisePhasePlanAction = {
  readonly kind: ResourceAdvertisePhasePlan;
};

export interface ResourceAdvertisePhasePlanStepResult {
  readonly state: ResourceAdvertisePhasePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertisePhasePlanAction[];
}

export function initialResourceAdvertisePhasePlanState(): ResourceAdvertisePhasePlanState {
  return {};
}

export function stepResourceAdvertisePhasePlanWithActions(
  state: ResourceAdvertisePhasePlanState,
  event: ResourceAdvertisePhasePlanEvent,
): ResourceAdvertisePhasePlanStepResult {
  if (event.kind === "resource/advertise-phase-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planResourceAdvertisePhase(event.linkReady) }],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the advertise-phase plan from actions; null when empty. */
export function resourceAdvertisePhasePlanFromActions(
  actions: ReadonlyArray<ResourceAdvertisePhasePlanAction>,
): ResourceAdvertisePhasePlan | null {
  const action = actions.find(
    (entry) => entry.kind === "queue" || entry.kind === "advertise",
  );
  return action?.kind ?? null;
}

export function shouldQueueResourceAdvertisePhasePlan(
  actions: ReadonlyArray<ResourceAdvertisePhasePlanAction>,
): boolean {
  return hasActionOfKind(actions, "queue");
}

export function shouldAdvertiseResourceAdvertisePhasePlan(
  actions: ReadonlyArray<ResourceAdvertisePhasePlanAction>,
): boolean {
  return hasActionOfKind(actions, "advertise");
}

/** Whether Resource.prove may build and send a proof (assembled data present). */
export function canProveResource(dataPresent: boolean): boolean {
  return dataPresent;
}

/**
 * Resource prove-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canProveResource` reads
 * beside the step).
 */
export type ProveResourceAllowState = Record<string, never>;

export type ProveResourceAllowEvent =
  | Event
  | {
      readonly kind: "resource/prove-allow-gate";
      readonly dataPresent: boolean;
    };

export type ProveResourceAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface ProveResourceAllowStepResult {
  readonly state: ProveResourceAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProveResourceAllowAction[];
}

export function initialProveResourceAllowState(): ProveResourceAllowState {
  return {};
}

export function stepProveResourceAllowWithActions(
  state: ProveResourceAllowState,
  event: ProveResourceAllowEvent,
): ProveResourceAllowStepResult {
  if (event.kind === "resource/prove-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canProveResource(event.dataPresent) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowProveResource(
  actions: ReadonlyArray<ProveResourceAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyProveResource(
  actions: ReadonlyArray<ProveResourceAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/**
 * Whether Resource.send should auto-advertise after construction.
 * Default true when the option is omitted (`advertise !== false`).
 */
export function shouldAdvertiseResource(
  advertiseOption: boolean | undefined,
): boolean {
  return advertiseOption !== false;
}

/**
 * Resource advertise-option gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAdvertiseResource`
 * reads beside the step).
 */
export type AdvertiseResourceState = Record<string, never>;

export type AdvertiseResourceEvent =
  | Event
  | {
      readonly kind: "resource/advertise-option-gate";
      readonly advertiseOption: boolean | undefined;
    };

export type AdvertiseResourceAction =
  { readonly kind: "advertise" } | { readonly kind: "skip" };

export interface AdvertiseResourceStepResult {
  readonly state: AdvertiseResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AdvertiseResourceAction[];
}

export function initialAdvertiseResourceState(): AdvertiseResourceState {
  return {};
}

export function stepAdvertiseResourceWithActions(
  state: AdvertiseResourceState,
  event: AdvertiseResourceEvent,
): AdvertiseResourceStepResult {
  if (event.kind === "resource/advertise-option-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAdvertiseResource(event.advertiseOption)
            ? "advertise"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAdvertiseResourceNow(
  actions: ReadonlyArray<AdvertiseResourceAction>,
): boolean {
  return hasActionOfKind(actions, "advertise");
}

export function shouldSkipAdvertiseResource(
  actions: ReadonlyArray<AdvertiseResourceAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Assemble validation outcome from crypto-edge booleans
 * (decrypt / payload split / hash match).
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceAssembleOutcome = "complete" | "corrupt";

export function planResourceAssembleOutcome(input: {
  readonly decryptedPresent: boolean;
  readonly payloadPresent: boolean;
  readonly hashMatches: boolean;
}): ResourceAssembleOutcome {
  if (!input.decryptedPresent || !input.payloadPresent || !input.hashMatches) {
    return "corrupt";
  }
  return "complete";
}

/**
 * Resource-assemble-outcome-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceAssembleOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepResourceAssembleWithActions}.
 */
export type ResourceAssembleOutcomePlanState = Record<string, never>;

export type ResourceAssembleOutcomePlanEvent =
  | Event
  | {
      readonly kind: "resource/assemble-outcome-plan-gate";
      readonly decryptedPresent: boolean;
      readonly payloadPresent: boolean;
      readonly hashMatches: boolean;
    };

export type ResourceAssembleOutcomePlanAction = {
  readonly kind: ResourceAssembleOutcome;
};

export interface ResourceAssembleOutcomePlanStepResult {
  readonly state: ResourceAssembleOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAssembleOutcomePlanAction[];
}

export function initialResourceAssembleOutcomePlanState(): ResourceAssembleOutcomePlanState {
  return {};
}

export function stepResourceAssembleOutcomePlanWithActions(
  state: ResourceAssembleOutcomePlanState,
  event: ResourceAssembleOutcomePlanEvent,
): ResourceAssembleOutcomePlanStepResult {
  if (event.kind === "resource/assemble-outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planResourceAssembleOutcome({
            decryptedPresent: event.decryptedPresent,
            payloadPresent: event.payloadPresent,
            hashMatches: event.hashMatches,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the assemble outcome from actions; null when empty. */
export function resourceAssembleOutcomePlanFromActions(
  actions: ReadonlyArray<ResourceAssembleOutcomePlanAction>,
): ResourceAssembleOutcome | null {
  const action = actions.find(
    (entry) => entry.kind === "complete" || entry.kind === "corrupt",
  );
  return action?.kind ?? null;
}

export function shouldCompleteResourceAssembleOutcomePlan(
  actions: ReadonlyArray<ResourceAssembleOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "complete");
}

export function shouldCorruptResourceAssembleOutcomePlan(
  actions: ReadonlyArray<ResourceAssembleOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "corrupt");
}

/**
 * Resource assemble gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceAssembleOutcomePlanWithActions}
 * (`complete`|`corrupt`).
 */
export type ResourceAssembleState = Record<string, never>;

export type ResourceAssembleEvent =
  | Event
  | {
      readonly kind: "resource/assemble-gate";
      readonly decryptedPresent: boolean;
      readonly payloadPresent: boolean;
      readonly hashMatches: boolean;
    };

/**
 * Adapter continues or marks corrupt only from these actions.
 * Plan nested via {@link stepResourceAssembleOutcomePlanWithActions}
 * (`complete`|`corrupt`).
 */
export type ResourceAssembleAction = { readonly kind: ResourceAssembleOutcome };

export interface ResourceAssembleStepResult {
  readonly state: ResourceAssembleState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAssembleAction[];
}

export function initialResourceAssembleState(): ResourceAssembleState {
  return {};
}

export const stepResourceAssemble: StepFn<ResourceAssembleState> = (
  state,
  event,
) => {
  const result = stepResourceAssembleInner(
    state,
    event as ResourceAssembleEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceAssembleWithActions(
  state: ResourceAssembleState,
  event: ResourceAssembleEvent,
): ResourceAssembleStepResult {
  return stepResourceAssembleInner(state, event);
}

export function shouldCompleteResourceAssemble(
  actions: ReadonlyArray<ResourceAssembleAction>,
): boolean {
  return hasActionOfKind(actions, "complete");
}

export function shouldCorruptResourceAssemble(
  actions: ReadonlyArray<ResourceAssembleAction>,
): boolean {
  return hasActionOfKind(actions, "corrupt");
}

function stepResourceAssembleInner(
  state: ResourceAssembleState,
  event: ResourceAssembleEvent,
): ResourceAssembleStepResult {
  if (event.kind === "resource/assemble-gate") {
    const planActions = stepResourceAssembleOutcomePlanWithActions(
      initialResourceAssembleOutcomePlanState(),
      {
        kind: "resource/assemble-outcome-plan-gate",
        decryptedPresent: event.decryptedPresent,
        payloadPresent: event.payloadPresent,
        hashMatches: event.hashMatches,
      },
    ).actions;
    const plan = resourceAssembleOutcomePlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether assemble may commit payload after {@link planResourceAssembleOutcome}
 * returns complete and split payload bytes remain present.
 */
export function shouldCommitResourceAssemblePayload(input: {
  readonly outcomeComplete: boolean;
  readonly payloadPresent: boolean;
}): boolean {
  return input.outcomeComplete && input.payloadPresent;
}

/**
 * Resource assemble payload-commit gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitResourceAssemblePayload` reads beside the step).
 */
export type CommitResourceAssemblePayloadState = Record<string, never>;

export type CommitResourceAssemblePayloadEvent =
  | Event
  | {
      readonly kind: "resource/commit-assemble-payload-gate";
      readonly outcomeComplete: boolean;
      readonly payloadPresent: boolean;
    };

export type CommitResourceAssemblePayloadAction =
  { readonly kind: "commit" } | { readonly kind: "skip" };

export interface CommitResourceAssemblePayloadStepResult {
  readonly state: CommitResourceAssemblePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitResourceAssemblePayloadAction[];
}

export function initialCommitResourceAssemblePayloadState(): CommitResourceAssemblePayloadState {
  return {};
}

export function stepCommitResourceAssemblePayloadWithActions(
  state: CommitResourceAssemblePayloadState,
  event: CommitResourceAssemblePayloadEvent,
): CommitResourceAssemblePayloadStepResult {
  if (event.kind === "resource/commit-assemble-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitResourceAssemblePayload({
            outcomeComplete: event.outcomeComplete,
            payloadPresent: event.payloadPresent,
          })
            ? "commit"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitResourceAssemblePayloadNow(
  actions: ReadonlyArray<CommitResourceAssemblePayloadAction>,
): boolean {
  return hasActionOfKind(actions, "commit");
}

export function shouldSkipCommitResourceAssemblePayload(
  actions: ReadonlyArray<CommitResourceAssemblePayloadAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}
