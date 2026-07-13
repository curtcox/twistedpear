import {
  ChannelExceptionTypeCode,
  ChannelMessageState,
  CHANNEL_SEQ_MAX,
  CHANNEL_SEQ_MODULUS,
  ChannelWindowLimits,
  applyChannelDelivery,
  applyChannelTimeout,
  channelAllowsSend,
  channelEmplaceIndex,
  channelMessageStateFromPacketReceipt,
  channelPacketTimeoutSeconds,
  channelPayloadMdu,
  channelRetryExhausted,
  drainContiguousChannelSequences,
  initialChannelWindowState,
  isChannelSystemMsgType,
  nextChannelSequence,
  packChannelEnvelope,
  shouldAcceptChannelSequence,
  unpackChannelEnvelope,
  type ChannelWindowState
} from "@twistedpear/protocol";
import { equalBytes } from "./crypto/bytes.js";
import type { Link } from "./link.js";
import { LinkStatus } from "./link.js";
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
    if (this.message === null) {
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
    if (this.raw === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no raw data");
    }

    const unpacked = unpackChannelEnvelope(this.raw);
    if (unpacked === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope framing is truncated");
    }

    this.sequence = unpacked.sequence;
    const ctor = factories.get(unpacked.msgType);
    if (ctor === undefined) {
      throw new ChannelException(
        ChannelExceptionType.ME_NOT_REGISTERED,
        `Unknown channel MSGTYPE ${unpacked.msgType.toString(16)}`
      );
    }

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
  private readonly maxTries = 5;
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
    if (messageClass.MSGTYPE === undefined) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message class lacks MSGTYPE");
    }

    if (isChannelSystemMsgType(messageClass.MSGTYPE) && options.isSystemType !== true) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message type is system-reserved");
    }

    this.messageFactories.set(messageClass.MSGTYPE, messageClass);
  }

  addMessageHandler(callback: ChannelMessageHandler): void {
    if (!this.messageCallbacks.includes(callback)) {
      this.messageCallbacks.push(callback);
    }
  }

  removeMessageHandler(callback: ChannelMessageHandler): void {
    const index = this.messageCallbacks.indexOf(callback);
    if (index >= 0) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  get mdu(): number {
    return channelPayloadMdu(this.outlet.mdu);
  }

  isReadyToSend(): boolean {
    let outstanding = 0;
    for (const envelope of this.txRing) {
      if (envelope.packet === null) {
        outstanding += 1;
        continue;
      }

      if (this.outlet.getPacketState(envelope.packet) !== MessageState.MSGSTATE_DELIVERED) {
        outstanding += 1;
      }
    }

    return channelAllowsSend({
      isUsable: this.outlet.isUsable,
      outstanding,
      window: this.windowState.window
    });
  }

  async send(message: ChannelMessage): Promise<Envelope> {
    if (!this.isReadyToSend()) {
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Link is not ready");
    }

    const reservedSequence = this.nextSequence;
    const envelope = new Envelope(this.outlet, { message, sequence: reservedSequence });
    envelope.pack();
    if (envelope.raw !== null && envelope.raw.length > this.outlet.mdu) {
      throw new ChannelException(
        ChannelExceptionType.ME_TOO_BIG,
        `Packed message too big for packet: ${envelope.raw.length} > ${this.outlet.mdu}`
      );
    }

    this.nextSequence = nextChannelSequence(reservedSequence);
    const packet = await this.outlet.send(envelope.raw!);
    if (packet === null || packet.raw.length === 0 || packet.receipt === null) {
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

    if (this.outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED) {
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
      const index = this.rxRing.findIndex((candidate) => candidate.sequence === sequence);
      if (index < 0) {
        continue;
      }
      const candidate = this.rxRing.splice(index, 1)[0]!;
      const delivered = candidate.unpack(this.messageFactories);

      for (const callback of [...this.messageCallbacks]) {
        if (callback(delivered)) {
          break;
        }
      }
    }
  }

  shutdown(): void {
    this.messageCallbacks.length = 0;
    for (const envelope of this.txRing) {
      if (envelope.packet !== null) {
        this.outlet.setPacketTimeoutCallback(envelope.packet, null);
        this.outlet.setPacketDeliveredCallback(envelope.packet, null);
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
    if (index === null) {
      return false;
    }

    ring.splice(index, 0, envelope);
    envelope.tracked = true;
    return true;
  }

  private packetDelivered(packet: ChannelPacket): void {
    this.packetTxOp(packet, () => true);
  }

  private async packetTimeout(packet: ChannelPacket): Promise<void> {
    if (this.outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED) {
      return;
    }

    const targetId = this.outlet.getPacketId(packet);
    const envelope = this.txRing.find(
      (candidate) =>
        candidate.packet !== null &&
        targetId !== null &&
        this.outlet.getPacketId(candidate.packet!) !== null &&
        equalBytes(this.outlet.getPacketId(candidate.packet!)!, targetId)
    );

    if (envelope === undefined) {
      return;
    }

    if (channelRetryExhausted(envelope.tries, this.maxTries)) {
      this.shutdown();
      this.outlet.timedOut();
      return;
    }

    envelope.tries += 1;
    if (envelope.packet !== null) {
      const resent = await this.outlet.resend(envelope.packet);
      if (resent !== null) {
        envelope.packet = resent;
      }

      this.outlet.setPacketDeliveredCallback(envelope.packet, (deliveredPacket) => {
        this.packetDelivered(deliveredPacket);
      });
      this.outlet.setPacketTimeoutCallback(
        envelope.packet,
        (timedOutPacket) => {
          void this.packetTimeout(timedOutPacket);
        },
        this.getPacketTimeoutTime(envelope.tries)
      );
      this.updatePacketTimeouts();

      if (this.outlet.getPacketState(envelope.packet) === MessageState.MSGSTATE_DELIVERED) {
        this.packetDelivered(envelope.packet);
      }
    }

    this.windowState = applyChannelTimeout(this.windowState);
  }

  private packetTxOp(packet: ChannelPacket, op: (envelope: Envelope) => boolean): void {
    const targetId = this.outlet.getPacketId(packet);
    const envelope = this.txRing.find(
      (candidate) =>
        candidate.packet !== null &&
        targetId !== null &&
        this.outlet.getPacketId(candidate.packet!) !== null &&
        equalBytes(this.outlet.getPacketId(candidate.packet!)!, targetId)
    );

    if (envelope === undefined || !op(envelope)) {
      return;
    }

    envelope.tracked = false;
    const index = this.txRing.indexOf(envelope);
    if (index >= 0) {
      this.txRing.splice(index, 1);
    }

    this.windowState = applyChannelDelivery(this.windowState, this.outlet.rtt);
  }

  private getPacketTimeoutTime(tries: number): number {
    return channelPacketTimeoutSeconds({
      tries,
      rtt: this.outlet.rtt,
      txRingLength: this.txRing.length
    });
  }

  private updatePacketTimeouts(): void {
    for (const envelope of this.txRing) {
      const receipt = envelope.packet?.receipt;
      if (receipt === null || receipt === undefined) {
        continue;
      }

      const updatedTimeout = this.getPacketTimeoutTime(envelope.tries);
      if (receipt.timeout !== null && updatedTimeout > receipt.timeout) {
        receipt.setTimeout(updatedTimeout);
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
    return this.link.status === LinkStatus.ACTIVE;
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
    if (packet.receipt === null) {
      return;
    }

    if (timeout !== null) {
      packet.receipt.setTimeout(timeout);
    }

    packet.receipt.setTimeoutCallback(
      callback === null ? null : () => {
        callback(packet);
      }
    );
  }

  setPacketDeliveredCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null
  ): void {
    if (packet.receipt === null) {
      return;
    }

    packet.receipt.setDeliveryCallback(
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
