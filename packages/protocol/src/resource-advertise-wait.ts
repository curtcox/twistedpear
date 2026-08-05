/**
 * Pure resource advertise-wait loop: queue until the link can accept a new resource.
 * Link readiness is observed only via probe actions; adapters schedule from timer intents
 * and conclude the Promise shell only via resolve actions.
 * Advertise-phase plan nested via {@link stepResourceAdvertisePhasePlanWithActions}
 * (`queue`|`advertise`).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  initialResourceAdvertisePhasePlanState,
  shouldAdvertiseResourceAdvertisePhasePlan,
  stepResourceAdvertisePhasePlanWithActions,
} from "./resource-status.js";

export const RESOURCE_ADVERTISE_WAIT_MS = 250;
export const RESOURCE_ADVERTISE_WAIT_TIMER_ID = "resource-advertise-wait";

export interface ResourceAdvertiseWaitState {
  readonly armed: boolean;
  readonly concluded: boolean;
}

export type ResourceAdvertiseWaitEvent =
  | Event
  | { readonly kind: "advertise-wait/arm" }
  | { readonly kind: "advertise-wait/link-ready"; readonly ready: boolean };

export type ResourceAdvertiseWaitAction =
  | { readonly kind: "probe" }
  | { readonly kind: "queue" }
  | { readonly kind: "resolve" };

export interface ResourceAdvertiseWaitStepResult {
  readonly state: ResourceAdvertiseWaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertiseWaitAction[];
}

export function initialResourceAdvertiseWaitState(): ResourceAdvertiseWaitState {
  return {
    armed: false,
    concluded: false,
  };
}

/** Whether the advertise-wait loop should keep probing link readiness. */
export function shouldContinueResourceAdvertiseWait(
  concluded: boolean,
): boolean {
  return !concluded;
}

export const stepResourceAdvertiseWait: StepFn<ResourceAdvertiseWaitState> = (
  state,
  event,
) => {
  const result = stepResourceAdvertiseWaitInner(
    state,
    event as ResourceAdvertiseWaitEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceAdvertiseWaitWithActions(
  state: ResourceAdvertiseWaitState,
  event: ResourceAdvertiseWaitEvent,
): ResourceAdvertiseWaitStepResult {
  return stepResourceAdvertiseWaitInner(state, event);
}

function stepResourceAdvertiseWaitInner(
  state: ResourceAdvertiseWaitState,
  event: ResourceAdvertiseWaitEvent,
): ResourceAdvertiseWaitStepResult {
  if (event.kind === "advertise-wait/arm") {
    return {
      state: { armed: true, concluded: false },
      intents: [],
      actions: [{ kind: "probe" }],
    };
  }

  if (event.kind === "advertise-wait/link-ready") {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    const planActions = stepResourceAdvertisePhasePlanWithActions(
      initialResourceAdvertisePhasePlanState(),
      {
        kind: "resource/advertise-phase-plan-gate",
        linkReady: event.ready,
      },
    ).actions;
    if (shouldAdvertiseResourceAdvertisePhasePlan(planActions)) {
      return {
        state: { ...state, concluded: true },
        intents: [
          {
            kind: "timer/cancel",
            timer: { id: RESOURCE_ADVERTISE_WAIT_TIMER_ID },
          },
        ],
        actions: [{ kind: "resolve" }],
      };
    }
    return {
      state,
      intents: [
        {
          kind: "timer/set",
          timer: {
            id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
            delayMs: RESOURCE_ADVERTISE_WAIT_MS,
          },
        },
      ],
      actions: [{ kind: "queue" }],
    };
  }

  if (
    event.kind === "timer/fired" &&
    event.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID
  ) {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "probe" }],
    };
  }

  return { state, intents: [], actions: [] };
}
