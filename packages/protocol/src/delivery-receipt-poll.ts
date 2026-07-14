/**
 * Pure delivery-receipt poll loop for LXMF opportunistic/propagated sends.
 * Time arrives only via event.at; adapters schedule from timer intents,
 * observe receipt status only when the machine emits a probe action, and
 * conclude the Promise shell only via resolve actions.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

/** Mirrors reticulum PacketReceiptStatus values used by the poll loop. */
export const ReceiptPollStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
} as const;

export type ReceiptPollStatusValue = (typeof ReceiptPollStatus)[keyof typeof ReceiptPollStatus];

export const DELIVERY_RECEIPT_POLL_INTERVAL_MS = 10;
export const DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS = 500;
export const DELIVERY_RECEIPT_POLL_TIMER_ID = "delivery-poll";

export interface DeliveryReceiptPollState {
  readonly armed: boolean;
  readonly deadlineMs: number;
  readonly receiptStatus: ReceiptPollStatusValue;
  readonly concluded: boolean;
}

export type DeliveryReceiptPollEvent =
  | Event
  | { readonly kind: "poll/arm"; readonly at: number; readonly timeoutMs: number }
  | {
      readonly kind: "poll/receipt-status";
      readonly status: ReceiptPollStatusValue;
      readonly at: number;
    };

export type DeliveryReceiptPollAction =
  | { readonly kind: "probe" }
  | { readonly kind: "resolve"; readonly status: ReceiptPollStatusValue };

export interface DeliveryReceiptPollStepResult {
  readonly state: DeliveryReceiptPollState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliveryReceiptPollAction[];
}

export function initialDeliveryReceiptPollState(): DeliveryReceiptPollState {
  return {
    armed: false,
    deadlineMs: 0,
    receiptStatus: ReceiptPollStatus.SENT,
    concluded: false
  };
}

export function isTerminalReceiptStatus(status: ReceiptPollStatusValue): boolean {
  return status === ReceiptPollStatus.DELIVERED || status === ReceiptPollStatus.FAILED;
}

/** Whether the delivery-receipt poll should keep probing. */
export function shouldContinueDeliveryReceiptPoll(concluded: boolean): boolean {
  return !concluded;
}

export const stepDeliveryReceiptPoll: StepFn<DeliveryReceiptPollState> = (state, event) => {
  const result = stepDeliveryReceiptPollInner(state, event as DeliveryReceiptPollEvent);
  return { state: result.state, intents: result.intents };
};

export function stepDeliveryReceiptPollWithActions(
  state: DeliveryReceiptPollState,
  event: DeliveryReceiptPollEvent
): DeliveryReceiptPollStepResult {
  return stepDeliveryReceiptPollInner(state, event);
}

function stepDeliveryReceiptPollInner(
  state: DeliveryReceiptPollState,
  event: DeliveryReceiptPollEvent
): DeliveryReceiptPollStepResult {
  if (event.kind === "poll/arm") {
    return {
      state: {
        armed: true,
        deadlineMs: event.at + event.timeoutMs,
        receiptStatus: ReceiptPollStatus.SENT,
        concluded: false
      },
      intents: [],
      actions: [{ kind: "probe" }]
    };
  }

  if (event.kind === "poll/receipt-status") {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    if (isTerminalReceiptStatus(event.status)) {
      return {
        state: { ...state, receiptStatus: event.status, concluded: true },
        intents: [{ kind: "timer/cancel", timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID } }],
        actions: [{ kind: "resolve", status: event.status }]
      };
    }
    if (event.at >= state.deadlineMs) {
      return {
        state: { ...state, receiptStatus: event.status, concluded: true },
        intents: [{ kind: "timer/cancel", timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID } }],
        actions: [{ kind: "resolve", status: event.status }]
      };
    }
    return {
      state: { ...state, receiptStatus: event.status },
      intents: [
        {
          kind: "timer/set",
          timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID, delayMs: DELIVERY_RECEIPT_POLL_INTERVAL_MS }
        }
      ],
      actions: []
    };
  }

  if (event.kind === "timer/fired" && event.id === DELIVERY_RECEIPT_POLL_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "probe" }]
    };
  }

  return { state, intents: [], actions: [] };
}
