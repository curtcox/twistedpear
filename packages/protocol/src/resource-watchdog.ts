/**
 * Pure resource advertisement / transfer watchdog.
 * Mirrors reticulum-ts Resource.watchdogTick scheduling without IO.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const RESOURCE_SENDER_GRACE_TIME = 10;
export const RESOURCE_PROCESSING_GRACE = 1;
export const RESOURCE_WATCHDOG_PERIOD_MS = 250;

/** Mirrors RNS/Resource.py transfer window constants. */
export const RESOURCE_WINDOW = 4;
export const RESOURCE_WINDOW_MIN = 2;
export const RESOURCE_WINDOW_MAX_SLOW = 10;
export const RESOURCE_WINDOW_MAX_FAST = 75;
export const RESOURCE_WINDOW_MAX = RESOURCE_WINDOW_MAX_FAST;
export const RESOURCE_WINDOW_FLEXIBILITY = 4;

/** Mirrors RNS/Resource.py retry / part-timeout factors. */
export const RESOURCE_MAX_RETRIES = 16;
export const RESOURCE_MAX_ADV_RETRIES = 4;
export const RESOURCE_PART_TIMEOUT_FACTOR = 4;

export const ResourceStatus = {
  NONE: 0x00,
  QUEUED: 0x01,
  ADVERTISED: 0x02,
  TRANSFERRING: 0x03,
  AWAITING_PROOF: 0x04,
  ASSEMBLING: 0x05,
  COMPLETE: 0x06,
  FAILED: 0x07,
  CORRUPT: 0x08,
  REJECTED: 0x00,
} as const;

export type ResourceStatusValue =
  (typeof ResourceStatus)[keyof typeof ResourceStatus];

export type ResourceWatchdogAction =
  | { readonly kind: "cancel" }
  | { readonly kind: "advertise" }
  | { readonly kind: "request-next" };

export interface ResourceWatchdogState {
  readonly status: ResourceStatusValue;
  readonly initiator: boolean;
  readonly advSent: number;
  readonly timeout: number;
  readonly retriesLeft: number;
  readonly outstandingParts: number;
  readonly receivedCount: number;
  readonly totalParts: number;
}

export type ResourceWatchdogEvent =
  | Event
  | { readonly kind: "resource/watchdog-start" }
  | {
      readonly kind: "resource/sync";
      readonly status: ResourceStatusValue;
      readonly advSent?: number;
      readonly timeout?: number;
      readonly retriesLeft?: number;
      readonly outstandingParts?: number;
      readonly receivedCount?: number;
      readonly totalParts?: number;
    };

export interface ResourceWatchdogStepResult {
  readonly state: ResourceWatchdogState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceWatchdogAction[];
}

export function initialResourceWatchdogState(options: {
  readonly initiator: boolean;
  readonly timeout: number;
  readonly retriesLeft: number;
}): ResourceWatchdogState {
  return {
    status: ResourceStatus.NONE,
    initiator: options.initiator,
    advSent: 0,
    timeout: options.timeout,
    retriesLeft: options.retriesLeft,
    outstandingParts: 0,
    receivedCount: 0,
    totalParts: 0,
  };
}

export function computeResourceTimeout(
  rtt: number,
  trafficTimeoutFactor: number,
): number {
  return rtt * trafficTimeoutFactor + RESOURCE_SENDER_GRACE_TIME;
}

/**
 * Resource timeout computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeResourceTimeout`
 * reads beside the step).
 */
export type ComputeResourceTimeoutState = Record<string, never>;

export type ComputeResourceTimeoutEvent =
  | Event
  | {
      readonly kind: "resource/timeout-gate";
      readonly rtt: number;
      readonly trafficTimeoutFactor: number;
    };

export type ComputeResourceTimeoutAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};

export interface ComputeResourceTimeoutStepResult {
  readonly state: ComputeResourceTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeResourceTimeoutAction[];
}

export function initialComputeResourceTimeoutState(): ComputeResourceTimeoutState {
  return {};
}

export function stepComputeResourceTimeoutWithActions(
  state: ComputeResourceTimeoutState,
  event: ComputeResourceTimeoutEvent,
): ComputeResourceTimeoutStepResult {
  if (event.kind === "resource/timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-timeout",
          timeout: computeResourceTimeout(
            event.rtt,
            event.trafficTimeoutFactor,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseResourceTimeout(
  actions: ReadonlyArray<ComputeResourceTimeoutAction>,
): boolean {
  return actions.some((action) => action.kind === "use-timeout");
}

/** Extract resource timeout from step actions; null when no `use-timeout`. */
export function resourceTimeoutFromActions(
  actions: ReadonlyArray<ComputeResourceTimeoutAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-timeout");
  return action?.kind === "use-timeout" ? action.timeout : null;
}

export const stepResourceWatchdog: StepFn<ResourceWatchdogState> = (
  state,
  event,
) => {
  const result = stepResourceWatchdogInner(
    state,
    event as ResourceWatchdogEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceWatchdogWithActions(
  state: ResourceWatchdogState,
  event: ResourceWatchdogEvent,
): ResourceWatchdogStepResult {
  return stepResourceWatchdogInner(state, event);
}

function stepResourceWatchdogInner(
  state: ResourceWatchdogState,
  event: ResourceWatchdogEvent,
): ResourceWatchdogStepResult {
  if (event.kind === "resource/sync") {
    return {
      state: {
        ...state,
        status: event.status,
        advSent: event.advSent ?? state.advSent,
        timeout: event.timeout ?? state.timeout,
        retriesLeft: event.retriesLeft ?? state.retriesLeft,
        outstandingParts: event.outstandingParts ?? state.outstandingParts,
        receivedCount: event.receivedCount ?? state.receivedCount,
        totalParts: event.totalParts ?? state.totalParts,
      },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "resource/watchdog-start" || event.kind === "start") {
    return scheduleWatchdog(state, []);
  }

  if (event.kind !== "timer/fired" || event.id !== "resource-watchdog") {
    return { state, intents: [], actions: [] };
  }

  if (
    state.status === ResourceStatus.COMPLETE ||
    state.status === ResourceStatus.FAILED
  ) {
    return { state, intents: [], actions: [] };
  }

  const now = event.at / 1000;

  if (state.status === ResourceStatus.ADVERTISED) {
    if (now >= state.advSent + state.timeout + RESOURCE_PROCESSING_GRACE) {
      if (state.retriesLeft <= 0) {
        return {
          state: { ...state, status: ResourceStatus.FAILED },
          intents: [],
          actions: [{ kind: "cancel" }],
        };
      }

      return scheduleWatchdog(
        { ...state, retriesLeft: state.retriesLeft - 1 },
        [{ kind: "advertise" }],
      );
    }

    return scheduleWatchdog(state, []);
  }

  if (state.status === ResourceStatus.TRANSFERRING && !state.initiator) {
    const actions: ResourceWatchdogAction[] = [];
    if (
      state.outstandingParts === 0 &&
      state.receivedCount < state.totalParts
    ) {
      actions.push({ kind: "request-next" });
    }
    return scheduleWatchdog(state, actions);
  }

  return { state, intents: [], actions: [] };
}

function scheduleWatchdog(
  state: ResourceWatchdogState,
  actions: readonly ResourceWatchdogAction[],
): ResourceWatchdogStepResult {
  return {
    state,
    intents: [
      {
        kind: "timer/set",
        timer: {
          id: "resource-watchdog",
          delayMs: RESOURCE_WATCHDOG_PERIOD_MS,
        },
      },
    ],
    actions,
  };
}
