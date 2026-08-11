import { ChannelExceptionTypeCode, ChannelMessageState } from "./protocol.js";
import type { PacketReceipt } from "../packet-receipt.js";

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

export interface ChannelPacket {
  readonly raw: Uint8Array;
  readonly receipt: PacketReceipt | null;
}

type MessageStateValue =
  (typeof ChannelMessageState)[keyof typeof ChannelMessageState];

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
    timeout?: number | null,
  ): void;
  setPacketDeliveredCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null,
  ): void;
  getPacketId(packet: ChannelPacket): Uint8Array | null;
}
