import { equalBytes } from "./crypto/bytes.js";
import { equalBytes } from "./crypto/bytes.js";
import type { Link } from "./link.js";
import { LinkStatus } from "./link.js";
import { Packet, PacketContext } from "./packet.js";
import type { PacketReceipt } from "./packet-receipt.js";
import { PacketReceiptStatus } from "./packet-receipt.js";

/** Mirrors RNS/Channel.py MessageState. */
export const MessageState = {
  MSGSTATE_NEW: 0,
  MSGSTATE_SENT: 1,
  MSGSTATE_DELIVERED: 2,
  MSGSTATE_FAILED: 3
} as const;

export type MessageStateValue = (typeof MessageState)[keyof typeof MessageState];

export const ChannelExceptionType = {
  ME_NO_MSG_TYPE: 0,
  ME_INVALID_MSG_TYPE: 1,
  ME_NOT_REGISTERED: 2,
  ME_LINK_NOT_READY: 3,
  ME_ALREADY_SENT: 4,
  ME_TOO_BIG: 5
} as const;

export type ChannelExceptionTypeValue = (typeof ChannelExceptionType)[keyof typeof ChannelExceptionType];

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

    const data = this.message.pack();
    const header = new Uint8Array(6);
    const view = new DataView(header.buffer);
    view.setUint16(0, this.message.MSGTYPE, false);
    view.setUint16(2, this.sequence, false);
    view.setUint16(4, data.length, false);
    this.raw = concatBytes(header, data);
    return this.raw;
  }

  unpack(factories: ReadonlyMap<number, ChannelMessageConstructor>): ChannelMessage {
    if (this.raw === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no raw data");
    }

    const view = new DataView(this.raw.buffer, this.raw.byteOffset, this.raw.byteLength);
    const msgtype = view.getUint16(0, false);
    this.sequence = view.getUint16(2, false);
    const length = view.getUint16(4, false);
    const ctor = factories.get(msgtype);
    if (ctor === undefined) {
      throw new ChannelException(ChannelExceptionType.ME_NOT_REGISTERED, `Unknown channel MSGTYPE ${msgtype.toString(16)}`);
    }

    const message = new ctor();
    message.unpack(this.raw.subarray(6, 6 + length));
    return message;
  }
}

/** Mirrors RNS/Channel.py ordered reliable delivery over links. */
export class Channel {
  static readonly WINDOW = 2;
  static readonly WINDOW_MIN = 2;
  static readonly WINDOW_MIN_LIMIT_MEDIUM = 5;
  static readonly WINDOW_MIN_LIMIT_FAST = 16;
  static readonly WINDOW_MAX_SLOW = 5;
  static readonly WINDOW_MAX_MEDIUM = 12;
  static readonly WINDOW_MAX_FAST = 48;
  static readonly WINDOW_MAX = Channel.WINDOW_MAX_FAST;
  static readonly FAST_RATE_THRESHOLD = 10;
  static readonly RTT_FAST = 0.18;
  static readonly RTT_MEDIUM = 0.75;
  static readonly RTT_SLOW = 1.45;
  static readonly WINDOW_FLEXIBILITY = 4;
  static readonly SEQ_MAX = 0xffff;
  static readonly SEQ_MODULUS = Channel.SEQ_MAX + 1;

  private readonly txRing: Envelope[] = [];
  private readonly rxRing: Envelope[] = [];
  private readonly messageCallbacks: ChannelMessageHandler[] = [];
  private readonly messageFactories = new Map<number, ChannelMessageConstructor>();
  private nextSequence = 0;
  private nextRxSequence = 0;
  private readonly maxTries = 5;
  private fastRateRounds = 0;
  private mediumRateRounds = 0;
  window: number;
  windowMax: number;
  windowMin: number;
  windowFlexibility: number;

  constructor(private readonly outlet: ChannelOutlet) {
    if (outlet.rtt > Channel.RTT_SLOW) {
      this.window = 1;
      this.windowMax = 1;
      this.windowMin = 1;
      this.windowFlexibility = 1;
    } else {
      this.window = Channel.WINDOW;
      this.windowMax = Channel.WINDOW_MAX_SLOW;
      this.windowMin = Channel.WINDOW_MIN;
      this.windowFlexibility = Channel.WINDOW_FLEXIBILITY;
    }
  }

  registerMessageType(messageClass: ChannelMessageConstructor, options: { readonly isSystemType?: boolean } = {}): void {
    if (messageClass.MSGTYPE === undefined) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message class lacks MSGTYPE");
    }

    if (messageClass.MSGTYPE >= 0xf000 && options.isSystemType !== true) {
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
    const value = this.outlet.mdu - 6;
    return value > 0xffff ? 0xffff : value;
  }

  isReadyToSend(): boolean {
    if (!this.outlet.isUsable) {
      return false;
    }

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

    return outstanding < this.window;
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

    this.nextSequence = (reservedSequence + 1) % Channel.SEQ_MODULUS;
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
    const message = envelope.unpack(this.messageFactories);

    if (envelope.sequence < this.nextRxSequence) {
      const windowOverflow = (this.nextRxSequence + Channel.WINDOW_MAX) % Channel.SEQ_MODULUS;
      if (windowOverflow < this.nextRxSequence) {
        if (envelope.sequence > windowOverflow) {
          return;
        }
      } else {
        return;
      }
    }

    if (!this.emplaceEnvelope(envelope, this.rxRing)) {
      return;
    }

    const contiguous: Envelope[] = [];
    for (const candidate of [...this.rxRing]) {
      if (candidate.sequence === this.nextRxSequence) {
        contiguous.push(candidate);
        this.nextRxSequence = (this.nextRxSequence + 1) % Channel.SEQ_MODULUS;
      }
    }

    for (const candidate of contiguous) {
      const delivered = candidate.unpack(this.messageFactories);
      const index = this.rxRing.indexOf(candidate);
      if (index >= 0) {
        this.rxRing.splice(index, 1);
      }

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
    for (const existing of ring) {
      if (envelope.sequence === existing.sequence) {
        return false;
      }
    }

    let inserted = false;
    for (let index = 0; index < ring.length; index += 1) {
      const existing = ring[index]!;
      if (
        envelope.sequence < existing.sequence &&
        !(this.nextRxSequence - envelope.sequence > Channel.SEQ_MAX / 2)
      ) {
        ring.splice(index, 0, envelope);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      ring.push(envelope);
    }

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

    if (envelope.tries >= this.maxTries) {
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

    if (this.window > this.windowMin) {
      this.window -= 1;
    }

    if (this.windowMax > this.windowMin + this.windowFlexibility) {
      this.windowMax -= 1;
    }
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

    if (this.window < this.windowMax) {
      this.window += 1;
    }

    if (this.outlet.rtt !== 0) {
      if (this.outlet.rtt > Channel.RTT_FAST) {
        this.fastRateRounds = 0;
      }

      if (this.outlet.rtt > Channel.RTT_MEDIUM) {
        this.mediumRateRounds = 0;
      } else {
        this.mediumRateRounds += 1;
        if (
          this.windowMax < Channel.WINDOW_MAX_MEDIUM &&
          this.mediumRateRounds === Channel.FAST_RATE_THRESHOLD
        ) {
          this.windowMax = Channel.WINDOW_MAX_MEDIUM;
          this.windowMin = Channel.WINDOW_MIN_LIMIT_MEDIUM;
        }
      }

      if (this.outlet.rtt <= Channel.RTT_FAST) {
        this.fastRateRounds += 1;
        if (this.windowMax < Channel.WINDOW_MAX_FAST && this.fastRateRounds === Channel.FAST_RATE_THRESHOLD) {
          this.windowMax = Channel.WINDOW_MAX_FAST;
          this.windowMin = Channel.WINDOW_MIN_LIMIT_FAST;
        }
      }
    }
  }

  private getPacketTimeoutTime(tries: number): number {
    return Math.pow(1.5, tries - 1) * Math.max(this.outlet.rtt * 2.5, 0.025) * (this.txRing.length + 1.5);
  }

  private updatePacketTimeouts(): void {
    for (const envelope of this.txRing) {
      if (envelope.packet?.receipt?.timeout !== null && envelope.packet?.receipt !== null && envelope.packet.receipt !== undefined) {
        const updatedTimeout = this.getPacketTimeoutTime(envelope.tries);
        if (envelope.packet.receipt.timeout !== null && updatedTimeout > envelope.packet.receipt.timeout) {
          envelope.packet.receipt.setTimeout(updatedTimeout);
        }
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
    if (packet.receipt === null) {
      return MessageState.MSGSTATE_FAILED;
    }

    const status = packet.receipt.getStatus();
    if (status === PacketReceiptStatus.SENT) {
      return MessageState.MSGSTATE_SENT;
    }

    if (status === PacketReceiptStatus.DELIVERED) {
      return MessageState.MSGSTATE_DELIVERED;
    }

    return MessageState.MSGSTATE_FAILED;
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

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

export { Envelope };
