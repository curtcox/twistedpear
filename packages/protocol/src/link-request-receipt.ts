/**
 * Pure link request-receipt status codes and transitions (RNS Link.RequestReceipt).
 */
import { equalByteArrays } from "./path-table.js";

export const LinkRequestReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  RECEIVING: 0x03,
  READY: 0x04
} as const;

export type LinkRequestReceiptStatusValue =
  (typeof LinkRequestReceiptStatus)[keyof typeof LinkRequestReceiptStatus];

export interface LinkRequestReceiptState {
  readonly status: LinkRequestReceiptStatusValue;
  readonly response: Uint8Array | null;
  readonly progress: number;
  readonly concludedAt: number | null;
}

export type LinkRequestReceiptEvent =
  | { readonly kind: "request/timeout"; readonly at: number }
  | { readonly kind: "request/response"; readonly at: number; readonly response: Uint8Array | null };

export type LinkRequestReceiptAction =
  | { readonly kind: "failed" }
  | { readonly kind: "response" };

export interface LinkRequestReceiptStepResult {
  readonly state: LinkRequestReceiptState;
  readonly actions: readonly LinkRequestReceiptAction[];
}

export function initialLinkRequestReceiptState(): LinkRequestReceiptState {
  return {
    status: LinkRequestReceiptStatus.SENT,
    response: null,
    progress: 0,
    concludedAt: null
  };
}

export function stepLinkRequestReceipt(
  state: LinkRequestReceiptState,
  event: LinkRequestReceiptEvent
): LinkRequestReceiptStepResult {
  if (event.kind === "request/timeout") {
    if (
      state.status === LinkRequestReceiptStatus.SENT ||
      state.status === LinkRequestReceiptStatus.DELIVERED
    ) {
      return {
        state: {
          ...state,
          status: LinkRequestReceiptStatus.FAILED,
          concludedAt: event.at
        },
        actions: [{ kind: "failed" }]
      };
    }
    return { state, actions: [] };
  }

  return {
    state: {
      status: LinkRequestReceiptStatus.READY,
      response: event.response,
      progress: 1,
      concludedAt: event.at
    },
    actions: [{ kind: "response" }]
  };
}

/** Index of a pending link app-request by request-id (RESPONSE dispatch). */
export function indexOfPendingLinkAppRequest(input: {
  readonly requestIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  for (let index = 0; index < input.requestIds.length; index += 1) {
    const requestId = input.requestIds[index];
    if (requestId != null && equalByteArrays(requestId, input.target)) {
      return index;
    }
  }
  return null;
}

/** Whether a pending link-request receipt list should receive a new member. */
export function shouldRegisterPendingLinkRequest(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * Unregister a pending link-request receipt: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterPendingLinkRequest(index: number): number | null {
  return index >= 0 ? index : null;
}
