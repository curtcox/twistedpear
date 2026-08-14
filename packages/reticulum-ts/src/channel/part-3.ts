/** Envelope codec extracted from part-1. */
import {
  channelEnvelopeFieldsFromActions,
  initialChannelEnvelopePackState,
  initialChannelEnvelopeUnpackState,
  initialPackChannelEnvelopeState,
  initialUnpackChannelEnvelopeState,
  packChannelEnvelopeRawFromActions,
  shouldProceedChannelEnvelopePack,
  shouldProceedChannelEnvelopeUnpack,
  shouldRejectChannelEnvelopePackMissingMessage,
  shouldRejectChannelEnvelopeUnpackMissingRaw,
  shouldRejectChannelEnvelopeUnpackNotRegistered,
  shouldRejectChannelEnvelopeUnpackTruncate,
  shouldRejectPackChannelEnvelope,
  shouldRejectUnpackChannelEnvelope,
  shouldUsePackChannelEnvelope,
  shouldUseUnpackChannelEnvelope,
  stepChannelEnvelopePackWithActions,
  stepChannelEnvelopeUnpackWithActions,
  stepPackChannelEnvelopeWithActions,
  stepUnpackChannelEnvelopeWithActions,
  type UnpackedChannelEnvelope,
} from "./protocol.js";
import type {
  ChannelMessage,
  ChannelMessageConstructor,
  ChannelOutlet,
  ChannelPacket,
} from "./part-1-types.js";
import { ChannelException, ChannelExceptionType } from "./part-1-types.js";

export class Envelope {
  readonly message: ChannelMessage | null;
  raw: Uint8Array | null = null;
  packet: ChannelPacket | null = null;
  sequence: number;
  tries = 0;
  tracked = false;

  constructor(
    readonly outlet: ChannelOutlet,
    options: {
      readonly message?: ChannelMessage;
      readonly raw?: Uint8Array;
      readonly sequence?: number;
    },
  ) {
    this.message = options.message ?? null;
    this.raw = options.raw ?? null;
    this.sequence = options.sequence ?? 0;
  }

  pack(): Uint8Array {
    const { actions } = stepChannelEnvelopePackWithActions(
      initialChannelEnvelopePackState(),
      {
        kind: "channel/envelope-pack-gate",
        messagePresent: this.message !== null,
      },
    );
    if (
      shouldRejectChannelEnvelopePackMissingMessage(actions) ||
      this.message === null
    ) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope has no message",
      );
    }
    if (!shouldProceedChannelEnvelopePack(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope has no message",
      );
    }

    const packStepped = stepPackChannelEnvelopeWithActions(
      initialPackChannelEnvelopeState(),
      {
        kind: "channel-envelope/pack-gate",
        msgType: this.message.MSGTYPE,
        sequence: this.sequence,
        payload: this.message.pack(),
      },
    );
    if (
      shouldRejectPackChannelEnvelope(packStepped.actions) ||
      !shouldUsePackChannelEnvelope(packStepped.actions)
    ) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope pack failed",
      );
    }
    const packed = packChannelEnvelopeRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope pack failed",
      );
    }
    this.raw = packed;
    return this.raw;
  }

  unpack(
    factories: ReadonlyMap<number, ChannelMessageConstructor>,
  ): ChannelMessage {
    let unpacked: UnpackedChannelEnvelope | null = null;
    if (this.raw !== null) {
      const unpackStepped = stepUnpackChannelEnvelopeWithActions(
        initialUnpackChannelEnvelopeState(),
        {
          kind: "channel-envelope/unpack-gate",
          raw: this.raw,
        },
      );
      if (
        !shouldRejectUnpackChannelEnvelope(unpackStepped.actions) &&
        shouldUseUnpackChannelEnvelope(unpackStepped.actions)
      ) {
        unpacked = channelEnvelopeFieldsFromActions(unpackStepped.actions);
      }
    }
    const { actions } = stepChannelEnvelopeUnpackWithActions(
      initialChannelEnvelopeUnpackState(),
      {
        kind: "channel/envelope-unpack-gate",
        rawPresent: this.raw !== null,
        framingOk: unpacked !== null,
        factoryRegistered: unpacked !== null && factories.has(unpacked.msgType),
      },
    );
    if (shouldRejectChannelEnvelopeUnpackMissingRaw(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope has no raw data",
      );
    }
    if (
      shouldRejectChannelEnvelopeUnpackTruncate(actions) ||
      unpacked === null
    ) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope framing is truncated",
      );
    }
    if (shouldRejectChannelEnvelopeUnpackNotRegistered(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_NOT_REGISTERED,
        `Unknown channel MSGTYPE ${unpacked.msgType.toString(16)}`,
      );
    }
    if (!shouldProceedChannelEnvelopeUnpack(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Envelope unpack rejected",
      );
    }

    this.sequence = unpacked.sequence;
    const ctor = factories.get(unpacked.msgType)!;
    const message = new ctor();
    message.unpack(unpacked.payload);
    return message;
  }
}
