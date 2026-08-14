import { describe, expect, it } from "vitest";
import {
  CHANNEL_ENVELOPE_HEADER_SIZE,
  CHANNEL_SEQ_MODULUS,
  ChannelMessageState,
  channelEnvelopeFieldsFromActions,
  channelEnvelopePackPlanFromActions,
  channelEnvelopeUnpackPlanFromActions,
  channelMessageHandlerUnregisterIndex,
  channelMessageHandlerUnregisterPlanIndex,
  channelMessageStateFromActions,
  channelMessageStateFromPacketReceipt,
  channelMessageTypeRegistrationPlanFromActions,
  channelPayloadMdu,
  initialChannelEnvelopePackPlanState,
  initialChannelEnvelopePackState,
  initialChannelEnvelopeUnpackPlanState,
  initialChannelEnvelopeUnpackState,
  initialChannelMessageHandlerUnregisterPlanState,
  initialChannelMessageHandlerUnregisterState,
  initialChannelMessageStateFromPacketReceiptState,
  initialChannelMessageTypeRegistrationPlanState,
  initialChannelMessageTypeRegistrationState,
  initialEmitChannelImmediateDeliveryState,
  initialPackChannelEnvelopeState,
  initialRegisterChannelMessageHandlerState,
  initialStopChannelHandlerFanoutState,
  initialUnpackChannelEnvelopeState,
  isChannelSystemMsgType,
  nextChannelSequence,
  packChannelEnvelope,
  packChannelEnvelopeRawFromActions,
  planChannelEnvelopePack,
  planChannelEnvelopeUnpack,
  planChannelMessageTypeRegistration,
  planUnregisterChannelMessageHandler,
  shouldContinueChannelHandlerFanout,
  shouldEmitChannelImmediateDelivery,
  shouldEmitChannelImmediateDeliveryNow,
  shouldProceedChannelEnvelopePack,
  shouldProceedChannelEnvelopePackPlan,
  shouldProceedChannelEnvelopeUnpack,
  shouldProceedChannelEnvelopeUnpackPlan,
  shouldProceedChannelMessageTypeRegistration,
  shouldProceedChannelMessageTypeRegistrationPlan,
  shouldRegisterChannelMessageHandler,
  shouldRegisterChannelMessageHandlerNow,
  shouldRejectChannelEnvelopePackMissingMessage,
  shouldRejectChannelEnvelopePackPlanMissingMessage,
  shouldRejectChannelEnvelopeUnpackMissingRaw,
  shouldRejectChannelEnvelopeUnpackNotRegistered,
  shouldRejectChannelEnvelopeUnpackPlanMissingRaw,
  shouldRejectChannelEnvelopeUnpackPlanNotRegistered,
  shouldRejectChannelEnvelopeUnpackPlanTruncate,
  shouldRejectChannelEnvelopeUnpackTruncate,
  shouldRejectChannelMessageTypeMissingMsgtype,
  shouldRejectChannelMessageTypeRegistrationPlanMissingMsgtype,
  shouldRejectChannelMessageTypeRegistrationPlanSystemReserved,
  shouldRejectChannelMessageTypeSystemReserved,
  shouldRejectPackChannelEnvelope,
  shouldRejectUnpackChannelEnvelope,
  shouldRemoveChannelMessageHandler,
  shouldRemoveChannelMessageHandlerUnregisterPlan,
  shouldSkipEmitChannelImmediateDelivery,
  shouldSkipRegisterChannelMessageHandler,
  shouldStopChannelHandlerFanout,
  shouldStopChannelHandlerFanoutNow,
  shouldUnregisterChannelMessageHandler,
  shouldUseChannelMessageStateFromPacketReceipt,
  shouldUsePackChannelEnvelope,
  shouldUseUnpackChannelEnvelope,
  stepChannelEnvelopePackPlanWithActions,
  stepChannelEnvelopePackWithActions,
  stepChannelEnvelopeUnpackPlanWithActions,
  stepChannelEnvelopeUnpackWithActions,
  stepChannelMessageHandlerUnregisterPlanWithActions,
  stepChannelMessageHandlerUnregisterWithActions,
  stepChannelMessageStateFromPacketReceiptWithActions,
  stepChannelMessageTypeRegistrationPlanWithActions,
  stepChannelMessageTypeRegistrationWithActions,
  stepEmitChannelImmediateDeliveryWithActions,
  stepPackChannelEnvelopeWithActions,
  stepRegisterChannelMessageHandlerWithActions,
  stepStopChannelHandlerFanoutWithActions,
  stepUnpackChannelEnvelopeWithActions,
  unpackChannelEnvelope,
} from "../src/channel-envelope.js";
import {
  channelEmplaceIndex,
  channelRingSequenceIndexFromActions,
  drainContiguousChannelSequences,
  indexOfChannelRingSequence,
  initialAcceptChannelSequenceState,
  initialDrainChannelRingIndexState,
  initialEmplaceChannelEnvelopeState,
  initialIndexOfChannelRingSequenceState,
  insertChannelSequence,
  shouldAcceptChannelSequence,
  shouldAcceptChannelSequenceNow,
  shouldDrainChannelRingIndex,
  shouldDrainChannelRingIndexNow,
  shouldEmplaceChannelEnvelope,
  shouldEmplaceChannelEnvelopeNow,
  shouldMissChannelRingSequenceIndex,
  shouldSkipAcceptChannelSequence,
  shouldSkipDrainChannelRingIndex,
  shouldSkipEmplaceChannelEnvelope,
  shouldUseChannelRingSequenceIndex,
  stepAcceptChannelSequenceWithActions,
  stepDrainChannelRingIndexWithActions,
  stepEmplaceChannelEnvelopeWithActions,
  stepIndexOfChannelRingSequenceWithActions,
} from "../src/channel-reorder.js";

describe("protocol channel envelope", () => {
  it("exposes channel message states", () => {
    expect(ChannelMessageState.MSGSTATE_NEW).toBe(0);
    expect(ChannelMessageState.MSGSTATE_DELIVERED).toBe(2);
    expect(ChannelMessageState.MSGSTATE_FAILED).toBe(3);
  });

  it("maps packet receipt status to channel message state", () => {
    expect(channelMessageStateFromPacketReceipt(null)).toBe(
      ChannelMessageState.MSGSTATE_FAILED,
    );
    expect(channelMessageStateFromPacketReceipt(0x01)).toBe(
      ChannelMessageState.MSGSTATE_SENT,
    );
    expect(channelMessageStateFromPacketReceipt(0x02)).toBe(
      ChannelMessageState.MSGSTATE_DELIVERED,
    );
  });

  it("emits channel message state only from use-state actions", () => {
    const stepped = stepChannelMessageStateFromPacketReceiptWithActions(
      initialChannelMessageStateFromPacketReceiptState(),
      {
        kind: "channel/message-state-from-receipt-gate",
        receiptStatus: 0x02,
      },
    );
    expect(shouldUseChannelMessageStateFromPacketReceipt(stepped.actions)).toBe(
      true,
    );
    expect(channelMessageStateFromActions(stepped.actions)).toBe(
      ChannelMessageState.MSGSTATE_DELIVERED,
    );
    expect(
      channelMessageStateFromActions(
        stepChannelMessageStateFromPacketReceiptWithActions(
          initialChannelMessageStateFromPacketReceiptState(),
          {
            kind: "channel/message-state-from-receipt-gate",
            receiptStatus: null,
          },
        ).actions,
      ),
    ).toBe(ChannelMessageState.MSGSTATE_FAILED);
  });

  it("gates immediate delivery callbacks", () => {
    expect(
      shouldEmitChannelImmediateDelivery(
        ChannelMessageState.MSGSTATE_DELIVERED,
      ),
    ).toBe(true);
    expect(
      shouldEmitChannelImmediateDelivery(ChannelMessageState.MSGSTATE_SENT),
    ).toBe(false);
    expect(
      shouldEmitChannelImmediateDelivery(ChannelMessageState.MSGSTATE_NEW),
    ).toBe(false);
  });

  it("round-trips envelope framing", () => {
    const packed = packChannelEnvelope({
      msgType: 0x0102,
      sequence: 7,
      payload: Uint8Array.from([9, 8, 7]),
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
      payload: Uint8Array.from([1, 2, 3]),
    });
    expect(
      unpackChannelEnvelope(packed.subarray(0, packed.length - 1)),
    ).toBeNull();
  });

  it("emits pack/unpack framing actions from WithActions steps", () => {
    const fields = {
      msgType: 0x0102,
      sequence: 7,
      payload: Uint8Array.from([9, 8, 7]),
    };
    const packed = packChannelEnvelope(fields);

    const packOk = stepPackChannelEnvelopeWithActions(
      initialPackChannelEnvelopeState(),
      {
        kind: "channel-envelope/pack-gate",
        ...fields,
      },
    );
    expect(shouldUsePackChannelEnvelope(packOk.actions)).toBe(true);
    expect(shouldRejectPackChannelEnvelope(packOk.actions)).toBe(false);
    expect([...packChannelEnvelopeRawFromActions(packOk.actions)!]).toEqual([
      ...packed,
    ]);

    const unpackOk = stepUnpackChannelEnvelopeWithActions(
      initialUnpackChannelEnvelopeState(),
      {
        kind: "channel-envelope/unpack-gate",
        raw: packed,
      },
    );
    expect(shouldUseUnpackChannelEnvelope(unpackOk.actions)).toBe(true);
    const unpacked = channelEnvelopeFieldsFromActions(unpackOk.actions)!;
    expect(unpacked.msgType).toBe(0x0102);
    expect(unpacked.sequence).toBe(7);
    expect([...unpacked.payload]).toEqual([9, 8, 7]);

    const unpackReject = stepUnpackChannelEnvelopeWithActions(
      initialUnpackChannelEnvelopeState(),
      {
        kind: "channel-envelope/unpack-gate",
        raw: new Uint8Array(5),
      },
    );
    expect(shouldRejectUnpackChannelEnvelope(unpackReject.actions)).toBe(true);
    expect(channelEnvelopeFieldsFromActions(unpackReject.actions)).toBeNull();
  });

  it("classifies system msgtypes and payload MDU", () => {
    expect(isChannelSystemMsgType(0xf000)).toBe(true);
    expect(isChannelSystemMsgType(0x0fff)).toBe(false);
    expect(channelPayloadMdu(100)).toBe(94);
    expect(nextChannelSequence(CHANNEL_SEQ_MODULUS - 1)).toBe(0);
  });

  it("plans channel MSGTYPE registration gates", () => {
    expect(
      planChannelMessageTypeRegistration({
        msgType: undefined,
        isSystemType: false,
      }),
    ).toBe("missing-msgtype");
    expect(
      planChannelMessageTypeRegistration({
        msgType: 0xf000,
        isSystemType: false,
      }),
    ).toBe("system-reserved");
    expect(
      planChannelMessageTypeRegistration({
        msgType: 0xf000,
        isSystemType: true,
      }),
    ).toBe("ok");
    expect(
      planChannelMessageTypeRegistration({
        msgType: 0x0100,
        isSystemType: false,
      }),
    ).toBe("ok");
  });
});

describe("protocol channel envelope (continued)", () => {
  it("plans channel envelope unpack gates", () => {
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: true,
        framingOk: true,
        factoryRegistered: true,
      }),
    ).toBe("ok");
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: false,
        framingOk: true,
        factoryRegistered: true,
      }),
    ).toBe("missing-raw");
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: true,
        framingOk: false,
        factoryRegistered: true,
      }),
    ).toBe("truncated");
    expect(
      planChannelEnvelopeUnpack({
        rawPresent: true,
        framingOk: true,
        factoryRegistered: false,
      }),
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
        isSystemType: false,
      },
    );
    expect(shouldRejectChannelMessageTypeMissingMsgtype(missing.actions)).toBe(
      true,
    );

    const reserved = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: 0xf000,
        isSystemType: false,
      },
    );
    expect(shouldRejectChannelMessageTypeSystemReserved(reserved.actions)).toBe(
      true,
    );

    const ok = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: 0x0100,
        isSystemType: false,
      },
    );
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedChannelMessageTypeRegistration(ok.actions)).toBe(true);
  });

  it("emits channel envelope unpack actions from WithActions step", () => {
    const missingRaw = stepChannelEnvelopeUnpackWithActions(
      initialChannelEnvelopeUnpackState(),
      {
        kind: "channel/envelope-unpack-gate",
        rawPresent: false,
        framingOk: true,
        factoryRegistered: true,
      },
    );
    expect(
      shouldRejectChannelEnvelopeUnpackMissingRaw(missingRaw.actions),
    ).toBe(true);

    const truncated = stepChannelEnvelopeUnpackWithActions(
      initialChannelEnvelopeUnpackState(),
      {
        kind: "channel/envelope-unpack-gate",
        rawPresent: true,
        framingOk: false,
        factoryRegistered: true,
      },
    );
    expect(shouldRejectChannelEnvelopeUnpackTruncate(truncated.actions)).toBe(
      true,
    );

    const notRegistered = stepChannelEnvelopeUnpackWithActions(
      initialChannelEnvelopeUnpackState(),
      {
        kind: "channel/envelope-unpack-gate",
        rawPresent: true,
        framingOk: true,
        factoryRegistered: false,
      },
    );
    expect(
      shouldRejectChannelEnvelopeUnpackNotRegistered(notRegistered.actions),
    ).toBe(true);

    const ok = stepChannelEnvelopeUnpackWithActions(
      initialChannelEnvelopeUnpackState(),
      {
        kind: "channel/envelope-unpack-gate",
        rawPresent: true,
        framingOk: true,
        factoryRegistered: true,
      },
    );
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedChannelEnvelopeUnpack(ok.actions)).toBe(true);
  });

  it("emits channel envelope pack actions from WithActions step", () => {
    const missing = stepChannelEnvelopePackWithActions(
      initialChannelEnvelopePackState(),
      {
        kind: "channel/envelope-pack-gate",
        messagePresent: false,
      },
    );
    expect(shouldRejectChannelEnvelopePackMissingMessage(missing.actions)).toBe(
      true,
    );

    const ok = stepChannelEnvelopePackWithActions(
      initialChannelEnvelopePackState(),
      {
        kind: "channel/envelope-pack-gate",
        messagePresent: true,
      },
    );
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedChannelEnvelopePack(ok.actions)).toBe(true);
  });
});

describe("protocol channel envelope (continued)", () => {
  it("emits channel MSGTYPE/envelope pack-unpack-plan actions from PlanWithActions", () => {
    const missingMsgtype = stepChannelMessageTypeRegistrationPlanWithActions(
      initialChannelMessageTypeRegistrationPlanState(),
      {
        kind: "channel/message-type-registration-plan-gate",
        msgType: undefined,
        isSystemType: false,
      },
    );
    expect(
      shouldRejectChannelMessageTypeRegistrationPlanMissingMsgtype(
        missingMsgtype.actions,
      ),
    ).toBe(true);
    expect(
      channelMessageTypeRegistrationPlanFromActions(missingMsgtype.actions),
    ).toBe("missing-msgtype");

    const reserved = stepChannelMessageTypeRegistrationPlanWithActions(
      initialChannelMessageTypeRegistrationPlanState(),
      {
        kind: "channel/message-type-registration-plan-gate",
        msgType: 0xf000,
        isSystemType: false,
      },
    );
    expect(
      shouldRejectChannelMessageTypeRegistrationPlanSystemReserved(
        reserved.actions,
      ),
    ).toBe(true);

    const regOk = stepChannelMessageTypeRegistrationPlanWithActions(
      initialChannelMessageTypeRegistrationPlanState(),
      {
        kind: "channel/message-type-registration-plan-gate",
        msgType: 0x0100,
        isSystemType: false,
      },
    );
    expect(shouldProceedChannelMessageTypeRegistrationPlan(regOk.actions)).toBe(
      true,
    );
    expect(channelMessageTypeRegistrationPlanFromActions(regOk.actions)).toBe(
      "ok",
    );

    const missingRaw = stepChannelEnvelopeUnpackPlanWithActions(
      initialChannelEnvelopeUnpackPlanState(),
      {
        kind: "channel/envelope-unpack-plan-gate",
        rawPresent: false,
        framingOk: true,
        factoryRegistered: true,
      },
    );
    expect(
      shouldRejectChannelEnvelopeUnpackPlanMissingRaw(missingRaw.actions),
    ).toBe(true);
    expect(channelEnvelopeUnpackPlanFromActions(missingRaw.actions)).toBe(
      "missing-raw",
    );

    const truncated = stepChannelEnvelopeUnpackPlanWithActions(
      initialChannelEnvelopeUnpackPlanState(),
      {
        kind: "channel/envelope-unpack-plan-gate",
        rawPresent: true,
        framingOk: false,
        factoryRegistered: true,
      },
    );
    expect(
      shouldRejectChannelEnvelopeUnpackPlanTruncate(truncated.actions),
    ).toBe(true);

    const notRegistered = stepChannelEnvelopeUnpackPlanWithActions(
      initialChannelEnvelopeUnpackPlanState(),
      {
        kind: "channel/envelope-unpack-plan-gate",
        rawPresent: true,
        framingOk: true,
        factoryRegistered: false,
      },
    );
    expect(
      shouldRejectChannelEnvelopeUnpackPlanNotRegistered(notRegistered.actions),
    ).toBe(true);

    const unpackOk = stepChannelEnvelopeUnpackPlanWithActions(
      initialChannelEnvelopeUnpackPlanState(),
      {
        kind: "channel/envelope-unpack-plan-gate",
        rawPresent: true,
        framingOk: true,
        factoryRegistered: true,
      },
    );
    expect(shouldProceedChannelEnvelopeUnpackPlan(unpackOk.actions)).toBe(true);
    expect(channelEnvelopeUnpackPlanFromActions(unpackOk.actions)).toBe("ok");

    const packMissing = stepChannelEnvelopePackPlanWithActions(
      initialChannelEnvelopePackPlanState(),
      {
        kind: "channel/envelope-pack-plan-gate",
        messagePresent: false,
      },
    );
    expect(
      shouldRejectChannelEnvelopePackPlanMissingMessage(packMissing.actions),
    ).toBe(true);
    expect(channelEnvelopePackPlanFromActions(packMissing.actions)).toBe(
      "missing-message",
    );

    const packOk = stepChannelEnvelopePackPlanWithActions(
      initialChannelEnvelopePackPlanState(),
      {
        kind: "channel/envelope-pack-plan-gate",
        messagePresent: true,
      },
    );
    expect(shouldProceedChannelEnvelopePackPlan(packOk.actions)).toBe(true);
    expect(channelEnvelopePackPlanFromActions(packOk.actions)).toBe("ok");
  });
});

describe("protocol channel envelope (continued)", () => {
  it("plans channel message-handler membership", () => {
    expect(shouldRegisterChannelMessageHandler(false)).toBe(true);
    expect(shouldRegisterChannelMessageHandler(true)).toBe(false);
    expect(planUnregisterChannelMessageHandler(1)).toBe(1);
    expect(planUnregisterChannelMessageHandler(-1)).toBeNull();
    expect(shouldUnregisterChannelMessageHandler(true)).toBe(true);
    expect(shouldUnregisterChannelMessageHandler(false)).toBe(false);
    expect(shouldStopChannelHandlerFanout(true)).toBe(true);
    expect(shouldStopChannelHandlerFanout(false)).toBe(false);

    const register = stepRegisterChannelMessageHandlerWithActions(
      initialRegisterChannelMessageHandlerState(),
      { kind: "channel/register-message-handler-gate", alreadyPresent: false },
    );
    expect(shouldRegisterChannelMessageHandlerNow(register.actions)).toBe(true);
    expect(shouldSkipRegisterChannelMessageHandler(register.actions)).toBe(
      false,
    );

    const skipRegister = stepRegisterChannelMessageHandlerWithActions(
      initialRegisterChannelMessageHandlerState(),
      { kind: "channel/register-message-handler-gate", alreadyPresent: true },
    );
    expect(shouldRegisterChannelMessageHandlerNow(skipRegister.actions)).toBe(
      false,
    );
    expect(shouldSkipRegisterChannelMessageHandler(skipRegister.actions)).toBe(
      true,
    );

    const stop = stepStopChannelHandlerFanoutWithActions(
      initialStopChannelHandlerFanoutState(),
      {
        kind: "channel/stop-handler-fanout-gate",
        handled: true,
      },
    );
    expect(shouldStopChannelHandlerFanoutNow(stop.actions)).toBe(true);
    expect(shouldContinueChannelHandlerFanout(stop.actions)).toBe(false);

    const continueFanout = stepStopChannelHandlerFanoutWithActions(
      initialStopChannelHandlerFanoutState(),
      { kind: "channel/stop-handler-fanout-gate", handled: false },
    );
    expect(shouldStopChannelHandlerFanoutNow(continueFanout.actions)).toBe(
      false,
    );
    expect(shouldContinueChannelHandlerFanout(continueFanout.actions)).toBe(
      true,
    );

    const emit = stepEmitChannelImmediateDeliveryWithActions(
      initialEmitChannelImmediateDeliveryState(),
      {
        kind: "channel/emit-immediate-delivery-gate",
        packetState: ChannelMessageState.MSGSTATE_DELIVERED,
      },
    );
    expect(shouldEmitChannelImmediateDeliveryNow(emit.actions)).toBe(true);
    expect(shouldSkipEmitChannelImmediateDelivery(emit.actions)).toBe(false);

    const skipEmit = stepEmitChannelImmediateDeliveryWithActions(
      initialEmitChannelImmediateDeliveryState(),
      {
        kind: "channel/emit-immediate-delivery-gate",
        packetState: ChannelMessageState.MSGSTATE_SENT,
      },
    );
    expect(shouldEmitChannelImmediateDeliveryNow(skipEmit.actions)).toBe(false);
    expect(shouldSkipEmitChannelImmediateDelivery(skipEmit.actions)).toBe(true);

    const removePlan = stepChannelMessageHandlerUnregisterPlanWithActions(
      initialChannelMessageHandlerUnregisterPlanState(),
      { kind: "channel/message-handler-unregister-plan-gate", index: 1 },
    );
    expect(
      shouldRemoveChannelMessageHandlerUnregisterPlan(removePlan.actions),
    ).toBe(true);
    expect(channelMessageHandlerUnregisterPlanIndex(removePlan.actions)).toBe(
      1,
    );

    const remove = stepChannelMessageHandlerUnregisterWithActions(
      initialChannelMessageHandlerUnregisterState(),
      { kind: "channel/message-handler-unregister-gate", index: 1 },
    );
    expect(shouldRemoveChannelMessageHandler(remove.actions)).toBe(true);
    expect(channelMessageHandlerUnregisterIndex(remove.actions)).toBe(1);

    const skipPlan = stepChannelMessageHandlerUnregisterPlanWithActions(
      initialChannelMessageHandlerUnregisterPlanState(),
      { kind: "channel/message-handler-unregister-plan-gate", index: -1 },
    );
    expect(
      shouldRemoveChannelMessageHandlerUnregisterPlan(skipPlan.actions),
    ).toBe(false);
    expect(
      channelMessageHandlerUnregisterPlanIndex(skipPlan.actions),
    ).toBeNull();

    const skip = stepChannelMessageHandlerUnregisterWithActions(
      initialChannelMessageHandlerUnregisterState(),
      { kind: "channel/message-handler-unregister-gate", index: -1 },
    );
    expect(shouldRemoveChannelMessageHandler(skip.actions)).toBe(false);
    expect(channelMessageHandlerUnregisterIndex(skip.actions)).toBeNull();
  });
});

describe("protocol channel reorder", () => {
  it("accepts in-window sequences and wraparound replays carefully", () => {
    expect(
      shouldAcceptChannelSequence({
        sequence: 5,
        nextRxSequence: 5,
        windowMax: 48,
      }),
    ).toBe(true);
    expect(
      shouldAcceptChannelSequence({
        sequence: 4,
        nextRxSequence: 5,
        windowMax: 48,
      }),
    ).toBe(false);

    // Wrap: nextRx near end, overflow wraps below nextRx.
    expect(
      shouldAcceptChannelSequence({
        sequence: 2,
        nextRxSequence: 0xfff0,
        windowMax: 48,
      }),
    ).toBe(true);

    const accept = stepAcceptChannelSequenceWithActions(
      initialAcceptChannelSequenceState(),
      {
        kind: "channel/accept-sequence-gate",
        sequence: 5,
        nextRxSequence: 5,
        windowMax: 48,
      },
    );
    expect(shouldAcceptChannelSequenceNow(accept.actions)).toBe(true);
    expect(shouldSkipAcceptChannelSequence(accept.actions)).toBe(false);

    const skip = stepAcceptChannelSequenceWithActions(
      initialAcceptChannelSequenceState(),
      {
        kind: "channel/accept-sequence-gate",
        sequence: 4,
        nextRxSequence: 5,
        windowMax: 48,
      },
    );
    expect(shouldAcceptChannelSequenceNow(skip.actions)).toBe(false);
    expect(shouldSkipAcceptChannelSequence(skip.actions)).toBe(true);
  });

  it("inserts ordered sequences and rejects duplicates", () => {
    expect(
      channelEmplaceIndex({
        sequence: 3,
        ringSequences: [1, 4],
        wrapBaseSequence: 1,
      }),
    ).toBe(1);
    expect(
      channelEmplaceIndex({
        sequence: 4,
        ringSequences: [1, 4],
        wrapBaseSequence: 1,
      }),
    ).toBeNull();
    expect(shouldEmplaceChannelEnvelope(true)).toBe(true);
    expect(shouldEmplaceChannelEnvelope(false)).toBe(false);
    expect(shouldDrainChannelRingIndex(true)).toBe(true);
    expect(shouldDrainChannelRingIndex(false)).toBe(false);

    const emplace = stepEmplaceChannelEnvelopeWithActions(
      initialEmplaceChannelEnvelopeState(),
      {
        kind: "channel/emplace-envelope-gate",
        indexPresent: true,
      },
    );
    expect(shouldEmplaceChannelEnvelopeNow(emplace.actions)).toBe(true);
    expect(shouldSkipEmplaceChannelEnvelope(emplace.actions)).toBe(false);

    const skipEmplace = stepEmplaceChannelEnvelopeWithActions(
      initialEmplaceChannelEnvelopeState(),
      {
        kind: "channel/emplace-envelope-gate",
        indexPresent: false,
      },
    );
    expect(shouldEmplaceChannelEnvelopeNow(skipEmplace.actions)).toBe(false);
    expect(shouldSkipEmplaceChannelEnvelope(skipEmplace.actions)).toBe(true);

    const drain = stepDrainChannelRingIndexWithActions(
      initialDrainChannelRingIndexState(),
      {
        kind: "channel/drain-ring-index-gate",
        indexPresent: true,
      },
    );
    expect(shouldDrainChannelRingIndexNow(drain.actions)).toBe(true);
    expect(shouldSkipDrainChannelRingIndex(drain.actions)).toBe(false);

    const skipDrain = stepDrainChannelRingIndexWithActions(
      initialDrainChannelRingIndexState(),
      {
        kind: "channel/drain-ring-index-gate",
        indexPresent: false,
      },
    );
    expect(shouldDrainChannelRingIndexNow(skipDrain.actions)).toBe(false);
    expect(shouldSkipDrainChannelRingIndex(skipDrain.actions)).toBe(true);

    const inserted = insertChannelSequence([1, 4], 3, 1);
    expect(inserted.inserted).toBe(true);
    expect(inserted.ring).toEqual([1, 3, 4]);
  });

  it("drains contiguous prefixes", () => {
    const drained = drainContiguousChannelSequences({
      ringSequences: [2, 3, 5],
      nextRxSequence: 2,
    });
    expect(drained.contiguous).toEqual([2, 3]);
    expect(drained.remaining).toEqual([5]);
    expect(drained.nextRxSequence).toBe(4);
  });

  it("finds ring sequence indices", () => {
    expect(
      indexOfChannelRingSequence({ ringSequences: [2, 3, 5], target: 3 }),
    ).toBe(1);
    expect(
      indexOfChannelRingSequence({ ringSequences: [2, 3, 5], target: 9 }),
    ).toBeNull();
    expect(shouldDrainChannelRingIndex(true)).toBe(true);
    expect(shouldDrainChannelRingIndex(false)).toBe(false);
  });

  it("emits ring-sequence index only from use-index/miss actions", () => {
    const hit = stepIndexOfChannelRingSequenceWithActions(
      initialIndexOfChannelRingSequenceState(),
      {
        kind: "channel/ring-sequence-index-gate",
        ringSequences: [2, 3, 5],
        target: 3,
      },
    );
    expect(shouldUseChannelRingSequenceIndex(hit.actions)).toBe(true);
    expect(shouldMissChannelRingSequenceIndex(hit.actions)).toBe(false);
    expect(channelRingSequenceIndexFromActions(hit.actions)).toBe(1);

    const miss = stepIndexOfChannelRingSequenceWithActions(
      initialIndexOfChannelRingSequenceState(),
      {
        kind: "channel/ring-sequence-index-gate",
        ringSequences: [2, 3, 5],
        target: 9,
      },
    );
    expect(shouldUseChannelRingSequenceIndex(miss.actions)).toBe(false);
    expect(shouldMissChannelRingSequenceIndex(miss.actions)).toBe(true);
    expect(channelRingSequenceIndexFromActions(miss.actions)).toBeNull();

    const empty = stepIndexOfChannelRingSequenceWithActions(
      initialIndexOfChannelRingSequenceState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseChannelRingSequenceIndex(empty.actions)).toBe(false);
    expect(shouldMissChannelRingSequenceIndex(empty.actions)).toBe(false);
    expect(channelRingSequenceIndexFromActions(empty.actions)).toBeNull();
  });
});
