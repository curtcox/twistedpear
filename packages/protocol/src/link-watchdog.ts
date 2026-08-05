/**
 * Pure link keepalive / stale / establishment-timeout watchdog.
 * Mirrors the scheduling decisions in reticulum-ts Link.watchdogTick without IO.
 * Keepalive / establishment / request timeout conclusions leave via machine
 * actions (no ad-hoc `computeKeepalive` / `computeLinkEstablishmentTimeout` /
 * `computeLinkRequestTimeout` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const LINK_KEEPALIVE = 360;
export const LINK_KEEPALIVE_MIN = 5;
export const LINK_KEEPALIVE_MAX_RTT = 1.75;
export const LINK_STALE_FACTOR = 2;
export const LINK_STALE_GRACE = 5;
export const LINK_KEEPALIVE_TIMEOUT_FACTOR = 4;
export const LINK_WATCHDOG_MAX_SLEEP_MS = 5000;
export const LINK_ESTABLISHMENT_TIMEOUT_PER_HOP = 6;
export const LINK_KEEPALIVE_DEFAULT = 360;
/** Multiplier on RTT for request/response traffic timeouts. */
export const LINK_TRAFFIC_TIMEOUT_FACTOR = 6;
/** Max grace seconds added to traffic timeouts. */
export const LINK_RESPONSE_MAX_GRACE_TIME = 5;
/** Extra grace multiplier used for in-link request timeouts. */
export const LINK_REQUEST_TIMEOUT_GRACE_FACTOR = 1.125;

export function computeLinkRequestTimeout(
  rtt: number,
  trafficTimeoutFactor: number = LINK_TRAFFIC_TIMEOUT_FACTOR,
  responseMaxGraceTime: number = LINK_RESPONSE_MAX_GRACE_TIME,
  graceFactor: number = LINK_REQUEST_TIMEOUT_GRACE_FACTOR,
): number {
  return rtt * trafficTimeoutFactor + responseMaxGraceTime * graceFactor;
}

export const LinkStatus = {
  PENDING: 0x00,
  HANDSHAKE: 0x01,
  ACTIVE: 0x02,
  STALE: 0x03,
  CLOSED: 0x04,
} as const;

export type LinkStatusValue = (typeof LinkStatus)[keyof typeof LinkStatus];

export const LinkTeardownReason = {
  TIMEOUT: 0x01,
  INITIATOR_CLOSED: 0x02,
  DESTINATION_CLOSED: 0x03,
} as const;

export type LinkTeardownReasonValue =
  (typeof LinkTeardownReason)[keyof typeof LinkTeardownReason];

/** Mirrors RNS/Link.py resource acceptance strategies. */
export const LinkResourceStrategy = {
  ACCEPT_NONE: 0x00,
  ACCEPT_ALL: 0x01,
  ACCEPT_APP: 0x02,
} as const;

export type LinkResourceStrategyValue =
  (typeof LinkResourceStrategy)[keyof typeof LinkResourceStrategy];

export type LinkWatchdogAction =
  | { readonly kind: "send-keepalive" }
  | { readonly kind: "send-teardown" }
  | { readonly kind: "mark-stale" }
  | { readonly kind: "close"; readonly reason: LinkTeardownReasonValue };

export interface LinkWatchdogState {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly requestTime: number;
  readonly establishmentTimeout: number;
  readonly activatedAt: number | null;
  readonly lastInbound: number;
  readonly lastKeepalive: number;
  readonly keepalive: number;
  readonly staleTime: number;
  readonly rtt: number | null;
  readonly teardownReason: LinkTeardownReasonValue | null;
}

export type LinkWatchdogEvent =
  | Event
  | { readonly kind: "link/watchdog-start" }
  | { readonly kind: "link/inbound"; readonly at: number }
  | { readonly kind: "link/keepalive-sent"; readonly at: number }
  | { readonly kind: "link/rtt-measured"; readonly rtt: number }
  | {
      readonly kind: "link/status";
      readonly status: LinkStatusValue;
      readonly activatedAt?: number;
    };

export interface LinkWatchdogStepResult {
  readonly state: LinkWatchdogState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkWatchdogAction[];
}

export function initialLinkWatchdogState(options: {
  readonly initiator: boolean;
  readonly requestTime: number;
  readonly establishmentTimeout?: number;
}): LinkWatchdogState {
  const keepalive = LINK_KEEPALIVE_DEFAULT;
  return {
    status: LinkStatus.PENDING,
    initiator: options.initiator,
    requestTime: options.requestTime,
    establishmentTimeout:
      options.establishmentTimeout ??
      computeLinkEstablishmentTimeout(1, keepalive),
    activatedAt: null,
    lastInbound: 0,
    lastKeepalive: 0,
    keepalive,
    staleTime: keepalive * LINK_STALE_FACTOR,
    rtt: null,
    teardownReason: null,
  };
}

export function computeKeepalive(rtt: number): number {
  return Math.max(
    Math.min(rtt * (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT), LINK_KEEPALIVE),
    LINK_KEEPALIVE_MIN,
  );
}

/**
 * Link keepalive computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeKeepalive` reads
 * beside the step).
 */
export type ComputeKeepaliveState = Record<string, never>;

export type ComputeKeepaliveEvent =
  | Event
  | {
      readonly kind: "link/keepalive-gate";
      readonly rtt: number;
    };

export type ComputeKeepaliveAction = {
  readonly kind: "use-keepalive";
  readonly keepalive: number;
};

export interface ComputeKeepaliveStepResult {
  readonly state: ComputeKeepaliveState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeKeepaliveAction[];
}

export function initialComputeKeepaliveState(): ComputeKeepaliveState {
  return {};
}

export function stepComputeKeepaliveWithActions(
  state: ComputeKeepaliveState,
  event: ComputeKeepaliveEvent,
): ComputeKeepaliveStepResult {
  if (event.kind === "link/keepalive-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-keepalive",
          keepalive: computeKeepalive(event.rtt),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkKeepalive(
  actions: ReadonlyArray<ComputeKeepaliveAction>,
): boolean {
  return actions.some((action) => action.kind === "use-keepalive");
}

/** Extract keepalive from step actions; null when no `use-keepalive`. */
export function linkKeepaliveFromActions(
  actions: ReadonlyArray<ComputeKeepaliveAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-keepalive");
  return action?.kind === "use-keepalive" ? action.keepalive : null;
}

/** Seconds allowed to establish a link across `hops` (minimum 1 hop). */
export function computeLinkEstablishmentTimeout(
  hops: number,
  keepalive: number = LINK_KEEPALIVE_DEFAULT,
): number {
  return LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * Math.max(1, hops) + keepalive;
}

/**
 * Link establishment-timeout computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkEstablishmentTimeout`
 * reads beside the step).
 */
export type ComputeLinkEstablishmentTimeoutState = Record<string, never>;

export type ComputeLinkEstablishmentTimeoutEvent =
  | Event
  | {
      readonly kind: "link/establishment-timeout-gate";
      readonly hops: number;
      readonly keepalive?: number;
    };

export type ComputeLinkEstablishmentTimeoutAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};

export interface ComputeLinkEstablishmentTimeoutStepResult {
  readonly state: ComputeLinkEstablishmentTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkEstablishmentTimeoutAction[];
}

export function initialComputeLinkEstablishmentTimeoutState(): ComputeLinkEstablishmentTimeoutState {
  return {};
}

export function stepComputeLinkEstablishmentTimeoutWithActions(
  state: ComputeLinkEstablishmentTimeoutState,
  event: ComputeLinkEstablishmentTimeoutEvent,
): ComputeLinkEstablishmentTimeoutStepResult {
  if (event.kind === "link/establishment-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-timeout",
          timeout: computeLinkEstablishmentTimeout(event.hops, event.keepalive),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkEstablishmentTimeout(
  actions: ReadonlyArray<ComputeLinkEstablishmentTimeoutAction>,
): boolean {
  return actions.some((action) => action.kind === "use-timeout");
}

/** Extract establishment timeout from step actions; null when no `use-timeout`. */
export function linkEstablishmentTimeoutFromActions(
  actions: ReadonlyArray<ComputeLinkEstablishmentTimeoutAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-timeout");
  return action?.kind === "use-timeout" ? action.timeout : null;
}

/**
 * Link request-timeout computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkRequestTimeout`
 * reads beside the step).
 */
export type ComputeLinkRequestTimeoutState = Record<string, never>;

export type ComputeLinkRequestTimeoutEvent =
  | Event
  | {
      readonly kind: "link/request-timeout-gate";
      readonly rtt: number;
      readonly trafficTimeoutFactor?: number;
      readonly responseMaxGraceTime?: number;
      readonly graceFactor?: number;
    };

export type ComputeLinkRequestTimeoutAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};

export interface ComputeLinkRequestTimeoutStepResult {
  readonly state: ComputeLinkRequestTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkRequestTimeoutAction[];
}

export function initialComputeLinkRequestTimeoutState(): ComputeLinkRequestTimeoutState {
  return {};
}

export function stepComputeLinkRequestTimeoutWithActions(
  state: ComputeLinkRequestTimeoutState,
  event: ComputeLinkRequestTimeoutEvent,
): ComputeLinkRequestTimeoutStepResult {
  if (event.kind === "link/request-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-timeout",
          timeout: computeLinkRequestTimeout(
            event.rtt,
            event.trafficTimeoutFactor,
            event.responseMaxGraceTime,
            event.graceFactor,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkRequestTimeout(
  actions: ReadonlyArray<ComputeLinkRequestTimeoutAction>,
): boolean {
  return actions.some((action) => action.kind === "use-timeout");
}

/** Extract request timeout from step actions; null when no `use-timeout`. */
export function linkRequestTimeoutFromActions(
  actions: ReadonlyArray<ComputeLinkRequestTimeoutAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-timeout");
  return action?.kind === "use-timeout" ? action.timeout : null;
}

export const stepLinkWatchdog: StepFn<LinkWatchdogState> = (state, event) => {
  const result = stepLinkWatchdogInner(state, event as LinkWatchdogEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkWatchdogWithActions(
  state: LinkWatchdogState,
  event: LinkWatchdogEvent,
): LinkWatchdogStepResult {
  return stepLinkWatchdogInner(state, event);
}

function stepLinkWatchdogInner(
  state: LinkWatchdogState,
  event: LinkWatchdogEvent,
): LinkWatchdogStepResult {
  if (event.kind === "link/inbound") {
    return {
      state: {
        ...state,
        lastInbound: event.at,
        status:
          state.status === LinkStatus.STALE ? LinkStatus.ACTIVE : state.status,
      },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "link/keepalive-sent") {
    return {
      state: { ...state, lastKeepalive: event.at },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "link/rtt-measured") {
    const keepalive = computeKeepalive(event.rtt);
    return {
      state: {
        ...state,
        rtt: event.rtt,
        keepalive,
        staleTime: keepalive * LINK_STALE_FACTOR,
      },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "link/status") {
    return {
      state: {
        ...state,
        status: event.status,
        activatedAt: event.activatedAt ?? state.activatedAt,
      },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "link/watchdog-start" || event.kind === "start") {
    return scheduleWatchdog(state, 25, []);
  }

  if (event.kind !== "timer/fired" || event.id !== "link-watchdog") {
    return { state, intents: [], actions: [] };
  }

  const now = event.at / 1000;

  if (state.status === LinkStatus.CLOSED) {
    return { state, intents: [], actions: [] };
  }

  if (
    state.status === LinkStatus.PENDING ||
    state.status === LinkStatus.HANDSHAKE
  ) {
    if (now >= state.requestTime + state.establishmentTimeout) {
      return {
        state: {
          ...state,
          status: LinkStatus.CLOSED,
          teardownReason: LinkTeardownReason.TIMEOUT,
        },
        intents: [],
        actions: [{ kind: "close", reason: LinkTeardownReason.TIMEOUT }],
      };
    }

    const delayMs = Math.max(
      (state.requestTime + state.establishmentTimeout - now) * 1000,
      25,
    );
    return scheduleWatchdog(state, delayMs, []);
  }

  if (state.status === LinkStatus.ACTIVE || state.status === LinkStatus.STALE) {
    const activatedAt = state.activatedAt ?? 0;
    const lastInbound = Math.max(state.lastInbound, activatedAt);

    if (state.status === LinkStatus.STALE) {
      return {
        state: {
          ...state,
          status: LinkStatus.CLOSED,
          teardownReason: LinkTeardownReason.TIMEOUT,
        },
        intents: [],
        actions: [
          { kind: "send-teardown" },
          { kind: "close", reason: LinkTeardownReason.TIMEOUT },
        ],
      };
    }

    const actions: LinkWatchdogAction[] = [];

    if (now >= lastInbound + state.keepalive) {
      if (state.initiator && now >= state.lastKeepalive + state.keepalive) {
        actions.push({ kind: "send-keepalive" });
      }

      if (now >= lastInbound + state.staleTime) {
        const delayMs = Math.max(
          (state.rtt ?? 0.025) * LINK_KEEPALIVE_TIMEOUT_FACTOR * 1000 +
            LINK_STALE_GRACE * 1000,
          25,
        );
        return scheduleWatchdog(
          { ...state, status: LinkStatus.STALE },
          delayMs,
          [{ kind: "mark-stale" }, ...actions],
        );
      }

      return scheduleWatchdog(
        state,
        Math.min(state.keepalive * 1000, LINK_WATCHDOG_MAX_SLEEP_MS),
        actions,
      );
    }

    const delayMs = Math.min(
      Math.max((lastInbound + state.keepalive - now) * 1000, 25),
      LINK_WATCHDOG_MAX_SLEEP_MS,
    );
    return scheduleWatchdog(state, delayMs, actions);
  }

  return { state, intents: [], actions: [] };
}

function scheduleWatchdog(
  state: LinkWatchdogState,
  delayMs: number,
  actions: readonly LinkWatchdogAction[],
): LinkWatchdogStepResult {
  return {
    state,
    intents: [{ kind: "timer/set", timer: { id: "link-watchdog", delayMs } }],
    actions,
  };
}
