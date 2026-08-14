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
import type { LxmfDeliverableAcceptPlan } from "./part-2.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";
/** Whether an unpacked LXMF deliverable should be accepted (sig + seen-hash). */
export function planLxmfDeliverableAccept(input: {
  readonly signatureValidated: boolean;
  readonly hasHash: boolean;
  readonly alreadySeen: boolean;
}): LxmfDeliverableAcceptPlan {
  if (!input.signatureValidated) {
    return "reject-unsigned";
  }
  if (input.hasHash && input.alreadySeen) {
    return "reject-seen";
  }
  return "accept";
}

/**
 * Deliverable-accept-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDeliverableAccept` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfDeliverableAcceptWithActions}.
 */
export type LxmfDeliverableAcceptPlanState = Record<string, never>;

export type LxmfDeliverableAcceptPlanEvent =
  | Event
  | {
      readonly kind: "deliverable/plan-gate";
      readonly signatureValidated: boolean;
      readonly hasHash: boolean;
      readonly alreadySeen: boolean;
    };

export type LxmfDeliverableAcceptPlanAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject-unsigned" }
  | { readonly kind: "reject-seen" };

export interface LxmfDeliverableAcceptPlanStepResult {
  readonly state: LxmfDeliverableAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliverableAcceptPlanAction[];
}

export function initialLxmfDeliverableAcceptPlanState(): LxmfDeliverableAcceptPlanState {
  return {};
}

export function stepLxmfDeliverableAcceptPlanWithActions(
  state: LxmfDeliverableAcceptPlanState,
  event: LxmfDeliverableAcceptPlanEvent,
): LxmfDeliverableAcceptPlanStepResult {
  if (event.kind === "deliverable/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfDeliverableAccept({
            signatureValidated: event.signatureValidated,
            hasHash: event.hasHash,
            alreadySeen: event.alreadySeen,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions accept the deliverable. */
export function shouldPlanLxmfDeliverableAccept(
  actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

/** Whether plan actions reject an unsigned deliverable. */
export function shouldRejectLxmfDeliverableAcceptPlanUnsigned(
  actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unsigned");
}

/** Whether plan actions reject an already-seen deliverable. */
export function shouldRejectLxmfDeliverableAcceptPlanSeen(
  actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-seen");
}

/** Extract the deliverable-accept plan from actions; null when empty. */
export function lxmfDeliverableAcceptPlanFromActions(
  actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>,
): LxmfDeliverableAcceptPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

/**
 * Deliverable accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfDeliverableAcceptPlanWithActions}
 * (`accept`|`reject-unsigned`|`reject-seen`).
 */
export type LxmfDeliverableAcceptState = Record<string, never>;

export type LxmfDeliverableAcceptEvent =
  | Event
  | {
      readonly kind: "deliverable/accept-gate";
      readonly signatureValidated: boolean;
      readonly hasHash: boolean;
      readonly alreadySeen: boolean;
    };

/**
 * Adapter applies accept / reject only from these actions.
 * Plan nested via {@link stepLxmfDeliverableAcceptPlanWithActions}
 * (`accept`|`reject-unsigned`|`reject-seen`).
 */
export type LxmfDeliverableAcceptAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject-unsigned" }
  | { readonly kind: "reject-seen" };

export interface LxmfDeliverableAcceptStepResult {
  readonly state: LxmfDeliverableAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliverableAcceptAction[];
}

export function initialLxmfDeliverableAcceptState(): LxmfDeliverableAcceptState {
  return {};
}

export const stepLxmfDeliverableAccept: StepFn<LxmfDeliverableAcceptState> = (
  state,
  event,
) => {
  const result = stepLxmfDeliverableAcceptInner(
    state,
    event as LxmfDeliverableAcceptEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfDeliverableAcceptWithActions(
  state: LxmfDeliverableAcceptState,
  event: LxmfDeliverableAcceptEvent,
): LxmfDeliverableAcceptStepResult {
  return stepLxmfDeliverableAcceptInner(state, event);
}

export function shouldAcceptLxmfDeliverable(
  actions: ReadonlyArray<LxmfDeliverableAcceptAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectLxmfDeliverableUnsigned(
  actions: ReadonlyArray<LxmfDeliverableAcceptAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unsigned");
}

export function shouldRejectLxmfDeliverableSeen(
  actions: ReadonlyArray<LxmfDeliverableAcceptAction>,
): boolean {
  return hasActionOfKind(actions, "reject-seen");
}

function stepLxmfDeliverableAcceptInner(
  state: LxmfDeliverableAcceptState,
  event: LxmfDeliverableAcceptEvent,
): LxmfDeliverableAcceptStepResult {
  if (event.kind === "deliverable/accept-gate") {
    const planActions = stepLxmfDeliverableAcceptPlanWithActions(
      initialLxmfDeliverableAcceptPlanState(),
      {
        kind: "deliverable/plan-gate",
        signatureValidated: event.signatureValidated,
        hasHash: event.hasHash,
        alreadySeen: event.alreadySeen,
      },
    ).actions;
    if (shouldRejectLxmfDeliverableAcceptPlanUnsigned(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-unsigned" }] };
    }
    if (shouldRejectLxmfDeliverableAcceptPlanSeen(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-seen" }] };
    }
    if (!shouldPlanLxmfDeliverableAccept(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "accept" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether an accepted LXMF deliverable hash should be remembered in the seen set. */
export function shouldRememberLxmfMessage(hasHash: boolean): boolean {
  return hasHash;
}

/**
 * shouldRememberLxmfMessage gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRememberLxmfMessage`
 * reads beside the step).
 */
export type RememberLxmfMessageState = Record<string, never>;

export type RememberLxmfMessageEvent =
  | Event
  | {
      readonly kind: "lxmf/remember-message-gate";
      readonly hasHash: boolean;
    };

export type RememberLxmfMessageAction =
  { readonly kind: "remember" } | { readonly kind: "skip" };

export interface RememberLxmfMessageStepResult {
  readonly state: RememberLxmfMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RememberLxmfMessageAction[];
}

export function initialRememberLxmfMessageState(): RememberLxmfMessageState {
  return {};
}

export function stepRememberLxmfMessageWithActions(
  state: RememberLxmfMessageState,
  event: RememberLxmfMessageEvent,
): RememberLxmfMessageStepResult {
  if (event.kind === "lxmf/remember-message-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRememberLxmfMessage(event.hasHash) ? "remember" : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRememberLxmfMessageNow(
  actions: ReadonlyArray<RememberLxmfMessageAction>,
): boolean {
  return hasActionOfKind(actions, "remember");
}

export function shouldSkipRememberLxmfMessage(
  actions: ReadonlyArray<RememberLxmfMessageAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Whether remember-message may commit after {@link shouldRememberLxmfMessage}
 * and the hash reference remains present for narrowing.
 */
export function shouldCommitRememberedLxmfHash(hashPresent: boolean): boolean {
  return hashPresent;
}

/**
 * shouldCommitRememberedLxmfHash gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldCommitRememberedLxmfHash`
 * reads beside the step).
 */
export type CommitRememberedLxmfHashState = Record<string, never>;

export type CommitRememberedLxmfHashEvent =
  | Event
  | {
      readonly kind: "lxmf/commit-remembered-hash-gate";
      readonly hashPresent: boolean;
    };

export type CommitRememberedLxmfHashAction =
  { readonly kind: "commit" } | { readonly kind: "skip" };

export interface CommitRememberedLxmfHashStepResult {
  readonly state: CommitRememberedLxmfHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitRememberedLxmfHashAction[];
}

export function initialCommitRememberedLxmfHashState(): CommitRememberedLxmfHashState {
  return {};
}

export function stepCommitRememberedLxmfHashWithActions(
  state: CommitRememberedLxmfHashState,
  event: CommitRememberedLxmfHashEvent,
): CommitRememberedLxmfHashStepResult {
  if (event.kind === "lxmf/commit-remembered-hash-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitRememberedLxmfHash(event.hashPresent)
            ? "commit"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitRememberedLxmfHashNow(
  actions: ReadonlyArray<CommitRememberedLxmfHashAction>,
): boolean {
  return hasActionOfKind(actions, "commit");
}

export function shouldSkipCommitRememberedLxmfHash(
  actions: ReadonlyArray<CommitRememberedLxmfHashAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether LXMF wire bytes may unpack after split WithActions `use-fields`. */
export function shouldAcceptLxmfWireFrame(wirePresent: boolean): boolean {
  return wirePresent;
}

/**
 * shouldAcceptLxmfWireFrame gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLxmfWireFrame`
 * reads beside the step).
 */
export type AcceptLxmfWireFrameState = Record<string, never>;

export type AcceptLxmfWireFrameEvent =
  | Event
  | {
      readonly kind: "lxmf/accept-wire-frame-gate";
      readonly wirePresent: boolean;
    };

export type AcceptLxmfWireFrameAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptLxmfWireFrameStepResult {
  readonly state: AcceptLxmfWireFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLxmfWireFrameAction[];
}

export function initialAcceptLxmfWireFrameState(): AcceptLxmfWireFrameState {
  return {};
}

export function stepAcceptLxmfWireFrameWithActions(
  state: AcceptLxmfWireFrameState,
  event: AcceptLxmfWireFrameEvent,
): AcceptLxmfWireFrameStepResult {
  if (event.kind === "lxmf/accept-wire-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptLxmfWireFrame(event.wirePresent)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLxmfWireFrameNow(
  actions: ReadonlyArray<AcceptLxmfWireFrameAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipAcceptLxmfWireFrame(
  actions: ReadonlyArray<AcceptLxmfWireFrameAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a router may register its (only) delivery identity. */
export function canRegisterLxmfDeliveryIdentity(
  deliveryDestinationPresent: boolean,
): boolean {
  return !deliveryDestinationPresent;
}

/**
 * canRegisterLxmfDeliveryIdentity gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRegisterLxmfDeliveryIdentity`
 * reads beside the step).
 */
export type RegisterLxmfDeliveryIdentityState = Record<string, never>;

export type RegisterLxmfDeliveryIdentityEvent =
  | Event
  | {
      readonly kind: "lxmf/register-delivery-identity-gate";
      readonly deliveryDestinationPresent: boolean;
    };

export type RegisterLxmfDeliveryIdentityAction =
  { readonly kind: "register" } | { readonly kind: "skip" };

export interface RegisterLxmfDeliveryIdentityStepResult {
  readonly state: RegisterLxmfDeliveryIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLxmfDeliveryIdentityAction[];
}

export function initialRegisterLxmfDeliveryIdentityState(): RegisterLxmfDeliveryIdentityState {
  return {};
}
