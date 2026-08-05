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

/** Whether propagation inbound targets this router's local delivery destination. */
export function canAcceptLxmfPropagationLocalDelivery(input: {
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.deliveryDestinationPresent && input.destinationHashMatches;
}

/**
 * Propagation local-delivery accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canAcceptLxmfPropagationLocalDelivery` reads beside the step).
 */
export type AcceptLxmfPropagationLocalDeliveryState = Record<string, never>;

export type AcceptLxmfPropagationLocalDeliveryEvent =
  | Event
  | {
      readonly kind: "propagation-local-delivery/accept-gate";
      readonly deliveryDestinationPresent: boolean;
      readonly destinationHashMatches: boolean;
    };

export type AcceptLxmfPropagationLocalDeliveryAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptLxmfPropagationLocalDeliveryStepResult {
  readonly state: AcceptLxmfPropagationLocalDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLxmfPropagationLocalDeliveryAction[];
}

export function initialAcceptLxmfPropagationLocalDeliveryState(): AcceptLxmfPropagationLocalDeliveryState {
  return {};
}

export function stepAcceptLxmfPropagationLocalDeliveryWithActions(
  state: AcceptLxmfPropagationLocalDeliveryState,
  event: AcceptLxmfPropagationLocalDeliveryEvent
): AcceptLxmfPropagationLocalDeliveryStepResult {
  if (event.kind === "propagation-local-delivery/accept-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLxmfPropagationLocalDelivery({
            deliveryDestinationPresent: event.deliveryDestinationPresent,
            destinationHashMatches: event.destinationHashMatches
          })
            ? "accept"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLxmfPropagationLocalDeliveryNow(
  actions: ReadonlyArray<AcceptLxmfPropagationLocalDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptLxmfPropagationLocalDelivery(
  actions: ReadonlyArray<AcceptLxmfPropagationLocalDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type LxmfPropagationLocalIngressPlan =
  | "reject-prefix"
  | "reject-destination"
  | "reject-decrypt"
  | "deliver";

/**
 * Whether propagation local-delivery ingress may unpack+callback.
 * Decrypt stays at the adapter edge (supply decryptedPresent).
 */
export function planLxmfPropagationLocalIngress(input: {
  readonly prefixedPresent: boolean;
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
  readonly decryptedPresent: boolean;
}): LxmfPropagationLocalIngressPlan {
  if (!input.prefixedPresent) {
    return "reject-prefix";
  }
  if (
    !canAcceptLxmfPropagationLocalDelivery({
      deliveryDestinationPresent: input.deliveryDestinationPresent,
      destinationHashMatches: input.destinationHashMatches
    })
  ) {
    return "reject-destination";
  }
  if (!input.decryptedPresent) {
    return "reject-decrypt";
  }
  return "deliver";
}

/**
 * Propagation local-ingress-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagationLocalIngress` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagationLocalIngressWithActions}.
 */
export type LxmfPropagationLocalIngressPlanState = Record<string, never>;

export type LxmfPropagationLocalIngressPlanEvent =
  | Event
  | {
      readonly kind: "propagation-local-ingress/plan-gate";
      readonly prefixedPresent: boolean;
      readonly deliveryDestinationPresent: boolean;
      readonly destinationHashMatches: boolean;
      readonly decryptedPresent: boolean;
    };

export type LxmfPropagationLocalIngressPlanAction =
  | { readonly kind: "deliver" }
  | { readonly kind: "reject-prefix" }
  | { readonly kind: "reject-destination" }
  | { readonly kind: "reject-decrypt" };

export interface LxmfPropagationLocalIngressPlanStepResult {
  readonly state: LxmfPropagationLocalIngressPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLocalIngressPlanAction[];
}

export function initialLxmfPropagationLocalIngressPlanState(): LxmfPropagationLocalIngressPlanState {
  return {};
}

export function stepLxmfPropagationLocalIngressPlanWithActions(
  state: LxmfPropagationLocalIngressPlanState,
  event: LxmfPropagationLocalIngressPlanEvent
): LxmfPropagationLocalIngressPlanStepResult {
  if (event.kind === "propagation-local-ingress/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPropagationLocalIngress({
            prefixedPresent: event.prefixedPresent,
            deliveryDestinationPresent: event.deliveryDestinationPresent,
            destinationHashMatches: event.destinationHashMatches,
            decryptedPresent: event.decryptedPresent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow local-ingress delivery. */
export function shouldPlanLxmfPropagationLocalIngressDeliver(
  actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

/** Whether plan actions reject a missing prefix. */
export function shouldRejectLxmfPropagationLocalIngressPlanPrefix(
  actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-prefix");
}

/** Whether plan actions reject a destination mismatch. */
export function shouldRejectLxmfPropagationLocalIngressPlanDestination(
  actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-destination");
}

/** Whether plan actions reject a failed decrypt. */
export function shouldRejectLxmfPropagationLocalIngressPlanDecrypt(
  actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-decrypt");
}

/** Extract the local-ingress plan from actions; null when empty. */
export function lxmfPropagationLocalIngressPlanFromActions(
  actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>
): LxmfPropagationLocalIngressPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "deliver" ||
      entry.kind === "reject-prefix" ||
      entry.kind === "reject-destination" ||
      entry.kind === "reject-decrypt"
  );
  return action?.kind ?? null;
}

/**
 * Propagation local-ingress gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagationLocalIngressPlanWithActions}
 * (`deliver`|`reject-prefix`|`reject-destination`|`reject-decrypt`).
 */
export type LxmfPropagationLocalIngressState = Record<string, never>;

export type LxmfPropagationLocalIngressEvent =
  | Event
  | {
      readonly kind: "propagation-local-ingress/gate";
      readonly prefixedPresent: boolean;
      readonly deliveryDestinationPresent: boolean;
      readonly destinationHashMatches: boolean;
      readonly decryptedPresent: boolean;
    };

/**
 * Adapter applies deliver / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagationLocalIngressPlanWithActions}
 * (`deliver`|`reject-prefix`|`reject-destination`|`reject-decrypt`).
 */
export type LxmfPropagationLocalIngressAction =
  | { readonly kind: "deliver" }
  | { readonly kind: "reject-prefix" }
  | { readonly kind: "reject-destination" }
  | { readonly kind: "reject-decrypt" };

export interface LxmfPropagationLocalIngressStepResult {
  readonly state: LxmfPropagationLocalIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLocalIngressAction[];
}

export function initialLxmfPropagationLocalIngressState(): LxmfPropagationLocalIngressState {
  return {};
}

export const stepLxmfPropagationLocalIngress: StepFn<LxmfPropagationLocalIngressState> = (
  state,
  event
) => {
  const result = stepLxmfPropagationLocalIngressInner(
    state,
    event as LxmfPropagationLocalIngressEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagationLocalIngressWithActions(
  state: LxmfPropagationLocalIngressState,
  event: LxmfPropagationLocalIngressEvent
): LxmfPropagationLocalIngressStepResult {
  return stepLxmfPropagationLocalIngressInner(state, event);
}

export function shouldDeliverLxmfPropagationLocalIngress(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

export function shouldRejectLxmfPropagationLocalPrefix(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "reject-prefix");
}

export function shouldRejectLxmfPropagationLocalDestination(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "reject-destination");
}

export function shouldRejectLxmfPropagationLocalDecrypt(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "reject-decrypt");
}

/**
 * Whether propagation local ingress may unpack after a deliver action
 * and prefixed/decrypted references remain present for narrowing.
 */
export function canUnpackLxmfPropagationLocalIngress(input: {
  readonly deliver: boolean;
  readonly prefixedPresent: boolean;
  readonly decryptedPresent: boolean;
}): boolean {
  return input.deliver && input.prefixedPresent && input.decryptedPresent;
}

/**
 * Propagation local-ingress unpack gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canUnpackLxmfPropagationLocalIngress` reads beside the step).
 */
export type UnpackLxmfPropagationLocalIngressState = Record<string, never>;

export type UnpackLxmfPropagationLocalIngressEvent =
  | Event
  | {
      readonly kind: "propagation-local-ingress/unpack-gate";
      readonly deliver: boolean;
      readonly prefixedPresent: boolean;
      readonly decryptedPresent: boolean;
    };

export type UnpackLxmfPropagationLocalIngressAction =
  | { readonly kind: "unpack" }
  | { readonly kind: "skip" };

export interface UnpackLxmfPropagationLocalIngressStepResult {
  readonly state: UnpackLxmfPropagationLocalIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLxmfPropagationLocalIngressAction[];
}

export function initialUnpackLxmfPropagationLocalIngressState(): UnpackLxmfPropagationLocalIngressState {
  return {};
}

export function stepUnpackLxmfPropagationLocalIngressWithActions(
  state: UnpackLxmfPropagationLocalIngressState,
  event: UnpackLxmfPropagationLocalIngressEvent
): UnpackLxmfPropagationLocalIngressStepResult {
  if (event.kind === "propagation-local-ingress/unpack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canUnpackLxmfPropagationLocalIngress({
            deliver: event.deliver,
            prefixedPresent: event.prefixedPresent,
            decryptedPresent: event.decryptedPresent
          })
            ? "unpack"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUnpackLxmfPropagationLocalIngressNow(
  actions: ReadonlyArray<UnpackLxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "unpack");
}

export function shouldSkipUnpackLxmfPropagationLocalIngress(
  actions: ReadonlyArray<UnpackLxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

function stepLxmfPropagationLocalIngressInner(
  state: LxmfPropagationLocalIngressState,
  event: LxmfPropagationLocalIngressEvent
): LxmfPropagationLocalIngressStepResult {
  if (event.kind === "propagation-local-ingress/gate") {
    const planActions = stepLxmfPropagationLocalIngressPlanWithActions(
      initialLxmfPropagationLocalIngressPlanState(),
      {
        kind: "propagation-local-ingress/plan-gate",
        prefixedPresent: event.prefixedPresent,
        deliveryDestinationPresent: event.deliveryDestinationPresent,
        destinationHashMatches: event.destinationHashMatches,
        decryptedPresent: event.decryptedPresent
      }
    ).actions;
    if (shouldRejectLxmfPropagationLocalIngressPlanPrefix(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-prefix" }] };
    }
    if (shouldRejectLxmfPropagationLocalIngressPlanDestination(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-destination" }] };
    }
    if (shouldRejectLxmfPropagationLocalIngressPlanDecrypt(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-decrypt" }] };
    }
    if (!shouldPlanLxmfPropagationLocalIngressDeliver(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "deliver" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPropagationLinkReadyPlan =
  | "reuse"
  | "missing-node"
  | "missing-identity"
  | "establish";

/** Whether outbound propagation may reuse a link, establish, or must abort. */
export function planLxmfPropagationLinkReady(input: {
  readonly canReuseLink: boolean;
  readonly nodeConfigured: boolean;
  readonly nodeIdentityPresent: boolean;
}): LxmfPropagationLinkReadyPlan {
  if (input.canReuseLink) {
    return "reuse";
  }
  if (!input.nodeConfigured) {
    return "missing-node";
  }
  if (!input.nodeIdentityPresent) {
    return "missing-identity";
  }
  return "establish";
}

export type LxmfPropagationLinkReadyPlanEvent =
  | Event
  | {
      readonly kind: "propagation-link/plan-gate";
      readonly canReuseLink: boolean;
      readonly nodeConfigured: boolean;
      readonly nodeIdentityPresent: boolean;
    };

export type LxmfPropagationLinkReadyPlanAction =
  | { readonly kind: "reuse" }
  | { readonly kind: "establish" }
  | { readonly kind: "missing-node" }
  | { readonly kind: "missing-identity" };

export type LxmfPropagationLinkReadyEvent =
  | Event
  | {
      readonly kind: "propagation-link/gate";
      readonly canReuseLink: boolean;
      readonly nodeConfigured: boolean;
      readonly nodeIdentityPresent: boolean;
    };
