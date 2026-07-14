/**
 * Pure RNS Channel envelope framing (MSGTYPE + sequence + length + payload).
 * Pack / unpack / MSGTYPE-registration conclusions leave via machine actions
 * (no ad-hoc plan reads beside the step).
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

export function channelPayloadMdu(outletMdu: number): number {
  const value = outletMdu - CHANNEL_ENVELOPE_HEADER_SIZE;
  return value > 0xffff ? 0xffff : value;
}

export function nextChannelSequence(sequence: number): number {
  return (sequence + 1) % CHANNEL_SEQ_MODULUS;
}
