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
import { LxmfDeliveryRepresentation } from "./part-1.js";
import { planLxmfPropagationLinkReady } from "./part-5.js";
import type { LxmfPropagationLinkReadyEvent, LxmfPropagationLinkReadyPlan, LxmfPropagationLinkReadyPlanAction, LxmfPropagationLinkReadyPlanEvent } from "./part-5.js";
/**
 * Propagation link-ready-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagationLinkReady` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagationLinkReadyWithActions}.
 */
export type LxmfPropagationLinkReadyPlanState = Record<string, never>;

export interface LxmfPropagationLinkReadyPlanStepResult {
  readonly state: LxmfPropagationLinkReadyPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLinkReadyPlanAction[];
}

export function initialLxmfPropagationLinkReadyPlanState(): LxmfPropagationLinkReadyPlanState {
  return {};
}

export function stepLxmfPropagationLinkReadyPlanWithActions(
  state: LxmfPropagationLinkReadyPlanState,
  event: LxmfPropagationLinkReadyPlanEvent
): LxmfPropagationLinkReadyPlanStepResult {
  if (event.kind === "propagation-link/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPropagationLinkReady({
            canReuseLink: event.canReuseLink,
            nodeConfigured: event.nodeConfigured,
            nodeIdentityPresent: event.nodeIdentityPresent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions reuse an existing propagation link. */
export function shouldPlanLxmfPropagationLinkReadyReuse(
  actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}

/** Whether plan actions establish a new propagation link. */
export function shouldPlanLxmfPropagationLinkReadyEstablish(
  actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>
): boolean {
  return actions.some((action) => action.kind === "establish");
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagationLinkReadyPlanMissingNode(
  actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-node");
}

/** Whether plan actions reject a missing node identity. */
export function shouldRejectLxmfPropagationLinkReadyPlanMissingIdentity(
  actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-identity");
}

/** Extract the link-ready plan from actions; null when empty. */
export function lxmfPropagationLinkReadyPlanFromActions(
  actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>
): LxmfPropagationLinkReadyPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "reuse" ||
      entry.kind === "establish" ||
      entry.kind === "missing-node" ||
      entry.kind === "missing-identity"
  );
  return action?.kind ?? null;
}

/**
 * Propagation link-ready gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagationLinkReadyPlanWithActions}
 * (`reuse`|`establish`|`missing-node`|`missing-identity`).
 */
export type LxmfPropagationLinkReadyState = Record<string, never>;

/**
 * Adapter applies reuse / establish / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagationLinkReadyPlanWithActions}
 * (`reuse`|`establish`|`missing-node`|`missing-identity`).
 */
export type LxmfPropagationLinkReadyAction =
  | { readonly kind: "reuse" }
  | { readonly kind: "establish" }
  | { readonly kind: "reject-missing-node" }
  | { readonly kind: "reject-missing-identity" };

export interface LxmfPropagationLinkReadyStepResult {
  readonly state: LxmfPropagationLinkReadyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLinkReadyAction[];
}

export function initialLxmfPropagationLinkReadyState(): LxmfPropagationLinkReadyState {
  return {};
}

export const stepLxmfPropagationLinkReady: StepFn<LxmfPropagationLinkReadyState> = (
  state,
  event
) => {
  const result = stepLxmfPropagationLinkReadyInner(
    state,
    event as LxmfPropagationLinkReadyEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagationLinkReadyWithActions(
  state: LxmfPropagationLinkReadyState,
  event: LxmfPropagationLinkReadyEvent
): LxmfPropagationLinkReadyStepResult {
  return stepLxmfPropagationLinkReadyInner(state, event);
}

export function shouldReuseLxmfPropagationLink(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}

export function shouldEstablishLxmfPropagationLink(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "establish");
}

export function shouldRejectLxmfPropagationMissingNode(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-node");
}

export function shouldRejectLxmfPropagationMissingIdentity(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-identity");
}

function stepLxmfPropagationLinkReadyInner(
  state: LxmfPropagationLinkReadyState,
  event: LxmfPropagationLinkReadyEvent
): LxmfPropagationLinkReadyStepResult {
  if (event.kind === "propagation-link/gate") {
    const planActions = stepLxmfPropagationLinkReadyPlanWithActions(
      initialLxmfPropagationLinkReadyPlanState(),
      {
        kind: "propagation-link/plan-gate",
        canReuseLink: event.canReuseLink,
        nodeConfigured: event.nodeConfigured,
        nodeIdentityPresent: event.nodeIdentityPresent
      }
    ).actions;
    if (shouldPlanLxmfPropagationLinkReadyReuse(planActions)) {
      return { state, intents: [], actions: [{ kind: "reuse" }] };
    }
    if (shouldRejectLxmfPropagationLinkReadyPlanMissingNode(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-node" }] };
    }
    if (shouldRejectLxmfPropagationLinkReadyPlanMissingIdentity(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-identity" }] };
    }
    if (!shouldPlanLxmfPropagationLinkReadyEstablish(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "establish" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPropagatedSendPlan =
  | "ok"
  | "missing-node"
  | "missing-packed"
  | "resource-unimplemented";

/** Whether PROPAGATED send may proceed (node + packed envelope + PACKET representation). */
export function planLxmfPropagatedSend(input: {
  readonly nodeConfigured: boolean;
  readonly hasPropagationPacked: boolean;
  readonly representation: number;
}): LxmfPropagatedSendPlan {
  if (!input.nodeConfigured) {
    return "missing-node";
  }
  if (!input.hasPropagationPacked) {
    return "missing-packed";
  }
  if (input.representation !== LxmfDeliveryRepresentation.PACKET) {
    return "resource-unimplemented";
  }
  return "ok";
}

/**
 * PROPAGATED send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagatedSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagatedSendWithActions}.
 */
export type LxmfPropagatedSendPlanState = Record<string, never>;

export type LxmfPropagatedSendPlanEvent =
  | Event
  | {
      readonly kind: "propagated-send/plan-gate";
      readonly nodeConfigured: boolean;
      readonly hasPropagationPacked: boolean;
      readonly representation: number;
    };

export type LxmfPropagatedSendPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-node" }
  | { readonly kind: "missing-packed" }
  | { readonly kind: "resource-unimplemented" };

export interface LxmfPropagatedSendPlanStepResult {
  readonly state: LxmfPropagatedSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedSendPlanAction[];
}

export function initialLxmfPropagatedSendPlanState(): LxmfPropagatedSendPlanState {
  return {};
}

export function stepLxmfPropagatedSendPlanWithActions(
  state: LxmfPropagatedSendPlanState,
  event: LxmfPropagatedSendPlanEvent
): LxmfPropagatedSendPlanStepResult {
  if (event.kind === "propagated-send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPropagatedSend({
            nodeConfigured: event.nodeConfigured,
            hasPropagationPacked: event.hasPropagationPacked,
            representation: event.representation
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow PROPAGATED send to proceed. */
export function shouldPlanLxmfPropagatedSendOk(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagatedSendPlanMissingNode(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-node");
}

/** Whether plan actions reject a missing packed envelope. */
export function shouldRejectLxmfPropagatedSendPlanMissingPacked(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-packed");
}

/** Whether plan actions reject unimplemented RESOURCE representation. */
export function shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "resource-unimplemented");
}

/** Extract the PROPAGATED send plan from actions; null when empty. */
export function lxmfPropagatedSendPlanFromActions(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): LxmfPropagatedSendPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "missing-node" ||
      entry.kind === "missing-packed" ||
      entry.kind === "resource-unimplemented"
  );
  return action?.kind ?? null;
}

/**
 * PROPAGATED send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagatedSendPlanWithActions}
 * (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`).
 */
export type LxmfPropagatedSendState = Record<string, never>;

export type LxmfPropagatedSendEvent =
  | Event
  | {
      readonly kind: "propagated-send/gate";
      readonly nodeConfigured: boolean;
      readonly hasPropagationPacked: boolean;
      readonly representation: number;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagatedSendPlanWithActions}
 * (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`).
 */
export type LxmfPropagatedSendAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-node" }
  | { readonly kind: "reject-missing-packed" }
  | { readonly kind: "reject-resource-unimplemented" };

export interface LxmfPropagatedSendStepResult {
  readonly state: LxmfPropagatedSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedSendAction[];
}

export function initialLxmfPropagatedSendState(): LxmfPropagatedSendState {
  return {};
}

export const stepLxmfPropagatedSend: StepFn<LxmfPropagatedSendState> = (state, event) => {
  const result = stepLxmfPropagatedSendInner(state, event as LxmfPropagatedSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagatedSendWithActions(
  state: LxmfPropagatedSendState,
  event: LxmfPropagatedSendEvent
): LxmfPropagatedSendStepResult {
  return stepLxmfPropagatedSendInner(state, event);
}

export function shouldProceedLxmfPropagatedSend(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfPropagatedMissingNode(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-node");
}

export function shouldRejectLxmfPropagatedMissingPacked(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-packed");
}

export function shouldRejectLxmfPropagatedResourceUnimplemented(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-resource-unimplemented");
}

function stepLxmfPropagatedSendInner(
  state: LxmfPropagatedSendState,
  event: LxmfPropagatedSendEvent
): LxmfPropagatedSendStepResult {
  if (event.kind === "propagated-send/gate") {
    const planActions = stepLxmfPropagatedSendPlanWithActions(
      initialLxmfPropagatedSendPlanState(),
      {
        kind: "propagated-send/plan-gate",
        nodeConfigured: event.nodeConfigured,
        hasPropagationPacked: event.hasPropagationPacked,
        representation: event.representation
      }
    ).actions;
    if (shouldRejectLxmfPropagatedSendPlanMissingNode(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-node" }] };
    }
    if (shouldRejectLxmfPropagatedSendPlanMissingPacked(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-packed" }] };
    }
    if (shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-resource-unimplemented" }] };
    }
    if (!shouldPlanLxmfPropagatedSendOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether outbound LXMF should await / poll a delivery receipt. */
export function shouldAwaitLxmfDeliveryReceipt(receiptPresent: boolean): boolean {
  return receiptPresent;
}

/**
 * LXMF delivery-receipt await gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAwaitLxmfDeliveryReceipt` reads beside the step).
 */
export type AwaitLxmfDeliveryReceiptState = Record<string, never>;

export type AwaitLxmfDeliveryReceiptEvent =
  | Event
  | {
      readonly kind: "lxmf/await-delivery-receipt-gate";
      readonly receiptPresent: boolean;
    };

export type AwaitLxmfDeliveryReceiptAction =
  | { readonly kind: "await" }
  | { readonly kind: "skip" };

export interface AwaitLxmfDeliveryReceiptStepResult {
  readonly state: AwaitLxmfDeliveryReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AwaitLxmfDeliveryReceiptAction[];
}

export function initialAwaitLxmfDeliveryReceiptState(): AwaitLxmfDeliveryReceiptState {
  return {};
}
