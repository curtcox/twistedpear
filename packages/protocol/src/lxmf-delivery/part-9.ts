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
  type LxmfUnverifiedReasonValue,
} from "../lxmf-fields.js";
import { LxmfDeliveryMethod } from "./part-1.js";
import {
  planLxMessageInstancePack,
  shouldPlanLxMessageInstancePackOk,
  shouldRejectLxMessageInstancePackPlanAlreadyPacked,
  shouldRejectLxMessageInstancePackPlanMissingEndpoints,
  shouldRejectLxMessageInstancePackPlanMissingTimestamp,
} from "./part-8.js";
import type {
  LxMessageInstancePackEvent,
  LxMessageInstancePackGate,
  LxMessageInstancePackPlanAction,
  LxMessageInstancePackPlanEvent,
} from "./part-8.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Instance-pack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxMessageInstancePack` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxMessageInstancePackWithActions}.
 */
export type LxMessageInstancePackPlanState = Record<string, never>;

export interface LxMessageInstancePackPlanStepResult {
  readonly state: LxMessageInstancePackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessageInstancePackPlanAction[];
}

export function initialLxMessageInstancePackPlanState(): LxMessageInstancePackPlanState {
  return {};
}

export function stepLxMessageInstancePackPlanWithActions(
  state: LxMessageInstancePackPlanState,
  event: LxMessageInstancePackPlanEvent,
): LxMessageInstancePackPlanStepResult {
  if (event.kind === "instance-pack/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxMessageInstancePack({
            alreadyPacked: event.alreadyPacked,
            destinationPresent: event.destinationPresent,
            sourcePresent: event.sourcePresent,
            sourceIdentityPresent: event.sourceIdentityPresent,
            timestampPresent: event.timestampPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the instance-pack plan from actions; null when empty. */
export function lxMessageInstancePackPlanFromActions(
  actions: ReadonlyArray<LxMessageInstancePackPlanAction>,
): LxMessageInstancePackGate | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "already-packed" ||
      entry.kind === "missing-endpoints" ||
      entry.kind === "missing-timestamp",
  );
  return action?.kind ?? null;
}

/**
 * LXMessage instance pack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxMessageInstancePackPlanWithActions}
 * (`ok`|`already-packed`|`missing-endpoints`|`missing-timestamp`).
 */
export type LxMessageInstancePackState = Record<string, never>;

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxMessageInstancePackPlanWithActions}
 * (`ok`|`already-packed`|`missing-endpoints`|`missing-timestamp`).
 */
export type LxMessageInstancePackAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-already-packed" }
  | { readonly kind: "reject-missing-endpoints" }
  | { readonly kind: "reject-missing-timestamp" };

export interface LxMessageInstancePackStepResult {
  readonly state: LxMessageInstancePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessageInstancePackAction[];
}

export function initialLxMessageInstancePackState(): LxMessageInstancePackState {
  return {};
}

export const stepLxMessageInstancePack: StepFn<LxMessageInstancePackState> = (
  state,
  event,
) => {
  const result = stepLxMessageInstancePackInner(
    state,
    event as LxMessageInstancePackEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxMessageInstancePackWithActions(
  state: LxMessageInstancePackState,
  event: LxMessageInstancePackEvent,
): LxMessageInstancePackStepResult {
  return stepLxMessageInstancePackInner(state, event);
}

export function shouldProceedLxMessageInstancePack(
  actions: ReadonlyArray<LxMessageInstancePackAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectLxMessageInstanceAlreadyPacked(
  actions: ReadonlyArray<LxMessageInstancePackAction>,
): boolean {
  return hasActionOfKind(actions, "reject-already-packed");
}

export function shouldRejectLxMessageInstanceMissingEndpoints(
  actions: ReadonlyArray<LxMessageInstancePackAction>,
): boolean {
  return hasActionOfKind(actions, "reject-missing-endpoints");
}

export function shouldRejectLxMessageInstanceMissingTimestamp(
  actions: ReadonlyArray<LxMessageInstancePackAction>,
): boolean {
  return hasActionOfKind(actions, "reject-missing-timestamp");
}

function stepLxMessageInstancePackInner(
  state: LxMessageInstancePackState,
  event: LxMessageInstancePackEvent,
): LxMessageInstancePackStepResult {
  if (event.kind === "instance-pack/gate") {
    const planActions = stepLxMessageInstancePackPlanWithActions(
      initialLxMessageInstancePackPlanState(),
      {
        kind: "instance-pack/plan-gate",
        alreadyPacked: event.alreadyPacked,
        destinationPresent: event.destinationPresent,
        sourcePresent: event.sourcePresent,
        sourceIdentityPresent: event.sourceIdentityPresent,
        timestampPresent: event.timestampPresent,
      },
    ).actions;
    if (shouldRejectLxMessageInstancePackPlanAlreadyPacked(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-already-packed" }],
      };
    }
    if (shouldRejectLxMessageInstancePackPlanMissingEndpoints(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-endpoints" }],
      };
    }
    if (shouldRejectLxMessageInstancePackPlanMissingTimestamp(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-timestamp" }],
      };
    }
    if (!shouldPlanLxMessageInstancePackOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether LXMessage.pack should reject for missing destination/source endpoints
 * after {@link planLxMessageInstancePack}.
 */
export function shouldRejectLxmfPackEndpoints(input: {
  readonly gateMissingEndpoints: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
}): boolean {
  return (
    input.gateMissingEndpoints ||
    !input.destinationPresent ||
    !input.sourcePresent ||
    !input.sourceIdentityPresent
  );
}

/**
 * Whether LXMessage.pack should reject for a missing timestamp after
 * {@link planLxMessageInstancePack}.
 */
export function shouldRejectLxmfPackTimestamp(input: {
  readonly gateMissingTimestamp: boolean;
  readonly timestampPresent: boolean;
}): boolean {
  return input.gateMissingTimestamp || !input.timestampPresent;
}

export type LxmfSignatureOutcome = {
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

/** Signature status / unverified reason after edge crypto validation. */
export function planLxmfSignatureOutcome(input: {
  readonly sourceIdentityPresent: boolean;
  readonly signatureValid: boolean;
}): LxmfSignatureOutcome {
  if (input.sourceIdentityPresent) {
    return {
      signatureValidated: input.signatureValid,
      unverifiedReason: input.signatureValid
        ? null
        : LxmfUnverifiedReason.SIGNATURE_INVALID,
    };
  }
  return {
    signatureValidated: false,
    unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN,
  };
}

/**
 * Signature-outcome-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfSignatureOutcome`
 * reads beside the step). Nested under {@link stepLxmfSignatureWithActions}.
 */
export type LxmfSignatureOutcomePlanState = Record<string, never>;

export type LxmfSignatureOutcomePlanEvent =
  | Event
  | {
      readonly kind: "signature/outcome-plan-gate";
      readonly sourceIdentityPresent: boolean;
      readonly signatureValid: boolean;
    };

export type LxmfSignatureOutcomePlanAction = {
  readonly kind: "outcome";
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

export interface LxmfSignatureOutcomePlanStepResult {
  readonly state: LxmfSignatureOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSignatureOutcomePlanAction[];
}

export function initialLxmfSignatureOutcomePlanState(): LxmfSignatureOutcomePlanState {
  return {};
}

export function stepLxmfSignatureOutcomePlanWithActions(
  state: LxmfSignatureOutcomePlanState,
  event: LxmfSignatureOutcomePlanEvent,
): LxmfSignatureOutcomePlanStepResult {
  if (event.kind === "signature/outcome-plan-gate") {
    const outcome = planLxmfSignatureOutcome({
      sourceIdentityPresent: event.sourceIdentityPresent,
      signatureValid: event.signatureValid,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "outcome",
          signatureValidated: outcome.signatureValidated,
          unverifiedReason: outcome.unverifiedReason,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Outcome fields from a plan outcome action, if present. */
export function lxmfSignatureOutcomePlanFromActions(
  actions: ReadonlyArray<LxmfSignatureOutcomePlanAction>,
): LxmfSignatureOutcome | null {
  for (const action of actions) {
    if (action.kind === "outcome") {
      return {
        signatureValidated: action.signatureValidated,
        unverifiedReason: action.unverifiedReason,
      };
    }
  }
  return null;
}

/**
 * Signature outcome gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfSignatureOutcomePlanWithActions} (`outcome`).
 */
export type LxmfSignatureState = Record<string, never>;

export type LxmfSignatureEvent =
  | Event
  | {
      readonly kind: "signature/outcome-gate";
      readonly sourceIdentityPresent: boolean;
      readonly signatureValid: boolean;
    };

/**
 * Adapter applies signatureValidated / unverifiedReason only from these actions.
 * Plan nested via {@link stepLxmfSignatureOutcomePlanWithActions} (`outcome`).
 */
export type LxmfSignatureAction = {
  readonly kind: "apply";
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

export interface LxmfSignatureStepResult {
  readonly state: LxmfSignatureState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSignatureAction[];
}

export function initialLxmfSignatureState(): LxmfSignatureState {
  return {};
}

export const stepLxmfSignature: StepFn<LxmfSignatureState> = (state, event) => {
  const result = stepLxmfSignatureInner(state, event as LxmfSignatureEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfSignatureWithActions(
  state: LxmfSignatureState,
  event: LxmfSignatureEvent,
): LxmfSignatureStepResult {
  return stepLxmfSignatureInner(state, event);
}

export function shouldApplyLxmfSignature(
  actions: ReadonlyArray<LxmfSignatureAction>,
): boolean {
  return hasActionOfKind(actions, "apply");
}

/** Outcome fields from an apply action, if present. */
export function lxmfSignatureOutcomeFromActions(
  actions: ReadonlyArray<LxmfSignatureAction>,
): LxmfSignatureOutcome | null {
  for (const action of actions) {
    if (action.kind === "apply") {
      return {
        signatureValidated: action.signatureValidated,
        unverifiedReason: action.unverifiedReason,
      };
    }
  }
  return null;
}

function stepLxmfSignatureInner(
  state: LxmfSignatureState,
  event: LxmfSignatureEvent,
): LxmfSignatureStepResult {
  if (event.kind === "signature/outcome-gate") {
    const planActions = stepLxmfSignatureOutcomePlanWithActions(
      initialLxmfSignatureOutcomePlanState(),
      {
        kind: "signature/outcome-plan-gate",
        sourceIdentityPresent: event.sourceIdentityPresent,
        signatureValid: event.signatureValid,
      },
    ).actions;
    const outcome = lxmfSignatureOutcomePlanFromActions(planActions);
    if (outcome === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "apply",
          signatureValidated: outcome.signatureValidated,
          unverifiedReason: outcome.unverifiedReason,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPropagatedPackPrepPlan =
  "skip" | "ok" | "missing-identity" | "missing-timestamp";

/**
 * Whether PROPAGATED pack prep (encrypt + envelope) may run during selectDeliveryParameters.
 * Returns `skip` when not packed or not PROPAGATED.
 */
export function planLxmfPropagatedPackPrep(input: {
  readonly packedPresent: boolean;
  readonly desiredMethod: number;
  readonly destinationIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxmfPropagatedPackPrepPlan {
  if (
    !input.packedPresent ||
    input.desiredMethod !== LxmfDeliveryMethod.PROPAGATED
  ) {
    return "skip";
  }
  if (!input.destinationIdentityPresent) {
    return "missing-identity";
  }
  if (!input.timestampPresent) {
    return "missing-timestamp";
  }
  return "ok";
}

export type LxmfPropagatedPackPrepPlanEvent =
  | Event
  | {
      readonly kind: "propagated-pack-prep/plan-gate";
      readonly packedPresent: boolean;
      readonly desiredMethod: number;
      readonly destinationIdentityPresent: boolean;
      readonly timestampPresent: boolean;
    };

export type LxmfPropagatedPackPrepPlanAction =
  | { readonly kind: "skip" }
  | { readonly kind: "ok" }
  | { readonly kind: "missing-identity" }
  | { readonly kind: "missing-timestamp" };

/** Whether pack-prep-plan actions skip PROPAGATED prep. */
export function shouldPlanLxmfPropagatedPackPrepSkip(
  actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether pack-prep-plan actions allow PROPAGATED prep to proceed. */
export function shouldPlanLxmfPropagatedPackPrepOk(
  actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

export type LxmfPropagatedPackPrepEvent =
  | Event
  | {
      readonly kind: "propagated-pack-prep/gate";
      readonly packedPresent: boolean;
      readonly desiredMethod: number;
      readonly destinationIdentityPresent: boolean;
      readonly timestampPresent: boolean;
    };
