import { describe, expect, it } from "vitest";
import {
  CHANNEL_ENVELOPE_HEADER_SIZE,
  CHANNEL_SEQ_MODULUS,
  ChannelMessageState,
  channelMessageStateFromPacketReceipt,
  channelPayloadMdu,
  initialChannelEnvelopePackState,
  initialChannelEnvelopeUnpackState,
  initialChannelMessageHandlerUnregisterState,
  initialChannelMessageTypeRegistrationState,
  isChannelSystemMsgType,
  nextChannelSequence,
  packChannelEnvelope,
  planChannelEnvelopePack,
  planChannelEnvelopeUnpack,
  planChannelMessageTypeRegistration,
  planUnregisterChannelMessageHandler,
  channelMessageHandlerUnregisterIndex,
  shouldEmitChannelImmediateDelivery,
  shouldProceedChannelEnvelopePack,
  shouldProceedChannelEnvelopeUnpack,
  shouldProceedChannelMessageTypeRegistration,
  shouldRegisterChannelMessageHandler,
  shouldRejectChannelEnvelopePackMissingMessage,
  shouldRejectChannelEnvelopeUnpackMissingRaw,
  shouldRejectChannelEnvelopeUnpackNotRegistered,
  shouldRejectChannelEnvelopeUnpackTruncate,
  shouldRejectChannelMessageTypeMissingMsgtype,
  shouldRejectChannelMessageTypeSystemReserved,
  shouldRemoveChannelMessageHandler,
  shouldStopChannelHandlerFanout,
  shouldUnregisterChannelMessageHandler,
  stepChannelEnvelopePackWithActions,
  stepChannelEnvelopeUnpackWithActions,
  stepChannelMessageHandlerUnregisterWithActions,
  stepChannelMessageTypeRegistrationWithActions,
  unpackChannelEnvelope
} from "../src/channel-envelope.js";
import {
  channelEmplaceIndex,
  drainContiguousChannelSequences,
  indexOfChannelRingSequence,
  insertChannelSequence,
  shouldAcceptChannelSequence,
  shouldDrainChannelRingIndex,
  shouldEmplaceChannelEnvelope
} from "../src/channel-reorder.js";

describe("protocol channel envelope", () => {
  it("exposes channel message states", () => {
    expect(ChannelMessageState.MSGSTATE_NEW).toBe(0);
    expect(ChannelMessageState.MSGSTATE_DELIVERED).toBe(2);
    expect(ChannelMessageState.MSGSTATE_FAILED).toBe(3);
  });

  it("maps packet receipt status to channel message state", () => {
    expect(channelMessageStateFromPacketReceipt(null)).toBe(ChannelMessageState.MSGSTATE_FAILED);
    expect(channelMessageStateFromPacketReceipt(0x01)).toBe(ChannelMessageState.MSGSTATE_SENT);
    expect(channelMessageStateFromPacketReceipt(0x02)).toBe(ChannelMessageState.MSGSTATE_DELIVERED);
  });

  it("gates immediate delivery callbacks", () => {
    expect(shouldEmitChannelImmediateDelivery(ChannelMessageState.MSGSTATE_DELIVERED)).toBe(true);
    expect(shouldEmitChannelImmediateDelivery(ChannelMessageState.MSGSTATE_SENT)).toBe(false);
    expect(shouldEmitChannelImmediateDelivery(ChannelMessageState.MSGSTATE_NEW)).toBe(false);
  });

  it("round-trips envelope framing", () => {
    const packed = packChannelEnvelope({
      msgType: 0x0102,
      sequence: 7,
      payload: Uint8Array.from([9, 8, 7])
    });
    expect(packed).toHaveLength(CHANNEL_ENVELOPE_HEADER_SIZE + 3);
    const unpacked = unpackChannelEnvelope(packed);
    expect(unpacked).not.toBeNull();
    expect(unpacked!.msgType).toBe(0x0102);
    expect(unpacked!.sequence).toBe(7);
    expect([...unpacked!.payload]).toEqual([9, 8, 7]);
  });

  it("rejects truncated envelopes", () => {
    expect(unpackChannelEnvelope(new Uint8Array(5))).toBeNull();
    const packed = packChannelEnvelope({
      msgType: 1,
      sequence: 1,
      payload: Uint8Array.from([1, 2, 3])
    });
    expect(unpackChannelEnvelope(packed.subarray(0, packed.length - 1))).toBeNull();
  });

  it("classifies system msgtypes and payload MDU", () => {
    expect(isChannelSystemMsgType(0xf000)).toBe(true);
    expect(isChannelSystemMsgType(0x0fff)).toBe(false);
    expect(channelPayloadMdu(100)).toBe(94);
    expect(nextChannelSequence(CHANNEL_SEQ_MODULUS - 1)).toBe(0);
  });

  it("plans channel MSGTYPE registration gates", () => {
    expect(
      planChannelMessageTypeRegistration({ msgType: undefined, isSystemType: false })
    ).toBe("missing-msgtype");
    expect(
      planChannelMessageTypeRegistration({ msgType: 0xf000, isSystemType: false })
    ).toBe("system-reserved");
    expect(
      planChannelMessageTypeRegistration({ msgType: 0xf000, isSystemType: true })
    ).toBe("ok");
    expect(
      planChannelMessageTypeRegistration({ msgType: 0x0100, isSystemType: false })
    ).toBe("ok");
  });

  it("plans channel envelope unpack gates", () => {
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: true,
        framingOk: true,
        factoryRegistered: true
      })
    ).toBe("ok");
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: false,
        framingOk: true,
        factoryRegistered: true
      })
    ).toBe("missing-raw");
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: true,
        framingOk: false,
        factoryRegistered: true
      })
    ).toBe("truncated");
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: true,
        framingOk: true,
        factoryRegistered: false
      })
    ).toBe("not-registered");
  });

  it("plans channel envelope pack gates", () => {
    expect(planChannelEnvelopePack(false)).toBe("missing-message");
    expect(planChannelEnvelopePack(true)).toBe("ok");
  });

  it("emits channel message-type registration actions from WithActions step", () => {
    const missing = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: undefined,
        isSystemType: false
      }
    );
    expect(shouldRejectChannelMessageTypeMissingMsgtype(missing.actions)).toBe(true);

    const reserved = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: 0xf000,
        isSystemType: false
      }
    );
    expect(shouldRejectChannelMessageTypeSystemReserved(reserved.actions)).toBe(true);

    const ok = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: 0x0100,
        isSystemType: false
      }
    );
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedChannelMessageTypeRegistration(ok.actions)).toBe(true);
  });

  it("emits channel envelope unpack actions from WithActions step", () => {
    const missingRaw = stepChannelEnvelopeUnpackWithActions(initialChannelEnvelopeUnpackState(), {
      kind: "channel/envelope-unpack-gate",
      rawPresent: false,
      framingOk: true,
      factoryRegistered: true
    });
    expect(shouldRejectChannelEnvelopeUnpackMissingRaw(missingRaw.actions)).toBe(true);

    const truncated = stepChannelEnvelopeUnpackWithActions(initialChannelEnvelopeUnpackState(), {
      kind: "channel/envelope-unpack-gate",
      rawPresent: true,
      framingOk: false,
      factoryRegistered: true
    });
    expect(shouldRejectChannelEnvelopeUnpackTruncate(truncated.actions)).toBe(true);

    const notRegistered = stepChannelEnvelopeUnpackWithActions(initialChannelEnvelopeUnpackState(), {
      kind: "channel/envelope-unpack-gate",
      rawPresent: true,
      framingOk: true,
      factoryRegistered: false
    });
    expect(shouldRejectChannelEnvelopeUnpackNotRegistered(notRegistered.actions)).toBe(true);

    const ok = stepChannelEnvelopeUnpackWithActions(initialChannelEnvelopeUnpackState(), {
      kind: "channel/envelope-unpack-gate",
      rawPresent: true,
      framingOk: true,
      factoryRegistered: true
    });
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedChannelEnvelopeUnpack(ok.actions)).toBe(true);
  });

  it("emits channel envelope pack actions from WithActions step", () => {
    const missing = stepChannelEnvelopePackWithActions(initialChannelEnvelopePackState(), {
      kind: "channel/envelope-pack-gate",
      messagePresent: false
    });
    expect(shouldRejectChannelEnvelopePackMissingMessage(missing.actions)).toBe(true);

    const ok = stepChannelEnvelopePackWithActions(initialChannelEnvelopePackState(), {
      kind: "channel/envelope-pack-gate",
      messagePresent: true
    });
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedChannelEnvelopePack(ok.actions)).toBe(true);
  });

  it("plans channel message-handler membership", () => {
    expect(shouldRegisterChannelMessageHandler(false)).toBe(true);
    expect(shouldRegisterChannelMessageHandler(true)).toBe(false);
    expect(planUnregisterChannelMessageHandler(1)).toBe(1);
    expect(planUnregisterChannelMessageHandler(-1)).toBeNull();
    expect(shouldUnregisterChannelMessageHandler(true)).toBe(true);
    expect(shouldUnregisterChannelMessageHandler(false)).toBe(false);
    expect(shouldStopChannelHandlerFanout(true)).toBe(true);
    expect(shouldStopChannelHandlerFanout(false)).toBe(false);

    const remove = stepChannelMessageHandlerUnregisterWithActions(
      initialChannelMessageHandlerUnregisterState(),
      { kind: "channel/message-handler-unregister-gate", index: 1 }
    );
    expect(shouldRemoveChannelMessageHandler(remove.actions)).toBe(true);
    expect(channelMessageHandlerUnregisterIndex(remove.actions)).toBe(1);

    const skip = stepChannelMessageHandlerUnregisterWithActions(
      initialChannelMessageHandlerUnregisterState(),
      { kind: "channel/message-handler-unregister-gate", index: -1 }
    );
    expect(shouldRemoveChannelMessageHandler(skip.actions)).toBe(false);
    expect(channelMessageHandlerUnregisterIndex(skip.actions)).toBeNull();
  });
});

describe("protocol channel reorder", () => {
  it("accepts in-window sequences and wraparound replays carefully", () => {
    expect(
      shouldAcceptChannelSequence({ sequence: 5, nextRxSequence: 5, windowMax: 48 })
    ).toBe(true);
    expect(
      shouldAcceptChannelSequence({ sequence: 4, nextRxSequence: 5, windowMax: 48 })
    ).toBe(false);

    // Wrap: nextRx near end, overflow wraps below nextRx.
    expect(
      shouldAcceptChannelSequence({
        sequence: 2,
        nextRxSequence: 0xfff0,
        windowMax: 48
      })
    ).toBe(true);
  });

  it("inserts ordered sequences and rejects duplicates", () => {
    expect(
      channelEmplaceIndex({ sequence: 3, ringSequences: [1, 4], wrapBaseSequence: 1 })
    ).toBe(1);
    expect(
      channelEmplaceIndex({ sequence: 4, ringSequences: [1, 4], wrapBaseSequence: 1 })
    ).toBeNull();
    expect(shouldEmplaceChannelEnvelope(true)).toBe(true);
    expect(shouldEmplaceChannelEnvelope(false)).toBe(false);
    expect(shouldDrainChannelRingIndex(true)).toBe(true);
    expect(shouldDrainChannelRingIndex(false)).toBe(false);

    const inserted = insertChannelSequence([1, 4], 3, 1);
    expect(inserted.inserted).toBe(true);
    expect(inserted.ring).toEqual([1, 3, 4]);
  });

  it("drains contiguous prefixes", () => {
    const drained = drainContiguousChannelSequences({
      ringSequences: [2, 3, 5],
      nextRxSequence: 2
    });
    expect(drained.contiguous).toEqual([2, 3]);
    expect(drained.remaining).toEqual([5]);
    expect(drained.nextRxSequence).toBe(4);
  });

  it("finds ring sequence indices", () => {
    expect(indexOfChannelRingSequence({ ringSequences: [2, 3, 5], target: 3 })).toBe(1);
    expect(indexOfChannelRingSequence({ ringSequences: [2, 3, 5], target: 9 })).toBeNull();
    expect(shouldDrainChannelRingIndex(true)).toBe(true);
    expect(shouldDrainChannelRingIndex(false)).toBe(false);
  });
});
