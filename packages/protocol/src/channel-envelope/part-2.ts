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
import {
  channelMessageTypeRegistrationPlanFromActions,
  planChannelMessageTypeRegistration,
} from "./part-1.js";
import type {
  ChannelMessageTypeRegistrationEvent,
  ChannelMessageTypeRegistrationPlan,
  ChannelMessageTypeRegistrationPlanAction,
  ChannelMessageTypeRegistrationPlanEvent,
} from "./part-1.js";
/**
 * Channel-message-type-registration-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelMessageTypeRegistration`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepChannelMessageTypeRegistrationWithActions}.
 */
export type ChannelMessageTypeRegistrationPlanState = Record<string, never>;

export interface ChannelMessageTypeRegistrationPlanStepResult {
  readonly state: ChannelMessageTypeRegistrationPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageTypeRegistrationPlanAction[];
}

export function initialChannelMessageTypeRegistrationPlanState(): ChannelMessageTypeRegistrationPlanState {
  return {};
}

export function stepChannelMessageTypeRegistrationPlanWithActions(
  state: ChannelMessageTypeRegistrationPlanState,
  event: ChannelMessageTypeRegistrationPlanEvent,
): ChannelMessageTypeRegistrationPlanStepResult {
  if (event.kind === "channel/message-type-registration-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planChannelMessageTypeRegistration({
            msgType: event.msgType,
            isSystemType: event.isSystemType,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldProceedChannelMessageTypeRegistrationPlan(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelMessageTypeRegistrationPlanMissingMsgtype(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-msgtype");
}

export function shouldRejectChannelMessageTypeRegistrationPlanSystemReserved(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "system-reserved");
}

/**
 * Channel MSGTYPE registration gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelMessageTypeRegistrationPlanWithActions}
 * (`ok`|`missing-msgtype`|`system-reserved`).
 */
export type ChannelMessageTypeRegistrationState = Record<string, never>;

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelMessageTypeRegistrationPlanWithActions}
 * (`ok`|`missing-msgtype`|`system-reserved`).
 */
export type ChannelMessageTypeRegistrationAction = {
  readonly kind: ChannelMessageTypeRegistrationPlan;
};

export interface ChannelMessageTypeRegistrationStepResult {
  readonly state: ChannelMessageTypeRegistrationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageTypeRegistrationAction[];
}

export function initialChannelMessageTypeRegistrationState(): ChannelMessageTypeRegistrationState {
  return {};
}

export const stepChannelMessageTypeRegistration: StepFn<
  ChannelMessageTypeRegistrationState
> = (state, event) => {
  const result = stepChannelMessageTypeRegistrationInner(
    state,
    event as ChannelMessageTypeRegistrationEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepChannelMessageTypeRegistrationWithActions(
  state: ChannelMessageTypeRegistrationState,
  event: ChannelMessageTypeRegistrationEvent,
): ChannelMessageTypeRegistrationStepResult {
  return stepChannelMessageTypeRegistrationInner(state, event);
}

export function shouldProceedChannelMessageTypeRegistration(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>,
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelMessageTypeMissingMsgtype(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-msgtype");
}

export function shouldRejectChannelMessageTypeSystemReserved(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>,
): boolean {
  return actions.some((action) => action.kind === "system-reserved");
}

function stepChannelMessageTypeRegistrationInner(
  state: ChannelMessageTypeRegistrationState,
  event: ChannelMessageTypeRegistrationEvent,
): ChannelMessageTypeRegistrationStepResult {
  if (event.kind === "channel/message-type-registration-gate") {
    const planActions = stepChannelMessageTypeRegistrationPlanWithActions(
      initialChannelMessageTypeRegistrationPlanState(),
      {
        kind: "channel/message-type-registration-plan-gate",
        msgType: event.msgType,
        isSystemType: event.isSystemType,
      },
    ).actions;
    const plan = channelMessageTypeRegistrationPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type ChannelEnvelopeUnpackPlan =
  "ok" | "missing-raw" | "truncated" | "not-registered";

/** Whether Envelope.unpack may construct a typed message from raw bytes. */
export function planChannelEnvelopeUnpack(input: {
  readonly rawPresent: boolean;
  readonly framingOk: boolean;
  readonly factoryRegistered: boolean;
}): ChannelEnvelopeUnpackPlan {
  if (!input.rawPresent) {
    return "missing-raw";
  }
  if (!input.framingOk) {
    return "truncated";
  }
  if (!input.factoryRegistered) {
    return "not-registered";
  }
  return "ok";
}

/**
 * Channel-envelope-unpack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelEnvelopeUnpack`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepChannelEnvelopeUnpackWithActions}.
 */
export type ChannelEnvelopeUnpackPlanState = Record<string, never>;

export type ChannelEnvelopeUnpackPlanEvent =
  | Event
  | {
      readonly kind: "channel/envelope-unpack-plan-gate";
      readonly rawPresent: boolean;
      readonly framingOk: boolean;
      readonly factoryRegistered: boolean;
    };

export type ChannelEnvelopeUnpackPlanAction = {
  readonly kind: ChannelEnvelopeUnpackPlan;
};

export interface ChannelEnvelopeUnpackPlanStepResult {
  readonly state: ChannelEnvelopeUnpackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopeUnpackPlanAction[];
}

export function initialChannelEnvelopeUnpackPlanState(): ChannelEnvelopeUnpackPlanState {
  return {};
}

export function stepChannelEnvelopeUnpackPlanWithActions(
  state: ChannelEnvelopeUnpackPlanState,
  event: ChannelEnvelopeUnpackPlanEvent,
): ChannelEnvelopeUnpackPlanStepResult {
  if (event.kind === "channel/envelope-unpack-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planChannelEnvelopeUnpack({
            rawPresent: event.rawPresent,
            framingOk: event.framingOk,
            factoryRegistered: event.factoryRegistered,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the unpack plan from actions; null when empty. */
export function channelEnvelopeUnpackPlanFromActions(
  actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>,
): ChannelEnvelopeUnpackPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "missing-raw" ||
      entry.kind === "truncated" ||
      entry.kind === "not-registered",
  );
  return action?.kind ?? null;
}

export function shouldProceedChannelEnvelopeUnpackPlan(
  actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelEnvelopeUnpackPlanMissingRaw(
  actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-raw");
}

export function shouldRejectChannelEnvelopeUnpackPlanTruncate(
  actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "truncated");
}

export function shouldRejectChannelEnvelopeUnpackPlanNotRegistered(
  actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "not-registered");
}

/**
 * Channel envelope unpack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelEnvelopeUnpackPlanWithActions}
 * (`ok`|`missing-raw`|`truncated`|`not-registered`).
 */
export type ChannelEnvelopeUnpackState = Record<string, never>;

export type ChannelEnvelopeUnpackEvent =
  | Event
  | {
      readonly kind: "channel/envelope-unpack-gate";
      readonly rawPresent: boolean;
      readonly framingOk: boolean;
      readonly factoryRegistered: boolean;
    };

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelEnvelopeUnpackPlanWithActions}
 * (`ok`|`missing-raw`|`truncated`|`not-registered`).
 */
export type ChannelEnvelopeUnpackAction = {
  readonly kind: ChannelEnvelopeUnpackPlan;
};

export interface ChannelEnvelopeUnpackStepResult {
  readonly state: ChannelEnvelopeUnpackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopeUnpackAction[];
}

export function initialChannelEnvelopeUnpackState(): ChannelEnvelopeUnpackState {
  return {};
}

export const stepChannelEnvelopeUnpack: StepFn<ChannelEnvelopeUnpackState> = (
  state,
  event,
) => {
  const result = stepChannelEnvelopeUnpackInner(
    state,
    event as ChannelEnvelopeUnpackEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepChannelEnvelopeUnpackWithActions(
  state: ChannelEnvelopeUnpackState,
  event: ChannelEnvelopeUnpackEvent,
): ChannelEnvelopeUnpackStepResult {
  return stepChannelEnvelopeUnpackInner(state, event);
}

export function shouldProceedChannelEnvelopeUnpack(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>,
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelEnvelopeUnpackMissingRaw(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-raw");
}

export function shouldRejectChannelEnvelopeUnpackTruncate(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>,
): boolean {
  return actions.some((action) => action.kind === "truncated");
}

export function shouldRejectChannelEnvelopeUnpackNotRegistered(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>,
): boolean {
  return actions.some((action) => action.kind === "not-registered");
}

function stepChannelEnvelopeUnpackInner(
  state: ChannelEnvelopeUnpackState,
  event: ChannelEnvelopeUnpackEvent,
): ChannelEnvelopeUnpackStepResult {
  if (event.kind === "channel/envelope-unpack-gate") {
    const planActions = stepChannelEnvelopeUnpackPlanWithActions(
      initialChannelEnvelopeUnpackPlanState(),
      {
        kind: "channel/envelope-unpack-plan-gate",
        rawPresent: event.rawPresent,
        framingOk: event.framingOk,
        factoryRegistered: event.factoryRegistered,
      },
    ).actions;
    const plan = channelEnvelopeUnpackPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type ChannelEnvelopePackPlan = "missing-message" | "ok";

/** Whether Envelope.pack may serialize from a typed message. */
export function planChannelEnvelopePack(
  messagePresent: boolean,
): ChannelEnvelopePackPlan {
  return messagePresent ? "ok" : "missing-message";
}

export type ChannelEnvelopePackPlanEvent =
  | Event
  | {
      readonly kind: "channel/envelope-pack-plan-gate";
      readonly messagePresent: boolean;
    };

export type ChannelEnvelopePackPlanAction = {
  readonly kind: ChannelEnvelopePackPlan;
};

/** Extract the pack plan from actions; null when empty. */
export function channelEnvelopePackPlanFromActions(
  actions: ReadonlyArray<ChannelEnvelopePackPlanAction>,
): ChannelEnvelopePackPlan | null {
  const action = actions.find(
    (entry) => entry.kind === "ok" || entry.kind === "missing-message",
  );
  return action?.kind ?? null;
}

export type ChannelEnvelopePackEvent =
  | Event
  | {
      readonly kind: "channel/envelope-pack-gate";
      readonly messagePresent: boolean;
    };
