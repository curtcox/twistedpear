/** Extracted from identity-ciphertext.ts; the original module remains the public composition point. */
/**
 * Pure RNS Identity encrypt wire layout: ephemeral X25519 public || Token ciphertext.
 * ECDH / Token crypto stay at the adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packIdentityCiphertext` / `splitIdentityCiphertext` reads beside the step).
 * Decrypt / recall / recall-app-data conclusions leave via machine actions (no
 * ad-hoc `planIdentityDecryptOutcome` / `planIdentityRecall` /
 * `planIdentityRecallAppData` / `plan ===` reads beside the step).
 * Ciphertext-frame / decrypt-plaintext accept gates conclude via machine
 * actions (no ad-hoc `shouldAcceptIdentityCiphertextFrame` /
 * `shouldAcceptIdentityDecryptPlaintext` reads beside the step).
 * Hash / private-key / public-key / load-key / ratchet-decrypt-attempt gates
 * conclude via machine actions (no ad-hoc `canIdentityHash` /
 * `canIdentityUsePrivateKey` / `canIdentityUsePublicKey` /
 * `canLoadIdentityKeyMaterial` / `shouldAttemptIdentityRatchetDecrypt`
 * reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  identityDecryptOutcomePlanFromActions,
  planIdentityDecryptOutcome,
} from "./part-1.js";
import type {
  IdentityDecryptEvent,
  IdentityDecryptOutcomePlanAction,
  IdentityDecryptOutcomePlanEvent,
  IdentityDecryptPlan,
} from "./part-1.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Identity-decrypt-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityDecryptOutcome`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepIdentityDecryptWithActions}.
 */
export type IdentityDecryptOutcomePlanState = Record<string, never>;

export interface IdentityDecryptOutcomePlanStepResult {
  readonly state: IdentityDecryptOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityDecryptOutcomePlanAction[];
}

export function initialIdentityDecryptOutcomePlanState(): IdentityDecryptOutcomePlanState {
  return {};
}

export function stepIdentityDecryptOutcomePlanWithActions(
  state: IdentityDecryptOutcomePlanState,
  event: IdentityDecryptOutcomePlanEvent,
): IdentityDecryptOutcomePlanStepResult {
  if (event.kind === "identity/decrypt-outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planIdentityDecryptOutcome({
            frameOk: event.frameOk,
            ratchetPlaintextPresent: event.ratchetPlaintextPresent,
            enforceRatchets: event.enforceRatchets,
            identityFallbackDone: event.identityFallbackDone,
            identityPlaintextPresent: event.identityPlaintextPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRejectIdentityDecryptOutcomePlanFrame(
  actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-frame");
}

export function shouldAcceptIdentityDecryptOutcomePlan(
  actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectIdentityDecryptOutcomePlanEnforced(
  actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-enforced");
}

export function shouldTryIdentityDecryptOutcomePlan(
  actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "try-identity");
}

export function shouldRejectIdentityDecryptOutcomePlan(
  actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/**
 * Identity decrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityDecryptOutcomePlanWithActions}
 * (`reject-frame`|`accept`|`reject-enforced`|`try-identity`|`reject`).
 */
export type IdentityDecryptState = Record<string, never>;

/**
 * Adapter applies ratchet/fallback outcomes only from these actions.
 * Plan nested via {@link stepIdentityDecryptOutcomePlanWithActions}
 * (`reject-frame`|`accept`|`reject-enforced`|`try-identity`|`reject`).
 */
export type IdentityDecryptAction = { readonly kind: IdentityDecryptPlan };

export interface IdentityDecryptStepResult {
  readonly state: IdentityDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityDecryptAction[];
}

export function initialIdentityDecryptState(): IdentityDecryptState {
  return {};
}

export const stepIdentityDecrypt: StepFn<IdentityDecryptState> = (
  state,
  event,
) => {
  const result = stepIdentityDecryptInner(state, event as IdentityDecryptEvent);
  return { state: result.state, intents: result.intents };
};

export function stepIdentityDecryptWithActions(
  state: IdentityDecryptState,
  event: IdentityDecryptEvent,
): IdentityDecryptStepResult {
  return stepIdentityDecryptInner(state, event);
}

export function shouldRejectIdentityDecryptFrame(
  actions: ReadonlyArray<IdentityDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "reject-frame");
}

export function shouldRejectIdentityDecryptEnforced(
  actions: ReadonlyArray<IdentityDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "reject-enforced");
}

export function shouldAcceptIdentityDecrypt(
  actions: ReadonlyArray<IdentityDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldTryIdentityDecrypt(
  actions: ReadonlyArray<IdentityDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "try-identity");
}

export function shouldRejectIdentityDecrypt(
  actions: ReadonlyArray<IdentityDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

function stepIdentityDecryptInner(
  state: IdentityDecryptState,
  event: IdentityDecryptEvent,
): IdentityDecryptStepResult {
  if (event.kind === "identity/decrypt-gate") {
    const planActions = stepIdentityDecryptOutcomePlanWithActions(
      initialIdentityDecryptOutcomePlanState(),
      {
        kind: "identity/decrypt-outcome-plan-gate",
        frameOk: event.frameOk,
        ratchetPlaintextPresent: event.ratchetPlaintextPresent,
        enforceRatchets: event.enforceRatchets,
        identityFallbackDone: event.identityFallbackDone,
        identityPlaintextPresent: event.identityPlaintextPresent,
      },
    ).actions;
    const plan = identityDecryptOutcomePlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type IdentityRecallPlan = "miss" | "reject-key" | "hit";

/**
 * Known-destination recall: miss, public-key load failure, or hit.
 * Identity construction / loadPublicKey stay at the adapter.
 */
export function planIdentityRecall(input: {
  readonly recordPresent: boolean;
  readonly publicKeyLoaded: boolean;
}): IdentityRecallPlan {
  if (!input.recordPresent) {
    return "miss";
  }
  if (!input.publicKeyLoaded) {
    return "reject-key";
  }
  return "hit";
}

/**
 * Identity-recall-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityRecall` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepIdentityRecallWithActions}.
 */
export type IdentityRecallPlanState = Record<string, never>;

export type IdentityRecallPlanEvent =
  | Event
  | {
      readonly kind: "identity/recall-plan-gate";
      readonly recordPresent: boolean;
      readonly publicKeyLoaded: boolean;
    };

export type IdentityRecallPlanAction = { readonly kind: IdentityRecallPlan };

export interface IdentityRecallPlanStepResult {
  readonly state: IdentityRecallPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallPlanAction[];
}

export function initialIdentityRecallPlanState(): IdentityRecallPlanState {
  return {};
}

export function stepIdentityRecallPlanWithActions(
  state: IdentityRecallPlanState,
  event: IdentityRecallPlanEvent,
): IdentityRecallPlanStepResult {
  if (event.kind === "identity/recall-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planIdentityRecall({
            recordPresent: event.recordPresent,
            publicKeyLoaded: event.publicKeyLoaded,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the recall plan from actions; null when empty. */
export function identityRecallPlanFromActions(
  actions: ReadonlyArray<IdentityRecallPlanAction>,
): IdentityRecallPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "miss" ||
      entry.kind === "reject-key" ||
      entry.kind === "hit",
  );
  return action?.kind ?? null;
}

export function shouldMissIdentityRecallPlan(
  actions: ReadonlyArray<IdentityRecallPlanAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

export function shouldRejectIdentityRecallPlanKey(
  actions: ReadonlyArray<IdentityRecallPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-key");
}

export function shouldHitIdentityRecallPlan(
  actions: ReadonlyArray<IdentityRecallPlanAction>,
): boolean {
  return hasActionOfKind(actions, "hit");
}

/**
 * Identity recall gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityRecallPlanWithActions}
 * (`miss`|`reject-key`|`hit`).
 */
export type IdentityRecallState = Record<string, never>;

export type IdentityRecallEvent =
  | Event
  | {
      readonly kind: "identity/recall-gate";
      readonly recordPresent: boolean;
      readonly publicKeyLoaded: boolean;
    };

/**
 * Adapter returns recall results only from these actions.
 * Plan nested via {@link stepIdentityRecallPlanWithActions}
 * (`miss`|`reject-key`|`hit`).
 */
export type IdentityRecallAction = { readonly kind: IdentityRecallPlan };

export interface IdentityRecallStepResult {
  readonly state: IdentityRecallState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAction[];
}

export function initialIdentityRecallState(): IdentityRecallState {
  return {};
}

export const stepIdentityRecall: StepFn<IdentityRecallState> = (
  state,
  event,
) => {
  const result = stepIdentityRecallInner(state, event as IdentityRecallEvent);
  return { state: result.state, intents: result.intents };
};

export function stepIdentityRecallWithActions(
  state: IdentityRecallState,
  event: IdentityRecallEvent,
): IdentityRecallStepResult {
  return stepIdentityRecallInner(state, event);
}

export function shouldHitIdentityRecall(
  actions: ReadonlyArray<IdentityRecallAction>,
): boolean {
  return hasActionOfKind(actions, "hit");
}

export function shouldMissIdentityRecall(
  actions: ReadonlyArray<IdentityRecallAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

export function shouldRejectIdentityRecallKey(
  actions: ReadonlyArray<IdentityRecallAction>,
): boolean {
  return hasActionOfKind(actions, "reject-key");
}

function stepIdentityRecallInner(
  state: IdentityRecallState,
  event: IdentityRecallEvent,
): IdentityRecallStepResult {
  if (event.kind === "identity/recall-gate") {
    const planActions = stepIdentityRecallPlanWithActions(
      initialIdentityRecallPlanState(),
      {
        kind: "identity/recall-plan-gate",
        recordPresent: event.recordPresent,
        publicKeyLoaded: event.publicKeyLoaded,
      },
    ).actions;
    const plan = identityRecallPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type IdentityRecallAppDataPlan = "hit" | "miss";

/** Known-destination app-data recall: hit when record holds appData. */
export function planIdentityRecallAppData(input: {
  readonly recordPresent: boolean;
  readonly appDataPresent: boolean;
}): IdentityRecallAppDataPlan {
  if (!input.recordPresent || !input.appDataPresent) {
    return "miss";
  }
  return "hit";
}

export type IdentityRecallAppDataPlanEvent =
  | Event
  | {
      readonly kind: "identity/recall-app-data-plan-gate";
      readonly recordPresent: boolean;
      readonly appDataPresent: boolean;
    };

export type IdentityRecallAppDataPlanAction = {
  readonly kind: IdentityRecallAppDataPlan;
};

/** Extract the recall-app-data plan from actions; null when empty. */
export function identityRecallAppDataPlanFromActions(
  actions: ReadonlyArray<IdentityRecallAppDataPlanAction>,
): IdentityRecallAppDataPlan | null {
  const action = actions.find(
    (entry) => entry.kind === "hit" || entry.kind === "miss",
  );
  return action?.kind ?? null;
}

export type IdentityRecallAppDataEvent =
  | Event
  | {
      readonly kind: "identity/recall-app-data-gate";
      readonly recordPresent: boolean;
      readonly appDataPresent: boolean;
    };
