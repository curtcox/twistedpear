/**
 * Pure LXMF outbound message send-state transitions.
 * Adapters perform network IO; this owns state/progress updates only.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

/** Mirrors LXMF/LXMessage.py message states. */
export const LxmfMessageState = {
  GENERATING: 0x00,
  OUTBOUND: 0x01,
  SENDING: 0x02,
  SENT: 0x04,
  DELIVERED: 0x08,
  REJECTED: 0xfd,
  CANCELLED: 0xfe,
  FAILED: 0xff
} as const;

export type LxmfMessageStateValue =
  (typeof LxmfMessageState)[keyof typeof LxmfMessageState];

export interface LxmfSendState {
  readonly state: LxmfMessageStateValue;
  readonly progress: number;
}

export type LxmfSendEvent =
  | Event
  | { readonly kind: "lxmf/enqueue" }
  | { readonly kind: "lxmf/begin-sending" }
  | { readonly kind: "lxmf/mark-sent"; readonly progress?: number }
  | { readonly kind: "lxmf/mark-delivered" }
  | { readonly kind: "lxmf/mark-failed" }
  | { readonly kind: "lxmf/progress"; readonly progress: number }
  | {
      readonly kind: "lxmf/receipt-result";
      readonly delivered: boolean;
      /** Propagated success lands on SENT; opportunistic on DELIVERED. */
      readonly onDelivered: "sent" | "delivered";
    };

export function initialLxmfSendState(
  state: LxmfMessageStateValue = LxmfMessageState.GENERATING,
  progress = 0
): LxmfSendState {
  return { state, progress };
}

export function applyLxmfSendEvent(
  current: LxmfSendState,
  event: LxmfSendEvent
): LxmfSendState {
  return stepLxmfSendInner(current, event).state;
}

export const stepLxmfSend: StepFn<LxmfSendState> = (state, event) =>
  stepLxmfSendInner(state, event as LxmfSendEvent);

function stepLxmfSendInner(
  state: LxmfSendState,
  event: LxmfSendEvent
): { state: LxmfSendState; intents: Intent[] } {
  if (event.kind === "lxmf/enqueue") {
    return { state: { state: LxmfMessageState.OUTBOUND, progress: state.progress }, intents: [] };
  }

  if (event.kind === "lxmf/begin-sending") {
    return { state: { state: LxmfMessageState.SENDING, progress: state.progress }, intents: [] };
  }

  if (event.kind === "lxmf/mark-sent") {
    return {
      state: {
        state: LxmfMessageState.SENT,
        progress: event.progress ?? 0.5
      },
      intents: []
    };
  }

  if (event.kind === "lxmf/mark-delivered") {
    return {
      state: { state: LxmfMessageState.DELIVERED, progress: 1 },
      intents: []
    };
  }

  if (event.kind === "lxmf/mark-failed") {
    return {
      state: { state: LxmfMessageState.FAILED, progress: state.progress },
      intents: []
    };
  }

  if (event.kind === "lxmf/progress") {
    return {
      state: { ...state, progress: event.progress },
      intents: []
    };
  }

  if (event.kind === "lxmf/receipt-result") {
    if (event.delivered) {
      if (event.onDelivered === "sent") {
        return {
          state: { state: LxmfMessageState.SENT, progress: 1 },
          intents: []
        };
      }
      return {
        state: { state: LxmfMessageState.DELIVERED, progress: 1 },
        intents: []
      };
    }
    return {
      state: { state: LxmfMessageState.FAILED, progress: state.progress },
      intents: []
    };
  }

  return { state, intents: [] };
}
