import {
  ChannelExceptionTypeCode,
  ChannelMessageState,
  CHANNEL_MAX_TRIES,
  CHANNEL_SEQ_MAX,
  CHANNEL_SEQ_MODULUS,
  ChannelWindowLimits,
  canLinkSend,
  channelAllowsSend,
  channelEmplaceIndex,
  channelMessageStateFromPacketReceipt,
  channelPacketTimeoutSeconds,
  channelPayloadMdu,
  channelTxTimeoutRetryAction,
  countChannelTxOutstanding,
  drainContiguousChannelSequences,
  indexOfChannelRingSequence,
  indexOfChannelTxEnvelope,
  initialChannelWindowState,
  isChannelOutletTransmitOk,
  nextChannelSequence,
  packChannelEnvelope,
  planChannelEnvelopePack,
  planChannelEnvelopeUnpack,
  planChannelMessageTypeRegistration,
  planChannelSend,
  planChannelTxEnvelopeOp,
  planChannelTxReceiptTimeoutRefresh,
  planUnregisterChannelMessageHandler,
  shouldAcceptChannelSequence,
  shouldApplyChannelPacketReceiptTimeout,
  shouldApplyChannelTxReceiptTimeoutExtension,
  shouldClearChannelEnvelopePacket,
  shouldDrainChannelRingIndex,
  shouldEmplaceChannelEnvelope,
  shouldEmitChannelImmediateDelivery,
  shouldGiveUpChannelTxTimeout,
  shouldRegisterChannelMessageHandler,
  shouldReplaceChannelResentPacket,
  shouldRetryChannelTxTimeout,
  shouldStopChannelHandlerFanout,
  shouldUnregisterChannelMessageHandler,
  stepChannelTxTimeoutWithActions,
  stepChannelWindow,
  unpackChannelEnvelope,
  type ChannelTxTimeoutAction,
  type ChannelWindowState
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
    if (planChannelEnvelopePack(this.message !== null) === "missing-message" || this.message === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no message");
    }

    this.raw = packChannelEnvelope({
      msgType: this.message.MSGTYPE,
      sequence: this.sequence,
      payload: this.message.pack()
    });
    return this.raw;
  }

  unpack(factories: ReadonlyMap<number, ChannelMessageConstructor>): ChannelMessage {
    const unpacked = this.raw === null ? null : unpackChannelEnvelope(this.raw);
    const plan = planChannelEnvelopeUnpack({
      rawPresent: this.raw !== null,
      framingOk: unpacked !== null,
      factoryRegistered: unpacked !== null && factories.has(unpacked.msgType)
    });
    if (plan === "missing-raw") {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no raw data");
    }
    if (plan === "truncated" || unpacked === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope framing is truncated");
    }
    if (plan === "not-registered") {
      throw new ChannelException(
        ChannelExceptionType.ME_NOT_REGISTERED,
        `Unknown channel MSGTYPE ${unpacked.msgType.toString(16)}`
      );
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
    const plan = planChannelMessageTypeRegistration({
      msgType: messageClass.MSGTYPE,
      isSystemType: options.isSystemType === true
    });
    if (plan === "missing-msgtype") {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message class lacks MSGTYPE");
    }
    if (plan === "system-reserved") {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message type is system-reserved");
    }

    this.messageFactories.set(messageClass.MSGTYPE, messageClass);
  }

  addMessageHandler(callback: ChannelMessageHandler): void {
    if (shouldRegisterChannelMessageHandler(this.messageCallbacks.includes(callback))) {
      this.messageCallbacks.push(callback);
    }
  }

  removeMessageHandler(callback: ChannelMessageHandler): void {
    const index = planUnregisterChannelMessageHandler(this.messageCallbacks.indexOf(callback));
    if (shouldUnregisterChannelMessageHandler(index !== null)) {
      this.messageCallbacks.splice(index!, 1);
    }
  }

  get mdu(): number {
    return channelPayloadMdu(this.outlet.mdu);
  }

  isReadyToSend(): boolean {
    const outstanding = countChannelTxOutstanding(
      this.txRing.map((envelope) => ({
        packetPresent: envelope.packet !== null,
        delivered:
          envelope.packet !== null &&
          this.outlet.getPacketState(envelope.packet) === MessageState.MSGSTATE_DELIVERED
      }))
    );

    return channelAllowsSend({
      isUsable: this.outlet.isUsable,
      outstanding,
      window: this.windowState.window
    });
  }

  async send(message: ChannelMessage): Promise<Envelope> {
    if (
      planChannelSend({
        ready: this.isReadyToSend(),
        packedLength: null,
        mdu: this.outlet.mdu
      }) === "link-not-ready"
    ) {
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Link is not ready");
    }

    const reservedSequence = this.nextSequence;
    const envelope = new Envelope(this.outlet, { message, sequence: reservedSequence });
    envelope.pack();
    if (
      planChannelSend({
        ready: true,
        packedLength: envelope.raw?.length ?? null,
        mdu: this.outlet.mdu
      }) === "too-big"
    ) {
      throw new ChannelException(
        ChannelExceptionType.ME_TOO_BIG,
        `Packed message too big for packet: ${envelope.raw!.length} > ${this.outlet.mdu}`
      );
    }

    this.nextSequence = nextChannelSequence(reservedSequence);
    const packet = await this.outlet.send(envelope.raw!);
    if (
      packet === null ||
      !isChannelOutletTransmitOk({
        packetPresent: true,
        rawLength: packet.raw.length,
        receiptPresent: packet.receipt !== null
      })
    ) {
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

    if (shouldEmitChannelImmediateDelivery(this.outlet.getPacketState(packet))) {
      this.packetDelivered(packet);
    }

    return envelope;
  }

  receive(raw: Uint8Array): void {
    const envelope = new Envelope(this.outlet, { raw: Uint8Array.from(raw) });
    envelope.unpack(this.messageFactories);

    if (
      !shouldAcceptChannelSequence({
        sequence: envelope.sequence,
        nextRxSequence: this.nextRxSequence,
        windowMax: Channel.WINDOW_MAX
      })
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
      const index = indexOfChannelRingSequence({
        ringSequences: this.rxRing.map((candidate) => candidate.sequence),
        target: sequence
      });
      if (!shouldDrainChannelRingIndex(index !== null)) {
        continue;
      }
      const candidate = this.rxRing.splice(index!, 1)[0]!;
      const delivered = candidate.unpack(this.messageFactories);

      for (const callback of [...this.messageCallbacks]) {
        if (shouldStopChannelHandlerFanout(callback(delivered))) {
          break;
        }
      }
    }
  }

  shutdown(): void {
    this.messageCallbacks.length = 0;
    for (const envelope of this.txRing) {
      if (shouldClearChannelEnvelopePacket(envelope.packet !== null)) {
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
    if (!shouldEmplaceChannelEnvelope(index !== null)) {
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
    if (shouldReplaceChannelResentPacket(resent !== null)) {
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

    if (shouldEmitChannelImmediateDelivery(this.outlet.getPacketState(packet))) {
      this.packetDelivered(packet);
    }
  }

  private packetTxOp(packet: ChannelPacket, op: (envelope: Envelope) => boolean): void {
    const index = this.indexOfTxEnvelope(packet);
    const envelope = index === null ? undefined : this.txRing[index];
    if (
      planChannelTxEnvelopeOp({
        indexOk: index !== null,
        envelopePresent: envelope !== undefined,
        opOk: envelope === undefined ? false : op(envelope)
      }) === "miss"
    ) {
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
    return indexOfChannelTxEnvelope({
      packetIds: this.txRing.map((candidate) =>
        candidate.packet === null ? null : this.outlet.getPacketId(candidate.packet)
      ),
      targetId: this.outlet.getPacketId(packet)
    });
  }

  private getPacketTimeoutTime(tries: number): number {
    return channelPacketTimeoutSeconds({
      tries,
      rtt: this.outlet.rtt,
      txRingLength: this.txRing.length
    });
  }

  private updatePacketTimeouts(): void {
    const extensions = planChannelTxReceiptTimeoutRefresh(
      this.txRing.map((envelope) => ({
        receiptPresent: envelope.packet?.receipt != null,
        currentTimeout: envelope.packet?.receipt?.timeout ?? null,
        tries: envelope.tries,
        rtt: this.outlet.rtt,
        txRingLength: this.txRing.length
      }))
    );
    for (const extension of extensions) {
      const receipt = this.txRing[extension.index]?.packet?.receipt;
      if (shouldApplyChannelTxReceiptTimeoutExtension(receipt != null)) {
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
    return canLinkSend(this.link.status);
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
    return channelMessageStateFromPacketReceipt(
      packet.receipt === null ? null : packet.receipt.getStatus()
    );
  }

  timedOut(): void {
    void this.link.teardown();
  }

  setPacketTimeoutCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null,
    timeout: number | null = null
  ): void {
    if (!canArmChannelPacketReceipt(packet.receipt !== null)) {
      return;
    }

    if (shouldApplyChannelPacketReceiptTimeout(timeout !== null)) {
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
    if (!canArmChannelPacketReceipt(packet.receipt !== null)) {
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
