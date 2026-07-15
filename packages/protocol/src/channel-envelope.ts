/**
 * Pure RNS Channel envelope framing (MSGTYPE + sequence + length + payload).
 * Pack / unpack framing conclusions leave via machine actions (no ad-hoc
 * `packChannelEnvelope` / `unpackChannelEnvelope` reads beside the step).
 * Pack / unpack / MSGTYPE-registration gate conclusions leave via machine
 * actions (no ad-hoc plan reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import type { PacketReceiptStatusValue } from "./packet-receipt-timeout.js";
import { PacketReceiptStatus } from "./packet-receipt-timeout.js";

export const CHANNEL_ENVELOPE_HEADER_SIZE = 6;
export const CHANNEL_SEQ_MAX = 0xffff;
export const CHANNEL_SEQ_MODULUS = CHANNEL_SEQ_MAX + 1;
export const CHANNEL_SYSTEM_MSGTYPE_MIN = 0xf000;

/** Mirrors RNS/Channel.py MessageState. */
export const ChannelMessageState = {
  MSGSTATE_NEW: 0,
  MSGSTATE_SENT: 1,
  MSGSTATE_DELIVERED: 2,
  MSGSTATE_FAILED: 3
} as const;

export type ChannelMessageStateValue =
  (typeof ChannelMessageState)[keyof typeof ChannelMessageState];

/** Mirrors RNS/Channel.py ChannelException types. */
export const ChannelExceptionTypeCode = {
  ME_NO_MSG_TYPE: 0,
  ME_INVALID_MSG_TYPE: 1,
  ME_NOT_REGISTERED: 2,
  ME_LINK_NOT_READY: 3,
  ME_ALREADY_SENT: 4,
  ME_TOO_BIG: 5
} as const;

export type ChannelExceptionTypeCodeValue =
  (typeof ChannelExceptionTypeCode)[keyof typeof ChannelExceptionTypeCode];

/** Map packet-receipt status to channel message state. */
export function channelMessageStateFromPacketReceipt(
  receiptStatus: PacketReceiptStatusValue | null
): ChannelMessageStateValue {
  if (receiptStatus === null) {
    return ChannelMessageState.MSGSTATE_FAILED;
  }
  if (receiptStatus === PacketReceiptStatus.SENT) {
    return ChannelMessageState.MSGSTATE_SENT;
  }
  if (receiptStatus === PacketReceiptStatus.DELIVERED) {
    return ChannelMessageState.MSGSTATE_DELIVERED;
  }
  return ChannelMessageState.MSGSTATE_FAILED;
}

/** Whether send/resend should immediately fire packetDelivered for an already-delivered outlet state. */
export function shouldEmitChannelImmediateDelivery(packetState: number): boolean {
  return packetState === ChannelMessageState.MSGSTATE_DELIVERED;
}

/**
 * Channel immediate-delivery emit gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEmitChannelImmediateDelivery`
 * reads beside the step).
 */
export type EmitChannelImmediateDeliveryState = Record<string, never>;

export type EmitChannelImmediateDeliveryEvent =
  | Event
  | {
      readonly kind: "channel/emit-immediate-delivery-gate";
      readonly packetState: number;
    };

export type EmitChannelImmediateDeliveryAction =
  | { readonly kind: "emit" }
  | { readonly kind: "skip" };

export interface EmitChannelImmediateDeliveryStepResult {
  readonly state: EmitChannelImmediateDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmitChannelImmediateDeliveryAction[];
}

export function initialEmitChannelImmediateDeliveryState(): EmitChannelImmediateDeliveryState {
  return {};
}

export function stepEmitChannelImmediateDeliveryWithActions(
  state: EmitChannelImmediateDeliveryState,
  event: EmitChannelImmediateDeliveryEvent
): EmitChannelImmediateDeliveryStepResult {
  if (event.kind === "channel/emit-immediate-delivery-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEmitChannelImmediateDelivery(event.packetState) ? "emit" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEmitChannelImmediateDeliveryNow(
  actions: ReadonlyArray<EmitChannelImmediateDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "emit");
}

export function shouldSkipEmitChannelImmediateDelivery(
  actions: ReadonlyArray<EmitChannelImmediateDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export interface PackedChannelEnvelope {
  readonly msgType: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
}

export interface UnpackedChannelEnvelope {
  readonly msgType: number;
  readonly sequence: number;
  readonly length: number;
  readonly payload: Uint8Array;
}

export function packChannelEnvelope(input: PackedChannelEnvelope): Uint8Array {
  const header = new Uint8Array(CHANNEL_ENVELOPE_HEADER_SIZE);
  const view = new DataView(header.buffer);
  view.setUint16(0, input.msgType & 0xffff, false);
  view.setUint16(2, input.sequence & 0xffff, false);
  view.setUint16(4, input.payload.length & 0xffff, false);
  const out = new Uint8Array(CHANNEL_ENVELOPE_HEADER_SIZE + input.payload.length);
  out.set(header, 0);
  out.set(input.payload, CHANNEL_ENVELOPE_HEADER_SIZE);
  return out;
}

export function unpackChannelEnvelope(raw: Uint8Array): UnpackedChannelEnvelope | null {
  if (raw.length < CHANNEL_ENVELOPE_HEADER_SIZE) {
    return null;
  }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const msgType = view.getUint16(0, false);
  const sequence = view.getUint16(2, false);
  const length = view.getUint16(4, false);
  if (raw.length < CHANNEL_ENVELOPE_HEADER_SIZE + length) {
    return null;
  }
  return {
    msgType,
    sequence,
    length,
    payload: raw.subarray(CHANNEL_ENVELOPE_HEADER_SIZE, CHANNEL_ENVELOPE_HEADER_SIZE + length)
  };
}

/**
 * Channel envelope pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packChannelEnvelope`
 * reads beside the step). Pack failures become `reject`.
 */
export type PackChannelEnvelopeState = Record<string, never>;

export type PackChannelEnvelopeEvent =
  | Event
  | {
      readonly kind: "channel-envelope/pack-gate";
      readonly msgType: number;
      readonly sequence: number;
      readonly payload: Uint8Array;
    };

export type PackChannelEnvelopeAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackChannelEnvelopeStepResult {
  readonly state: PackChannelEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackChannelEnvelopeAction[];
}

export function initialPackChannelEnvelopeState(): PackChannelEnvelopeState {
  return {};
}

export function stepPackChannelEnvelopeWithActions(
  state: PackChannelEnvelopeState,
  event: PackChannelEnvelopeEvent
): PackChannelEnvelopeStepResult {
  if (event.kind === "channel-envelope/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packChannelEnvelope({
              msgType: event.msgType,
              sequence: event.sequence,
              payload: event.payload
            })
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackChannelEnvelope(
  actions: ReadonlyArray<PackChannelEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackChannelEnvelope(
  actions: ReadonlyArray<PackChannelEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed channel envelope from step actions; null when no `use-raw`. */
export function packChannelEnvelopeRawFromActions(
  actions: ReadonlyArray<PackChannelEnvelopeAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Channel envelope unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackChannelEnvelope`
 * reads beside the step). Truncated frames become `reject`.
 */
export type UnpackChannelEnvelopeState = Record<string, never>;

export type UnpackChannelEnvelopeEvent =
  | Event
  | {
      readonly kind: "channel-envelope/unpack-gate";
      readonly raw: Uint8Array;
    };

export type UnpackChannelEnvelopeAction =
  | { readonly kind: "use-fields"; readonly fields: UnpackedChannelEnvelope }
  | { readonly kind: "reject" };

export interface UnpackChannelEnvelopeStepResult {
  readonly state: UnpackChannelEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackChannelEnvelopeAction[];
}

export function initialUnpackChannelEnvelopeState(): UnpackChannelEnvelopeState {
  return {};
}

export function stepUnpackChannelEnvelopeWithActions(
  state: UnpackChannelEnvelopeState,
  event: UnpackChannelEnvelopeEvent
): UnpackChannelEnvelopeStepResult {
  if (event.kind === "channel-envelope/unpack-gate") {
    const fields = unpackChannelEnvelope(event.raw);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [{ kind: "use-fields", fields }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackChannelEnvelope(
  actions: ReadonlyArray<UnpackChannelEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackChannelEnvelope(
  actions: ReadonlyArray<UnpackChannelEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked channel envelope from step actions; null when no `use-fields`. */
export function channelEnvelopeFieldsFromActions(
  actions: ReadonlyArray<UnpackChannelEnvelopeAction>
): UnpackedChannelEnvelope | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

export function isChannelSystemMsgType(msgType: number): boolean {
  return msgType >= CHANNEL_SYSTEM_MSGTYPE_MIN;
}

export type ChannelMessageTypeRegistrationPlan =
  | "ok"
  | "missing-msgtype"
  | "system-reserved";

/** Whether a channel MSGTYPE may be registered (missing / system-reserved gates). */
export function planChannelMessageTypeRegistration(input: {
  readonly msgType: number | undefined;
  readonly isSystemType: boolean;
}): ChannelMessageTypeRegistrationPlan {
  if (input.msgType === undefined) {
    return "missing-msgtype";
  }
  if (isChannelSystemMsgType(input.msgType) && !input.isSystemType) {
    return "system-reserved";
  }
  return "ok";
}

/**
 * Channel MSGTYPE registration gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ChannelMessageTypeRegistrationState = Record<string, never>;

export type ChannelMessageTypeRegistrationEvent =
  | Event
  | {
      readonly kind: "channel/message-type-registration-gate";
      readonly msgType: number | undefined;
      readonly isSystemType: boolean;
    };

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

export const stepChannelMessageTypeRegistration: StepFn<ChannelMessageTypeRegistrationState> = (
  state,
  event
) => {
  const result = stepChannelMessageTypeRegistrationInner(
    state,
    event as ChannelMessageTypeRegistrationEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepChannelMessageTypeRegistrationWithActions(
  state: ChannelMessageTypeRegistrationState,
  event: ChannelMessageTypeRegistrationEvent
): ChannelMessageTypeRegistrationStepResult {
  return stepChannelMessageTypeRegistrationInner(state, event);
}

export function shouldProceedChannelMessageTypeRegistration(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelMessageTypeMissingMsgtype(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>
): boolean {
  return actions.some((action) => action.kind === "missing-msgtype");
}

export function shouldRejectChannelMessageTypeSystemReserved(
  actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>
): boolean {
  return actions.some((action) => action.kind === "system-reserved");
}

function stepChannelMessageTypeRegistrationInner(
  state: ChannelMessageTypeRegistrationState,
  event: ChannelMessageTypeRegistrationEvent
): ChannelMessageTypeRegistrationStepResult {
  if (event.kind === "channel/message-type-registration-gate") {
    const plan = planChannelMessageTypeRegistration({
      msgType: event.msgType,
      isSystemType: event.isSystemType
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type ChannelEnvelopeUnpackPlan =
  | "ok"
  | "missing-raw"
  | "truncated"
  | "not-registered";

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
 * Channel envelope unpack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

export type ChannelEnvelopeUnpackAction = { readonly kind: ChannelEnvelopeUnpackPlan };

export interface ChannelEnvelopeUnpackStepResult {
  readonly state: ChannelEnvelopeUnpackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopeUnpackAction[];
}

export function initialChannelEnvelopeUnpackState(): ChannelEnvelopeUnpackState {
  return {};
}

export const stepChannelEnvelopeUnpack: StepFn<ChannelEnvelopeUnpackState> = (state, event) => {
  const result = stepChannelEnvelopeUnpackInner(state, event as ChannelEnvelopeUnpackEvent);
  return { state: result.state, intents: result.intents };
};

export function stepChannelEnvelopeUnpackWithActions(
  state: ChannelEnvelopeUnpackState,
  event: ChannelEnvelopeUnpackEvent
): ChannelEnvelopeUnpackStepResult {
  return stepChannelEnvelopeUnpackInner(state, event);
}

export function shouldProceedChannelEnvelopeUnpack(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectChannelEnvelopeUnpackMissingRaw(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>
): boolean {
  return actions.some((action) => action.kind === "missing-raw");
}

export function shouldRejectChannelEnvelopeUnpackTruncate(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>
): boolean {
  return actions.some((action) => action.kind === "truncated");
}

export function shouldRejectChannelEnvelopeUnpackNotRegistered(
  actions: ReadonlyArray<ChannelEnvelopeUnpackAction>
): boolean {
  return actions.some((action) => action.kind === "not-registered");
}

function stepChannelEnvelopeUnpackInner(
  state: ChannelEnvelopeUnpackState,
  event: ChannelEnvelopeUnpackEvent
): ChannelEnvelopeUnpackStepResult {
  if (event.kind === "channel/envelope-unpack-gate") {
    const plan = planChannelEnvelopeUnpack({
      rawPresent: event.rawPresent,
      framingOk: event.framingOk,
      factoryRegistered: event.factoryRegistered
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type ChannelEnvelopePackPlan = "missing-message" | "ok";

/** Whether Envelope.pack may serialize from a typed message. */
export function planChannelEnvelopePack(messagePresent: boolean): ChannelEnvelopePackPlan {
  return messagePresent ? "ok" : "missing-message";
}

/**
 * Channel envelope pack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ChannelEnvelopePackState = Record<string, never>;

export type ChannelEnvelopePackEvent =
  | Event
  | {
      readonly kind: "channel/envelope-pack-gate";
      readonly messagePresent: boolean;
    };

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
    const plan = planChannelEnvelopePack(event.messagePresent);
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
 * Channel message-handler unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterChannelMessageHandler` reads beside the step).
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
    const index = planUnregisterChannelMessageHandler(event.index);
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
