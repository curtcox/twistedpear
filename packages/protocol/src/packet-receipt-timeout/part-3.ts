/** Extracted from packet-receipt-timeout.ts; the original module remains the public composition point. */
/**
 * Pure packet-receipt timeout conclusion.
 * Adapters schedule/cancel clocks from timer intents and invoke
 * delivery/timeout callbacks only via machine actions (no ad-hoc
 * `state.timedOut` reads beside the step).
 * Register / keep / fail-and-drop gates conclude via machine actions (no
 * ad-hoc `shouldRegisterPacketReceipt` / `shouldKeepOutboundReceipt` /
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 * Outbound-receipt / packet-receipt-proof-ingress / packet-receipt-callback /
 * packet-receipt-unregister plans nested via
 * {@link stepOutboundReceiptPlanWithActions} /
 * {@link stepPacketReceiptProofIngressPlanWithActions} /
 * {@link stepPacketReceiptCallbackPlanWithActions} /
 * {@link stepPacketReceiptUnregisterPlanWithActions}.
 */
import type { Intent, StepFn } from "@twistedpear/effects";
import { stepOutboundReceiptInner } from "./part-1.js";
import {
  packetReceiptCallbackPlanFromActions,
  planPacketReceiptCallback,
  stepPacketReceiptProofIngressInner,
} from "./part-2.js";
import type {
  OutboundReceiptAction,
  OutboundReceiptEvent,
  OutboundReceiptOutcome,
  OutboundReceiptState,
  PacketReceiptTimeoutAction,
} from "./part-1.js";
import type {
  PacketReceiptCallbackAction,
  PacketReceiptCallbackEvent,
  PacketReceiptCallbackPlanAction,
  PacketReceiptCallbackPlanEvent,
  PacketReceiptProofIngressAction,
  PacketReceiptProofIngressEvent,
  PacketReceiptProofIngressPlan,
  PacketReceiptProofIngressState,
} from "./part-2.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Packet-receipt callback plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptCallback` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketReceiptCallbackWithActions}.
 */
export type PacketReceiptCallbackPlanState = Record<string, never>;

export interface PacketReceiptCallbackPlanStepResult {
  readonly state: PacketReceiptCallbackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptCallbackPlanAction[];
}

export function initialPacketReceiptCallbackPlanState(): PacketReceiptCallbackPlanState {
  return {};
}

export function stepPacketReceiptCallbackPlanWithActions(
  state: PacketReceiptCallbackPlanState,
  event: PacketReceiptCallbackPlanEvent,
): PacketReceiptCallbackPlanStepResult {
  if (event.kind === "receipt/callback-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planPacketReceiptCallback(event.callbackPresent) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClearPacketReceiptCallbackPlan(
  actions: ReadonlyArray<PacketReceiptCallbackPlanAction>,
): boolean {
  return hasActionOfKind(actions, "clear");
}

export function shouldSetPacketReceiptCallbackPlan(
  actions: ReadonlyArray<PacketReceiptCallbackPlanAction>,
): boolean {
  return hasActionOfKind(actions, "set");
}

/**
 * Packet-receipt callback assignment is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptCallback`
 * / `plan === "clear"` reads beside the step).
 * Plan nested via {@link stepPacketReceiptCallbackPlanWithActions} (`clear`|`set`).
 */
export type PacketReceiptCallbackState = Record<string, never>;

export interface PacketReceiptCallbackStepResult {
  readonly state: PacketReceiptCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptCallbackAction[];
}

export function initialPacketReceiptCallbackState(): PacketReceiptCallbackState {
  return {};
}

export function stepPacketReceiptCallbackWithActions(
  state: PacketReceiptCallbackState,
  event: PacketReceiptCallbackEvent,
): PacketReceiptCallbackStepResult {
  if (event.kind === "receipt/callback-gate") {
    const planActions = stepPacketReceiptCallbackPlanWithActions(
      initialPacketReceiptCallbackPlanState(),
      {
        kind: "receipt/callback-plan-gate",
        callbackPresent: event.callbackPresent,
      },
    ).actions;
    const plan = packetReceiptCallbackPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClearPacketReceiptCallback(
  actions: ReadonlyArray<PacketReceiptCallbackAction>,
): boolean {
  return hasActionOfKind(actions, "clear");
}

export function shouldSetPacketReceiptCallback(
  actions: ReadonlyArray<PacketReceiptCallbackAction>,
): boolean {
  return hasActionOfKind(actions, "set");
}

/** Whether step actions include a timeout/delivery/failed fanout for the adapter callback. */
export function shouldInvokePacketReceiptAction(
  actions: ReadonlyArray<PacketReceiptTimeoutAction>,
  kind: PacketReceiptTimeoutAction["kind"],
): boolean {
  return actions.some((action) => action.kind === kind);
}

/** Whether the adapter should invoke the timeout callback after a timed-out step. */
export function shouldInvokePacketReceiptTimeoutCallback(
  actions: ReadonlyArray<PacketReceiptTimeoutAction>,
): boolean {
  return shouldInvokePacketReceiptAction(actions, "timeout");
}

export function initialOutboundReceiptState(): OutboundReceiptState {
  return {};
}

export const stepOutboundReceipt: StepFn<OutboundReceiptState> = (
  state,
  event,
) => {
  const result = stepOutboundReceiptInner(state, event as OutboundReceiptEvent);
  return { state: result.state, intents: result.intents };
};

export function outboundReceiptOutcomeFromActions(
  actions: ReadonlyArray<OutboundReceiptAction>,
): OutboundReceiptOutcome | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldOutboundReceiptNone(
  actions: ReadonlyArray<OutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "none");
}

export function shouldOutboundKeepReceipt(
  actions: ReadonlyArray<OutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "keep-receipt");
}

export function shouldOutboundFailAndDropReceipt(
  actions: ReadonlyArray<OutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "fail-and-drop-receipt");
}

export function initialPacketReceiptProofIngressState(): PacketReceiptProofIngressState {
  return {};
}

export const stepPacketReceiptProofIngress: StepFn<
  PacketReceiptProofIngressState
> = (state, event) => {
  const result = stepPacketReceiptProofIngressInner(
    state,
    event as PacketReceiptProofIngressEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function packetReceiptProofIngressFromActions(
  actions: ReadonlyArray<PacketReceiptProofIngressAction>,
): PacketReceiptProofIngressPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldRemovePacketReceiptProofIngress(
  actions: ReadonlyArray<PacketReceiptProofIngressAction>,
): boolean {
  return hasActionOfKind(actions, "remove-receipt");
}

export function shouldContinuePacketReceiptProofIngress(
  actions: ReadonlyArray<PacketReceiptProofIngressAction>,
): boolean {
  return hasActionOfKind(actions, "continue");
}
