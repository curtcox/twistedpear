/**
 * Pure RNS Channel congestion window + packet timeout decisions.
 * Adapters own send/resend/timers; this owns window sizing and timeout formulas.
 * Packet-timeout-seconds / TX outstanding / send-allow / TX timeout conclusions
 * leave via machine actions (no ad-hoc `channelPacketTimeoutSeconds` /
 * `countChannelTxOutstanding` / `channelAllowsSend` / `plan.kind` reads beside
 * the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { equalByteArrays } from "./path-table.js";
import { linkPayloadFitsMdu } from "./link-metrics.js";

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

/**
 * Channel packet-timeout-seconds computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `channelPacketTimeoutSeconds` reads
 * beside the step).
 */
export type ChannelPacketTimeoutSecondsState = Record<string, never>;

export type ChannelPacketTimeoutSecondsEvent =
  | Event
  | {
      readonly kind: "channel/packet-timeout-gate";
      readonly tries: number;
      readonly rtt: number;
      readonly txRingLength: number;
    };

export type ChannelPacketTimeoutSecondsAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};

export interface ChannelPacketTimeoutSecondsStepResult {
  readonly state: ChannelPacketTimeoutSecondsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelPacketTimeoutSecondsAction[];
}

export function initialChannelPacketTimeoutSecondsState(): ChannelPacketTimeoutSecondsState {
  return {};
}

export function stepChannelPacketTimeoutSecondsWithActions(
  state: ChannelPacketTimeoutSecondsState,
  event: ChannelPacketTimeoutSecondsEvent
): ChannelPacketTimeoutSecondsStepResult {
  if (event.kind === "channel/packet-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-timeout",
          timeout: channelPacketTimeoutSeconds({
            tries: event.tries,
            rtt: event.rtt,
            txRingLength: event.txRingLength
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelPacketTimeout(
  actions: ReadonlyArray<ChannelPacketTimeoutSecondsAction>
): boolean {
  return actions.some((action) => action.kind === "use-timeout");
}

/** Extract packet timeout from step actions; null when no `use-timeout`. */
export function channelPacketTimeoutFromActions(
  actions: ReadonlyArray<ChannelPacketTimeoutSecondsAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-timeout");
  return action?.kind === "use-timeout" ? action.timeout : null;
}

export function channelAllowsSend(input: {
  readonly isUsable: boolean;
  readonly outstanding: number;
  readonly window: number;
}): boolean {
  return input.isUsable && input.outstanding < input.window;
}

/**
 * Channel send-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `channelAllowsSend` reads
 * beside the step).
 */
export type ChannelAllowsSendState = Record<string, never>;

export type ChannelAllowsSendEvent =
  | Event
  | {
      readonly kind: "channel/allows-send-gate";
      readonly isUsable: boolean;
      readonly outstanding: number;
      readonly window: number;
    };

export type ChannelAllowsSendAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface ChannelAllowsSendStepResult {
  readonly state: ChannelAllowsSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelAllowsSendAction[];
}

export function initialChannelAllowsSendState(): ChannelAllowsSendState {
  return {};
}

export function stepChannelAllowsSendWithActions(
  state: ChannelAllowsSendState,
  event: ChannelAllowsSendEvent
): ChannelAllowsSendStepResult {
  if (event.kind === "channel/allows-send-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: channelAllowsSend({
            isUsable: event.isUsable,
            outstanding: event.outstanding,
            window: event.window
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowChannelSend(
  actions: ReadonlyArray<ChannelAllowsSendAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyChannelSend(
  actions: ReadonlyArray<ChannelAllowsSendAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/**
 * Channel send gate: ready-to-send and packed-payload MDU fitness.
 * Pass `packedLength: null` to check readiness only (before pack).
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ChannelSendPlan = "proceed" | "link-not-ready" | "too-big";

export function planChannelSend(input: {
  readonly ready: boolean;
  readonly packedLength: number | null;
  readonly mdu: number;
}): ChannelSendPlan {
  if (!input.ready) {
    return "link-not-ready";
  }
  if (input.packedLength !== null && !linkPayloadFitsMdu(input.packedLength, input.mdu)) {
    return "too-big";
  }
  return "proceed";
}

/**
 * Channel send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ChannelSendState = Record<string, never>;

export type ChannelSendEvent =
  | Event
  | {
      readonly kind: "channel/send-gate";
      readonly ready: boolean;
      readonly packedLength: number | null;
      readonly mdu: number;
    };

export type ChannelSendAction = { readonly kind: ChannelSendPlan };

export interface ChannelSendStepResult {
  readonly state: ChannelSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelSendAction[];
}

export function initialChannelSendState(): ChannelSendState {
  return {};
}

export const stepChannelSend: StepFn<ChannelSendState> = (state, event) => {
  const result = stepChannelSendInner(state, event as ChannelSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepChannelSendWithActions(
  state: ChannelSendState,
  event: ChannelSendEvent
): ChannelSendStepResult {
  return stepChannelSendInner(state, event);
}

export function shouldProceedChannelSend(actions: ReadonlyArray<ChannelSendAction>): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectChannelSendLinkNotReady(
  actions: ReadonlyArray<ChannelSendAction>
): boolean {
  return actions.some((action) => action.kind === "link-not-ready");
}

export function shouldRejectChannelSendTooBig(actions: ReadonlyArray<ChannelSendAction>): boolean {
  return actions.some((action) => action.kind === "too-big");
}

function stepChannelSendInner(
  state: ChannelSendState,
  event: ChannelSendEvent
): ChannelSendStepResult {
  if (event.kind === "channel/send-gate") {
    const plan = planChannelSend({
      ready: event.ready,
      packedLength: event.packedLength,
      mdu: event.mdu
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether an outlet send result is usable for TX tracking (non-empty packet with a receipt).
 */
export function isChannelOutletTransmitOk(input: {
  readonly packetPresent: boolean;
  readonly rawLength: number;
  readonly receiptPresent: boolean;
}): boolean {
  return input.packetPresent && input.rawLength > 0 && input.receiptPresent;
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

/**
 * Channel TX-outstanding count is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `countChannelTxOutstanding`
 * reads beside the step).
 */
export type CountChannelTxOutstandingState = Record<string, never>;

export type CountChannelTxOutstandingEvent =
  | Event
  | {
      readonly kind: "channel/tx-outstanding-gate";
      readonly entries: ReadonlyArray<{
        readonly packetPresent: boolean;
        readonly delivered: boolean;
      }>;
    };

export type CountChannelTxOutstandingAction = {
  readonly kind: "use-count";
  readonly count: number;
};

export interface CountChannelTxOutstandingStepResult {
  readonly state: CountChannelTxOutstandingState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CountChannelTxOutstandingAction[];
}

export function initialCountChannelTxOutstandingState(): CountChannelTxOutstandingState {
  return {};
}

export function stepCountChannelTxOutstandingWithActions(
  state: CountChannelTxOutstandingState,
  event: CountChannelTxOutstandingEvent
): CountChannelTxOutstandingStepResult {
  if (event.kind === "channel/tx-outstanding-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-count",
          count: countChannelTxOutstanding(event.entries)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelTxOutstandingCount(
  actions: ReadonlyArray<CountChannelTxOutstandingAction>
): boolean {
  return actions.some((action) => action.kind === "use-count");
}

/** Extract outstanding count from step actions; null when no `use-count`. */
export function channelTxOutstandingCountFromActions(
  actions: ReadonlyArray<CountChannelTxOutstandingAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-count");
  return action?.kind === "use-count" ? action.count : null;
}

/** Whether channel TX timeout refresh / receipt callback arming may use a packet receipt. */
export function canArmChannelPacketReceipt(receiptPresent: boolean): boolean {
  return receiptPresent;
}

/** Whether a recomputed channel packet timeout should replace the receipt's current timeout. */
export function shouldExtendPacketReceiptTimeout(input: {
  readonly currentTimeout: number | null;
  readonly updatedTimeout: number;
}): boolean {
  return input.currentTimeout !== null && input.updatedTimeout > input.currentTimeout;
}

/**
 * Find a TX-ring envelope by outlet packet id.
 * Packet-id extraction stays at the adapter edge.
 */
export function indexOfChannelTxEnvelope(input: {
  readonly packetIds: ReadonlyArray<Uint8Array | null>;
  readonly targetId: Uint8Array | null;
}): number | null {
  if (input.targetId === null) {
    return null;
  }
  for (let index = 0; index < input.packetIds.length; index += 1) {
    const packetId = input.packetIds[index];
    if (packetId != null && equalByteArrays(packetId, input.targetId)) {
      return index;
    }
  }
  return null;
}

export type ChannelTxEnvelopeOpPlan = "miss" | "process";

/**
 * Whether a TX-ring lookup may operate on the envelope (timeout/delivery).
 * Pass `opOk: false` when a delivery op declined the envelope.
 */
export function planChannelTxEnvelopeOp(input: {
  readonly indexOk: boolean;
  readonly envelopePresent: boolean;
  readonly opOk?: boolean;
}): ChannelTxEnvelopeOpPlan {
  if (!input.indexOk || !input.envelopePresent || input.opOk === false) {
    return "miss";
  }
  return "process";
}

/**
 * Channel TX-envelope op gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelTxEnvelopeOp`
 * / `plan === "miss"` reads beside the step).
 */
export type ChannelTxEnvelopeOpState = Record<string, never>;

export type ChannelTxEnvelopeOpEvent =
  | Event
  | {
      readonly kind: "channel/tx-envelope-op-gate";
      readonly indexOk: boolean;
      readonly envelopePresent: boolean;
      readonly opOk?: boolean;
    };

export type ChannelTxEnvelopeOpAction =
  | { readonly kind: "miss" }
  | { readonly kind: "process" };

export interface ChannelTxEnvelopeOpStepResult {
  readonly state: ChannelTxEnvelopeOpState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxEnvelopeOpAction[];
}

export function initialChannelTxEnvelopeOpState(): ChannelTxEnvelopeOpState {
  return {};
}

export function stepChannelTxEnvelopeOpWithActions(
  state: ChannelTxEnvelopeOpState,
  event: ChannelTxEnvelopeOpEvent
): ChannelTxEnvelopeOpStepResult {
  if (event.kind === "channel/tx-envelope-op-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planChannelTxEnvelopeOp({
            indexOk: event.indexOk,
            envelopePresent: event.envelopePresent,
            ...(event.opOk !== undefined ? { opOk: event.opOk } : {})
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMissChannelTxEnvelopeOp(
  actions: ReadonlyArray<ChannelTxEnvelopeOpAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

export function shouldProcessChannelTxEnvelopeOp(
  actions: ReadonlyArray<ChannelTxEnvelopeOpAction>
): boolean {
  return actions.some((action) => action.kind === "process");
}

/** Whether channel outlet arming should apply a non-null receipt timeout. */
export function shouldApplyChannelPacketReceiptTimeout(timeoutPresent: boolean): boolean {
  return timeoutPresent;
}

/** Whether a successful resend should replace the envelope's tracked packet. */
export function shouldReplaceChannelResentPacket(resentPresent: boolean): boolean {
  return resentPresent;
}

/** Whether a timed-out channel envelope still has a packet to resend. */
export function shouldResendChannelTimeoutPacket(packetPresent: boolean): boolean {
  return packetPresent;
}

/** Whether shutdown may clear outlet callbacks for a TX-ring envelope packet. */
export function shouldClearChannelEnvelopePacket(packetPresent: boolean): boolean {
  return packetPresent;
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

/**
 * Channel TX-timeout step: compose envelope miss / ignore / give-up / retry
 * with window shrink. Adapters apply give-up (shutdown) and retry (resend +
 * re-arm) only from actions — not by reading `plan.kind` beside the step.
 */
export type ChannelTxTimeoutEvent =
  | Event
  | {
      readonly kind: "channel/tx-timeout";
      readonly indexOk: boolean;
      readonly envelopePresent: boolean;
      readonly delivered: boolean;
      readonly tries: number;
      readonly maxTries: number;
      readonly packetPresent: boolean;
    };

export type ChannelTxTimeoutAction =
  | { readonly kind: "give-up" }
  | { readonly kind: "retry"; readonly nextTries: number; readonly resend: boolean };

export interface ChannelTxTimeoutStepResult {
  readonly state: ChannelWindowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxTimeoutAction[];
}

export const stepChannelTxTimeout: StepFn<ChannelWindowState> = (state, event) => {
  const result = stepChannelTxTimeoutInner(state, event as ChannelTxTimeoutEvent);
  return { state: result.state, intents: result.intents };
};

export function stepChannelTxTimeoutWithActions(
  state: ChannelWindowState,
  event: ChannelTxTimeoutEvent
): ChannelTxTimeoutStepResult {
  return stepChannelTxTimeoutInner(state, event);
}

function stepChannelTxTimeoutInner(
  state: ChannelWindowState,
  event: ChannelTxTimeoutEvent
): ChannelTxTimeoutStepResult {
  if (event.kind !== "channel/tx-timeout") {
    return { state, intents: [], actions: [] };
  }

  if (
    planChannelTxEnvelopeOp({
      indexOk: event.indexOk,
      envelopePresent: event.envelopePresent
    }) === "miss"
  ) {
    return { state, intents: [], actions: [] };
  }

  const plan = planChannelPacketTimeout({
    delivered: event.delivered,
    tries: event.tries,
    maxTries: event.maxTries
  });

  if (plan.kind === "ignore") {
    return { state, intents: [], actions: [] };
  }

  if (plan.kind === "give-up") {
    return { state, intents: [], actions: [{ kind: "give-up" }] };
  }

  return {
    state: applyChannelTimeout(state),
    intents: [],
    actions: [
      {
        kind: "retry",
        nextTries: plan.nextTries,
        resend: shouldResendChannelTimeoutPacket(event.packetPresent)
      }
    ]
  };
}

/** Whether step actions include a give-up for channel TX timeout. */
export function shouldGiveUpChannelTxTimeout(
  actions: ReadonlyArray<ChannelTxTimeoutAction>
): boolean {
  return actions.some((action) => action.kind === "give-up");
}

/** Whether step actions include a retry for channel TX timeout. */
export function shouldRetryChannelTxTimeout(
  actions: ReadonlyArray<ChannelTxTimeoutAction>
): boolean {
  return actions.some((action) => action.kind === "retry");
}

/** Extract the retry action from a TX-timeout step, if any. */
export function channelTxTimeoutRetryAction(
  actions: ReadonlyArray<ChannelTxTimeoutAction>
): Extract<ChannelTxTimeoutAction, { kind: "retry" }> | null {
  for (const action of actions) {
    if (action.kind === "retry") {
      return action;
    }
  }
  return null;
}

/**
 * Plan which TX-ring receipts need a longer timeout after a send/retry.
 * Adapter applies `setTimeout` only for returned indexes (no
 * `shouldExtend…` beside the loop).
 */
export function planChannelTxReceiptTimeoutRefresh(
  entries: ReadonlyArray<{
    readonly receiptPresent: boolean;
    readonly currentTimeout: number | null;
    readonly tries: number;
    readonly rtt: number;
    readonly txRingLength: number;
  }>
): ReadonlyArray<{ readonly index: number; readonly timeoutSeconds: number }> {
  const extensions: Array<{ index: number; timeoutSeconds: number }> = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (!canArmChannelPacketReceipt(entry.receiptPresent)) {
      continue;
    }
    const updatedTimeout = channelPacketTimeoutSeconds({
      tries: entry.tries,
      rtt: entry.rtt,
      txRingLength: entry.txRingLength
    });
    if (
      shouldExtendPacketReceiptTimeout({
        currentTimeout: entry.currentTimeout,
        updatedTimeout
      })
    ) {
      extensions.push({ index, timeoutSeconds: updatedTimeout });
    }
  }
  return extensions;
}

/** Whether the adapter should apply a planned receipt timeout extension. */
export function shouldApplyChannelTxReceiptTimeoutExtension(
  extensionPresent: boolean
): boolean {
  return extensionPresent;
}

/**
 * Channel TX receipt-timeout refresh is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planChannelTxReceiptTimeoutRefresh` reads beside the step).
 */
export type ChannelTxReceiptTimeoutRefreshState = Record<string, never>;

export type ChannelTxReceiptTimeoutRefreshEvent =
  | Event
  | {
      readonly kind: "channel/tx-receipt-timeout-refresh-gate";
      readonly entries: ReadonlyArray<{
        readonly receiptPresent: boolean;
        readonly currentTimeout: number | null;
        readonly tries: number;
        readonly rtt: number;
        readonly txRingLength: number;
      }>;
    };

export type ChannelTxReceiptTimeoutRefreshAction = {
  readonly kind: "extend";
  readonly index: number;
  readonly timeoutSeconds: number;
};

export interface ChannelTxReceiptTimeoutRefreshStepResult {
  readonly state: ChannelTxReceiptTimeoutRefreshState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxReceiptTimeoutRefreshAction[];
}

export function initialChannelTxReceiptTimeoutRefreshState(): ChannelTxReceiptTimeoutRefreshState {
  return {};
}

export function stepChannelTxReceiptTimeoutRefreshWithActions(
  state: ChannelTxReceiptTimeoutRefreshState,
  event: ChannelTxReceiptTimeoutRefreshEvent
): ChannelTxReceiptTimeoutRefreshStepResult {
  if (event.kind === "channel/tx-receipt-timeout-refresh-gate") {
    return {
      state,
      intents: [],
      actions: planChannelTxReceiptTimeoutRefresh(event.entries).map((extension) => ({
        kind: "extend" as const,
        index: extension.index,
        timeoutSeconds: extension.timeoutSeconds
      }))
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether step actions include a receipt timeout extension at `index`. */
export function shouldExtendChannelTxReceiptTimeout(
  actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshAction>
): boolean {
  return actions.some((action) => action.kind === "extend");
}

/** Extract extend actions for the adapter to apply `setTimeout`. */
export function channelTxReceiptTimeoutExtensions(
  actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshAction>
): ReadonlyArray<{ readonly index: number; readonly timeoutSeconds: number }> {
  return actions
    .filter((action): action is ChannelTxReceiptTimeoutRefreshAction => action.kind === "extend")
    .map((action) => ({ index: action.index, timeoutSeconds: action.timeoutSeconds }));
}
