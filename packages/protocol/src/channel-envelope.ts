/**
 * Pure RNS Channel envelope framing (MSGTYPE + sequence + length + payload).
 */
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

export function channelPayloadMdu(outletMdu: number): number {
  const value = outletMdu - CHANNEL_ENVELOPE_HEADER_SIZE;
  return value > 0xffff ? 0xffff : value;
}

export function nextChannelSequence(sequence: number): number {
  return (sequence + 1) % CHANNEL_SEQ_MODULUS;
}
