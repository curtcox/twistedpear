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
import { LxmfDeliveryMethod } from "./part-1.js";
import { shouldAwaitLxmfDeliveryReceipt } from "./part-6.js";
import type {
  AwaitLxmfDeliveryReceiptAction,
  AwaitLxmfDeliveryReceiptEvent,
  AwaitLxmfDeliveryReceiptState,
  AwaitLxmfDeliveryReceiptStepResult,
} from "./part-6.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";
export function stepAwaitLxmfDeliveryReceiptWithActions(
  state: AwaitLxmfDeliveryReceiptState,
  event: AwaitLxmfDeliveryReceiptEvent,
): AwaitLxmfDeliveryReceiptStepResult {
  if (event.kind === "lxmf/await-delivery-receipt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAwaitLxmfDeliveryReceipt(event.receiptPresent)
            ? "await"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAwaitLxmfDeliveryReceiptNow(
  actions: ReadonlyArray<AwaitLxmfDeliveryReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "await");
}

export function shouldSkipAwaitLxmfDeliveryReceipt(
  actions: ReadonlyArray<AwaitLxmfDeliveryReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether an unpacked deliverable should invoke the delivery callback. */
export function shouldInvokeLxmfDeliveryCallback(
  messagePresent: boolean,
): boolean {
  return messagePresent;
}

/**
 * LXMF delivery-callback invoke gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeLxmfDeliveryCallback` reads beside the step).
 */
export type InvokeLxmfDeliveryCallbackState = Record<string, never>;

export type InvokeLxmfDeliveryCallbackEvent =
  | Event
  | {
      readonly kind: "lxmf/invoke-delivery-callback-gate";
      readonly messagePresent: boolean;
    };

export type InvokeLxmfDeliveryCallbackAction =
  { readonly kind: "invoke" } | { readonly kind: "skip" };

export interface InvokeLxmfDeliveryCallbackStepResult {
  readonly state: InvokeLxmfDeliveryCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InvokeLxmfDeliveryCallbackAction[];
}

export function initialInvokeLxmfDeliveryCallbackState(): InvokeLxmfDeliveryCallbackState {
  return {};
}

export function stepInvokeLxmfDeliveryCallbackWithActions(
  state: InvokeLxmfDeliveryCallbackState,
  event: InvokeLxmfDeliveryCallbackEvent,
): InvokeLxmfDeliveryCallbackStepResult {
  if (event.kind === "lxmf/invoke-delivery-callback-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeLxmfDeliveryCallback(event.messagePresent)
            ? "invoke"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeLxmfDeliveryCallbackNow(
  actions: ReadonlyArray<InvokeLxmfDeliveryCallbackAction>,
): boolean {
  return hasActionOfKind(actions, "invoke");
}

export function shouldSkipInvokeLxmfDeliveryCallback(
  actions: ReadonlyArray<InvokeLxmfDeliveryCallbackAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** LXMFRouter.send method dispatch after packed-envelope check. */
export type LxmfSendMethodPlan =
  | "opportunistic"
  | "direct"
  | "propagated"
  | "reject-unpacked"
  | "reject-unsupported";

export function planLxmfSendMethod(input: {
  readonly packed: boolean;
  readonly method: number;
}): LxmfSendMethodPlan {
  if (!input.packed) {
    return "reject-unpacked";
  }
  if (input.method === LxmfDeliveryMethod.OPPORTUNISTIC) {
    return "opportunistic";
  }
  if (input.method === LxmfDeliveryMethod.DIRECT) {
    return "direct";
  }
  if (input.method === LxmfDeliveryMethod.PROPAGATED) {
    return "propagated";
  }
  return "reject-unsupported";
}

/**
 * Send-method-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfSendMethod` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfSendMethodWithActions}.
 */
export type LxmfSendMethodPlanState = Record<string, never>;

export type LxmfSendMethodPlanEvent =
  | Event
  | {
      readonly kind: "send/plan-gate";
      readonly packed: boolean;
      readonly method: number;
    };

export type LxmfSendMethodPlanAction =
  | { readonly kind: "opportunistic" }
  | { readonly kind: "direct" }
  | { readonly kind: "propagated" }
  | { readonly kind: "reject-unpacked" }
  | { readonly kind: "reject-unsupported" };

export interface LxmfSendMethodPlanStepResult {
  readonly state: LxmfSendMethodPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSendMethodPlanAction[];
}

export function initialLxmfSendMethodPlanState(): LxmfSendMethodPlanState {
  return {};
}

export function stepLxmfSendMethodPlanWithActions(
  state: LxmfSendMethodPlanState,
  event: LxmfSendMethodPlanEvent,
): LxmfSendMethodPlanStepResult {
  if (event.kind === "send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfSendMethod({
            packed: event.packed,
            method: event.method,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions reject an unpacked send. */
export function shouldRejectLxmfSendMethodPlanUnpacked(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unpacked");
}

/** Whether plan actions select opportunistic send. */
export function shouldPlanLxmfSendMethodOpportunistic(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>,
): boolean {
  return hasActionOfKind(actions, "opportunistic");
}

/** Whether plan actions select direct send. */
export function shouldPlanLxmfSendMethodDirect(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>,
): boolean {
  return hasActionOfKind(actions, "direct");
}

/** Whether plan actions select propagated send. */
export function shouldPlanLxmfSendMethodPropagated(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>,
): boolean {
  return hasActionOfKind(actions, "propagated");
}

/** Whether plan actions reject an unsupported delivery method. */
export function shouldRejectLxmfSendMethodPlanUnsupported(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unsupported");
}

/** Extract the send-method plan from actions; null when empty. */
export function lxmfSendMethodPlanFromActions(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>,
): LxmfSendMethodPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

/**
 * Send-method dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfSendMethodPlanWithActions}
 * (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`).
 */
export type LxmfSendMethodState = Record<string, never>;

export type LxmfSendMethodEvent =
  | Event
  | {
      readonly kind: "send/dispatch";
      readonly packed: boolean;
      readonly method: number;
    };

/**
 * Adapter applies reject / method-send only from these actions.
 * Plan nested via {@link stepLxmfSendMethodPlanWithActions}
 * (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`).
 */
export type LxmfSendMethodAction =
  | { readonly kind: "reject-unpacked" }
  | { readonly kind: "send-opportunistic" }
  | { readonly kind: "send-direct" }
  | { readonly kind: "send-propagated" }
  | { readonly kind: "reject-unsupported"; readonly method: number };

export interface LxmfSendMethodStepResult {
  readonly state: LxmfSendMethodState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSendMethodAction[];
}

export function initialLxmfSendMethodState(): LxmfSendMethodState {
  return {};
}

export const stepLxmfSendMethod: StepFn<LxmfSendMethodState> = (
  state,
  event,
) => {
  const result = stepLxmfSendMethodInner(state, event as LxmfSendMethodEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfSendMethodWithActions(
  state: LxmfSendMethodState,
  event: LxmfSendMethodEvent,
): LxmfSendMethodStepResult {
  return stepLxmfSendMethodInner(state, event);
}

/** Whether step actions reject an unpacked send. */
export function shouldRejectLxmfSendUnpacked(
  actions: ReadonlyArray<LxmfSendMethodAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unpacked");
}

/** Whether step actions dispatch opportunistic send. */
export function shouldSendLxmfOpportunistic(
  actions: ReadonlyArray<LxmfSendMethodAction>,
): boolean {
  return hasActionOfKind(actions, "send-opportunistic");
}

/** Whether step actions dispatch direct send. */
export function shouldSendLxmfDirect(
  actions: ReadonlyArray<LxmfSendMethodAction>,
): boolean {
  return hasActionOfKind(actions, "send-direct");
}

/** Whether step actions dispatch propagated send. */
export function shouldSendLxmfPropagated(
  actions: ReadonlyArray<LxmfSendMethodAction>,
): boolean {
  return hasActionOfKind(actions, "send-propagated");
}

/** Whether step actions reject an unsupported delivery method. */
export function shouldRejectLxmfSendUnsupported(
  actions: ReadonlyArray<LxmfSendMethodAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unsupported");
}

/** Unsupported method code from a reject-unsupported action, if present. */
export function lxmfSendUnsupportedMethod(
  actions: ReadonlyArray<LxmfSendMethodAction>,
): number | null {
  for (const action of actions) {
    if (action.kind === "reject-unsupported") {
      return action.method;
    }
  }
  return null;
}

function stepLxmfSendMethodInner(
  state: LxmfSendMethodState,
  event: LxmfSendMethodEvent,
): LxmfSendMethodStepResult {
  if (event.kind === "send/dispatch") {
    const planActions = stepLxmfSendMethodPlanWithActions(
      initialLxmfSendMethodPlanState(),
      {
        kind: "send/plan-gate",
        packed: event.packed,
        method: event.method,
      },
    ).actions;
    if (shouldRejectLxmfSendMethodPlanUnpacked(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-unpacked" }] };
    }
    if (shouldPlanLxmfSendMethodOpportunistic(planActions)) {
      return { state, intents: [], actions: [{ kind: "send-opportunistic" }] };
    }
    if (shouldPlanLxmfSendMethodDirect(planActions)) {
      return { state, intents: [], actions: [{ kind: "send-direct" }] };
    }
    if (shouldPlanLxmfSendMethodPropagated(planActions)) {
      return { state, intents: [], actions: [{ kind: "send-propagated" }] };
    }
    if (!shouldRejectLxmfSendMethodPlanUnsupported(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "reject-unsupported", method: event.method }],
    };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfDirectSendPlan =
  "ok" | "missing-destination" | "missing-packed";

/** Whether DIRECT send may proceed (destination identity + packed envelope). */
export function planLxmfDirectSend(input: {
  readonly destinationPresent: boolean;
  readonly destinationIdentityPresent: boolean;
  readonly packed: boolean;
}): LxmfDirectSendPlan {
  if (!input.destinationPresent || !input.destinationIdentityPresent) {
    return "missing-destination";
  }
  if (!input.packed) {
    return "missing-packed";
  }
  return "ok";
}

export type LxmfDirectSendPlanEvent =
  | Event
  | {
      readonly kind: "direct-send/plan-gate";
      readonly destinationPresent: boolean;
      readonly destinationIdentityPresent: boolean;
      readonly packed: boolean;
    };

export type LxmfDirectSendPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-destination" }
  | { readonly kind: "missing-packed" };

/** Whether plan actions allow DIRECT send to proceed. */
export function shouldPlanLxmfDirectSendOk(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

/** Whether plan actions reject a missing destination / identity. */
export function shouldRejectLxmfDirectSendPlanMissingDestination(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "missing-destination");
}

/** Whether plan actions reject a missing packed envelope. */
export function shouldRejectLxmfDirectSendPlanMissingPacked(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "missing-packed");
}

export type LxmfDirectSendEvent =
  | Event
  | {
      readonly kind: "direct-send/gate";
      readonly destinationPresent: boolean;
      readonly destinationIdentityPresent: boolean;
      readonly packed: boolean;
    };
