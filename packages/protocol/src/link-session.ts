/**
 * Multi-peer link session leaf for sim scenarios.
 * Composes establishment + link-watchdog phases without crypto/IO.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LinkStatus,
  LinkTeardownReason,
  initialLinkWatchdogState,
  stepLinkWatchdogWithActions,
  type LinkWatchdogAction,
  type LinkWatchdogState,
  type LinkStatusValue
} from "./link-watchdog.js";

export interface LinkSessionState {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
  readonly status: LinkStatusValue;
  readonly watchdog: LinkWatchdogState;
  readonly established: boolean;
}

export type LinkSessionEvent =
  | Event
  | { readonly kind: "session/request-link"; readonly at: number }
  | { readonly kind: "session/link-proof"; readonly at: number; readonly rtt: number }
  | { readonly kind: "session/inbound"; readonly at: number }
  | { readonly kind: "session/close" };

export type LinkSessionAction =
  | { readonly kind: "send-link-request"; readonly peerId: string }
  | { readonly kind: "send-link-proof"; readonly peerId: string }
  | LinkWatchdogAction;

export interface LinkSessionStepResult {
  readonly state: LinkSessionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkSessionAction[];
}

export function initialLinkSessionState(options: {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
  readonly requestTime?: number;
}): LinkSessionState {
  return {
    role: options.role,
    peerId: options.peerId,
    status: LinkStatus.PENDING,
    watchdog: initialLinkWatchdogState({
      initiator: options.role === "initiator",
      requestTime: options.requestTime ?? 0
    }),
    established: false
  };
}

export const stepLinkSession: StepFn<LinkSessionState> = (state, event) => {
  const result = stepLinkSessionWithActions(state, event as LinkSessionEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkSessionWithActions(
  state: LinkSessionState,
  event: LinkSessionEvent
): LinkSessionStepResult {
  if (event.kind === "session/close") {
    return {
      state: {
        ...state,
        status: LinkStatus.CLOSED,
        established: false,
        watchdog: { ...state.watchdog, status: LinkStatus.CLOSED }
      },
      intents: [],
      actions: [{ kind: "close", reason: LinkTeardownReason.INITIATOR_CLOSED }]
    };
  }

  if (event.kind === "session/request-link") {
    if (state.role !== "initiator") {
      return { state, intents: [], actions: [] };
    }
    const watchdog = stepLinkWatchdogWithActions(
      {
        ...state.watchdog,
        requestTime: event.at,
        status: LinkStatus.PENDING
      },
      { kind: "link/watchdog-start" }
    );
    return {
      state: {
        ...state,
        status: LinkStatus.PENDING,
        watchdog: watchdog.state
      },
      intents: watchdog.intents,
      actions: [{ kind: "send-link-request", peerId: state.peerId }]
    };
  }

  if (event.kind === "session/link-proof") {
    let watchdog = stepLinkWatchdogWithActions(state.watchdog, {
      kind: "link/status",
      status: LinkStatus.ACTIVE,
      activatedAt: event.at
    }).state;
    watchdog = stepLinkWatchdogWithActions(watchdog, {
      kind: "link/rtt-measured",
      rtt: event.rtt
    }).state;
    watchdog = stepLinkWatchdogWithActions(watchdog, {
      kind: "link/inbound",
      at: event.at
    }).state;
    const start = stepLinkWatchdogWithActions(watchdog, { kind: "link/watchdog-start" });

    const actions: LinkSessionAction[] = [];
    if (state.role === "responder") {
      actions.push({ kind: "send-link-proof", peerId: state.peerId });
    }

    return {
      state: {
        ...state,
        status: LinkStatus.ACTIVE,
        established: true,
        watchdog: start.state
      },
      intents: start.intents,
      actions
    };
  }

  if (event.kind === "session/inbound") {
    const watchdog = stepLinkWatchdogWithActions(state.watchdog, {
      kind: "link/inbound",
      at: event.at
    });
    return {
      state: { ...state, watchdog: watchdog.state },
      intents: [],
      actions: []
    };
  }

  if (event.kind === "timer/fired" && event.id === "link-watchdog") {
    const tick = stepLinkWatchdogWithActions(state.watchdog, event);
    return {
      state: {
        ...state,
        status: tick.state.status,
        established: tick.state.status === LinkStatus.ACTIVE,
        watchdog: tick.state
      },
      intents: tick.intents,
      actions: tick.actions
    };
  }

  if (event.kind === "start") {
    return { state, intents: [], actions: [] };
  }

  return { state, intents: [], actions: [] };
}
