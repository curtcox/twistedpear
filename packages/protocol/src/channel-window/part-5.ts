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
import { channelPacketTimeoutSeconds, stepChannelPacketTimeoutSecondsWithActions } from "./part-1.js";
import { canArmChannelPacketReceipt, stepArmChannelPacketReceiptWithActions } from "./part-2.js";
import { channelTxReceiptTimeoutRefreshPlanExtensions, planChannelTxReceiptTimeoutRefresh } from "./part-4.js";
import type { ChannelTxReceiptTimeoutRefreshAction, ChannelTxReceiptTimeoutRefreshEvent, ChannelTxReceiptTimeoutRefreshPlanAction, ChannelTxReceiptTimeoutRefreshPlanEvent } from "./part-4.js";
/**
 * Channel TX receipt-timeout refresh plan leaf is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `planChannelTxReceiptTimeoutRefresh` reads beside the step). Nested under
 * {@link stepChannelTxReceiptTimeoutRefreshWithActions}.
 */
export type ChannelTxReceiptTimeoutRefreshPlanState = Record<string, never>;

export interface ChannelTxReceiptTimeoutRefreshPlanStepResult {
  readonly state: ChannelTxReceiptTimeoutRefreshPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxReceiptTimeoutRefreshPlanAction[];
}

export function initialChannelTxReceiptTimeoutRefreshPlanState(): ChannelTxReceiptTimeoutRefreshPlanState {
  return {};
}

export function stepChannelTxReceiptTimeoutRefreshPlanWithActions(
  state: ChannelTxReceiptTimeoutRefreshPlanState,
  event: ChannelTxReceiptTimeoutRefreshPlanEvent
): ChannelTxReceiptTimeoutRefreshPlanStepResult {
  if (event.kind === "channel/tx-receipt-timeout-refresh-plan-gate") {
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

export function shouldExtendChannelTxReceiptTimeoutRefreshPlan(
  actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshPlanAction>
): boolean {
  return actions.some((action) => action.kind === "extend");
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
 * `planChannelTxReceiptTimeoutRefresh` / `canArmChannelPacketReceipt` /
 * `channelPacketTimeoutSeconds` reads beside the step). Arm gate nested via
 * `stepArmChannelPacketReceiptWithActions` (`arm`|`skip`); timeout formula
 * nested via `stepChannelPacketTimeoutSecondsWithActions` (`use-timeout`).
 * Plan nested via {@link stepChannelTxReceiptTimeoutRefreshPlanWithActions}
 * (`extend`).
 */
export type ChannelTxReceiptTimeoutRefreshState = Record<string, never>;

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
    const planActions = stepChannelTxReceiptTimeoutRefreshPlanWithActions(
      initialChannelTxReceiptTimeoutRefreshPlanState(),
      {
        kind: "channel/tx-receipt-timeout-refresh-plan-gate",
        entries: event.entries
      }
    ).actions;
    return {
      state,
      intents: [],
      actions: channelTxReceiptTimeoutRefreshPlanExtensions(planActions).map((extension) => ({
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
