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
import {
  channelPacketTimeoutFromActions,
  initialChannelPacketTimeoutSecondsState,
  initialChannelWindowState,
  stepChannelPacketTimeoutSecondsWithActions,
} from "./part-1.js";
import {
  initialArmChannelPacketReceiptState,
  initialExtendPacketReceiptTimeoutState,
  shouldArmChannelPacketReceiptNow,
  shouldExtendPacketReceiptTimeoutNow,
  stepArmChannelPacketReceiptWithActions,
  stepExtendPacketReceiptTimeoutWithActions,
} from "./part-2.js";
import {
  CHANNEL_MAX_TRIES,
  applyChannelDelivery,
  applyChannelTimeout,
  initialChannelTxEnvelopeOpState,
  shouldMissChannelTxEnvelopeOp,
  stepChannelTxEnvelopeOpWithActions,
} from "./part-3.js";
import type { ChannelWindowState } from "./part-1.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";
/** Should the channel give up retrying this envelope? */
export function channelRetryExhausted(
  tries: number,
  maxTries: number = CHANNEL_MAX_TRIES,
): boolean {
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

/**
 * Channel packet-timeout plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelPacketTimeout`
 * / `plan.kind` reads beside the step). Nested under
 * {@link stepChannelPacketTimeoutWithActions}.
 */
export type ChannelPacketTimeoutPlanState = Record<string, never>;

export type ChannelPacketTimeoutPlanEvent =
  | Event
  | {
      readonly kind: "channel/packet-timeout-plan-gate";
      readonly delivered: boolean;
      readonly tries: number;
      readonly maxTries?: number;
    };

export type ChannelPacketTimeoutPlanAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "give-up" }
  | { readonly kind: "retry"; readonly nextTries: number };

export interface ChannelPacketTimeoutPlanStepResult {
  readonly state: ChannelPacketTimeoutPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelPacketTimeoutPlanAction[];
}

export function initialChannelPacketTimeoutPlanState(): ChannelPacketTimeoutPlanState {
  return {};
}

export function stepChannelPacketTimeoutPlanWithActions(
  state: ChannelPacketTimeoutPlanState,
  event: ChannelPacketTimeoutPlanEvent,
): ChannelPacketTimeoutPlanStepResult {
  if (event.kind === "channel/packet-timeout-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        planChannelPacketTimeout({
          delivered: event.delivered,
          tries: event.tries,
          ...(event.maxTries !== undefined ? { maxTries: event.maxTries } : {}),
        }),
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreChannelPacketTimeoutPlan(
  actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldGiveUpChannelPacketTimeoutPlan(
  actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>,
): boolean {
  return hasActionOfKind(actions, "give-up");
}

export function shouldRetryChannelPacketTimeoutPlan(
  actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>,
): boolean {
  return hasActionOfKind(actions, "retry");
}

/** Extract the retry plan action, if any. */
export function channelPacketTimeoutRetryFromActions(
  actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>,
): Extract<ChannelPacketTimeoutPlanAction, { kind: "retry" }> | null {
  for (const action of actions) {
    if (action.kind === "retry") {
      return action;
    }
  }
  return null;
}

/** Extract the full plan from actions; null when empty. */
export function channelPacketTimeoutPlanFromActions(
  actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>,
): ChannelPacketTimeoutPlan | null {
  const action = firstAction(actions);
  return action ?? null;
}

/**
 * Channel packet-timeout gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelPacketTimeout`
 * / `plan.kind` reads beside the step).
 * Plan nested via {@link stepChannelPacketTimeoutPlanWithActions}
 * (`ignore`|`give-up`|`retry`).
 */
export type ChannelPacketTimeoutState = Record<string, never>;

export type ChannelPacketTimeoutEvent =
  | Event
  | {
      readonly kind: "channel/packet-timeout-gate";
      readonly delivered: boolean;
      readonly tries: number;
      readonly maxTries?: number;
    };

export type ChannelPacketTimeoutAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "give-up" }
  | { readonly kind: "retry"; readonly nextTries: number };

export interface ChannelPacketTimeoutStepResult {
  readonly state: ChannelPacketTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelPacketTimeoutAction[];
}

export function initialChannelPacketTimeoutState(): ChannelPacketTimeoutState {
  return {};
}

export function stepChannelPacketTimeoutWithActions(
  state: ChannelPacketTimeoutState,
  event: ChannelPacketTimeoutEvent,
): ChannelPacketTimeoutStepResult {
  if (event.kind === "channel/packet-timeout-gate") {
    const planActions = stepChannelPacketTimeoutPlanWithActions(
      initialChannelPacketTimeoutPlanState(),
      {
        kind: "channel/packet-timeout-plan-gate",
        delivered: event.delivered,
        tries: event.tries,
        ...(event.maxTries !== undefined ? { maxTries: event.maxTries } : {}),
      },
    ).actions;
    const plan = channelPacketTimeoutPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [plan] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreChannelPacketTimeout(
  actions: ReadonlyArray<ChannelPacketTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldGiveUpChannelPacketTimeout(
  actions: ReadonlyArray<ChannelPacketTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "give-up");
}

export function shouldRetryChannelPacketTimeout(
  actions: ReadonlyArray<ChannelPacketTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "retry");
}

export type ChannelWindowEvent =
  | Event
  | { readonly kind: "channel/init"; readonly rtt: number }
  | { readonly kind: "channel/timeout" }
  | { readonly kind: "channel/delivered"; readonly rtt: number };

export function stepChannelWindow(
  state: ChannelWindowState,
  event: ChannelWindowEvent,
): { state: ChannelWindowState; intents: [] } {
  return stepChannelWindowInner(state, event);
}

function stepChannelWindowInner(
  state: ChannelWindowState,
  event: ChannelWindowEvent,
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
 * re-arm) only from actions — not by reading `plan.kind` /
 * `planChannelTxEnvelopeOp` / `planChannelPacketTimeout` beside the step.
 * Envelope-op nested via `stepChannelTxEnvelopeOpWithActions` (`miss`|`process`;
 * plan nested via {@link stepChannelTxEnvelopeOpPlanWithActions}: miss|process).
 * Packet-timeout nested via `stepChannelPacketTimeoutWithActions`
 * (`ignore`|`give-up`|`retry`; plan nested via
 * {@link stepChannelPacketTimeoutPlanWithActions}: ignore|give-up|retry).
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

export const stepChannelTxTimeout: StepFn<ChannelWindowState> = (
  state,
  event,
) => {
  const result = stepChannelTxTimeoutInner(
    state,
    event as ChannelTxTimeoutEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepChannelTxTimeoutWithActions(
  state: ChannelWindowState,
  event: ChannelTxTimeoutEvent,
): ChannelTxTimeoutStepResult {
  return stepChannelTxTimeoutInner(state, event);
}

function stepChannelTxTimeoutInner(
  state: ChannelWindowState,
  event: ChannelTxTimeoutEvent,
): ChannelTxTimeoutStepResult {
  if (event.kind !== "channel/tx-timeout") {
    return { state, intents: [], actions: [] };
  }

  if (
    shouldMissChannelTxEnvelopeOp(
      stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), {
        kind: "channel/tx-envelope-op-gate",
        indexOk: event.indexOk,
        envelopePresent: event.envelopePresent,
      }).actions,
    )
  ) {
    return { state, intents: [], actions: [] };
  }

  const planActions = stepChannelPacketTimeoutWithActions(
    initialChannelPacketTimeoutState(),
    {
      kind: "channel/packet-timeout-gate",
      delivered: event.delivered,
      tries: event.tries,
      maxTries: event.maxTries,
    },
  ).actions;

  if (shouldIgnoreChannelPacketTimeout(planActions)) {
    return { state, intents: [], actions: [] };
  }

  if (shouldGiveUpChannelPacketTimeout(planActions)) {
    return { state, intents: [], actions: [{ kind: "give-up" }] };
  }

  const retry = channelPacketTimeoutRetryFromActions(planActions);
  if (retry === null) {
    return { state, intents: [], actions: [] };
  }

  return {
    state: applyChannelTimeout(state),
    intents: [],
    actions: [
      {
        kind: "retry",
        nextTries: retry.nextTries,
      },
    ],
  };
}

/** Whether step actions include a give-up for channel TX timeout. */
export function shouldGiveUpChannelTxTimeout(
  actions: ReadonlyArray<ChannelTxTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "give-up");
}

/** Whether step actions include a retry for channel TX timeout. */
export function shouldRetryChannelTxTimeout(
  actions: ReadonlyArray<ChannelTxTimeoutAction>,
): boolean {
  return hasActionOfKind(actions, "retry");
}

/** Extract the retry action from a TX-timeout step, if any. */
export function channelTxTimeoutRetryAction(
  actions: ReadonlyArray<ChannelTxTimeoutAction>,
): Extract<ChannelTxTimeoutAction, { kind: "retry" }> | null {
  for (const action of actions) {
    if (action.kind === "retry") {
      return action;
    }
  }
  return null;
}

export type ChannelTxReceiptTimeoutRefreshEntry = {
  readonly receiptPresent: boolean;
  readonly currentTimeout: number | null;
  readonly tries: number;
  readonly rtt: number;
  readonly txRingLength: number;
};

export type ChannelTxReceiptTimeoutRefreshExtension = {
  readonly index: number;
  readonly timeoutSeconds: number;
};

/**
 * Plan which TX-ring receipts need a longer timeout after a send/retry.
 * Adapter applies `setTimeout` only for returned indexes (arm gate nested via
 * `stepArmChannelPacketReceiptWithActions`; timeout formula nested via
 * `stepChannelPacketTimeoutSecondsWithActions`; extend decisions only from
 * `stepExtendPacketReceiptTimeoutWithActions` actions).
 */
export function planChannelTxReceiptTimeoutRefresh(
  entries: ReadonlyArray<ChannelTxReceiptTimeoutRefreshEntry>,
): ReadonlyArray<ChannelTxReceiptTimeoutRefreshExtension> {
  const extensions: Array<ChannelTxReceiptTimeoutRefreshExtension> = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (
      !shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(
          initialArmChannelPacketReceiptState(),
          {
            kind: "channel/arm-packet-receipt-gate",
            receiptPresent: entry.receiptPresent,
          },
        ).actions,
      )
    ) {
      continue;
    }
    const updatedTimeout = channelPacketTimeoutFromActions(
      stepChannelPacketTimeoutSecondsWithActions(
        initialChannelPacketTimeoutSecondsState(),
        {
          kind: "channel/packet-timeout-gate",
          tries: entry.tries,
          rtt: entry.rtt,
          txRingLength: entry.txRingLength,
        },
      ).actions,
    );
    if (updatedTimeout === null) {
      continue;
    }
    if (
      shouldExtendPacketReceiptTimeoutNow(
        stepExtendPacketReceiptTimeoutWithActions(
          initialExtendPacketReceiptTimeoutState(),
          {
            kind: "channel/extend-packet-receipt-timeout-gate",
            currentTimeout: entry.currentTimeout,
            updatedTimeout,
          },
        ).actions,
      )
    ) {
      extensions.push({ index, timeoutSeconds: updatedTimeout });
    }
  }
  return extensions;
}

export type ChannelTxReceiptTimeoutRefreshPlanEvent =
  | Event
  | {
      readonly kind: "channel/tx-receipt-timeout-refresh-plan-gate";
      readonly entries: ReadonlyArray<ChannelTxReceiptTimeoutRefreshEntry>;
    };

export type ChannelTxReceiptTimeoutRefreshPlanAction = {
  readonly kind: "extend";
  readonly index: number;
  readonly timeoutSeconds: number;
};

/** Extract extend actions for the planned receipt timeout refresh. */
export function channelTxReceiptTimeoutRefreshPlanExtensions(
  actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshPlanAction>,
): ReadonlyArray<ChannelTxReceiptTimeoutRefreshExtension> {
  return actions.map((action) => ({
    index: action.index,
    timeoutSeconds: action.timeoutSeconds,
  }));
}

export type ChannelTxReceiptTimeoutRefreshEvent =
  | Event
  | {
      readonly kind: "channel/tx-receipt-timeout-refresh-gate";
      readonly entries: ReadonlyArray<ChannelTxReceiptTimeoutRefreshEntry>;
    };

export type ChannelTxReceiptTimeoutRefreshAction = {
  readonly kind: "extend";
  readonly index: number;
  readonly timeoutSeconds: number;
};
