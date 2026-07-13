/**
 * Pure RNS Channel congestion window + packet timeout decisions.
 * Adapters own send/resend/timers; this owns window sizing and timeout formulas.
 */
import type { Event, StepFn } from "@twistedpear/effects";

export const ChannelWindowLimits = {
  WINDOW: 2,
  WINDOW_MIN: 2,
  WINDOW_MIN_LIMIT_MEDIUM: 5,
  WINDOW_MIN_LIMIT_FAST: 16,
  WINDOW_MAX_SLOW: 5,
  WINDOW_MAX_MEDIUM: 12,
  WINDOW_MAX_FAST: 48,
  FAST_RATE_THRESHOLD: 10,
  RTT_FAST: 0.18,
  RTT_MEDIUM: 0.75,
  RTT_SLOW: 1.45,
  WINDOW_FLEXIBILITY: 4
} as const;

export interface ChannelWindowState {
  readonly window: number;
  readonly windowMax: number;
  readonly windowMin: number;
  readonly windowFlexibility: number;
  readonly fastRateRounds: number;
  readonly mediumRateRounds: number;
}

export function initialChannelWindowState(rtt: number): ChannelWindowState {
  if (rtt > ChannelWindowLimits.RTT_SLOW) {
    return {
      window: 1,
      windowMax: 1,
      windowMin: 1,
      windowFlexibility: 1,
      fastRateRounds: 0,
      mediumRateRounds: 0
    };
  }

  return {
    window: ChannelWindowLimits.WINDOW,
    windowMax: ChannelWindowLimits.WINDOW_MAX_SLOW,
    windowMin: ChannelWindowLimits.WINDOW_MIN,
    windowFlexibility: ChannelWindowLimits.WINDOW_FLEXIBILITY,
    fastRateRounds: 0,
    mediumRateRounds: 0
  };
}

export function channelPacketTimeoutSeconds(input: {
  readonly tries: number;
  readonly rtt: number;
  readonly txRingLength: number;
}): number {
  return (
    Math.pow(1.5, input.tries - 1) *
    Math.max(input.rtt * 2.5, 0.025) *
    (input.txRingLength + 1.5)
  );
}

export function channelAllowsSend(input: {
  readonly isUsable: boolean;
  readonly outstanding: number;
  readonly window: number;
}): boolean {
  return input.isUsable && input.outstanding < input.window;
}

/**
 * Count TX-ring entries that still occupy window (unsent or not yet delivered).
 * Packet presence / delivery status are supplied by the adapter.
 */
export function countChannelTxOutstanding(
  entries: ReadonlyArray<{ readonly packetPresent: boolean; readonly delivered: boolean }>
): number {
  let outstanding = 0;
  for (const entry of entries) {
    if (!entry.packetPresent || !entry.delivered) {
      outstanding += 1;
    }
  }
  return outstanding;
}

/** Whether a recomputed channel packet timeout should replace the receipt's current timeout. */
export function shouldExtendPacketReceiptTimeout(input: {
  readonly currentTimeout: number | null;
  readonly updatedTimeout: number;
}): boolean {
  return input.currentTimeout !== null && input.updatedTimeout > input.currentTimeout;
}

/** Shrink window after a packet timeout / retry. */
export function applyChannelTimeout(state: ChannelWindowState): ChannelWindowState {
  let window = state.window;
  let windowMax = state.windowMax;
  if (window > state.windowMin) {
    window -= 1;
  }
  if (windowMax > state.windowMin + state.windowFlexibility) {
    windowMax -= 1;
  }
  return { ...state, window, windowMax };
}

/** Grow window / upgrade rate tiers after a successful delivery. */
export function applyChannelDelivery(
  state: ChannelWindowState,
  rtt: number
): ChannelWindowState {
  let {
    window,
    windowMax,
    windowMin,
    windowFlexibility,
    fastRateRounds,
    mediumRateRounds
  } = state;

  if (window < windowMax) {
    window += 1;
  }

  if (rtt === 0) {
    return {
      window,
      windowMax,
      windowMin,
      windowFlexibility,
      fastRateRounds,
      mediumRateRounds
    };
  }

  if (rtt > ChannelWindowLimits.RTT_FAST) {
    fastRateRounds = 0;
  }

  if (rtt > ChannelWindowLimits.RTT_MEDIUM) {
    mediumRateRounds = 0;
  } else {
    mediumRateRounds += 1;
    if (
      windowMax < ChannelWindowLimits.WINDOW_MAX_MEDIUM &&
      mediumRateRounds === ChannelWindowLimits.FAST_RATE_THRESHOLD
    ) {
      windowMax = ChannelWindowLimits.WINDOW_MAX_MEDIUM;
      windowMin = ChannelWindowLimits.WINDOW_MIN_LIMIT_MEDIUM;
    }
  }

  if (rtt <= ChannelWindowLimits.RTT_FAST) {
    fastRateRounds += 1;
    if (
      windowMax < ChannelWindowLimits.WINDOW_MAX_FAST &&
      fastRateRounds === ChannelWindowLimits.FAST_RATE_THRESHOLD
    ) {
      windowMax = ChannelWindowLimits.WINDOW_MAX_FAST;
      windowMin = ChannelWindowLimits.WINDOW_MIN_LIMIT_FAST;
    }
  }

  return {
    window,
    windowMax,
    windowMin,
    windowFlexibility,
    fastRateRounds,
    mediumRateRounds
  };
}

/** Default max TX tries for a channel envelope (RNS Channel). */
export const CHANNEL_MAX_TRIES = 5;

/** Should the channel give up retrying this envelope? */
export function channelRetryExhausted(tries: number, maxTries: number = CHANNEL_MAX_TRIES): boolean {
  return tries >= maxTries;
}

export type ChannelPacketTimeoutPlan =
  | { readonly kind: "ignore" }
  | { readonly kind: "give-up" }
  | { readonly kind: "retry"; readonly nextTries: number };

/**
 * Plan TX timeout handling for one envelope.
 * Delivered check and try counting stay pure; resend/shutdown stay at the edge.
 */
export function planChannelPacketTimeout(input: {
  readonly delivered: boolean;
  readonly tries: number;
  readonly maxTries?: number;
}): ChannelPacketTimeoutPlan {
  if (input.delivered) {
    return { kind: "ignore" };
  }
  const maxTries = input.maxTries ?? CHANNEL_MAX_TRIES;
  if (channelRetryExhausted(input.tries, maxTries)) {
    return { kind: "give-up" };
  }
  return { kind: "retry", nextTries: input.tries + 1 };
}

export type ChannelWindowEvent =
  | Event
  | { readonly kind: "channel/init"; readonly rtt: number }
  | { readonly kind: "channel/timeout" }
  | { readonly kind: "channel/delivered"; readonly rtt: number };

export const stepChannelWindow: StepFn<ChannelWindowState> = (state, event) =>
  stepChannelWindowInner(state, event as ChannelWindowEvent);

function stepChannelWindowInner(
  state: ChannelWindowState,
  event: ChannelWindowEvent
): { state: ChannelWindowState; intents: [] } {
  if (event.kind === "channel/init") {
    return { state: initialChannelWindowState(event.rtt), intents: [] };
  }
  if (event.kind === "channel/timeout") {
    return { state: applyChannelTimeout(state), intents: [] };
  }
  if (event.kind === "channel/delivered") {
    return { state: applyChannelDelivery(state, event.rtt), intents: [] };
  }
  return { state, intents: [] };
}
