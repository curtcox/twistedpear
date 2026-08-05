/** Extracted from channel-window.ts; the original module remains the public composition point. */
/**
 * Pure RNS Channel congestion window + packet timeout decisions.
 * Adapters own send/resend/timers; this owns window sizing and timeout formulas.
 * Packet-timeout-seconds / packet-timeout plan / TX outstanding / send-allow /
 * outlet-transmit / TX-envelope index / TX timeout / arm-packet-receipt /
 * extend-packet-receipt-timeout conclusions leave via machine actions (no
 * ad-hoc `channelPacketTimeoutSeconds` / `planChannelPacketTimeout` /
 * `countChannelTxOutstanding` / `channelAllowsSend` /
 * `isChannelOutletTransmitOk` / `indexOfChannelTxEnvelope` /
 * `canArmChannelPacketReceipt` / `shouldExtendPacketReceiptTimeout` /
 * `plan.kind` reads beside the step).
 * TX receipt-timeout refresh nests packet-timeout-seconds via
 * `stepChannelPacketTimeoutSecondsWithActions` (`use-timeout`) and the refresh
 * plan via {@link stepChannelTxReceiptTimeoutRefreshPlanWithActions} (`extend`).
 * TX timeout nests envelope-op via `stepChannelTxEnvelopeOpWithActions`
 * (`miss`|`process`; plan nested via {@link stepChannelTxEnvelopeOpPlanWithActions})
 * and packet-timeout via `stepChannelPacketTimeoutWithActions`
 * (`ignore`|`give-up`|`retry`; plan nested via
 * {@link stepChannelPacketTimeoutPlanWithActions}: ignore|give-up|retry).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { equalByteArrays } from "../path-table.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { ChannelWindowLimits } from "./part-1.js";
import {
  channelTxEnvelopeOpPlanFromActions,
  planChannelTxEnvelopeOp,
} from "./part-2.js";
import type { ChannelWindowState } from "./part-1.js";
import type {
  ChannelTxEnvelopeOpAction,
  ChannelTxEnvelopeOpEvent,
  ChannelTxEnvelopeOpPlanAction,
  ChannelTxEnvelopeOpPlanEvent,
} from "./part-2.js";
/**
 * Channel TX-envelope-op plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelTxEnvelopeOp`
 * / `plan === "miss"` reads beside the step). Nested under
 * {@link stepChannelTxEnvelopeOpWithActions}.
 */
export type ChannelTxEnvelopeOpPlanState = Record<string, never>;

export interface ChannelTxEnvelopeOpPlanStepResult {
  readonly state: ChannelTxEnvelopeOpPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxEnvelopeOpPlanAction[];
}

export function initialChannelTxEnvelopeOpPlanState(): ChannelTxEnvelopeOpPlanState {
  return {};
}

export function stepChannelTxEnvelopeOpPlanWithActions(
  state: ChannelTxEnvelopeOpPlanState,
  event: ChannelTxEnvelopeOpPlanEvent,
): ChannelTxEnvelopeOpPlanStepResult {
  if (event.kind === "channel/tx-envelope-op-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planChannelTxEnvelopeOp({
            indexOk: event.indexOk,
            envelopePresent: event.envelopePresent,
            ...(event.opOk !== undefined ? { opOk: event.opOk } : {}),
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMissChannelTxEnvelopeOpPlan(
  actions: ReadonlyArray<ChannelTxEnvelopeOpPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "miss");
}

export function shouldProcessChannelTxEnvelopeOpPlan(
  actions: ReadonlyArray<ChannelTxEnvelopeOpPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "process");
}

/**
 * Channel TX-envelope op gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelTxEnvelopeOp`
 * / `plan === "miss"` reads beside the step).
 * Plan nested via {@link stepChannelTxEnvelopeOpPlanWithActions}
 * (`miss`|`process`).
 */
export type ChannelTxEnvelopeOpState = Record<string, never>;

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
  event: ChannelTxEnvelopeOpEvent,
): ChannelTxEnvelopeOpStepResult {
  if (event.kind === "channel/tx-envelope-op-gate") {
    const planActions = stepChannelTxEnvelopeOpPlanWithActions(
      initialChannelTxEnvelopeOpPlanState(),
      {
        kind: "channel/tx-envelope-op-plan-gate",
        indexOk: event.indexOk,
        envelopePresent: event.envelopePresent,
        ...(event.opOk !== undefined ? { opOk: event.opOk } : {}),
      },
    ).actions;
    const plan = channelTxEnvelopeOpPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMissChannelTxEnvelopeOp(
  actions: ReadonlyArray<ChannelTxEnvelopeOpAction>,
): boolean {
  return actions.some((action) => action.kind === "miss");
}

export function shouldProcessChannelTxEnvelopeOp(
  actions: ReadonlyArray<ChannelTxEnvelopeOpAction>,
): boolean {
  return actions.some((action) => action.kind === "process");
}

/** Whether channel outlet arming should apply a non-null receipt timeout. */
export function shouldApplyChannelPacketReceiptTimeout(
  timeoutPresent: boolean,
): boolean {
  return timeoutPresent;
}

/**
 * Channel packet-receipt timeout apply gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyChannelPacketReceiptTimeout` reads beside the step).
 */
export type ApplyChannelPacketReceiptTimeoutState = Record<string, never>;

export type ApplyChannelPacketReceiptTimeoutEvent =
  | Event
  | {
      readonly kind: "channel/apply-packet-receipt-timeout-gate";
      readonly timeoutPresent: boolean;
    };

export type ApplyChannelPacketReceiptTimeoutAction =
  { readonly kind: "apply" } | { readonly kind: "skip" };

export interface ApplyChannelPacketReceiptTimeoutStepResult {
  readonly state: ApplyChannelPacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyChannelPacketReceiptTimeoutAction[];
}

export function initialApplyChannelPacketReceiptTimeoutState(): ApplyChannelPacketReceiptTimeoutState {
  return {};
}

export function stepApplyChannelPacketReceiptTimeoutWithActions(
  state: ApplyChannelPacketReceiptTimeoutState,
  event: ApplyChannelPacketReceiptTimeoutEvent,
): ApplyChannelPacketReceiptTimeoutStepResult {
  if (event.kind === "channel/apply-packet-receipt-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyChannelPacketReceiptTimeout(event.timeoutPresent)
            ? "apply"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyChannelPacketReceiptTimeoutNow(
  actions: ReadonlyArray<ApplyChannelPacketReceiptTimeoutAction>,
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyChannelPacketReceiptTimeout(
  actions: ReadonlyArray<ApplyChannelPacketReceiptTimeoutAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a successful resend should replace the envelope's tracked packet. */
export function shouldReplaceChannelResentPacket(
  resentPresent: boolean,
): boolean {
  return resentPresent;
}

/**
 * Channel resent-packet replace gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReplaceChannelResentPacket`
 * reads beside the step).
 */
export type ReplaceChannelResentPacketState = Record<string, never>;

export type ReplaceChannelResentPacketEvent =
  | Event
  | {
      readonly kind: "channel/replace-resent-packet-gate";
      readonly resentPresent: boolean;
    };

export type ReplaceChannelResentPacketAction =
  { readonly kind: "replace" } | { readonly kind: "skip" };

export interface ReplaceChannelResentPacketStepResult {
  readonly state: ReplaceChannelResentPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReplaceChannelResentPacketAction[];
}

export function initialReplaceChannelResentPacketState(): ReplaceChannelResentPacketState {
  return {};
}

export function stepReplaceChannelResentPacketWithActions(
  state: ReplaceChannelResentPacketState,
  event: ReplaceChannelResentPacketEvent,
): ReplaceChannelResentPacketStepResult {
  if (event.kind === "channel/replace-resent-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReplaceChannelResentPacket(event.resentPresent)
            ? "replace"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReplaceChannelResentPacketNow(
  actions: ReadonlyArray<ReplaceChannelResentPacketAction>,
): boolean {
  return actions.some((action) => action.kind === "replace");
}

export function shouldSkipReplaceChannelResentPacket(
  actions: ReadonlyArray<ReplaceChannelResentPacketAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a timed-out channel envelope still has a packet to resend. */
export function shouldResendChannelTimeoutPacket(
  packetPresent: boolean,
): boolean {
  return packetPresent;
}

/**
 * Channel TX-timeout resend gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldResendChannelTimeoutPacket`
 * reads beside the step).
 */
export type ResendChannelTimeoutPacketState = Record<string, never>;

export type ResendChannelTimeoutPacketEvent =
  | Event
  | {
      readonly kind: "channel/resend-timeout-packet-gate";
      readonly packetPresent: boolean;
    };

export type ResendChannelTimeoutPacketAction =
  { readonly kind: "resend" } | { readonly kind: "skip" };

export interface ResendChannelTimeoutPacketStepResult {
  readonly state: ResendChannelTimeoutPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResendChannelTimeoutPacketAction[];
}

export function initialResendChannelTimeoutPacketState(): ResendChannelTimeoutPacketState {
  return {};
}

export function stepResendChannelTimeoutPacketWithActions(
  state: ResendChannelTimeoutPacketState,
  event: ResendChannelTimeoutPacketEvent,
): ResendChannelTimeoutPacketStepResult {
  if (event.kind === "channel/resend-timeout-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldResendChannelTimeoutPacket(event.packetPresent)
            ? "resend"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldResendChannelTimeoutPacketNow(
  actions: ReadonlyArray<ResendChannelTimeoutPacketAction>,
): boolean {
  return actions.some((action) => action.kind === "resend");
}

export function shouldSkipResendChannelTimeoutPacket(
  actions: ReadonlyArray<ResendChannelTimeoutPacketAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether shutdown may clear outlet callbacks for a TX-ring envelope packet. */
export function shouldClearChannelEnvelopePacket(
  packetPresent: boolean,
): boolean {
  return packetPresent;
}

/**
 * Channel envelope-packet clear gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldClearChannelEnvelopePacket`
 * reads beside the step).
 */
export type ClearChannelEnvelopePacketState = Record<string, never>;

export type ClearChannelEnvelopePacketEvent =
  | Event
  | {
      readonly kind: "channel/clear-envelope-packet-gate";
      readonly packetPresent: boolean;
    };

export type ClearChannelEnvelopePacketAction =
  { readonly kind: "clear" } | { readonly kind: "skip" };

export interface ClearChannelEnvelopePacketStepResult {
  readonly state: ClearChannelEnvelopePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClearChannelEnvelopePacketAction[];
}

export function initialClearChannelEnvelopePacketState(): ClearChannelEnvelopePacketState {
  return {};
}

export function stepClearChannelEnvelopePacketWithActions(
  state: ClearChannelEnvelopePacketState,
  event: ClearChannelEnvelopePacketEvent,
): ClearChannelEnvelopePacketStepResult {
  if (event.kind === "channel/clear-envelope-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldClearChannelEnvelopePacket(event.packetPresent)
            ? "clear"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClearChannelEnvelopePacketNow(
  actions: ReadonlyArray<ClearChannelEnvelopePacketAction>,
): boolean {
  return actions.some((action) => action.kind === "clear");
}

export function shouldSkipClearChannelEnvelopePacket(
  actions: ReadonlyArray<ClearChannelEnvelopePacketAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Shrink window after a packet timeout / retry. */
export function applyChannelTimeout(
  state: ChannelWindowState,
): ChannelWindowState {
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
  rtt: number,
): ChannelWindowState {
  let {
    window,
    windowMax,
    windowMin,
    windowFlexibility,
    fastRateRounds,
    mediumRateRounds,
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
      mediumRateRounds,
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
    mediumRateRounds,
  };
}

/** Default max TX tries for a channel envelope (RNS Channel). */
export const CHANNEL_MAX_TRIES = 5;
