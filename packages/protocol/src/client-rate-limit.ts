/**
 * Pure per-client request rate limit (fixed 60s window).
 * Time arrives only as `now` on events — no wall clock.
 */
import type { Event, StepFn } from "@twistedpear/effects";

export const CLIENT_RATE_WINDOW_MS = 60_000;

export interface ClientRateBucket {
  readonly count: number;
  readonly windowStart: number;
}

export interface ClientRateLimitState {
  readonly limitPerWindow: number;
  readonly buckets: ReadonlyMap<string, ClientRateBucket>;
  readonly lastAllowed: boolean;
}

export type ClientRateLimitEvent =
  | Event
  | { readonly kind: "rate/configure"; readonly limitPerWindow: number }
  | { readonly kind: "rate/check"; readonly clientKey: string; readonly at: number };

export function initialClientRateLimitState(limitPerWindow: number): ClientRateLimitState {
  return {
    limitPerWindow,
    buckets: new Map(),
    lastAllowed: true
  };
}

export function stepClientRateLimit(
  state: ClientRateLimitState,
  event: ClientRateLimitEvent
): { state: ClientRateLimitState; intents: [] } {
  if (event.kind === "rate/configure") {
    return {
      state: { ...state, limitPerWindow: event.limitPerWindow },
      intents: []
    };
  }

  if (event.kind === "rate/check") {
    const existing = state.buckets.get(event.clientKey) ?? { count: 0, windowStart: event.at };
    const nextBucket: ClientRateBucket =
      event.at - existing.windowStart >= CLIENT_RATE_WINDOW_MS
        ? { count: 1, windowStart: event.at }
        : { count: existing.count + 1, windowStart: existing.windowStart };

    const buckets = new Map(state.buckets);
    buckets.set(event.clientKey, nextBucket);
    const lastAllowed = nextBucket.count <= state.limitPerWindow;
    return {
      state: { ...state, buckets, lastAllowed },
      intents: []
    };
  }

  return { state, intents: [] };
}

export const stepClientRateLimitFn: StepFn<ClientRateLimitState> = (state, event) =>
  stepClientRateLimit(state, event as ClientRateLimitEvent);

/** Convenience for adapters that keep a mutable Map of buckets. */
export function allowClientRequest(
  buckets: Map<string, ClientRateBucket>,
  clientKey: string,
  now: number,
  limitPerWindow: number
): boolean {
  const state = stepClientRateLimit(
    {
      limitPerWindow,
      buckets,
      lastAllowed: true
    },
    { kind: "rate/check", clientKey, at: now }
  ).state;
  buckets.clear();
  for (const [key, bucket] of state.buckets) {
    buckets.set(key, bucket);
  }
  return state.lastAllowed;
}
