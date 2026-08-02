/** Extracted from channel-envelope.ts; the original module remains the public composition point. */
/**
 * Pure RNS Channel envelope framing (MSGTYPE + sequence + length + payload).
 * Pack / unpack framing conclusions leave via machine actions (no ad-hoc
 * `packChannelEnvelope` / `unpackChannelEnvelope` reads beside the step).
 * Pack / unpack / MSGTYPE-registration gate conclusions leave via machine
 * actions (no ad-hoc plan reads beside the step).
 * Message-state-from-receipt mapping conclusions leave via machine actions
 * (no ad-hoc `channelMessageStateFromPacketReceipt` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import type { PacketReceiptStatusValue } from "../packet-receipt-timeout.js";
import { PacketReceiptStatus } from "../packet-receipt-timeout.js";
import { CHANNEL_ENVELOPE_HEADER_SIZE, CHANNEL_SEQ_MODULUS } from "./part-1.js";
import { channelEnvelopePackPlanFromActions, planChannelEnvelopePack } from "./part-2.js";
import type { ChannelEnvelopePackEvent, ChannelEnvelopePackPlan, ChannelEnvelopePackPlanAction, ChannelEnvelopePackPlanEvent } from "./part-2.js";
/**
 * Channel-envelope-pack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelEnvelopePack`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepChannelEnvelopePackWithActions}.
 */
export type ChannelEnvelopePackPlanState = Record<string, never>;

export interface ChannelEnvelopePackPlanStepResult {
  readonly state: ChannelEnvelopePackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopePackPlanAction[];
}

export function initialChannelEnvelopePackPlanState(): ChannelEnvelopePackPlanState {
  return {};
}

export function stepChannelEnvelopePackPlanWithActions(
  state: ChannelEnvelopePackPlanState,
  event: ChannelEnvelopePackPlanEvent
): ChannelEnvelopePackPlanStepResult {
  if (event.kind === "channel/envelope-pack-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planChannelEnvelopePack(event.messagePresent) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldProceedChannelEnvelopePackPlan(
  actions: ReadonlyArray<ChannelEnvelopePackPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelEnvelopePackPlanMissingMessage(
  actions: ReadonlyArray<ChannelEnvelopePackPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-message");
}

/**
 * Channel envelope pack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelEnvelopePackPlanWithActions}
 * (`ok`|`missing-message`).
 */
export type ChannelEnvelopePackState = Record<string, never>;

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelEnvelopePackPlanWithActions}
 * (`ok`|`missing-message`).
 */
export type ChannelEnvelopePackAction = { readonly kind: ChannelEnvelopePackPlan };

export interface ChannelEnvelopePackStepResult {
  readonly state: ChannelEnvelopePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopePackAction[];
}

export function initialChannelEnvelopePackState(): ChannelEnvelopePackState {
  return {};
}

export const stepChannelEnvelopePack: StepFn<ChannelEnvelopePackState> = (state, event) => {
  const result = stepChannelEnvelopePackInner(state, event as ChannelEnvelopePackEvent);
  return { state: result.state, intents: result.intents };
};

export function stepChannelEnvelopePackWithActions(
  state: ChannelEnvelopePackState,
  event: ChannelEnvelopePackEvent
): ChannelEnvelopePackStepResult {
  return stepChannelEnvelopePackInner(state, event);
}

export function shouldProceedChannelEnvelopePack(
  actions: ReadonlyArray<ChannelEnvelopePackAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelEnvelopePackMissingMessage(
  actions: ReadonlyArray<ChannelEnvelopePackAction>
): boolean {
  return actions.some((action) => action.kind === "missing-message");
}

function stepChannelEnvelopePackInner(
  state: ChannelEnvelopePackState,
  event: ChannelEnvelopePackEvent
): ChannelEnvelopePackStepResult {
  if (event.kind === "channel/envelope-pack-gate") {
    const planActions = stepChannelEnvelopePackPlanWithActions(
      initialChannelEnvelopePackPlanState(),
      {
        kind: "channel/envelope-pack-plan-gate",
        messagePresent: event.messagePresent
      }
    ).actions;
    const plan = channelEnvelopePackPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether a channel message-handler list should receive a new member. */
export function shouldRegisterChannelMessageHandler(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * Channel message-handler register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRegisterChannelMessageHandler`
 * reads beside the step).
 */
export type RegisterChannelMessageHandlerState = Record<string, never>;

export type RegisterChannelMessageHandlerEvent =
  | Event
  | {
      readonly kind: "channel/register-message-handler-gate";
      readonly alreadyPresent: boolean;
    };

export type RegisterChannelMessageHandlerAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export interface RegisterChannelMessageHandlerStepResult {
  readonly state: RegisterChannelMessageHandlerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterChannelMessageHandlerAction[];
}

export function initialRegisterChannelMessageHandlerState(): RegisterChannelMessageHandlerState {
  return {};
}

export function stepRegisterChannelMessageHandlerWithActions(
  state: RegisterChannelMessageHandlerState,
  event: RegisterChannelMessageHandlerEvent
): RegisterChannelMessageHandlerStepResult {
  if (event.kind === "channel/register-message-handler-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterChannelMessageHandler(event.alreadyPresent)
            ? "register"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterChannelMessageHandlerNow(
  actions: ReadonlyArray<RegisterChannelMessageHandlerAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipRegisterChannelMessageHandler(
  actions: ReadonlyArray<RegisterChannelMessageHandlerAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Unregister a channel message handler: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterChannelMessageHandler(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice a planned handler index. */
export function shouldUnregisterChannelMessageHandler(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Channel message-handler unregister plan leaf is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterChannelMessageHandler` reads beside the step). Nested under
 * {@link stepChannelMessageHandlerUnregisterWithActions}.
 */
export type ChannelMessageHandlerUnregisterPlanState = Record<string, never>;

export type ChannelMessageHandlerUnregisterPlanEvent =
  | Event
  | {
      readonly kind: "channel/message-handler-unregister-plan-gate";
      readonly index: number;
    };

export type ChannelMessageHandlerUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface ChannelMessageHandlerUnregisterPlanStepResult {
  readonly state: ChannelMessageHandlerUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageHandlerUnregisterPlanAction[];
}

export function initialChannelMessageHandlerUnregisterPlanState(): ChannelMessageHandlerUnregisterPlanState {
  return {};
}

export function stepChannelMessageHandlerUnregisterPlanWithActions(
  state: ChannelMessageHandlerUnregisterPlanState,
  event: ChannelMessageHandlerUnregisterPlanEvent
): ChannelMessageHandlerUnregisterPlanStepResult {
  if (event.kind === "channel/message-handler-unregister-plan-gate") {
    const index = planUnregisterChannelMessageHandler(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function channelMessageHandlerUnregisterPlanIndex(
  actions: ReadonlyArray<ChannelMessageHandlerUnregisterPlanAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemoveChannelMessageHandlerUnregisterPlan(
  actions: ReadonlyArray<ChannelMessageHandlerUnregisterPlanAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/**
 * Channel message-handler unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterChannelMessageHandler` reads beside the step).
 * Plan nested via {@link stepChannelMessageHandlerUnregisterPlanWithActions}
 * (`remove`).
 */
export type ChannelMessageHandlerUnregisterState = Record<string, never>;

export type ChannelMessageHandlerUnregisterEvent =
  | Event
  | {
      readonly kind: "channel/message-handler-unregister-gate";
      readonly index: number;
    };

export type ChannelMessageHandlerUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface ChannelMessageHandlerUnregisterStepResult {
  readonly state: ChannelMessageHandlerUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageHandlerUnregisterAction[];
}

export function initialChannelMessageHandlerUnregisterState(): ChannelMessageHandlerUnregisterState {
  return {};
}

export function stepChannelMessageHandlerUnregisterWithActions(
  state: ChannelMessageHandlerUnregisterState,
  event: ChannelMessageHandlerUnregisterEvent
): ChannelMessageHandlerUnregisterStepResult {
  if (event.kind === "channel/message-handler-unregister-gate") {
    const planActions = stepChannelMessageHandlerUnregisterPlanWithActions(
      initialChannelMessageHandlerUnregisterPlanState(),
      {
        kind: "channel/message-handler-unregister-plan-gate",
        index: event.index
      }
    ).actions;
    const index = channelMessageHandlerUnregisterPlanIndex(planActions);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function channelMessageHandlerUnregisterIndex(
  actions: ReadonlyArray<ChannelMessageHandlerUnregisterAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemoveChannelMessageHandler(
  actions: ReadonlyArray<ChannelMessageHandlerUnregisterAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/** Whether channel message-handler fan-out should stop after a handler returns handled. */
export function shouldStopChannelHandlerFanout(handled: boolean): boolean {
  return handled;
}

/**
 * Channel message-handler fan-out stop gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldStopChannelHandlerFanout`
 * reads beside the step).
 */
export type StopChannelHandlerFanoutState = Record<string, never>;

export type StopChannelHandlerFanoutEvent =
  | Event
  | {
      readonly kind: "channel/stop-handler-fanout-gate";
      readonly handled: boolean;
    };

export type StopChannelHandlerFanoutAction =
  | { readonly kind: "stop" }
  | { readonly kind: "continue" };

export interface StopChannelHandlerFanoutStepResult {
  readonly state: StopChannelHandlerFanoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StopChannelHandlerFanoutAction[];
}

export function initialStopChannelHandlerFanoutState(): StopChannelHandlerFanoutState {
  return {};
}

export function stepStopChannelHandlerFanoutWithActions(
  state: StopChannelHandlerFanoutState,
  event: StopChannelHandlerFanoutEvent
): StopChannelHandlerFanoutStepResult {
  if (event.kind === "channel/stop-handler-fanout-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldStopChannelHandlerFanout(event.handled) ? "stop" : "continue"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldStopChannelHandlerFanoutNow(
  actions: ReadonlyArray<StopChannelHandlerFanoutAction>
): boolean {
  return actions.some((action) => action.kind === "stop");
}

export function shouldContinueChannelHandlerFanout(
  actions: ReadonlyArray<StopChannelHandlerFanoutAction>
): boolean {
  return actions.some((action) => action.kind === "continue");
}

export function channelPayloadMdu(outletMdu: number): number {
  const value = outletMdu - CHANNEL_ENVELOPE_HEADER_SIZE;
  return value > 0xffff ? 0xffff : value;
}

export function nextChannelSequence(sequence: number): number {
  return (sequence + 1) % CHANNEL_SEQ_MODULUS;
}
