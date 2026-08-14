/**
 * Pure LXMF outbound message send-state transitions.
 * Adapters perform network IO; this owns state/progress updates only.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { hasActionOfKind } from "./action-kind.js";

/** Mirrors LXMF/LXMessage.py message states. */
export const LxmfMessageState = {
  GENERATING: 0x00,
  OUTBOUND: 0x01,
  SENDING: 0x02,
  SENT: 0x04,
  DELIVERED: 0x08,
  REJECTED: 0xfd,
  CANCELLED: 0xfe,
  FAILED: 0xff,
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
  progress = 0,
): LxmfSendState {
  return { state, progress };
}

export function applyLxmfSendEvent(
  current: LxmfSendState,
  event: LxmfSendEvent,
): LxmfSendState {
  return stepLxmfSendInner(current, event).state;
}

export const stepLxmfSend: StepFn<LxmfSendState> = (state, event) =>
  stepLxmfSendInner(state, event as LxmfSendEvent);

function stepLxmfSendInner(
  state: LxmfSendState,
  event: LxmfSendEvent,
): { state: LxmfSendState; intents: Intent[] } {
  if (event.kind === "lxmf/enqueue") {
    return {
      state: { state: LxmfMessageState.OUTBOUND, progress: state.progress },
      intents: [],
    };
  }

  if (event.kind === "lxmf/begin-sending") {
    return {
      state: { state: LxmfMessageState.SENDING, progress: state.progress },
      intents: [],
    };
  }

  if (event.kind === "lxmf/mark-sent") {
    return {
      state: {
        state: LxmfMessageState.SENT,
        progress: event.progress ?? 0.5,
      },
      intents: [],
    };
  }

  if (event.kind === "lxmf/mark-delivered") {
    return {
      state: { state: LxmfMessageState.DELIVERED, progress: 1 },
      intents: [],
    };
  }

  if (event.kind === "lxmf/mark-failed") {
    return {
      state: { state: LxmfMessageState.FAILED, progress: state.progress },
      intents: [],
    };
  }

  if (event.kind === "lxmf/progress") {
    return {
      state: { ...state, progress: event.progress },
      intents: [],
    };
  }

  if (event.kind === "lxmf/receipt-result") {
    return applyLxmfReceiptResult(state, event);
  }

  return { state, intents: [] };
}

function applyLxmfReceiptResult(
  state: LxmfSendState,
  event: Extract<LxmfSendEvent, { kind: "lxmf/receipt-result" }>,
): { state: LxmfSendState; intents: Intent[] } {
  if (!event.delivered) {
    return {
      state: { state: LxmfMessageState.FAILED, progress: state.progress },
      intents: [],
    };
  }
  return {
    state: {
      state:
        event.onDelivered === "sent"
          ? LxmfMessageState.SENT
          : LxmfMessageState.DELIVERED,
      progress: 1,
    },
    intents: [],
  };
}

export type LxmfOutboundSendMode = "opportunistic" | "propagated";
export type LxmfReceiptSendPhase = "after-send" | "after-poll";

/**
 * Maps outbound receipt presence/status into LXMF send-state events.
 * Opportunistic: missing receipt → fail; present → sent; delivered → DELIVERED (else noop).
 * Propagated: after-send → progress; after-poll → receipt-result (SENT on deliver, else FAILED).
 */
/** Whether an LXMF receipt send-outcome event should be applied to send-state. */
export function shouldApplyLxmfReceiptSendState(
  outcomePresent: boolean,
): boolean {
  return outcomePresent;
}

export function planLxmfReceiptSendOutcome(input: {
  readonly mode: LxmfOutboundSendMode;
  readonly phase: LxmfReceiptSendPhase;
  readonly receiptPresent: boolean;
  readonly delivered: boolean;
}): LxmfSendEvent | null {
  if (input.mode === "opportunistic") {
    if (input.phase === "after-send") {
      if (!input.receiptPresent) {
        return { kind: "lxmf/mark-failed" };
      }
      return { kind: "lxmf/mark-sent", progress: 0.5 };
    }
    if (input.delivered) {
      return {
        kind: "lxmf/receipt-result",
        delivered: true,
        onDelivered: "delivered",
      };
    }
    return null;
  }

  if (input.phase === "after-send") {
    return { kind: "lxmf/progress", progress: 0.5 };
  }
  return {
    kind: "lxmf/receipt-result",
    delivered: input.receiptPresent && input.delivered,
    onDelivered: "sent",
  };
}

/**
 * Receipt-send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfReceiptSendOutcome`
 * reads beside the step). Nested under {@link stepLxmfReceiptSendWithActions}.
 */
export type LxmfReceiptSendPlanState = Record<string, never>;

export type LxmfReceiptSendPlanEvent =
  | Event
  | {
      readonly kind: "receipt-send/plan-gate";
      readonly mode: LxmfOutboundSendMode;
      readonly phase: LxmfReceiptSendPhase;
      readonly receiptPresent: boolean;
      readonly delivered: boolean;
    };

export type LxmfReceiptSendPlanAction =
  | { readonly kind: "apply"; readonly event: LxmfSendEvent }
  | { readonly kind: "skip" };

export interface LxmfReceiptSendPlanStepResult {
  readonly state: LxmfReceiptSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfReceiptSendPlanAction[];
}

export function initialLxmfReceiptSendPlanState(): LxmfReceiptSendPlanState {
  return {};
}

export function stepLxmfReceiptSendPlanWithActions(
  state: LxmfReceiptSendPlanState,
  event: LxmfReceiptSendPlanEvent,
): LxmfReceiptSendPlanStepResult {
  if (event.kind === "receipt-send/plan-gate") {
    const outcome = planLxmfReceiptSendOutcome({
      mode: event.mode,
      phase: event.phase,
      receiptPresent: event.receiptPresent,
      delivered: event.delivered,
    });
    if (outcome === null) {
      return { state, intents: [], actions: [{ kind: "skip" }] };
    }
    return { state, intents: [], actions: [{ kind: "apply", event: outcome }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions apply a send-state event. */
export function shouldApplyLxmfReceiptSendPlan(
  actions: ReadonlyArray<LxmfReceiptSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "apply");
}

/** Whether plan actions skip send-state update. */
export function shouldSkipLxmfReceiptSendPlan(
  actions: ReadonlyArray<LxmfReceiptSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Send-state event from a plan apply action, if present. */
export function lxmfReceiptSendPlanApplyEvent(
  actions: ReadonlyArray<LxmfReceiptSendPlanAction>,
): LxmfSendEvent | null {
  for (const action of actions) {
    if (action.kind === "apply") {
      return action.event;
    }
  }
  return null;
}

/**
 * Receipt → send-state mapping is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfReceiptSendPlanWithActions} (`apply`|`skip`).
 */
export type LxmfReceiptSendState = Record<string, never>;

export type LxmfReceiptSendEvent =
  | Event
  | {
      readonly kind: "receipt-send/map";
      readonly mode: LxmfOutboundSendMode;
      readonly phase: LxmfReceiptSendPhase;
      readonly receiptPresent: boolean;
      readonly delivered: boolean;
    };

/**
 * Adapter applies send-state update or skip only from these actions.
 * Plan nested via {@link stepLxmfReceiptSendPlanWithActions} (`apply`|`skip`).
 */
export type LxmfReceiptSendAction =
  | { readonly kind: "apply"; readonly event: LxmfSendEvent }
  | { readonly kind: "skip" };

export interface LxmfReceiptSendStepResult {
  readonly state: LxmfReceiptSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfReceiptSendAction[];
}

export function initialLxmfReceiptSendState(): LxmfReceiptSendState {
  return {};
}

export const stepLxmfReceiptSend: StepFn<LxmfReceiptSendState> = (
  state,
  event,
) => {
  const result = stepLxmfReceiptSendInner(state, event as LxmfReceiptSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfReceiptSendWithActions(
  state: LxmfReceiptSendState,
  event: LxmfReceiptSendEvent,
): LxmfReceiptSendStepResult {
  return stepLxmfReceiptSendInner(state, event);
}

export function shouldApplyLxmfReceiptSend(
  actions: ReadonlyArray<LxmfReceiptSendAction>,
): boolean {
  return hasActionOfKind(actions, "apply");
}

export function shouldSkipLxmfReceiptSend(
  actions: ReadonlyArray<LxmfReceiptSendAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Send-state event from an apply action, if present. */
export function lxmfReceiptSendApplyEvent(
  actions: ReadonlyArray<LxmfReceiptSendAction>,
): LxmfSendEvent | null {
  for (const action of actions) {
    if (action.kind === "apply") {
      return action.event;
    }
  }
  return null;
}

function stepLxmfReceiptSendInner(
  state: LxmfReceiptSendState,
  event: LxmfReceiptSendEvent,
): LxmfReceiptSendStepResult {
  if (event.kind === "receipt-send/map") {
    const planActions = stepLxmfReceiptSendPlanWithActions(
      initialLxmfReceiptSendPlanState(),
      {
        kind: "receipt-send/plan-gate",
        mode: event.mode,
        phase: event.phase,
        receiptPresent: event.receiptPresent,
        delivered: event.delivered,
      },
    ).actions;
    if (shouldSkipLxmfReceiptSendPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "skip" }] };
    }
    const planned = lxmfReceiptSendPlanApplyEvent(planActions);
    if (planned === null) {
      return { state, intents: [], actions: [{ kind: "skip" }] };
    }
    return { state, intents: [], actions: [{ kind: "apply", event: planned }] };
  }

  return { state, intents: [], actions: [] };
}
