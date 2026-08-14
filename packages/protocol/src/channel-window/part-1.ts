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
import { firstAction, firstActionOfKind, hasActionOfKind } from "../action-kind.js";

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
  WINDOW_FLEXIBILITY: 4,
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
      mediumRateRounds: 0,
    };
  }

  return {
    window: ChannelWindowLimits.WINDOW,
    windowMax: ChannelWindowLimits.WINDOW_MAX_SLOW,
    windowMin: ChannelWindowLimits.WINDOW_MIN,
    windowFlexibility: ChannelWindowLimits.WINDOW_FLEXIBILITY,
    fastRateRounds: 0,
    mediumRateRounds: 0,
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
  event: ChannelPacketTimeoutSecondsEvent,
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
            txRingLength: event.txRingLength,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelPacketTimeout(
  actions: ReadonlyArray<ChannelPacketTimeoutSecondsAction>,
): boolean {
  return hasActionOfKind(actions, "use-timeout");
}

/** Extract packet timeout from step actions; null when no `use-timeout`. */
export function channelPacketTimeoutFromActions(
  actions: ReadonlyArray<ChannelPacketTimeoutSecondsAction>,
): number | null {
  return firstActionOfKind(actions, "use-timeout")?.timeout ?? null;
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
  { readonly kind: "allow" } | { readonly kind: "deny" };

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
  event: ChannelAllowsSendEvent,
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
            window: event.window,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowChannelSend(
  actions: ReadonlyArray<ChannelAllowsSendAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyChannelSend(
  actions: ReadonlyArray<ChannelAllowsSendAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
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
  if (
    input.packedLength !== null &&
    !linkPayloadFitsMdu(input.packedLength, input.mdu)
  ) {
    return "too-big";
  }
  return "proceed";
}

/**
 * Channel-send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepChannelSendWithActions}.
 */
export type ChannelSendPlanState = Record<string, never>;

export type ChannelSendPlanEvent =
  | Event
  | {
      readonly kind: "channel/send-plan-gate";
      readonly ready: boolean;
      readonly packedLength: number | null;
      readonly mdu: number;
    };

export type ChannelSendPlanAction = { readonly kind: ChannelSendPlan };

export interface ChannelSendPlanStepResult {
  readonly state: ChannelSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelSendPlanAction[];
}

export function initialChannelSendPlanState(): ChannelSendPlanState {
  return {};
}

export function stepChannelSendPlanWithActions(
  state: ChannelSendPlanState,
  event: ChannelSendPlanEvent,
): ChannelSendPlanStepResult {
  if (event.kind === "channel/send-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planChannelSend({
            ready: event.ready,
            packedLength: event.packedLength,
            mdu: event.mdu,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the send plan from actions; null when empty. */
export function channelSendPlanFromActions(
  actions: ReadonlyArray<ChannelSendPlanAction>,
): ChannelSendPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

export function shouldProceedChannelSendPlan(
  actions: ReadonlyArray<ChannelSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectChannelSendPlanLinkNotReady(
  actions: ReadonlyArray<ChannelSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "link-not-ready");
}

export function shouldRejectChannelSendPlanTooBig(
  actions: ReadonlyArray<ChannelSendPlanAction>,
): boolean {
  return hasActionOfKind(actions, "too-big");
}

/**
 * Channel send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelSendPlanWithActions}
 * (`proceed`|`link-not-ready`|`too-big`).
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

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelSendPlanWithActions}
 * (`proceed`|`link-not-ready`|`too-big`).
 */
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
  event: ChannelSendEvent,
): ChannelSendStepResult {
  return stepChannelSendInner(state, event);
}

export function shouldProceedChannelSend(
  actions: ReadonlyArray<ChannelSendAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectChannelSendLinkNotReady(
  actions: ReadonlyArray<ChannelSendAction>,
): boolean {
  return hasActionOfKind(actions, "link-not-ready");
}

export function shouldRejectChannelSendTooBig(
  actions: ReadonlyArray<ChannelSendAction>,
): boolean {
  return hasActionOfKind(actions, "too-big");
}

function stepChannelSendInner(
  state: ChannelSendState,
  event: ChannelSendEvent,
): ChannelSendStepResult {
  if (event.kind === "channel/send-gate") {
    const planActions = stepChannelSendPlanWithActions(
      initialChannelSendPlanState(),
      {
        kind: "channel/send-plan-gate",
        ready: event.ready,
        packedLength: event.packedLength,
        mdu: event.mdu,
      },
    ).actions;
    const plan = channelSendPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
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
 * Channel outlet-transmit gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isChannelOutletTransmitOk`
 * reads beside the step).
 */
export type ChannelOutletTransmitState = Record<string, never>;

export type ChannelOutletTransmitEvent =
  | Event
  | {
      readonly kind: "channel/outlet-transmit-gate";
      readonly packetPresent: boolean;
      readonly rawLength: number;
      readonly receiptPresent: boolean;
    };

export type ChannelOutletTransmitAction =
  { readonly kind: "ok" } | { readonly kind: "reject" };

export interface ChannelOutletTransmitStepResult {
  readonly state: ChannelOutletTransmitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelOutletTransmitAction[];
}

export function initialChannelOutletTransmitState(): ChannelOutletTransmitState {
  return {};
}
