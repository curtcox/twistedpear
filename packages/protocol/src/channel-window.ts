/**
 * Pure RNS Channel congestion window + packet timeout decisions.
 * Adapters own send/resend/timers; this owns window sizing and timeout formulas.
 * Packet-timeout-seconds / TX outstanding / send-allow / outlet-transmit /
 * TX-envelope index / TX timeout / arm-packet-receipt /
 * extend-packet-receipt-timeout conclusions leave via machine actions (no
 * ad-hoc `channelPacketTimeoutSeconds` / `countChannelTxOutstanding` /
 * `channelAllowsSend` / `isChannelOutletTransmitOk` /
 * `indexOfChannelTxEnvelope` / `canArmChannelPacketReceipt` /
 * `shouldExtendPacketReceiptTimeout` / `plan.kind` reads beside the step).
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
  | { readonly kind: "ok" }
  | { readonly kind: "reject" };

export interface ChannelOutletTransmitStepResult {
  readonly state: ChannelOutletTransmitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelOutletTransmitAction[];
}

export function initialChannelOutletTransmitState(): ChannelOutletTransmitState {
  return {};
}

export function stepChannelOutletTransmitWithActions(
  state: ChannelOutletTransmitState,
  event: ChannelOutletTransmitEvent
): ChannelOutletTransmitStepResult {
  if (event.kind === "channel/outlet-transmit-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isChannelOutletTransmitOk({
            packetPresent: event.packetPresent,
            rawLength: event.rawLength,
            receiptPresent: event.receiptPresent
          })
            ? "ok"
            : "reject"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptChannelOutletTransmit(
  actions: ReadonlyArray<ChannelOutletTransmitAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelOutletTransmit(
  actions: ReadonlyArray<ChannelOutletTransmitAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
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

/**
 * Channel packet-receipt arm gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canArmChannelPacketReceipt`
 * reads beside the step).
 */
export type ArmChannelPacketReceiptState = Record<string, never>;

export type ArmChannelPacketReceiptEvent =
  | Event
  | {
      readonly kind: "channel/arm-packet-receipt-gate";
      readonly receiptPresent: boolean;
    };

export type ArmChannelPacketReceiptAction =
  | { readonly kind: "arm" }
  | { readonly kind: "skip" };

export interface ArmChannelPacketReceiptStepResult {
  readonly state: ArmChannelPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ArmChannelPacketReceiptAction[];
}

export function initialArmChannelPacketReceiptState(): ArmChannelPacketReceiptState {
  return {};
}

export function stepArmChannelPacketReceiptWithActions(
  state: ArmChannelPacketReceiptState,
  event: ArmChannelPacketReceiptEvent
): ArmChannelPacketReceiptStepResult {
  if (event.kind === "channel/arm-packet-receipt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canArmChannelPacketReceipt(event.receiptPresent) ? "arm" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldArmChannelPacketReceiptNow(
  actions: ReadonlyArray<ArmChannelPacketReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "arm");
}

export function shouldSkipArmChannelPacketReceipt(
  actions: ReadonlyArray<ArmChannelPacketReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether a recomputed channel packet timeout should replace the receipt's
 * current timeout (updated must be strictly greater than a present current).
 */
export function shouldExtendPacketReceiptTimeout(input: {
  readonly currentTimeout: number | null;
  readonly updatedTimeout: number;
}): boolean {
  return input.currentTimeout !== null && input.updatedTimeout > input.currentTimeout;
}

/**
 * Extend-packet-receipt-timeout gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldExtendPacketReceiptTimeout` reads beside the step).
 */
export type ExtendPacketReceiptTimeoutState = Record<string, never>;

export type ExtendPacketReceiptTimeoutEvent =
  | Event
  | {
      readonly kind: "channel/extend-packet-receipt-timeout-gate";
      readonly currentTimeout: number | null;
      readonly updatedTimeout: number;
    };

export type ExtendPacketReceiptTimeoutAction =
  | { readonly kind: "extend" }
  | { readonly kind: "skip" };

export interface ExtendPacketReceiptTimeoutStepResult {
  readonly state: ExtendPacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExtendPacketReceiptTimeoutAction[];
}

export function initialExtendPacketReceiptTimeoutState(): ExtendPacketReceiptTimeoutState {
  return {};
}

export function stepExtendPacketReceiptTimeoutWithActions(
  state: ExtendPacketReceiptTimeoutState,
  event: ExtendPacketReceiptTimeoutEvent
): ExtendPacketReceiptTimeoutStepResult {
  if (event.kind === "channel/extend-packet-receipt-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldExtendPacketReceiptTimeout({
            currentTimeout: event.currentTimeout,
            updatedTimeout: event.updatedTimeout
          })
            ? "extend"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldExtendPacketReceiptTimeoutNow(
  actions: ReadonlyArray<ExtendPacketReceiptTimeoutAction>
): boolean {
  return actions.some((action) => action.kind === "extend");
}

export function shouldSkipExtendPacketReceiptTimeout(
  actions: ReadonlyArray<ExtendPacketReceiptTimeoutAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * Channel TX-envelope index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfChannelTxEnvelope`
 * reads beside the step).
 */
export type IndexOfChannelTxEnvelopeState = Record<string, never>;

export type IndexOfChannelTxEnvelopeEvent =
  | Event
  | {
      readonly kind: "channel/tx-envelope-index-gate";
      readonly packetIds: ReadonlyArray<Uint8Array | null>;
      readonly targetId: Uint8Array | null;
    };

export type IndexOfChannelTxEnvelopeAction =
  | { readonly kind: "use-index"; readonly index: number }
  | { readonly kind: "miss" };

export interface IndexOfChannelTxEnvelopeStepResult {
  readonly state: IndexOfChannelTxEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfChannelTxEnvelopeAction[];
}

export function initialIndexOfChannelTxEnvelopeState(): IndexOfChannelTxEnvelopeState {
  return {};
}

export function stepIndexOfChannelTxEnvelopeWithActions(
  state: IndexOfChannelTxEnvelopeState,
  event: IndexOfChannelTxEnvelopeEvent
): IndexOfChannelTxEnvelopeStepResult {
  if (event.kind === "channel/tx-envelope-index-gate") {
    const index = indexOfChannelTxEnvelope({
      packetIds: event.packetIds,
      targetId: event.targetId
    });
    return {
      state,
      intents: [],
      actions:
        index === null
          ? [{ kind: "miss" }]
          : [{ kind: "use-index", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelTxEnvelopeIndex(
  actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "use-index");
}

export function shouldMissChannelTxEnvelopeIndex(
  actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

/** Extract TX-envelope index from step actions; null when no `use-index`. */
export function channelTxEnvelopeIndexFromActions(
  actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-index");
  return action?.kind === "use-index" ? action.index : null;
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
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

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
  event: ApplyChannelPacketReceiptTimeoutEvent
): ApplyChannelPacketReceiptTimeoutStepResult {
  if (event.kind === "channel/apply-packet-receipt-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyChannelPacketReceiptTimeout(event.timeoutPresent)
            ? "apply"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyChannelPacketReceiptTimeoutNow(
  actions: ReadonlyArray<ApplyChannelPacketReceiptTimeoutAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyChannelPacketReceiptTimeout(
  actions: ReadonlyArray<ApplyChannelPacketReceiptTimeoutAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a successful resend should replace the envelope's tracked packet. */
export function shouldReplaceChannelResentPacket(resentPresent: boolean): boolean {
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
  | { readonly kind: "replace" }
  | { readonly kind: "skip" };

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
  event: ReplaceChannelResentPacketEvent
): ReplaceChannelResentPacketStepResult {
  if (event.kind === "channel/replace-resent-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReplaceChannelResentPacket(event.resentPresent) ? "replace" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReplaceChannelResentPacketNow(
  actions: ReadonlyArray<ReplaceChannelResentPacketAction>
): boolean {
  return actions.some((action) => action.kind === "replace");
}

export function shouldSkipReplaceChannelResentPacket(
  actions: ReadonlyArray<ReplaceChannelResentPacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a timed-out channel envelope still has a packet to resend. */
export function shouldResendChannelTimeoutPacket(packetPresent: boolean): boolean {
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
  | { readonly kind: "resend" }
  | { readonly kind: "skip" };

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
  event: ResendChannelTimeoutPacketEvent
): ResendChannelTimeoutPacketStepResult {
  if (event.kind === "channel/resend-timeout-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldResendChannelTimeoutPacket(event.packetPresent) ? "resend" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldResendChannelTimeoutPacketNow(
  actions: ReadonlyArray<ResendChannelTimeoutPacketAction>
): boolean {
  return actions.some((action) => action.kind === "resend");
}

export function shouldSkipResendChannelTimeoutPacket(
  actions: ReadonlyArray<ResendChannelTimeoutPacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether shutdown may clear outlet callbacks for a TX-ring envelope packet. */
export function shouldClearChannelEnvelopePacket(packetPresent: boolean): boolean {
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
  | { readonly kind: "clear" }
  | { readonly kind: "skip" };

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
  event: ClearChannelEnvelopePacketEvent
): ClearChannelEnvelopePacketStepResult {
  if (event.kind === "channel/clear-envelope-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldClearChannelEnvelopePacket(event.packetPresent) ? "clear" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClearChannelEnvelopePacketNow(
  actions: ReadonlyArray<ClearChannelEnvelopePacketAction>
): boolean {
  return actions.some((action) => action.kind === "clear");
}

export function shouldSkipClearChannelEnvelopePacket(
  actions: ReadonlyArray<ClearChannelEnvelopePacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

export function stepChannelWindow(
  state: ChannelWindowState,
  event: ChannelWindowEvent
): { state: ChannelWindowState; intents: [] } {
  return stepChannelWindowInner(state, event);
}

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
 * Resend itself is gated separately via
 * `stepResendChannelTimeoutPacketWithActions`.
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
    };

export type ChannelTxTimeoutAction =
  | { readonly kind: "give-up" }
  | { readonly kind: "retry"; readonly nextTries: number };

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
        nextTries: plan.nextTries
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
 * Adapter applies `setTimeout` only for returned indexes (arm gate nested via
 * `stepArmChannelPacketReceiptWithActions`; extend decisions only from
 * `stepExtendPacketReceiptTimeoutWithActions` actions).
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
    if (
      !shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), {
          kind: "channel/arm-packet-receipt-gate",
          receiptPresent: entry.receiptPresent
        }).actions
      )
    ) {
      continue;
    }
    const updatedTimeout = channelPacketTimeoutSeconds({
      tries: entry.tries,
      rtt: entry.rtt,
      txRingLength: entry.txRingLength
    });
    if (
      shouldExtendPacketReceiptTimeoutNow(
        stepExtendPacketReceiptTimeoutWithActions(initialExtendPacketReceiptTimeoutState(), {
          kind: "channel/extend-packet-receipt-timeout-gate",
          currentTimeout: entry.currentTimeout,
          updatedTimeout
        }).actions
      )
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
 * Channel TX receipt-timeout extension apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyChannelTxReceiptTimeoutExtension` reads beside the step).
 */
export type ApplyChannelTxReceiptTimeoutExtensionState = Record<string, never>;

export type ApplyChannelTxReceiptTimeoutExtensionEvent =
  | Event
  | {
      readonly kind: "channel/apply-tx-receipt-timeout-extension-gate";
      readonly extensionPresent: boolean;
    };

export type ApplyChannelTxReceiptTimeoutExtensionAction =
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

export interface ApplyChannelTxReceiptTimeoutExtensionStepResult {
  readonly state: ApplyChannelTxReceiptTimeoutExtensionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyChannelTxReceiptTimeoutExtensionAction[];
}

export function initialApplyChannelTxReceiptTimeoutExtensionState(): ApplyChannelTxReceiptTimeoutExtensionState {
  return {};
}

export function stepApplyChannelTxReceiptTimeoutExtensionWithActions(
  state: ApplyChannelTxReceiptTimeoutExtensionState,
  event: ApplyChannelTxReceiptTimeoutExtensionEvent
): ApplyChannelTxReceiptTimeoutExtensionStepResult {
  if (event.kind === "channel/apply-tx-receipt-timeout-extension-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyChannelTxReceiptTimeoutExtension(event.extensionPresent)
            ? "apply"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyChannelTxReceiptTimeoutExtensionNow(
  actions: ReadonlyArray<ApplyChannelTxReceiptTimeoutExtensionAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyChannelTxReceiptTimeoutExtension(
  actions: ReadonlyArray<ApplyChannelTxReceiptTimeoutExtensionAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Channel TX receipt-timeout refresh is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planChannelTxReceiptTimeoutRefresh` / `canArmChannelPacketReceipt` reads
 * beside the step). Arm gate nested via
 * `stepArmChannelPacketReceiptWithActions` (`arm`|`skip`).
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
