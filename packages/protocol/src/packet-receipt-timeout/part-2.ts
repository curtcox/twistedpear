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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { shouldKeepOutboundReceipt } from "./part-1.js";
import type {
  KeepOutboundReceiptAction,
  KeepOutboundReceiptEvent,
  KeepOutboundReceiptState,
  KeepOutboundReceiptStepResult,
} from "./part-1.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function stepKeepOutboundReceiptWithActions(
  state: KeepOutboundReceiptState,
  event: KeepOutboundReceiptEvent,
): KeepOutboundReceiptStepResult {
  if (event.kind === "receipt/keep-outbound-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldKeepOutboundReceipt({
            planKeep: event.planKeep,
            sent: event.sent,
          })
            ? "keep"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldKeepOutboundReceiptNow(
  actions: ReadonlyArray<KeepOutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "keep");
}

export function shouldSkipKeepOutboundReceipt(
  actions: ReadonlyArray<KeepOutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export type PacketReceiptProofIngressPlan = "remove-receipt" | "continue";

/**
 * After `planProofIngressKind === "receipt"`: whether this receipt may be removed.
 * Identity recall + validateProofPacket stay at the adapter edge as booleans.
 */
export function planPacketReceiptProofIngress(input: {
  readonly truncatedHashMatches: boolean;
  readonly identityPresent: boolean;
  readonly proofAccepted: boolean;
}): PacketReceiptProofIngressPlan {
  if (
    input.truncatedHashMatches &&
    input.identityPresent &&
    input.proofAccepted
  ) {
    return "remove-receipt";
  }
  return "continue";
}

/**
 * Packet-receipt proof ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptProofIngress` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketReceiptProofIngressWithActions}.
 */
export type PacketReceiptProofIngressPlanState = Record<string, never>;

export type PacketReceiptProofIngressPlanEvent =
  | Event
  | {
      readonly kind: "receipt/proof-ingress-plan-gate";
      readonly truncatedHashMatches: boolean;
      readonly identityPresent: boolean;
      readonly proofAccepted: boolean;
    };

export type PacketReceiptProofIngressPlanAction = {
  readonly kind: PacketReceiptProofIngressPlan;
};

export interface PacketReceiptProofIngressPlanStepResult {
  readonly state: PacketReceiptProofIngressPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofIngressPlanAction[];
}

export function initialPacketReceiptProofIngressPlanState(): PacketReceiptProofIngressPlanState {
  return {};
}

export function stepPacketReceiptProofIngressPlanWithActions(
  state: PacketReceiptProofIngressPlanState,
  event: PacketReceiptProofIngressPlanEvent,
): PacketReceiptProofIngressPlanStepResult {
  if (event.kind === "receipt/proof-ingress-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPacketReceiptProofIngress({
            truncatedHashMatches: event.truncatedHashMatches,
            identityPresent: event.identityPresent,
            proofAccepted: event.proofAccepted,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the packet-receipt proof ingress plan from actions; null when empty. */
export function packetReceiptProofIngressPlanFromActions(
  actions: ReadonlyArray<PacketReceiptProofIngressPlanAction>,
): PacketReceiptProofIngressPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldRemovePacketReceiptProofIngressPlan(
  actions: ReadonlyArray<PacketReceiptProofIngressPlanAction>,
): boolean {
  return hasActionOfKind(actions, "remove-receipt");
}

export function shouldContinuePacketReceiptProofIngressPlan(
  actions: ReadonlyArray<PacketReceiptProofIngressPlanAction>,
): boolean {
  return hasActionOfKind(actions, "continue");
}

/**
 * Unregister a packet receipt from the transport receipt list.
 * Splice stays at the adapter.
 */
export function planUnregisterPacketReceipt(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterPacketReceipt}. */
export function shouldUnregisterPacketReceipt(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Packet-receipt unregister plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPacketReceipt` reads beside the step). Nested under
 * {@link stepPacketReceiptUnregisterWithActions}.
 */
export type PacketReceiptUnregisterPlanState = Record<string, never>;

export type PacketReceiptUnregisterPlanEvent =
  | Event
  | {
      readonly kind: "receipt/unregister-plan-gate";
      readonly index: number;
    };

export type PacketReceiptUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface PacketReceiptUnregisterPlanStepResult {
  readonly state: PacketReceiptUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptUnregisterPlanAction[];
}

export function initialPacketReceiptUnregisterPlanState(): PacketReceiptUnregisterPlanState {
  return {};
}

export function stepPacketReceiptUnregisterPlanWithActions(
  state: PacketReceiptUnregisterPlanState,
  event: PacketReceiptUnregisterPlanEvent,
): PacketReceiptUnregisterPlanStepResult {
  if (event.kind === "receipt/unregister-plan-gate") {
    const index = planUnregisterPacketReceipt(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function packetReceiptUnregisterPlanIndex(
  actions: ReadonlyArray<PacketReceiptUnregisterPlanAction>,
): number | null {
  return firstActionOfKind(actions, "remove")?.index ?? null;
}

export function shouldRemovePacketReceiptUnregisterPlan(
  actions: ReadonlyArray<PacketReceiptUnregisterPlanAction>,
): boolean {
  return hasActionOfKind(actions, "remove");
}

/**
 * Packet-receipt unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPacketReceipt` reads beside the step).
 * Plan nested via {@link stepPacketReceiptUnregisterPlanWithActions} (`remove`).
 */
export type PacketReceiptUnregisterState = Record<string, never>;

export type PacketReceiptUnregisterEvent =
  | Event
  | {
      readonly kind: "receipt/unregister-gate";
      readonly index: number;
    };

export type PacketReceiptUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface PacketReceiptUnregisterStepResult {
  readonly state: PacketReceiptUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptUnregisterAction[];
}

export function initialPacketReceiptUnregisterState(): PacketReceiptUnregisterState {
  return {};
}

export function stepPacketReceiptUnregisterWithActions(
  state: PacketReceiptUnregisterState,
  event: PacketReceiptUnregisterEvent,
): PacketReceiptUnregisterStepResult {
  if (event.kind === "receipt/unregister-gate") {
    const planActions = stepPacketReceiptUnregisterPlanWithActions(
      initialPacketReceiptUnregisterPlanState(),
      {
        kind: "receipt/unregister-plan-gate",
        index: event.index,
      },
    ).actions;
    const index = packetReceiptUnregisterPlanIndex(planActions);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function packetReceiptUnregisterIndex(
  actions: ReadonlyArray<PacketReceiptUnregisterAction>,
): number | null {
  return firstActionOfKind(actions, "remove")?.index ?? null;
}

export function shouldRemovePacketReceipt(
  actions: ReadonlyArray<PacketReceiptUnregisterAction>,
): boolean {
  return hasActionOfKind(actions, "remove");
}

/** Whether an outbound send should create and register a packet receipt. */
export function shouldRegisterPacketReceipt(createReceipt: boolean): boolean {
  return createReceipt;
}

/**
 * Packet-receipt register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterPacketReceipt` reads beside the step).
 */
export type RegisterPacketReceiptState = Record<string, never>;

export type RegisterPacketReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/register-gate";
      readonly createReceipt: boolean;
    };

export type RegisterPacketReceiptAction =
  { readonly kind: "register" } | { readonly kind: "skip" };

export interface RegisterPacketReceiptStepResult {
  readonly state: RegisterPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterPacketReceiptAction[];
}

export function initialRegisterPacketReceiptState(): RegisterPacketReceiptState {
  return {};
}

export function stepRegisterPacketReceiptWithActions(
  state: RegisterPacketReceiptState,
  event: RegisterPacketReceiptEvent,
): RegisterPacketReceiptStepResult {
  if (event.kind === "receipt/register-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterPacketReceipt(event.createReceipt)
            ? "register"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterPacketReceiptNow(
  actions: ReadonlyArray<RegisterPacketReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "register");
}

export function shouldSkipRegisterPacketReceipt(
  actions: ReadonlyArray<RegisterPacketReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export type PacketReceiptCallbackPlan = "clear" | "set";

/** Whether a packet-receipt timeout/delivery callback should be cleared or assigned. */
export function planPacketReceiptCallback(
  callbackPresent: boolean,
): PacketReceiptCallbackPlan {
  return callbackPresent ? "set" : "clear";
}

export type PacketReceiptCallbackPlanEvent =
  | Event
  | {
      readonly kind: "receipt/callback-plan-gate";
      readonly callbackPresent: boolean;
    };

export type PacketReceiptCallbackPlanAction = {
  readonly kind: PacketReceiptCallbackPlan;
};

/** Extract the packet-receipt callback plan from actions; null when empty. */
export function packetReceiptCallbackPlanFromActions(
  actions: ReadonlyArray<PacketReceiptCallbackPlanAction>,
): PacketReceiptCallbackPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export type PacketReceiptCallbackEvent =
  | Event
  | {
      readonly kind: "receipt/callback-gate";
      readonly callbackPresent: boolean;
    };

export type PacketReceiptCallbackAction =
  { readonly kind: "clear" } | { readonly kind: "set" };

/**
 * Packet-receipt proof ingress is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketReceiptProofIngressPlanWithActions}
 * (`remove-receipt`|`continue`).
 */
export type PacketReceiptProofIngressState = Record<string, never>;

export type PacketReceiptProofIngressEvent =
  | Event
  | {
      readonly kind: "receipt/proof-ingress-gate";
      readonly truncatedHashMatches: boolean;
      readonly identityPresent: boolean;
      readonly proofAccepted: boolean;
    };

export type PacketReceiptProofIngressAction = {
  readonly kind: PacketReceiptProofIngressPlan;
};

export interface PacketReceiptProofIngressStepResult {
  readonly state: PacketReceiptProofIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofIngressAction[];
}

export function stepPacketReceiptProofIngressWithActions(
  state: PacketReceiptProofIngressState,
  event: PacketReceiptProofIngressEvent,
): PacketReceiptProofIngressStepResult {
  return stepPacketReceiptProofIngressInner(state, event);
}

export function stepPacketReceiptProofIngressInner(
  state: PacketReceiptProofIngressState,
  event: PacketReceiptProofIngressEvent,
): PacketReceiptProofIngressStepResult {
  if (event.kind === "receipt/proof-ingress-gate") {
    const planActions = stepPacketReceiptProofIngressPlanWithActions(
      initialPacketReceiptProofIngressPlanState(),
      {
        kind: "receipt/proof-ingress-plan-gate",
        truncatedHashMatches: event.truncatedHashMatches,
        identityPresent: event.identityPresent,
        proofAccepted: event.proofAccepted,
      },
    ).actions;
    const plan = packetReceiptProofIngressPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
