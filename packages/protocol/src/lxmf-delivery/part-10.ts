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
import {
  planLxmfPropagatedPackPrep,
  shouldPlanLxmfPropagatedPackPrepOk,
  shouldPlanLxmfPropagatedPackPrepSkip,
} from "./part-9.js";
import type {
  LxmfPropagatedPackPrepEvent,
  LxmfPropagatedPackPrepPlan,
  LxmfPropagatedPackPrepPlanAction,
  LxmfPropagatedPackPrepPlanEvent,
} from "./part-9.js";
/**
 * PROPAGATED pack-prep-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagatedPackPrep` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagatedPackPrepWithActions}.
 */
export type LxmfPropagatedPackPrepPlanState = Record<string, never>;

export interface LxmfPropagatedPackPrepPlanStepResult {
  readonly state: LxmfPropagatedPackPrepPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedPackPrepPlanAction[];
}

export function initialLxmfPropagatedPackPrepPlanState(): LxmfPropagatedPackPrepPlanState {
  return {};
}

export function stepLxmfPropagatedPackPrepPlanWithActions(
  state: LxmfPropagatedPackPrepPlanState,
  event: LxmfPropagatedPackPrepPlanEvent,
): LxmfPropagatedPackPrepPlanStepResult {
  if (event.kind === "propagated-pack-prep/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPropagatedPackPrep({
            packedPresent: event.packedPresent,
            desiredMethod: event.desiredMethod,
            destinationIdentityPresent: event.destinationIdentityPresent,
            timestampPresent: event.timestampPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether pack-prep-plan actions reject a missing destination identity. */
export function shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity(
  actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-identity");
}

/** Whether pack-prep-plan actions reject a missing timestamp. */
export function shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp(
  actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-timestamp");
}

/** Extract the PROPAGATED pack-prep plan from actions; null when empty. */
export function lxmfPropagatedPackPrepPlanFromActions(
  actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>,
): LxmfPropagatedPackPrepPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "skip" ||
      entry.kind === "ok" ||
      entry.kind === "missing-identity" ||
      entry.kind === "missing-timestamp",
  );
  return action?.kind ?? null;
}

/**
 * PROPAGATED pack prep gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagatedPackPrepPlanWithActions}
 * (`skip`|`ok`|`missing-identity`|`missing-timestamp`).
 */
export type LxmfPropagatedPackPrepState = Record<string, never>;

/**
 * Adapter applies skip / proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagatedPackPrepPlanWithActions}
 * (`skip`|`ok`|`missing-identity`|`missing-timestamp`).
 */
export type LxmfPropagatedPackPrepAction =
  | { readonly kind: "skip" }
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-identity" }
  | { readonly kind: "reject-missing-timestamp" };

export interface LxmfPropagatedPackPrepStepResult {
  readonly state: LxmfPropagatedPackPrepState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedPackPrepAction[];
}

export function initialLxmfPropagatedPackPrepState(): LxmfPropagatedPackPrepState {
  return {};
}

export const stepLxmfPropagatedPackPrep: StepFn<LxmfPropagatedPackPrepState> = (
  state,
  event,
) => {
  const result = stepLxmfPropagatedPackPrepInner(
    state,
    event as LxmfPropagatedPackPrepEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagatedPackPrepWithActions(
  state: LxmfPropagatedPackPrepState,
  event: LxmfPropagatedPackPrepEvent,
): LxmfPropagatedPackPrepStepResult {
  return stepLxmfPropagatedPackPrepInner(state, event);
}

export function shouldSkipLxmfPropagatedPackPrep(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function shouldProceedLxmfPropagatedPackPrep(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>,
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfPropagatedPackMissingIdentity(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>,
): boolean {
  return actions.some((action) => action.kind === "reject-missing-identity");
}

export function shouldRejectLxmfPropagatedPackMissingTimestamp(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>,
): boolean {
  return actions.some((action) => action.kind === "reject-missing-timestamp");
}

function stepLxmfPropagatedPackPrepInner(
  state: LxmfPropagatedPackPrepState,
  event: LxmfPropagatedPackPrepEvent,
): LxmfPropagatedPackPrepStepResult {
  if (event.kind === "propagated-pack-prep/gate") {
    const planActions = stepLxmfPropagatedPackPrepPlanWithActions(
      initialLxmfPropagatedPackPrepPlanState(),
      {
        kind: "propagated-pack-prep/plan-gate",
        packedPresent: event.packedPresent,
        desiredMethod: event.desiredMethod,
        destinationIdentityPresent: event.destinationIdentityPresent,
        timestampPresent: event.timestampPresent,
      },
    ).actions;
    if (shouldPlanLxmfPropagatedPackPrepSkip(planActions)) {
      return { state, intents: [], actions: [{ kind: "skip" }] };
    }
    if (shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-identity" }],
      };
    }
    if (shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-timestamp" }],
      };
    }
    if (!shouldPlanLxmfPropagatedPackPrepOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}
