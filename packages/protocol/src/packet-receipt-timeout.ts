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
  | { readonly kind: "receipt/failed"; readonly at: number }
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

  if (event.kind === "receipt/failed") {
    if (
      state.status === PacketReceiptStatus.DELIVERED ||
      state.status === PacketReceiptStatus.FAILED
    ) {
      return { state, intents: [] };
    }
    return {
      state: {
        ...state,
        status: PacketReceiptStatus.FAILED,
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

export type OutboundReceiptOutcome = "none" | "keep-receipt" | "fail-and-drop-receipt";

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

/** Whether outbound send should fail+drop a created receipt after transmit failure. */
export function shouldFailAndDropOutboundReceipt(input: {
  readonly failAndDrop: boolean;
  readonly receiptPresent: boolean;
}): boolean {
  return input.failAndDrop && input.receiptPresent;
}

/** Whether outbound send should return a kept receipt to the caller. */
export function shouldKeepOutboundReceipt(keepReceipt: boolean): boolean {
  return keepReceipt;
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
  if (input.truncatedHashMatches && input.identityPresent && input.proofAccepted) {
    return "remove-receipt";
  }
  return "continue";
}

/**
 * Unregister a packet receipt from the transport receipt list.
 * Splice stays at the adapter.
 */
export function planUnregisterPacketReceipt(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether an outbound send should create and register a packet receipt. */
export function shouldRegisterPacketReceipt(createReceipt: boolean): boolean {
  return createReceipt;
}

export type PacketReceiptCallbackPlan = "clear" | "set";

/** Whether a packet-receipt timeout/delivery callback should be cleared or assigned. */
export function planPacketReceiptCallback(callbackPresent: boolean): PacketReceiptCallbackPlan {
  return callbackPresent ? "set" : "clear";
}

/** Whether checkTimeout should invoke the timeout callback after a timed-out step. */
export function shouldInvokePacketReceiptTimeoutCallback(timedOut: boolean): boolean {
  return timedOut;
}
