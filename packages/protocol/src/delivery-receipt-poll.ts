/**
 * Pure delivery-receipt poll loop for LXMF opportunistic/propagated sends.
 * Time arrives only via event.at; adapters schedule from timer intents.
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
  | { readonly kind: "poll/receipt-status"; readonly status: ReceiptPollStatusValue };

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

export const stepDeliveryReceiptPoll: StepFn<DeliveryReceiptPollState> = (state, event) =>
  stepDeliveryReceiptPollInner(state, event as DeliveryReceiptPollEvent);

function stepDeliveryReceiptPollInner(
  state: DeliveryReceiptPollState,
  event: DeliveryReceiptPollEvent
): { state: DeliveryReceiptPollState; intents: Intent[] } {
  if (event.kind === "poll/arm") {
    return {
      state: {
        armed: true,
        deadlineMs: event.at + event.timeoutMs,
        receiptStatus: ReceiptPollStatus.SENT,
        concluded: false
      },
      intents: [
        {
          kind: "timer/set",
          timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID, delayMs: DELIVERY_RECEIPT_POLL_INTERVAL_MS }
        }
      ]
    };
  }

  if (event.kind === "poll/receipt-status") {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    if (isTerminalReceiptStatus(event.status)) {
      return {
        state: { ...state, receiptStatus: event.status, concluded: true },
        intents: [{ kind: "timer/cancel", timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID } }]
      };
    }
    return { state: { ...state, receiptStatus: event.status }, intents: [] };
  }

  if (event.kind === "timer/fired" && event.id === DELIVERY_RECEIPT_POLL_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    if (isTerminalReceiptStatus(state.receiptStatus) || event.at >= state.deadlineMs) {
      return { state: { ...state, concluded: true }, intents: [] };
    }
    return {
      state,
      intents: [
        {
          kind: "timer/set",
          timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID, delayMs: DELIVERY_RECEIPT_POLL_INTERVAL_MS }
        }
      ]
    };
  }

  return { state, intents: [] };
}
