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
import { isChannelOutletTransmitOk } from "./part-1.js";
import type {
  ChannelOutletTransmitAction,
  ChannelOutletTransmitEvent,
  ChannelOutletTransmitState,
  ChannelOutletTransmitStepResult,
} from "./part-1.js";
import { firstAction, firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function stepChannelOutletTransmitWithActions(
  state: ChannelOutletTransmitState,
  event: ChannelOutletTransmitEvent,
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
            receiptPresent: event.receiptPresent,
          })
            ? "ok"
            : "reject",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptChannelOutletTransmit(
  actions: ReadonlyArray<ChannelOutletTransmitAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

export function shouldRejectChannelOutletTransmit(
  actions: ReadonlyArray<ChannelOutletTransmitAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/**
 * Count TX-ring entries that still occupy window (unsent or not yet delivered).
 * Packet presence / delivery status are supplied by the adapter.
 */
export function countChannelTxOutstanding(
  entries: ReadonlyArray<{
    readonly packetPresent: boolean;
    readonly delivered: boolean;
  }>,
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
  event: CountChannelTxOutstandingEvent,
): CountChannelTxOutstandingStepResult {
  if (event.kind === "channel/tx-outstanding-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-count",
          count: countChannelTxOutstanding(event.entries),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelTxOutstandingCount(
  actions: ReadonlyArray<CountChannelTxOutstandingAction>,
): boolean {
  return hasActionOfKind(actions, "use-count");
}

/** Extract outstanding count from step actions; null when no `use-count`. */
export function channelTxOutstandingCountFromActions(
  actions: ReadonlyArray<CountChannelTxOutstandingAction>,
): number | null {
  return firstActionOfKind(actions, "use-count")?.count ?? null;
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
  { readonly kind: "arm" } | { readonly kind: "skip" };

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
  event: ArmChannelPacketReceiptEvent,
): ArmChannelPacketReceiptStepResult {
  if (event.kind === "channel/arm-packet-receipt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canArmChannelPacketReceipt(event.receiptPresent)
            ? "arm"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldArmChannelPacketReceiptNow(
  actions: ReadonlyArray<ArmChannelPacketReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "arm");
}

export function shouldSkipArmChannelPacketReceipt(
  actions: ReadonlyArray<ArmChannelPacketReceiptAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Whether a recomputed channel packet timeout should replace the receipt's
 * current timeout (updated must be strictly greater than a present current).
 */
export function shouldExtendPacketReceiptTimeout(input: {
  readonly currentTimeout: number | null;
  readonly updatedTimeout: number;
}): boolean {
  return (
    input.currentTimeout !== null && input.updatedTimeout > input.currentTimeout
  );
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
  { readonly kind: "extend" } | { readonly kind: "skip" };

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
  event: ExtendPacketReceiptTimeoutEvent,
): ExtendPacketReceiptTimeoutStepResult {
  if (event.kind === "channel/extend-packet-receipt-timeout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldExtendPacketReceiptTimeout({
            currentTimeout: event.currentTimeout,
            updatedTimeout: event.updatedTimeout,
          })
            ? "extend"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldExtendPacketReceiptTimeoutNow(
  actions: ReadonlyArray<ExtendPacketReceiptTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "extend");
}

export function shouldSkipExtendPacketReceiptTimeout(
  actions: ReadonlyArray<ExtendPacketReceiptTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
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
  event: IndexOfChannelTxEnvelopeEvent,
): IndexOfChannelTxEnvelopeStepResult {
  if (event.kind === "channel/tx-envelope-index-gate") {
    const index = indexOfChannelTxEnvelope({
      packetIds: event.packetIds,
      targetId: event.targetId,
    });
    return {
      state,
      intents: [],
      actions:
        index === null ? [{ kind: "miss" }] : [{ kind: "use-index", index }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelTxEnvelopeIndex(
  actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>,
): boolean {
  return hasActionOfKind(actions, "use-index");
}

export function shouldMissChannelTxEnvelopeIndex(
  actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

/** Extract TX-envelope index from step actions; null when no `use-index`. */
export function channelTxEnvelopeIndexFromActions(
  actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>,
): number | null {
  return firstActionOfKind(actions, "use-index")?.index ?? null;
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

export type ChannelTxEnvelopeOpPlanEvent =
  | Event
  | {
      readonly kind: "channel/tx-envelope-op-plan-gate";
      readonly indexOk: boolean;
      readonly envelopePresent: boolean;
      readonly opOk?: boolean;
    };

export type ChannelTxEnvelopeOpPlanAction = {
  readonly kind: ChannelTxEnvelopeOpPlan;
};

/** Extract the TX-envelope-op plan from actions; null when empty. */
export function channelTxEnvelopeOpPlanFromActions(
  actions: ReadonlyArray<ChannelTxEnvelopeOpPlanAction>,
): ChannelTxEnvelopeOpPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

export type ChannelTxEnvelopeOpEvent =
  | Event
  | {
      readonly kind: "channel/tx-envelope-op-gate";
      readonly indexOk: boolean;
      readonly envelopePresent: boolean;
      readonly opOk?: boolean;
    };

export type ChannelTxEnvelopeOpAction =
  { readonly kind: "miss" } | { readonly kind: "process" };
