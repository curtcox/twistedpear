/** Extracted from propagation-quota.ts; the original module remains the public composition point. */
/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 * Store / store-plan / restore / restore-plan / catalog-evict / catalog-delete /
 * evict-oldest / message-too-large / select-oldest-key / store-commit /
 * restore-apply / store-apply-commit conclusions leave via machine actions
 * (no ad-hoc `plan.kind` / `planPropagationStore` / `planPropagationRestore` /
 * `plan === "accept"` / `shouldEvict*` / `shouldDelete*` /
 * `isPropagationMessageTooLarge` / `selectOldestPropagationKey` /
 * `shouldCommitPropagationStoreEntry` / `shouldApplyPropagationRestore` /
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 * Restore plan nested via {@link stepPropagationRestorePlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { equalByteArrays } from "../path-table.js";
import type { DeletePropagationCatalogEntryAction } from "./part-2.js";
export function shouldSkipDeletePropagationCatalogEntry(
  actions: ReadonlyArray<DeletePropagationCatalogEntryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether restore may insert after {@link planPropagationRestore} accepts
 * and destination-hash bytes remain present.
 */
export function shouldApplyPropagationRestore(input: {
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
}): boolean {
  return input.planAccept && input.destinationHashPresent;
}

/**
 * Propagation restore accept+hash apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyPropagationRestore` reads beside the step).
 */
export type ApplyPropagationRestoreState = Record<string, never>;

export type ApplyPropagationRestoreEvent =
  | Event
  | {
      readonly kind: "propagation/apply-restore-gate";
      readonly planAccept: boolean;
      readonly destinationHashPresent: boolean;
    };

export type ApplyPropagationRestoreAction =
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

export interface ApplyPropagationRestoreStepResult {
  readonly state: ApplyPropagationRestoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyPropagationRestoreAction[];
}

export function initialApplyPropagationRestoreState(): ApplyPropagationRestoreState {
  return {};
}

export function stepApplyPropagationRestoreWithActions(
  state: ApplyPropagationRestoreState,
  event: ApplyPropagationRestoreEvent
): ApplyPropagationRestoreStepResult {
  if (event.kind === "propagation/apply-restore-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyPropagationRestore({
            planAccept: event.planAccept,
            destinationHashPresent: event.destinationHashPresent
          })
            ? "apply"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyPropagationRestoreNow(
  actions: ReadonlyArray<ApplyPropagationRestoreAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyPropagationRestore(
  actions: ReadonlyArray<ApplyPropagationRestoreAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type PropagationRestorePlan =
  | "reject-too-large"
  | "duplicate"
  | "reject-hash"
  | "accept";

/**
 * Whether a persisted propagation entry may be restored into the in-memory catalog.
 * Map set / usedBytes stay at the adapter.
 */
export function planPropagationRestore(input: {
  readonly tooLarge: boolean;
  readonly alreadyStored: boolean;
  readonly destinationHashPresent: boolean;
}): PropagationRestorePlan {
  if (input.tooLarge) {
    return "reject-too-large";
  }
  if (input.alreadyStored) {
    return "duplicate";
  }
  if (!input.destinationHashPresent) {
    return "reject-hash";
  }
  return "accept";
}

/**
 * Propagation restore plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationRestore`
 * reads beside the step). Nested under {@link stepPropagationRestoreWithActions}.
 */
export type PropagationRestorePlanState = Record<string, never>;

export type PropagationRestorePlanEvent =
  | Event
  | {
      readonly kind: "propagation/restore-plan-gate";
      readonly tooLarge: boolean;
      readonly alreadyStored: boolean;
      readonly destinationHashPresent: boolean;
    };

export type PropagationRestorePlanAction =
  | { readonly kind: "reject-too-large" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "reject-hash" }
  | { readonly kind: "accept" };

export interface PropagationRestorePlanStepResult {
  readonly state: PropagationRestorePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationRestorePlanAction[];
}

export function initialPropagationRestorePlanState(): PropagationRestorePlanState {
  return {};
}

export function stepPropagationRestorePlanWithActions(
  state: PropagationRestorePlanState,
  event: PropagationRestorePlanEvent
): PropagationRestorePlanStepResult {
  if (event.kind === "propagation/restore-plan-gate") {
    const plan = planPropagationRestore({
      tooLarge: event.tooLarge,
      alreadyStored: event.alreadyStored,
      destinationHashPresent: event.destinationHashPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptPropagationRestorePlan(
  actions: ReadonlyArray<PropagationRestorePlanAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function propagationRestorePlanFromActions(
  actions: ReadonlyArray<PropagationRestorePlanAction>
): PropagationRestorePlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "accept" ||
      entry.kind === "duplicate" ||
      entry.kind === "reject-too-large" ||
      entry.kind === "reject-hash"
  );
  return action?.kind ?? null;
}

/**
 * Propagation restore is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationRestore`
 * / `plan === "accept"` reads beside the step).
 * Plan nested via {@link stepPropagationRestorePlanWithActions}
 * (`reject-too-large`|`duplicate`|`reject-hash`|`accept`).
 */
export type PropagationRestoreState = Record<string, never>;

export type PropagationRestoreEvent =
  | Event
  | {
      readonly kind: "propagation/restore-gate";
      readonly tooLarge: boolean;
      readonly alreadyStored: boolean;
      readonly destinationHashPresent: boolean;
    };

export type PropagationRestoreAction =
  | { readonly kind: "reject-too-large" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "reject-hash" }
  | { readonly kind: "accept" };

export interface PropagationRestoreStepResult {
  readonly state: PropagationRestoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationRestoreAction[];
}

export function initialPropagationRestoreState(): PropagationRestoreState {
  return {};
}

export const stepPropagationRestore: StepFn<PropagationRestoreState> = (state, event) => {
  const result = stepPropagationRestoreInner(state, event as PropagationRestoreEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPropagationRestoreWithActions(
  state: PropagationRestoreState,
  event: PropagationRestoreEvent
): PropagationRestoreStepResult {
  return stepPropagationRestoreInner(state, event);
}

/** Whether step actions include accept (catalog insert). */
export function shouldAcceptPropagationRestore(
  actions: ReadonlyArray<PropagationRestoreAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

function stepPropagationRestoreInner(
  state: PropagationRestoreState,
  event: PropagationRestoreEvent
): PropagationRestoreStepResult {
  if (event.kind === "propagation/restore-gate") {
    const planActions = stepPropagationRestorePlanWithActions(
      initialPropagationRestorePlanState(),
      {
        kind: "propagation/restore-plan-gate",
        tooLarge: event.tooLarge,
        alreadyStored: event.alreadyStored,
        destinationHashPresent: event.destinationHashPresent
      }
    ).actions;
    const plan = propagationRestorePlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
