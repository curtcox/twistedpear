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
import { hasActionOfKind } from "../action-kind.js";

export const RECEIPT_TIMEOUT_TIMER_ID = "receipt-timeout";

export const PacketReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff,
} as const;

export type PacketReceiptStatusValue =
  (typeof PacketReceiptStatus)[keyof typeof PacketReceiptStatus];

export interface PacketReceiptTimeoutState {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly concludedAt: number | null;
  readonly timedOut: boolean;
}

export type PacketReceiptTimeoutEvent =
  | Event
  | {
      readonly kind: "receipt/arm";
      readonly at: number;
      readonly timeoutSeconds: number;
    }
  | { readonly kind: "receipt/delivered"; readonly at: number }
  | { readonly kind: "receipt/failed"; readonly at: number }
  | { readonly kind: "receipt/check"; readonly at: number };

export type PacketReceiptTimeoutAction =
  | { readonly kind: "timeout" }
  | { readonly kind: "delivered" }
  | { readonly kind: "failed" };

export interface PacketReceiptTimeoutStepResult {
  readonly state: PacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptTimeoutAction[];
}

export function initialPacketReceiptTimeoutState(): PacketReceiptTimeoutState {
  return {
    status: PacketReceiptStatus.SENT,
    timeoutAt: null,
    concludedAt: null,
    timedOut: false,
  };
}

export function checkPacketReceiptTimeout(input: {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly nowSeconds: number;
}): {
  readonly timedOut: boolean;
  readonly status: PacketReceiptStatusValue;
  readonly concludedAt: number | null;
} {
  if (
    input.status === PacketReceiptStatus.DELIVERED ||
    input.status === PacketReceiptStatus.FAILED
  ) {
    return { timedOut: false, status: input.status, concludedAt: null };
  }

  if (input.timeoutAt !== null && input.nowSeconds >= input.timeoutAt) {
    return {
      timedOut: true,
      status: PacketReceiptStatus.FAILED,
      concludedAt: input.nowSeconds,
    };
  }

  return { timedOut: false, status: input.status, concludedAt: null };
}

/** Whether a packet-receipt timeout timer should be armed from intents. */
export function shouldArmPacketReceiptTimeoutTimer(
  timeoutSeconds: number,
): boolean {
  return timeoutSeconds > 0;
}

export const stepPacketReceiptTimeout: StepFn<PacketReceiptTimeoutState> = (
  state,
  event,
) => {
  const result = stepPacketReceiptTimeoutInner(
    state,
    event as PacketReceiptTimeoutEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepPacketReceiptTimeoutWithActions(
  state: PacketReceiptTimeoutState,
  event: PacketReceiptTimeoutEvent,
): PacketReceiptTimeoutStepResult {
  return stepPacketReceiptTimeoutInner(state, event);
}

function idleReceiptTimeoutResult(
  state: PacketReceiptTimeoutState,
): PacketReceiptTimeoutStepResult {
  return { state, intents: [], actions: [] };
}

function cancelReceiptTimerIntent(): Intent {
  return { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } };
}

function stepReceiptArm(
  event: Extract<PacketReceiptTimeoutEvent, { kind: "receipt/arm" }>,
): PacketReceiptTimeoutStepResult {
  const intents: Intent[] = [cancelReceiptTimerIntent()];
  if (shouldArmPacketReceiptTimeoutTimer(event.timeoutSeconds)) {
    intents.push({
      kind: "timer/set",
      timer: {
        id: RECEIPT_TIMEOUT_TIMER_ID,
        delayMs: event.timeoutSeconds * 1000,
      },
    });
  }
  return {
    state: {
      status: PacketReceiptStatus.SENT,
      timeoutAt: event.at + event.timeoutSeconds,
      concludedAt: null,
      timedOut: false,
    },
    intents,
    actions: [],
  };
}

function stepReceiptFailed(
  state: PacketReceiptTimeoutState,
  event: Extract<PacketReceiptTimeoutEvent, { kind: "receipt/failed" }>,
): PacketReceiptTimeoutStepResult {
  if (
    state.status === PacketReceiptStatus.DELIVERED ||
    state.status === PacketReceiptStatus.FAILED
  ) {
    return idleReceiptTimeoutResult(state);
  }
  return {
    state: {
      ...state,
      status: PacketReceiptStatus.FAILED,
      concludedAt: event.at,
      timedOut: false,
    },
    intents: [cancelReceiptTimerIntent()],
    actions: [{ kind: "failed" }],
  };
}

function stepReceiptTimeoutCheck(
  state: PacketReceiptTimeoutState,
  nowSeconds: number,
  cancelTimer: boolean,
): PacketReceiptTimeoutStepResult {
  const result = checkPacketReceiptTimeout({
    status: state.status,
    timeoutAt: state.timeoutAt,
    nowSeconds,
  });
  if (!result.timedOut) {
    return { state: { ...state, timedOut: false }, intents: [], actions: [] };
  }
  return {
    state: {
      status: result.status,
      timeoutAt: state.timeoutAt,
      concludedAt: result.concludedAt,
      timedOut: true,
    },
    intents: cancelTimer ? [cancelReceiptTimerIntent()] : [],
    actions: [{ kind: "timeout" }],
  };
}

function stepPacketReceiptTimeoutInner(
  state: PacketReceiptTimeoutState,
  event: PacketReceiptTimeoutEvent,
): PacketReceiptTimeoutStepResult {
  if (event.kind === "receipt/arm") {
    return stepReceiptArm(event);
  }
  if (event.kind === "receipt/delivered") {
    return {
      state: {
        ...state,
        status: PacketReceiptStatus.DELIVERED,
        concludedAt: event.at,
        timedOut: false,
      },
      intents: [cancelReceiptTimerIntent()],
      actions: [{ kind: "delivered" }],
    };
  }
  if (event.kind === "receipt/failed") {
    return stepReceiptFailed(state, event);
  }
  if (event.kind === "receipt/check") {
    return stepReceiptTimeoutCheck(state, event.at, true);
  }
  if (event.kind === "timer/fired" && event.id === RECEIPT_TIMEOUT_TIMER_ID) {
    return stepReceiptTimeoutCheck(state, event.at / 1000, false);
  }
  return idleReceiptTimeoutResult(state);
}

export type OutboundReceiptOutcome =
  "none" | "keep-receipt" | "fail-and-drop-receipt";

/**
 * After outbound transmit: whether a created receipt is kept, failed+dropped, or unused.
 * Receipt construction / markFailed / splice stay at the adapter edge.
 */
export function planOutboundReceiptOutcome(input: {
  readonly createReceipt: boolean;
  readonly sent: boolean;
}): OutboundReceiptOutcome {
  if (!input.createReceipt) {
    return "none";
  }
  if (input.sent) {
    return "keep-receipt";
  }
  return "fail-and-drop-receipt";
}

/**
 * Outbound receipt outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planOutboundReceiptOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepOutboundReceiptWithActions}.
 */
export type OutboundReceiptPlanState = Record<string, never>;

export type OutboundReceiptPlanEvent =
  | Event
  | {
      readonly kind: "receipt/outbound-plan-gate";
      readonly createReceipt: boolean;
      readonly sent: boolean;
    };

export type OutboundReceiptPlanAction = {
  readonly kind: OutboundReceiptOutcome;
};

export interface OutboundReceiptPlanStepResult {
  readonly state: OutboundReceiptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OutboundReceiptPlanAction[];
}

export function initialOutboundReceiptPlanState(): OutboundReceiptPlanState {
  return {};
}

export function stepOutboundReceiptPlanWithActions(
  state: OutboundReceiptPlanState,
  event: OutboundReceiptPlanEvent,
): OutboundReceiptPlanStepResult {
  if (event.kind === "receipt/outbound-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planOutboundReceiptOutcome({
            createReceipt: event.createReceipt,
            sent: event.sent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the outbound receipt plan from actions; null when empty. */
export function outboundReceiptPlanFromActions(
  actions: ReadonlyArray<OutboundReceiptPlanAction>,
): OutboundReceiptOutcome | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldOutboundReceiptNonePlan(
  actions: ReadonlyArray<OutboundReceiptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "none");
}

export function shouldOutboundKeepReceiptPlan(
  actions: ReadonlyArray<OutboundReceiptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "keep-receipt");
}

export function shouldOutboundFailAndDropReceiptPlan(
  actions: ReadonlyArray<OutboundReceiptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "fail-and-drop-receipt");
}

/** Whether outbound send should fail+drop a created receipt after transmit failure. */
export function shouldFailAndDropOutboundReceipt(input: {
  readonly failAndDrop: boolean;
  readonly receiptPresent: boolean;
}): boolean {
  return input.failAndDrop && input.receiptPresent;
}

/**
 * Outbound fail-and-drop gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 */
export type FailAndDropOutboundReceiptState = Record<string, never>;

export type FailAndDropOutboundReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/fail-and-drop-gate";
      readonly failAndDrop: boolean;
      readonly receiptPresent: boolean;
    };

export type FailAndDropOutboundReceiptAction =
  { readonly kind: "fail-and-drop" } | { readonly kind: "skip" };

export interface FailAndDropOutboundReceiptStepResult {
  readonly state: FailAndDropOutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FailAndDropOutboundReceiptAction[];
}

export function initialFailAndDropOutboundReceiptState(): FailAndDropOutboundReceiptState {
  return {};
}

export function stepFailAndDropOutboundReceiptWithActions(
  state: FailAndDropOutboundReceiptState,
  event: FailAndDropOutboundReceiptEvent,
): FailAndDropOutboundReceiptStepResult {
  if (event.kind === "receipt/fail-and-drop-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldFailAndDropOutboundReceipt({
            failAndDrop: event.failAndDrop,
            receiptPresent: event.receiptPresent,
          })
            ? "fail-and-drop"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldFailAndDropOutboundReceiptNow(
  actions: ReadonlyArray<FailAndDropOutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "fail-and-drop");
}

export function shouldSkipFailAndDropOutboundReceipt(
  actions: ReadonlyArray<FailAndDropOutboundReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Whether outbound send should return a kept receipt after outbound-outcome
 * actions say keep and the transmit succeeded.
 */
export function shouldKeepOutboundReceipt(input: {
  readonly planKeep: boolean;
  readonly sent: boolean;
}): boolean {
  return input.planKeep && input.sent;
}

/**
 * Outbound keep-receipt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldKeepOutboundReceipt`
 * reads beside the step).
 */
export type KeepOutboundReceiptState = Record<string, never>;

export type KeepOutboundReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/keep-outbound-gate";
      readonly planKeep: boolean;
      readonly sent: boolean;
    };

export type KeepOutboundReceiptAction =
  { readonly kind: "keep" } | { readonly kind: "skip" };

export interface KeepOutboundReceiptStepResult {
  readonly state: KeepOutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly KeepOutboundReceiptAction[];
}

export function initialKeepOutboundReceiptState(): KeepOutboundReceiptState {
  return {};
}

/**
 * Outbound receipt outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepOutboundReceiptPlanWithActions}
 * (`none`|`keep-receipt`|`fail-and-drop-receipt`).
 */
export type OutboundReceiptState = Record<string, never>;

export type OutboundReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/outbound-gate";
      readonly createReceipt: boolean;
      readonly sent: boolean;
    };

export type OutboundReceiptAction = {
  readonly kind: OutboundReceiptOutcome;
};

export interface OutboundReceiptStepResult {
  readonly state: OutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OutboundReceiptAction[];
}

export function stepOutboundReceiptWithActions(
  state: OutboundReceiptState,
  event: OutboundReceiptEvent,
): OutboundReceiptStepResult {
  return stepOutboundReceiptInner(state, event);
}

export function stepOutboundReceiptInner(
  state: OutboundReceiptState,
  event: OutboundReceiptEvent,
): OutboundReceiptStepResult {
  if (event.kind === "receipt/outbound-gate") {
    const planActions = stepOutboundReceiptPlanWithActions(
      initialOutboundReceiptPlanState(),
      {
        kind: "receipt/outbound-plan-gate",
        createReceipt: event.createReceipt,
        sent: event.sent,
      },
    ).actions;
    const plan = outboundReceiptPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
