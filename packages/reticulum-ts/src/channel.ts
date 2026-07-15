import {
  ChannelExceptionTypeCode,
  ChannelMessageState,
  CHANNEL_MAX_TRIES,
  CHANNEL_SEQ_MAX,
  CHANNEL_SEQ_MODULUS,
  ChannelWindowLimits,
  shouldAllowLinkSend,
  initialLinkSendAllowState,
  stepLinkSendAllowWithActions,
  channelEmplaceIndex,
  channelEnvelopeFieldsFromActions,
  channelMessageStateFromActions,
  channelPacketTimeoutFromActions,
  channelPayloadMdu,
  channelRingSequenceIndexFromActions,
  channelTxEnvelopeIndexFromActions,
  channelTxOutstandingCountFromActions,
  channelTxTimeoutRetryAction,
  drainContiguousChannelSequences,
  initialAcceptChannelSequenceState,
  initialApplyChannelPacketReceiptTimeoutState,
  initialApplyChannelTxReceiptTimeoutExtensionState,
  initialArmChannelPacketReceiptState,
  initialChannelAllowsSendState,
  initialChannelOutletTransmitState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelWindowState,
  initialClearChannelEnvelopePacketState,
  initialCountChannelTxOutstandingState,
  initialDrainChannelRingIndexState,
  initialEmplaceChannelEnvelopeState,
  initialEmitChannelImmediateDeliveryState,
  initialChannelMessageStateFromPacketReceiptState,
  initialIndexOfChannelRingSequenceState,
  initialIndexOfChannelTxEnvelopeState,
  initialRegisterChannelMessageHandlerState,
  initialReplaceChannelResentPacketState,
  initialStopChannelHandlerFanoutState,
  nextChannelSequence,
  initialChannelEnvelopePackState,
  initialChannelEnvelopeUnpackState,
  initialChannelMessageHandlerUnregisterState,
  initialChannelMessageTypeRegistrationState,
  initialChannelSendState,
  initialChannelTxEnvelopeOpState,
  initialChannelTxReceiptTimeoutRefreshState,
  initialPackChannelEnvelopeState,
  initialUnpackChannelEnvelopeState,
  packChannelEnvelopeRawFromActions,
  shouldAcceptChannelOutletTransmit,
  shouldAcceptChannelSequenceNow,
  shouldAllowChannelSend,
  shouldApplyChannelPacketReceiptTimeoutNow,
  shouldApplyChannelTxReceiptTimeoutExtensionNow,
  shouldArmChannelPacketReceiptNow,
  shouldClearChannelEnvelopePacketNow,
  shouldDrainChannelRingIndexNow,
  shouldEmplaceChannelEnvelopeNow,
  shouldEmitChannelImmediateDeliveryNow,
  shouldGiveUpChannelTxTimeout,
  shouldMissChannelTxEnvelopeOp,
  shouldProceedChannelEnvelopePack,
  shouldProceedChannelEnvelopeUnpack,
  shouldProceedChannelMessageTypeRegistration,
  shouldProceedChannelSend,
  shouldRegisterChannelMessageHandlerNow,
  shouldRejectChannelEnvelopePackMissingMessage,
  shouldRejectChannelEnvelopeUnpackMissingRaw,
  shouldRejectChannelEnvelopeUnpackNotRegistered,
  shouldRejectChannelEnvelopeUnpackTruncate,
  shouldRejectChannelMessageTypeMissingMsgtype,
  shouldRejectChannelMessageTypeSystemReserved,
  shouldRejectChannelSendLinkNotReady,
  shouldRejectChannelSendTooBig,
  shouldRejectPackChannelEnvelope,
  shouldRejectUnpackChannelEnvelope,
  shouldRemoveChannelMessageHandler,
  shouldReplaceChannelResentPacketNow,
  shouldRetryChannelTxTimeout,
  shouldStopChannelHandlerFanoutNow,
  shouldUseChannelPacketTimeout,
  shouldUseChannelRingSequenceIndex,
  shouldUseChannelTxEnvelopeIndex,
  shouldUseChannelTxOutstandingCount,
  shouldUsePackChannelEnvelope,
  shouldUseUnpackChannelEnvelope,
  channelMessageHandlerUnregisterIndex,
  channelTxReceiptTimeoutExtensions,
  stepAcceptChannelSequenceWithActions,
  stepApplyChannelPacketReceiptTimeoutWithActions,
  stepApplyChannelTxReceiptTimeoutExtensionWithActions,
  stepArmChannelPacketReceiptWithActions,
  stepChannelAllowsSendWithActions,
  stepChannelEnvelopePackWithActions,
  stepChannelEnvelopeUnpackWithActions,
  stepChannelMessageHandlerUnregisterWithActions,
  stepChannelMessageTypeRegistrationWithActions,
  stepChannelOutletTransmitWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepChannelSendWithActions,
  stepChannelTxEnvelopeOpWithActions,
  stepChannelTxReceiptTimeoutRefreshWithActions,
  stepChannelTxTimeoutWithActions,
  stepChannelWindow,
  stepClearChannelEnvelopePacketWithActions,
  stepCountChannelTxOutstandingWithActions,
  stepDrainChannelRingIndexWithActions,
  stepEmplaceChannelEnvelopeWithActions,
  stepEmitChannelImmediateDeliveryWithActions,
  stepChannelMessageStateFromPacketReceiptWithActions,
  stepIndexOfChannelRingSequenceWithActions,
  stepIndexOfChannelTxEnvelopeWithActions,
  stepPackChannelEnvelopeWithActions,
  stepRegisterChannelMessageHandlerWithActions,
  stepReplaceChannelResentPacketWithActions,
  stepStopChannelHandlerFanoutWithActions,
  stepUnpackChannelEnvelopeWithActions,
  type ChannelTxTimeoutAction,
  type ChannelWindowState,
  type UnpackedChannelEnvelope
} from "@twistedpear/protocol";
import type { Link } from "./link.js";
import { PacketContext } from "./packet.js";
import type { PacketReceipt } from "./packet-receipt.js";

/** Mirrors RNS/Channel.py MessageState. */
export const MessageState = ChannelMessageState;

export type MessageStateValue = (typeof MessageState)[keyof typeof MessageState];

export const ChannelExceptionType = ChannelExceptionTypeCode;

export type ChannelExceptionTypeValue =
  (typeof ChannelExceptionType)[keyof typeof ChannelExceptionType];

export class ChannelException extends Error {
  readonly type: ChannelExceptionTypeValue;

  constructor(type: ChannelExceptionTypeValue, message: string) {
    super(message);
    this.type = type;
  }
}

export interface ChannelMessage {
  readonly MSGTYPE: number;
  pack(): Uint8Array;
  unpack(raw: Uint8Array): void;
}

export type ChannelMessageConstructor = {
  new (): ChannelMessage;
  readonly MSGTYPE: number;
};

export type ChannelMessageHandler = (message: ChannelMessage) => boolean;

export interface ChannelOutlet {
  send(raw: Uint8Array): Promise<ChannelPacket | null>;
  resend(packet: ChannelPacket): Promise<ChannelPacket | null>;
  readonly mdu: number;
  readonly rtt: number;
  readonly isUsable: boolean;
  getPacketState(packet: ChannelPacket): MessageStateValue;
  timedOut(): void;
  setPacketTimeoutCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null,
    timeout?: number | null
  ): void;
  setPacketDeliveredCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null
  ): void;
  getPacketId(packet: ChannelPacket): Uint8Array | null;
}

export interface ChannelPacket {
  readonly raw: Uint8Array;
  readonly receipt: PacketReceipt | null;
}

class Envelope {
  readonly message: ChannelMessage | null;
  raw: Uint8Array | null = null;
  packet: ChannelPacket | null = null;
  sequence: number;
  tries = 0;
  tracked = false;

  constructor(
    readonly outlet: ChannelOutlet,
    options: { readonly message?: ChannelMessage; readonly raw?: Uint8Array; readonly sequence?: number }
  ) {
    this.message = options.message ?? null;
    this.raw = options.raw ?? null;
    this.sequence = options.sequence ?? 0;
  }

  pack(): Uint8Array {
    const { actions } = stepChannelEnvelopePackWithActions(initialChannelEnvelopePackState(), {
      kind: "channel/envelope-pack-gate",
      messagePresent: this.message !== null
    });
    if (shouldRejectChannelEnvelopePackMissingMessage(actions) || this.message === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no message");
    }
    if (!shouldProceedChannelEnvelopePack(actions)) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no message");
    }

    const packStepped = stepPackChannelEnvelopeWithActions(initialPackChannelEnvelopeState(), {
      kind: "channel-envelope/pack-gate",
      msgType: this.message.MSGTYPE,
      sequence: this.sequence,
      payload: this.message.pack()
    });
    if (
      shouldRejectPackChannelEnvelope(packStepped.actions) ||
      !shouldUsePackChannelEnvelope(packStepped.actions)
    ) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope pack failed");
    }
    const packed = packChannelEnvelopeRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope pack failed");
    }
    this.raw = packed;
    return this.raw;
  }

  unpack(factories: ReadonlyMap<number, ChannelMessageConstructor>): ChannelMessage {
    let unpacked: UnpackedChannelEnvelope | null = null;
    if (this.raw !== null) {
      const unpackStepped = stepUnpackChannelEnvelopeWithActions(initialUnpackChannelEnvelopeState(), {
        kind: "channel-envelope/unpack-gate",
        raw: this.raw
      });
      if (
        !shouldRejectUnpackChannelEnvelope(unpackStepped.actions) &&
        shouldUseUnpackChannelEnvelope(unpackStepped.actions)
      ) {
        unpacked = channelEnvelopeFieldsFromActions(unpackStepped.actions);
      }
    }
    const { actions } = stepChannelEnvelopeUnpackWithActions(initialChannelEnvelopeUnpackState(), {
      kind: "channel/envelope-unpack-gate",
      rawPresent: this.raw !== null,
      framingOk: unpacked !== null,
      factoryRegistered: unpacked !== null && factories.has(unpacked.msgType)
    });
    if (shouldRejectChannelEnvelopeUnpackMissingRaw(actions)) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no raw data");
    }
    if (shouldRejectChannelEnvelopeUnpackTruncate(actions) || unpacked === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope framing is truncated");
    }
    if (shouldRejectChannelEnvelopeUnpackNotRegistered(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_NOT_REGISTERED,
        `Unknown channel MSGTYPE ${unpacked.msgType.toString(16)}`
      );
    }
    if (!shouldProceedChannelEnvelopeUnpack(actions)) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope unpack rejected");
    }

    this.sequence = unpacked.sequence;
    const ctor = factories.get(unpacked.msgType)!;
    const message = new ctor();
    message.unpack(unpacked.payload);
    return message;
  }
}

/** Mirrors RNS/Channel.py ordered reliable delivery over links. */
export class Channel {
  static readonly WINDOW = ChannelWindowLimits.WINDOW;
  static readonly WINDOW_MIN = ChannelWindowLimits.WINDOW_MIN;
  static readonly WINDOW_MIN_LIMIT_MEDIUM = ChannelWindowLimits.WINDOW_MIN_LIMIT_MEDIUM;
  static readonly WINDOW_MIN_LIMIT_FAST = ChannelWindowLimits.WINDOW_MIN_LIMIT_FAST;
  static readonly WINDOW_MAX_SLOW = ChannelWindowLimits.WINDOW_MAX_SLOW;
  static readonly WINDOW_MAX_MEDIUM = ChannelWindowLimits.WINDOW_MAX_MEDIUM;
  static readonly WINDOW_MAX_FAST = ChannelWindowLimits.WINDOW_MAX_FAST;
  static readonly WINDOW_MAX = ChannelWindowLimits.WINDOW_MAX_FAST;
  static readonly FAST_RATE_THRESHOLD = ChannelWindowLimits.FAST_RATE_THRESHOLD;
  static readonly RTT_FAST = ChannelWindowLimits.RTT_FAST;
  static readonly RTT_MEDIUM = ChannelWindowLimits.RTT_MEDIUM;
  static readonly RTT_SLOW = ChannelWindowLimits.RTT_SLOW;
  static readonly WINDOW_FLEXIBILITY = ChannelWindowLimits.WINDOW_FLEXIBILITY;
  static readonly SEQ_MAX = CHANNEL_SEQ_MAX;
  static readonly SEQ_MODULUS = CHANNEL_SEQ_MODULUS;

  private readonly txRing: Envelope[] = [];
  private readonly rxRing: Envelope[] = [];
  private readonly messageCallbacks: ChannelMessageHandler[] = [];
  private readonly messageFactories = new Map<number, ChannelMessageConstructor>();
  private nextSequence = 0;
  private nextRxSequence = 0;
  private readonly maxTries = CHANNEL_MAX_TRIES;
  private windowState: ChannelWindowState;

  get window(): number {
    return this.windowState.window;
  }

  set window(value: number) {
    this.windowState = { ...this.windowState, window: value };
  }

  get windowMax(): number {
    return this.windowState.windowMax;
  }

  set windowMax(value: number) {
    this.windowState = { ...this.windowState, windowMax: value };
  }

  get windowMin(): number {
    return this.windowState.windowMin;
  }

  set windowMin(value: number) {
    this.windowState = { ...this.windowState, windowMin: value };
  }

  get windowFlexibility(): number {
    return this.windowState.windowFlexibility;
  }

  set windowFlexibility(value: number) {
    this.windowState = { ...this.windowState, windowFlexibility: value };
  }

  constructor(private readonly outlet: ChannelOutlet) {
    this.windowState = initialChannelWindowState(outlet.rtt);
  }

  registerMessageType(messageClass: ChannelMessageConstructor, options: { readonly isSystemType?: boolean } = {}): void {
    const { actions } = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: messageClass.MSGTYPE,
        isSystemType: options.isSystemType === true
      }
    );
    if (shouldRejectChannelMessageTypeMissingMsgtype(actions)) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message class lacks MSGTYPE");
    }
    if (shouldRejectChannelMessageTypeSystemReserved(actions)) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message type is system-reserved");
    }
    if (!shouldProceedChannelMessageTypeRegistration(actions)) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message type registration rejected");
    }

    this.messageFactories.set(messageClass.MSGTYPE, messageClass);
  }

  addMessageHandler(callback: ChannelMessageHandler): void {
    if (
      shouldRegisterChannelMessageHandlerNow(
        stepRegisterChannelMessageHandlerWithActions(
          initialRegisterChannelMessageHandlerState(),
          {
            kind: "channel/register-message-handler-gate",
            alreadyPresent: this.messageCallbacks.includes(callback)
          }
        ).actions
      )
    ) {
      this.messageCallbacks.push(callback);
    }
  }

  removeMessageHandler(callback: ChannelMessageHandler): void {
    const stepped = stepChannelMessageHandlerUnregisterWithActions(
      initialChannelMessageHandlerUnregisterState(),
      {
        kind: "channel/message-handler-unregister-gate",
        index: this.messageCallbacks.indexOf(callback)
      }
    );
    const index = channelMessageHandlerUnregisterIndex(stepped.actions);
    if (shouldRemoveChannelMessageHandler(stepped.actions) && index !== null) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  get mdu(): number {
    return channelPayloadMdu(this.outlet.mdu);
  }

  isReadyToSend(): boolean {
    /** Adapt TX outstanding / send-allow via protocol actions (no ad-hoc
     * `countChannelTxOutstanding` / `channelAllowsSend` reads). */
    const outstandingStepped = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "channel/tx-outstanding-gate",
        entries: this.txRing.map((envelope) => ({
          packetPresent: envelope.packet !== null,
          delivered:
            envelope.packet !== null &&
            this.outlet.getPacketState(envelope.packet) === MessageState.MSGSTATE_DELIVERED
        }))
      }
    );
    const outstanding = shouldUseChannelTxOutstandingCount(outstandingStepped.actions)
      ? channelTxOutstandingCountFromActions(outstandingStepped.actions)
      : null;
    if (outstanding === null) {
      throw new Error("Channel.isReadyToSend: missing use-count action");
    }

    const allowStepped = stepChannelAllowsSendWithActions(initialChannelAllowsSendState(), {
      kind: "channel/allows-send-gate",
      isUsable: this.outlet.isUsable,
      outstanding,
      window: this.windowState.window
    });
    return shouldAllowChannelSend(allowStepped.actions);
  }

  async send(message: ChannelMessage): Promise<Envelope> {
    const readyGate = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: this.isReadyToSend(),
      packedLength: null,
      mdu: this.outlet.mdu
    });
    if (shouldRejectChannelSendLinkNotReady(readyGate.actions)) {
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Link is not ready");
    }
    if (!shouldProceedChannelSend(readyGate.actions)) {
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Link is not ready");
    }

    const reservedSequence = this.nextSequence;
    const envelope = new Envelope(this.outlet, { message, sequence: reservedSequence });
    envelope.pack();
    const sizeGate = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: true,
      packedLength: envelope.raw?.length ?? null,
      mdu: this.outlet.mdu
    });
    if (shouldRejectChannelSendTooBig(sizeGate.actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_TOO_BIG,
        `Packed message too big for packet: ${envelope.raw!.length} > ${this.outlet.mdu}`
      );
    }
    if (!shouldProceedChannelSend(sizeGate.actions)) {
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Link is not ready");
    }

    this.nextSequence = nextChannelSequence(reservedSequence);
    const packet = await this.outlet.send(envelope.raw!);
    /** Adapt outlet-transmit via protocol actions (no ad-hoc
     * `isChannelOutletTransmitOk` reads). */
    const transmitStepped = stepChannelOutletTransmitWithActions(
      initialChannelOutletTransmitState(),
      {
        kind: "channel/outlet-transmit-gate",
        packetPresent: packet !== null,
        rawLength: packet?.raw.length ?? 0,
        receiptPresent: packet?.receipt !== null
      }
    );
    if (packet === null || !shouldAcceptChannelOutletTransmit(transmitStepped.actions)) {
      this.nextSequence = reservedSequence;
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Outlet did not transmit packet");
    }

    envelope.packet = packet;
    this.emplaceEnvelope(envelope, this.txRing);
    envelope.tries += 1;
    this.outlet.setPacketDeliveredCallback(packet, (deliveredPacket) => {
      this.packetDelivered(deliveredPacket);
    });
    this.outlet.setPacketTimeoutCallback(
      packet,
      (timedOutPacket) => {
        void this.packetTimeout(timedOutPacket);
      },
      this.getPacketTimeoutTime(envelope.tries)
    );
    this.updatePacketTimeouts();

    if (
      shouldEmitChannelImmediateDeliveryNow(
        stepEmitChannelImmediateDeliveryWithActions(
          initialEmitChannelImmediateDeliveryState(),
          {
            kind: "channel/emit-immediate-delivery-gate",
            packetState: this.outlet.getPacketState(packet)
          }
        ).actions
      )
    ) {
      this.packetDelivered(packet);
    }

    return envelope;
  }

  receive(raw: Uint8Array): void {
    const envelope = new Envelope(this.outlet, { raw: Uint8Array.from(raw) });
    envelope.unpack(this.messageFactories);

    if (
      !shouldAcceptChannelSequenceNow(
        stepAcceptChannelSequenceWithActions(initialAcceptChannelSequenceState(), {
          kind: "channel/accept-sequence-gate",
          sequence: envelope.sequence,
          nextRxSequence: this.nextRxSequence,
          windowMax: Channel.WINDOW_MAX
        }).actions
      )
    ) {
      return;
    }

    if (!this.emplaceEnvelope(envelope, this.rxRing)) {
      return;
    }

    const drained = drainContiguousChannelSequences({
      ringSequences: this.rxRing.map((candidate) => candidate.sequence),
      nextRxSequence: this.nextRxSequence
    });
    this.nextRxSequence = drained.nextRxSequence;

    for (const sequence of drained.contiguous) {
      /** Adapt ring-sequence index via protocol actions (no ad-hoc
       * `indexOfChannelRingSequence` reads). */
      const indexStepped = stepIndexOfChannelRingSequenceWithActions(
        initialIndexOfChannelRingSequenceState(),
        {
          kind: "channel/ring-sequence-index-gate",
          ringSequences: this.rxRing.map((candidate) => candidate.sequence),
          target: sequence
        }
      );
      const index = shouldUseChannelRingSequenceIndex(indexStepped.actions)
        ? channelRingSequenceIndexFromActions(indexStepped.actions)
        : null;
      if (
        !shouldDrainChannelRingIndexNow(
          stepDrainChannelRingIndexWithActions(initialDrainChannelRingIndexState(), {
            kind: "channel/drain-ring-index-gate",
            indexPresent: index !== null
          }).actions
        )
      ) {
        continue;
      }
      const candidate = this.rxRing.splice(index!, 1)[0]!;
      const delivered = candidate.unpack(this.messageFactories);

      for (const callback of [...this.messageCallbacks]) {
        if (
          shouldStopChannelHandlerFanoutNow(
            stepStopChannelHandlerFanoutWithActions(initialStopChannelHandlerFanoutState(), {
              kind: "channel/stop-handler-fanout-gate",
              handled: callback(delivered)
            }).actions
          )
        ) {
          break;
        }
      }
    }
  }

  shutdown(): void {
    this.messageCallbacks.length = 0;
    for (const envelope of this.txRing) {
      if (
        shouldClearChannelEnvelopePacketNow(
          stepClearChannelEnvelopePacketWithActions(initialClearChannelEnvelopePacketState(), {
            kind: "channel/clear-envelope-packet-gate",
            packetPresent: envelope.packet !== null
          }).actions
        )
      ) {
        this.outlet.setPacketTimeoutCallback(envelope.packet!, null);
        this.outlet.setPacketDeliveredCallback(envelope.packet!, null);
      }
    }

    this.txRing.length = 0;
    this.rxRing.length = 0;
  }

  private emplaceEnvelope(envelope: Envelope, ring: Envelope[]): boolean {
    const index = channelEmplaceIndex({
      sequence: envelope.sequence,
      ringSequences: ring.map((existing) => existing.sequence),
      wrapBaseSequence: this.nextRxSequence
    });
    const emplaceStepped = stepEmplaceChannelEnvelopeWithActions(
      initialEmplaceChannelEnvelopeState(),
      {
        kind: "channel/emplace-envelope-gate",
        indexPresent: index !== null
      }
    );
    if (!shouldEmplaceChannelEnvelopeNow(emplaceStepped.actions)) {
      return false;
    }

    ring.splice(index!, 0, envelope);
    envelope.tracked = true;
    return true;
  }

  private packetDelivered(packet: ChannelPacket): void {
    this.packetTxOp(packet, () => true);
  }

  private async packetTimeout(packet: ChannelPacket): Promise<void> {
    const index = this.indexOfTxEnvelope(packet);
    const envelope = index === null ? undefined : this.txRing[index];
    const stepped = stepChannelTxTimeoutWithActions(this.windowState, {
      kind: "channel/tx-timeout",
      indexOk: index !== null,
      envelopePresent: envelope !== undefined,
      delivered: this.outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED,
      tries: envelope?.tries ?? 0,
      maxTries: this.maxTries,
      packetPresent: envelope?.packet != null
    });
    this.windowState = stepped.state;
    await this.applyChannelTxTimeoutActions(envelope, stepped.actions);
  }

  private async applyChannelTxTimeoutActions(
    envelope: Envelope | undefined,
    actions: readonly ChannelTxTimeoutAction[]
  ): Promise<void> {
    if (shouldGiveUpChannelTxTimeout(actions)) {
      this.shutdown();
      this.outlet.timedOut();
      return;
    }

    if (!shouldRetryChannelTxTimeout(actions) || envelope === undefined) {
      return;
    }

    const retry = channelTxTimeoutRetryAction(actions);
    if (retry === null) {
      return;
    }

    envelope.tries = retry.nextTries;
    if (!retry.resend || envelope.packet === null) {
      return;
    }

    let packet = envelope.packet;
    const resent = await this.outlet.resend(packet);
    if (
      shouldReplaceChannelResentPacketNow(
        stepReplaceChannelResentPacketWithActions(initialReplaceChannelResentPacketState(), {
          kind: "channel/replace-resent-packet-gate",
          resentPresent: resent !== null
        }).actions
      )
    ) {
      packet = resent!;
      envelope.packet = packet;
    }

    this.outlet.setPacketDeliveredCallback(packet, (deliveredPacket) => {
      this.packetDelivered(deliveredPacket);
    });
    this.outlet.setPacketTimeoutCallback(
      packet,
      (timedOutPacket) => {
        void this.packetTimeout(timedOutPacket);
      },
      this.getPacketTimeoutTime(envelope.tries)
    );
    this.updatePacketTimeouts();

    if (
      shouldEmitChannelImmediateDeliveryNow(
        stepEmitChannelImmediateDeliveryWithActions(
          initialEmitChannelImmediateDeliveryState(),
          {
            kind: "channel/emit-immediate-delivery-gate",
            packetState: this.outlet.getPacketState(packet)
          }
        ).actions
      )
    ) {
      this.packetDelivered(packet);
    }
  }

  private packetTxOp(packet: ChannelPacket, op: (envelope: Envelope) => boolean): void {
    const index = this.indexOfTxEnvelope(packet);
    const envelope = index === null ? undefined : this.txRing[index];
    const stepped = stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), {
      kind: "channel/tx-envelope-op-gate",
      indexOk: index !== null,
      envelopePresent: envelope !== undefined,
      opOk: envelope === undefined ? false : op(envelope)
    });
    if (shouldMissChannelTxEnvelopeOp(stepped.actions)) {
      return;
    }

    envelope!.tracked = false;
    this.txRing.splice(index!, 1);

    this.windowState = stepChannelWindow(this.windowState, {
      kind: "channel/delivered",
      rtt: this.outlet.rtt
    }).state;
  }

  private indexOfTxEnvelope(packet: ChannelPacket): number | null {
    /** Adapt TX-envelope index via protocol actions (no ad-hoc
     * `indexOfChannelTxEnvelope` reads). */
    const stepped = stepIndexOfChannelTxEnvelopeWithActions(
      initialIndexOfChannelTxEnvelopeState(),
      {
        kind: "channel/tx-envelope-index-gate",
        packetIds: this.txRing.map((candidate) =>
          candidate.packet === null ? null : this.outlet.getPacketId(candidate.packet)
        ),
        targetId: this.outlet.getPacketId(packet)
      }
    );
    return shouldUseChannelTxEnvelopeIndex(stepped.actions)
      ? channelTxEnvelopeIndexFromActions(stepped.actions)
      : null;
  }

  private getPacketTimeoutTime(tries: number): number {
    /** Adapt packet timeout via protocol actions (no ad-hoc `channelPacketTimeoutSeconds` reads). */
    const stepped = stepChannelPacketTimeoutSecondsWithActions(
      initialChannelPacketTimeoutSecondsState(),
      {
        kind: "channel/packet-timeout-gate",
        tries,
        rtt: this.outlet.rtt,
        txRingLength: this.txRing.length
      }
    );
    const timeout = shouldUseChannelPacketTimeout(stepped.actions)
      ? channelPacketTimeoutFromActions(stepped.actions)
      : null;
    if (timeout === null) {
      throw new Error("Channel.getPacketTimeoutTime: missing use-timeout action");
    }
    return timeout;
  }

  private updatePacketTimeouts(): void {
    const stepped = stepChannelTxReceiptTimeoutRefreshWithActions(
      initialChannelTxReceiptTimeoutRefreshState(),
      {
        kind: "channel/tx-receipt-timeout-refresh-gate",
        entries: this.txRing.map((envelope) => ({
          receiptPresent: envelope.packet?.receipt != null,
          currentTimeout: envelope.packet?.receipt?.timeout ?? null,
          tries: envelope.tries,
          rtt: this.outlet.rtt,
          txRingLength: this.txRing.length
        }))
      }
    );
    for (const extension of channelTxReceiptTimeoutExtensions(stepped.actions)) {
      const receipt = this.txRing[extension.index]?.packet?.receipt;
      if (
        shouldApplyChannelTxReceiptTimeoutExtensionNow(
          stepApplyChannelTxReceiptTimeoutExtensionWithActions(
            initialApplyChannelTxReceiptTimeoutExtensionState(),
            {
              kind: "channel/apply-tx-receipt-timeout-extension-gate",
              extensionPresent: receipt != null
            }
          ).actions
        )
      ) {
        receipt!.setTimeout(extension.timeoutSeconds);
      }
    }
  }
}

class LinkChannelPacket implements ChannelPacket {
  constructor(
    readonly raw: Uint8Array,
    readonly receipt: PacketReceipt | null
  ) {}
}

/** Mirrors RNS/Channel.py LinkChannelOutlet. */
export class LinkChannelOutlet implements ChannelOutlet {
  constructor(private readonly link: Link) {}

  get mdu(): number {
    return this.link.mdu;
  }

  get rtt(): number {
    return this.link.rtt ?? 0;
  }

  get isUsable(): boolean {
    const sendAllow = stepLinkSendAllowWithActions(initialLinkSendAllowState(), {
      kind: "link/send-allow-gate",
      status: this.link.status
    });
    return shouldAllowLinkSend(sendAllow.actions);
  }

  async send(raw: Uint8Array): Promise<ChannelPacket | null> {
    const result = await this.link.sendContext(PacketContext.CHANNEL, raw, { createReceipt: true });
    if (result === null) {
      return null;
    }

    return new LinkChannelPacket(result.raw, result.receipt);
  }

  async resend(packet: ChannelPacket): Promise<ChannelPacket | null> {
    const resent = await this.link.resendPacket(packet.raw, { createReceipt: true });
    if (resent === null) {
      return null;
    }

    return new LinkChannelPacket(resent.raw, resent.receipt);
  }

  getPacketState(packet: ChannelPacket): MessageStateValue {
    const messageState = channelMessageStateFromActions(
      stepChannelMessageStateFromPacketReceiptWithActions(
        initialChannelMessageStateFromPacketReceiptState(),
        {
          kind: "channel/message-state-from-receipt-gate",
          receiptStatus: packet.receipt === null ? null : packet.receipt.getStatus()
        }
      ).actions
    );
    if (messageState === null) {
      throw new Error("getPacketState: missing use-state action");
    }
    return messageState;
  }

  timedOut(): void {
    void this.link.teardown();
  }

  setPacketTimeoutCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null,
    timeout: number | null = null
  ): void {
    if (
      !shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), {
          kind: "channel/arm-packet-receipt-gate",
          receiptPresent: packet.receipt !== null
        }).actions
      )
    ) {
      return;
    }

    if (
      shouldApplyChannelPacketReceiptTimeoutNow(
        stepApplyChannelPacketReceiptTimeoutWithActions(
          initialApplyChannelPacketReceiptTimeoutState(),
          {
            kind: "channel/apply-packet-receipt-timeout-gate",
            timeoutPresent: timeout !== null
          }
        ).actions
      )
    ) {
      packet.receipt!.setTimeout(timeout!);
    }

    packet.receipt!.setTimeoutCallback(
      callback === null ? null : () => {
        callback(packet);
      }
    );
  }

  setPacketDeliveredCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null
  ): void {
    if (
      !shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), {
          kind: "channel/arm-packet-receipt-gate",
          receiptPresent: packet.receipt !== null
        }).actions
      )
    ) {
      return;
    }

    packet.receipt!.setDeliveryCallback(
      callback === null
        ? null
        : () => {
            callback(packet);
          }
    );
  }

  getPacketId(packet: ChannelPacket): Uint8Array | null {
    return packet.receipt?.hash ?? null;
  }
}
