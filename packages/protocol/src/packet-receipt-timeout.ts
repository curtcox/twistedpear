/**
 * Pure packet-receipt timeout conclusion.
 * Adapters own callbacks/timers; this only decides FAILED transitions.
 */
import type { Event, StepFn } from "@twistedpear/effects";

export const PacketReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
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
  | { readonly kind: "receipt/arm"; readonly at: number; readonly timeoutSeconds: number }
  | { readonly kind: "receipt/delivered"; readonly at: number }
  | { readonly kind: "receipt/check"; readonly at: number };

export function initialPacketReceiptTimeoutState(): PacketReceiptTimeoutState {
  return {
    status: PacketReceiptStatus.SENT,
    timeoutAt: null,
    concludedAt: null,
    timedOut: false
  };
}

export function checkPacketReceiptTimeout(input: {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly nowSeconds: number;
}): { readonly timedOut: boolean; readonly status: PacketReceiptStatusValue; readonly concludedAt: number | null } {
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
      concludedAt: input.nowSeconds
    };
  }

  return { timedOut: false, status: input.status, concludedAt: null };
}

export const stepPacketReceiptTimeout: StepFn<PacketReceiptTimeoutState> = (state, event) =>
  stepPacketReceiptTimeoutInner(state, event as PacketReceiptTimeoutEvent);

function stepPacketReceiptTimeoutInner(
  state: PacketReceiptTimeoutState,
  event: PacketReceiptTimeoutEvent
): { state: PacketReceiptTimeoutState; intents: [] } {
  if (event.kind === "receipt/arm") {
    return {
      state: {
        status: PacketReceiptStatus.SENT,
        timeoutAt: event.at + event.timeoutSeconds,
        concludedAt: null,
        timedOut: false
      },
      intents: []
    };
  }

  if (event.kind === "receipt/delivered") {
    return {
      state: {
        ...state,
        status: PacketReceiptStatus.DELIVERED,
        concludedAt: event.at,
        timedOut: false
      },
      intents: []
    };
  }

  if (event.kind === "receipt/check" || (event.kind === "timer/fired" && event.id === "receipt-timeout")) {
    const at = event.kind === "receipt/check" ? event.at : event.at / 1000;
    const result = checkPacketReceiptTimeout({
      status: state.status,
      timeoutAt: state.timeoutAt,
      nowSeconds: at
    });
    if (!result.timedOut) {
      return { state: { ...state, timedOut: false }, intents: [] };
    }
    return {
      state: {
        status: result.status,
        timeoutAt: state.timeoutAt,
        concludedAt: result.concludedAt,
        timedOut: true
      },
      intents: []
    };
  }

  return { state, intents: [] };
}
