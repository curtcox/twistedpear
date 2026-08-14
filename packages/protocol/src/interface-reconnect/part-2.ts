import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  INTERFACE_RECONNECT_TIMER_ID,
  INTERFACE_RECONNECT_WAIT_MS,
} from "./part-1.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";

export type InterfaceReconnectPlan =
  | {
      readonly kind: "reconnect";
      readonly delayMs: number;
      readonly attempt: number;
    }
  | { readonly kind: "give-up"; readonly attempt: number };

export function planInterfaceReconnect(input: {
  readonly attempts: number;
  readonly maxTries?: number | null;
  readonly waitMs?: number;
}): InterfaceReconnectPlan {
  const attempt = input.attempts + 1;
  const maxTries = input.maxTries ?? null;
  if (maxTries !== null && attempt > maxTries) {
    return { kind: "give-up", attempt };
  }
  return {
    kind: "reconnect",
    delayMs: input.waitMs ?? INTERFACE_RECONNECT_WAIT_MS,
    attempt,
  };
}

/**
 * Interface-reconnect plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planInterfaceReconnect` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepInterfaceReconnectWithActions}.
 */
export type InterfaceReconnectPlanState = Record<string, never>;

export type InterfaceReconnectPlanEvent =
  | Event
  | {
      readonly kind: "iface/reconnect-plan-gate";
      readonly attempts: number;
      readonly maxTries?: number | null;
      readonly waitMs?: number;
    };

export type InterfaceReconnectPlanAction =
  | {
      readonly kind: "reconnect";
      readonly delayMs: number;
      readonly attempt: number;
    }
  | { readonly kind: "give-up"; readonly attempt: number };

export interface InterfaceReconnectPlanStepResult {
  readonly state: InterfaceReconnectPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceReconnectPlanAction[];
}

export function initialInterfaceReconnectPlanState(): InterfaceReconnectPlanState {
  return {};
}

export function stepInterfaceReconnectPlanWithActions(
  state: InterfaceReconnectPlanState,
  event: InterfaceReconnectPlanEvent,
): InterfaceReconnectPlanStepResult {
  if (event.kind === "iface/reconnect-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        planInterfaceReconnect({
          attempts: event.attempts,
          ...(event.maxTries !== undefined ? { maxTries: event.maxTries } : {}),
          ...(event.waitMs !== undefined ? { waitMs: event.waitMs } : {}),
        }),
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReconnectInterfacePlan(
  actions: ReadonlyArray<InterfaceReconnectPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reconnect");
}

export function shouldGiveUpInterfaceReconnectPlan(
  actions: ReadonlyArray<InterfaceReconnectPlanAction>,
): boolean {
  return hasActionOfKind(actions, "give-up");
}

/** Extract give-up plan action, if any. */
export function interfaceReconnectGiveUpFromActions(
  actions: ReadonlyArray<InterfaceReconnectPlanAction>,
): Extract<InterfaceReconnectPlanAction, { kind: "give-up" }> | null {
  for (const action of actions) {
    if (action.kind === "give-up") {
      return action;
    }
  }
  return null;
}

/** Extract reconnect plan action, if any. */
export function interfaceReconnectRetryFromActions(
  actions: ReadonlyArray<InterfaceReconnectPlanAction>,
): Extract<InterfaceReconnectPlanAction, { kind: "reconnect" }> | null {
  for (const action of actions) {
    if (action.kind === "reconnect") {
      return action;
    }
  }
  return null;
}

/** Extract the reconnect plan from actions; null when empty. */
export function interfaceReconnectPlanFromActions(
  actions: ReadonlyArray<InterfaceReconnectPlanAction>,
): InterfaceReconnectPlan | null {
  const action = firstAction(actions);
  return action ?? null;
}

export interface InterfaceReconnectState {
  readonly attempts: number;
  readonly maxTries: number | null;
  readonly waitMs: number;
  readonly detached: boolean;
  /** When true, spawned/server-accepted sockets must not auto-reconnect. */
  readonly suppressReconnect: boolean;
  readonly waiting: boolean;
}

export type InterfaceReconnectEvent =
  | Event
  | { readonly kind: "iface/connected" }
  | { readonly kind: "iface/disconnected" }
  | { readonly kind: "iface/connect-failed" }
  | { readonly kind: "iface/detach" };

export type InterfaceReconnectAction =
  | { readonly kind: "connect"; readonly attempt: number }
  | { readonly kind: "give-up"; readonly attempt: number };

export interface InterfaceReconnectStepResult {
  readonly state: InterfaceReconnectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceReconnectAction[];
}

export function initialInterfaceReconnectState(
  options: {
    readonly maxTries?: number | null;
    readonly waitMs?: number;
    readonly suppressReconnect?: boolean;
  } = {},
): InterfaceReconnectState {
  return {
    attempts: 0,
    maxTries: options.maxTries ?? null,
    waitMs: options.waitMs ?? INTERFACE_RECONNECT_WAIT_MS,
    detached: false,
    suppressReconnect: options.suppressReconnect === true,
    waiting: false,
  };
}

export const stepInterfaceReconnect: StepFn<InterfaceReconnectState> = (
  state,
  event,
) => {
  const result = stepInterfaceReconnectInner(
    state,
    event as InterfaceReconnectEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepInterfaceReconnectWithActions(
  state: InterfaceReconnectState,
  event: InterfaceReconnectEvent,
): InterfaceReconnectStepResult {
  return stepInterfaceReconnectInner(state, event);
}

function cancelTimerIntent(): Intent {
  return { kind: "timer/cancel", timer: { id: INTERFACE_RECONNECT_TIMER_ID } };
}

function setTimerIntent(delayMs: number): Intent {
  return {
    kind: "timer/set",
    timer: { id: INTERFACE_RECONNECT_TIMER_ID, delayMs },
  };
}

function idleReconnectResult(
  state: InterfaceReconnectState,
): InterfaceReconnectStepResult {
  return { state, intents: [], actions: [] };
}

function stepInterfaceReconnectTimerFired(
  state: InterfaceReconnectState,
): InterfaceReconnectStepResult {
  if (!state.waiting) {
    return idleReconnectResult(state);
  }
  const planActions = stepInterfaceReconnectPlanWithActions(
    initialInterfaceReconnectPlanState(),
    {
      kind: "iface/reconnect-plan-gate",
      attempts: state.attempts,
      maxTries: state.maxTries,
      waitMs: state.waitMs,
    },
  ).actions;
  const giveUp = interfaceReconnectGiveUpFromActions(planActions);
  if (giveUp !== null) {
    return {
      state: { ...state, attempts: giveUp.attempt, waiting: false },
      intents: [],
      actions: [{ kind: "give-up", attempt: giveUp.attempt }],
    };
  }
  const reconnect = interfaceReconnectRetryFromActions(planActions);
  if (reconnect === null) {
    return idleReconnectResult(state);
  }
  return {
    state: { ...state, attempts: reconnect.attempt, waiting: false },
    intents: [],
    actions: [{ kind: "connect", attempt: reconnect.attempt }],
  };
}

function stepInterfaceReconnectInner(
  state: InterfaceReconnectState,
  event: InterfaceReconnectEvent,
): InterfaceReconnectStepResult {
  if (event.kind === "iface/detach") {
    return {
      state: { ...state, detached: true, waiting: false },
      intents: [cancelTimerIntent()],
      actions: [],
    };
  }

  if (event.kind === "iface/connected") {
    return {
      state: { ...state, attempts: 0, waiting: false, detached: false },
      intents: [cancelTimerIntent()],
      actions: [],
    };
  }

  if (state.detached || state.suppressReconnect) {
    return idleReconnectResult(state);
  }

  if (
    event.kind === "iface/disconnected" ||
    event.kind === "iface/connect-failed"
  ) {
    return {
      state: { ...state, waiting: true },
      intents: [cancelTimerIntent(), setTimerIntent(state.waitMs)],
      actions: [],
    };
  }

  if (
    event.kind === "timer/fired" &&
    event.id === INTERFACE_RECONNECT_TIMER_ID
  ) {
    return stepInterfaceReconnectTimerFired(state);
  }

  return idleReconnectResult(state);
}
