import { describe, expect, it } from "vitest";
import {
  STREAM_DATA_MSGTYPE,
  STREAM_ID_MAX,
  StreamSystemMessageTypes,
  clampStreamChunkTake,
  clampStreamDataChunkLength,
  clampStreamReadSize,
  initialAppendStreamDataState,
  initialClampStreamChunkTakeState,
  initialClampStreamDataChunkLengthState,
  initialClampStreamReadSizeState,
  initialPackStreamDataMessageState,
  initialStreamChunkConsumeState,
  initialStreamDataMessageHandleState,
  initialStreamEofMarkState,
  initialStreamIdAssignedState,
  initialStreamReadDeferState,
  initialStreamReadReturnState,
  initialStreamReadyCallbackRegisterState,
  initialStreamReadyCallbackUnregisterPlanState,
  initialStreamReadyCallbackUnregisterState,
  initialUnpackStreamDataMessageState,
  isStreamIdAssigned,
  packStreamDataMessage,
  packStreamDataMessageRawFromActions,
  planUnregisterStreamReadyCallback,
  shouldAppendStreamData,
  shouldConsumeStreamChunk,
  shouldDeferStreamRead,
  shouldHandleStreamDataMessage,
  shouldHandleStreamDataMessageNow,
  shouldIgnoreStreamDataMessage,
  shouldMarkStreamEof,
  shouldPerformStreamAppend,
  shouldRegisterStreamReadyCallback,
  shouldRegisterStreamReadyNow,
  shouldRejectPackStreamDataMessage,
  shouldRejectUnpackStreamDataMessage,
  shouldRemoveStreamReadyCallback,
  shouldRemoveStreamReadyCallbackUnregisterPlan,
  shouldReturnStreamReadResult,
  shouldSkipStreamAppend,
  shouldSkipStreamEofMark,
  shouldSkipStreamReadYield,
  shouldSkipStreamReadyRegister,
  shouldStreamChunkConsume,
  shouldStreamChunkResidual,
  shouldStreamEofMark,
  shouldStreamIdAssigned,
  shouldStreamIdUnassigned,
  shouldStreamReadDefer,
  shouldStreamReadProceed,
  shouldUnregisterStreamReadyCallback,
  shouldUsePackStreamDataMessage,
  shouldUseStreamChunkTake,
  shouldUseStreamDataChunkLength,
  shouldUseStreamReadSize,
  shouldUseUnpackStreamDataMessage,
  shouldYieldStreamRead,
  stepAppendStreamDataWithActions,
  stepClampStreamChunkTakeWithActions,
  stepClampStreamDataChunkLengthWithActions,
  stepClampStreamReadSizeWithActions,
  stepPackStreamDataMessageWithActions,
  stepStreamChunkConsumeWithActions,
  stepStreamDataMessageHandleWithActions,
  stepStreamEofMarkWithActions,
  stepStreamIdAssignedWithActions,
  stepStreamReadDeferWithActions,
  stepStreamReadReturnWithActions,
  stepStreamReadyCallbackRegisterWithActions,
  stepStreamReadyCallbackUnregisterPlanWithActions,
  stepStreamReadyCallbackUnregisterWithActions,
  stepUnpackStreamDataMessageWithActions,
  streamChunkTakeFromActions,
  streamDataChunkLengthFromActions,
  streamDataMessageFieldsFromActions,
  streamReadSizeFromActions,
  streamReadyCallbackUnregisterIndex,
  streamReadyCallbackUnregisterPlanIndex,
  unpackStreamDataMessage,
} from "../src/stream-data.js";

describe("protocol stream data framing", () => {
  it("exposes stream system message type", () => {
    expect(STREAM_DATA_MSGTYPE).toBe(0xff00);
    expect(StreamSystemMessageTypes.SMT_STREAM_DATA).toBe(STREAM_DATA_MSGTYPE);
  });
  it("packs and unpacks stream headers with flags", () => {
    const packed = packStreamDataMessage({
      streamId: 42,
      data: new Uint8Array([9, 8, 7]),
      eof: true,
      compressed: true,
    });
    const fields = unpackStreamDataMessage(packed);
    expect(fields.streamId).toBe(42);
    expect(fields.eof).toBe(true);
    expect(fields.compressed).toBe(true);
    expect([...fields.data]).toEqual([9, 8, 7]);
  });

  it("packs and unpacks via WithActions steps", () => {
    const packStepped = stepPackStreamDataMessageWithActions(
      initialPackStreamDataMessageState(),
      {
        kind: "stream-data/pack-gate",
        streamId: 42,
        data: new Uint8Array([9, 8, 7]),
        eof: true,
        compressed: true,
      },
    );
    expect(shouldUsePackStreamDataMessage(packStepped.actions)).toBe(true);
    expect(shouldRejectPackStreamDataMessage(packStepped.actions)).toBe(false);
    const packed = packStreamDataMessageRawFromActions(packStepped.actions);
    expect(packed).not.toBeNull();

    const unpackStepped = stepUnpackStreamDataMessageWithActions(
      initialUnpackStreamDataMessageState(),
      { kind: "stream-data/unpack-gate", data: packed! },
    );
    expect(shouldUseUnpackStreamDataMessage(unpackStepped.actions)).toBe(true);
    expect(shouldRejectUnpackStreamDataMessage(unpackStepped.actions)).toBe(
      false,
    );
    const fields = streamDataMessageFieldsFromActions(unpackStepped.actions);
    expect(fields).toEqual({
      streamId: 42,
      eof: true,
      compressed: true,
      data: new Uint8Array([9, 8, 7]),
    });
  });

  it("rejects invalid stream ids", () => {
    expect(() =>
      packStreamDataMessage({
        streamId: STREAM_ID_MAX + 1,
        data: new Uint8Array(0),
      }),
    ).toThrow(/stream_id/);

    const rejected = stepPackStreamDataMessageWithActions(
      initialPackStreamDataMessageState(),
      {
        kind: "stream-data/pack-gate",
        streamId: STREAM_ID_MAX + 1,
        data: new Uint8Array(0),
      },
    );
    expect(shouldRejectPackStreamDataMessage(rejected.actions)).toBe(true);
    expect(shouldUsePackStreamDataMessage(rejected.actions)).toBe(false);
    expect(packStreamDataMessageRawFromActions(rejected.actions)).toBeNull();
  });

  it("rejects truncated unpack via WithActions", () => {
    const rejected = stepUnpackStreamDataMessageWithActions(
      initialUnpackStreamDataMessageState(),
      {
        kind: "stream-data/unpack-gate",
        data: new Uint8Array([1]),
      },
    );
    expect(shouldRejectUnpackStreamDataMessage(rejected.actions)).toBe(true);
    expect(shouldUseUnpackStreamDataMessage(rejected.actions)).toBe(false);
    expect(streamDataMessageFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("clamps write chunk length to data and chunk limits", () => {
    expect(clampStreamDataChunkLength(1000, 256, 16_384)).toBe(256);
    expect(clampStreamDataChunkLength(100, 256, 16_384)).toBe(100);
    expect(clampStreamDataChunkLength(1000, 2000, 500)).toBe(500);

    const capped = stepClampStreamDataChunkLengthWithActions(
      initialClampStreamDataChunkLengthState(),
      {
        kind: "stream/data-chunk-length-gate",
        length: 1000,
        maxDataLen: 256,
        maxChunkLen: 16_384,
      },
    );
    expect(shouldUseStreamDataChunkLength(capped.actions)).toBe(true);
    expect(streamDataChunkLengthFromActions(capped.actions)).toBe(256);

    const empty = stepClampStreamDataChunkLengthWithActions(
      initialClampStreamDataChunkLengthState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseStreamDataChunkLength(empty.actions)).toBe(false);
    expect(streamDataChunkLengthFromActions(empty.actions)).toBeNull();
  });

  it("skips empty stream payloads for append", () => {
    expect(shouldAppendStreamData(0)).toBe(false);
    expect(shouldAppendStreamData(1)).toBe(true);

    const append = stepAppendStreamDataWithActions(
      initialAppendStreamDataState(),
      {
        kind: "stream/append-gate",
        length: 1,
      },
    );
    expect(shouldPerformStreamAppend(append.actions)).toBe(true);
    expect(shouldSkipStreamAppend(append.actions)).toBe(false);

    const skip = stepAppendStreamDataWithActions(
      initialAppendStreamDataState(),
      {
        kind: "stream/append-gate",
        length: 0,
      },
    );
    expect(shouldPerformStreamAppend(skip.actions)).toBe(false);
    expect(shouldSkipStreamAppend(skip.actions)).toBe(true);
  });

  it("clamps reader size to buffered length", () => {
    expect(clampStreamReadSize(100, 40)).toBe(40);
    expect(clampStreamReadSize(10, 40)).toBe(10);
    expect(clampStreamReadSize(0, 0)).toBe(0);

    const clamped = stepClampStreamReadSizeWithActions(
      initialClampStreamReadSizeState(),
      {
        kind: "stream/read-size-gate",
        size: 100,
        bufferLength: 40,
      },
    );
    expect(shouldUseStreamReadSize(clamped.actions)).toBe(true);
    expect(streamReadSizeFromActions(clamped.actions)).toBe(40);

    const empty = stepClampStreamReadSizeWithActions(
      initialClampStreamReadSizeState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseStreamReadSize(empty.actions)).toBe(false);
    expect(streamReadSizeFromActions(empty.actions)).toBeNull();
  });
});

describe("protocol stream data framing (continued)", () => {
  it("defers read when buffer is empty before EOF", () => {
    expect(shouldDeferStreamRead(0, false)).toBe(true);
    expect(shouldDeferStreamRead(0, true)).toBe(false);
    expect(shouldDeferStreamRead(10, false)).toBe(false);

    const defer = stepStreamReadDeferWithActions(
      initialStreamReadDeferState(),
      {
        kind: "stream/read-defer-gate",
        bufferLength: 0,
        eof: false,
      },
    );
    expect(shouldStreamReadDefer(defer.actions)).toBe(true);
    expect(shouldStreamReadProceed(defer.actions)).toBe(false);

    const proceed = stepStreamReadDeferWithActions(
      initialStreamReadDeferState(),
      {
        kind: "stream/read-defer-gate",
        bufferLength: 10,
        eof: false,
      },
    );
    expect(shouldStreamReadDefer(proceed.actions)).toBe(false);
    expect(shouldStreamReadProceed(proceed.actions)).toBe(true);
  });

  it("returns read results when bytes copied or EOF", () => {
    expect(shouldReturnStreamReadResult(0, false)).toBe(false);
    expect(shouldReturnStreamReadResult(0, true)).toBe(true);
    expect(shouldReturnStreamReadResult(3, false)).toBe(true);

    const yieldResult = stepStreamReadReturnWithActions(
      initialStreamReadReturnState(),
      {
        kind: "stream/read-return-gate",
        copied: 3,
        eof: false,
      },
    );
    expect(shouldYieldStreamRead(yieldResult.actions)).toBe(true);
    expect(shouldSkipStreamReadYield(yieldResult.actions)).toBe(false);

    const skip = stepStreamReadReturnWithActions(
      initialStreamReadReturnState(),
      {
        kind: "stream/read-return-gate",
        copied: 0,
        eof: false,
      },
    );
    expect(shouldYieldStreamRead(skip.actions)).toBe(false);
    expect(shouldSkipStreamReadYield(skip.actions)).toBe(true);
  });

  it("clamps per-chunk take to remaining read window", () => {
    expect(clampStreamChunkTake(100, 40)).toBe(40);
    expect(clampStreamChunkTake(10, 40)).toBe(10);
    expect(clampStreamChunkTake(0, 5)).toBe(0);

    const clamped = stepClampStreamChunkTakeWithActions(
      initialClampStreamChunkTakeState(),
      {
        kind: "stream/chunk-take-gate",
        chunkLength: 100,
        remaining: 40,
      },
    );
    expect(shouldUseStreamChunkTake(clamped.actions)).toBe(true);
    expect(streamChunkTakeFromActions(clamped.actions)).toBe(40);

    const empty = stepClampStreamChunkTakeWithActions(
      initialClampStreamChunkTakeState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseStreamChunkTake(empty.actions)).toBe(false);
    expect(streamChunkTakeFromActions(empty.actions)).toBeNull();
  });

  it("consumes a chunk when take equals chunk length", () => {
    expect(shouldConsumeStreamChunk(10, 10)).toBe(true);
    expect(shouldConsumeStreamChunk(5, 10)).toBe(false);

    const consume = stepStreamChunkConsumeWithActions(
      initialStreamChunkConsumeState(),
      {
        kind: "stream/chunk-consume-gate",
        take: 10,
        chunkLength: 10,
      },
    );
    expect(shouldStreamChunkConsume(consume.actions)).toBe(true);
    expect(shouldStreamChunkResidual(consume.actions)).toBe(false);

    const residual = stepStreamChunkConsumeWithActions(
      initialStreamChunkConsumeState(),
      {
        kind: "stream/chunk-consume-gate",
        take: 5,
        chunkLength: 10,
      },
    );
    expect(shouldStreamChunkConsume(residual.actions)).toBe(false);
    expect(shouldStreamChunkResidual(residual.actions)).toBe(true);
  });

  it("marks reader EOF from stream-data eof flag", () => {
    expect(shouldMarkStreamEof(true)).toBe(true);
    expect(shouldMarkStreamEof(false)).toBe(false);

    const mark = stepStreamEofMarkWithActions(initialStreamEofMarkState(), {
      kind: "stream/eof-mark-gate",
      eof: true,
    });
    expect(shouldStreamEofMark(mark.actions)).toBe(true);
    expect(shouldSkipStreamEofMark(mark.actions)).toBe(false);

    const skip = stepStreamEofMarkWithActions(initialStreamEofMarkState(), {
      kind: "stream/eof-mark-gate",
      eof: false,
    });
    expect(shouldStreamEofMark(skip.actions)).toBe(false);
    expect(shouldSkipStreamEofMark(skip.actions)).toBe(true);
  });

  it("requires an assigned stream id for packing", () => {
    expect(isStreamIdAssigned(true)).toBe(true);
    expect(isStreamIdAssigned(false)).toBe(false);

    const assigned = stepStreamIdAssignedWithActions(
      initialStreamIdAssignedState(),
      {
        kind: "stream/id-assigned-gate",
        streamIdPresent: true,
      },
    );
    expect(shouldStreamIdAssigned(assigned.actions)).toBe(true);
    expect(shouldStreamIdUnassigned(assigned.actions)).toBe(false);

    const unassigned = stepStreamIdAssignedWithActions(
      initialStreamIdAssignedState(),
      {
        kind: "stream/id-assigned-gate",
        streamIdPresent: false,
      },
    );
    expect(shouldStreamIdAssigned(unassigned.actions)).toBe(false);
    expect(shouldStreamIdUnassigned(unassigned.actions)).toBe(true);
  });
});

describe("protocol stream data framing (continued)", () => {
  it("handles stream-data messages for matching stream ids", () => {
    expect(
      shouldHandleStreamDataMessage({
        messageStreamId: 3,
        expectedStreamId: 3,
      }),
    ).toBe(true);
    expect(
      shouldHandleStreamDataMessage({
        messageStreamId: 3,
        expectedStreamId: 4,
      }),
    ).toBe(false);
    expect(
      shouldHandleStreamDataMessage({
        messageStreamId: null,
        expectedStreamId: 3,
      }),
    ).toBe(false);

    const handle = stepStreamDataMessageHandleWithActions(
      initialStreamDataMessageHandleState(),
      {
        kind: "stream/data-message-handle-gate",
        messageStreamId: 3,
        expectedStreamId: 3,
      },
    );
    expect(shouldHandleStreamDataMessageNow(handle.actions)).toBe(true);
    expect(shouldIgnoreStreamDataMessage(handle.actions)).toBe(false);

    const ignore = stepStreamDataMessageHandleWithActions(
      initialStreamDataMessageHandleState(),
      {
        kind: "stream/data-message-handle-gate",
        messageStreamId: null,
        expectedStreamId: 3,
      },
    );
    expect(shouldHandleStreamDataMessageNow(ignore.actions)).toBe(false);
    expect(shouldIgnoreStreamDataMessage(ignore.actions)).toBe(true);
  });

  it("plans stream ready-callback register and unregister", () => {
    expect(shouldRegisterStreamReadyCallback(true)).toBe(true);
    expect(shouldRegisterStreamReadyCallback(false)).toBe(false);
    expect(planUnregisterStreamReadyCallback(0)).toBe(0);
    expect(planUnregisterStreamReadyCallback(4)).toBe(4);
    expect(planUnregisterStreamReadyCallback(-1)).toBeNull();
    expect(shouldUnregisterStreamReadyCallback(true)).toBe(true);
    expect(shouldUnregisterStreamReadyCallback(false)).toBe(false);

    const register = stepStreamReadyCallbackRegisterWithActions(
      initialStreamReadyCallbackRegisterState(),
      { kind: "stream/ready-callback-register-gate", callbackPresent: true },
    );
    expect(shouldRegisterStreamReadyNow(register.actions)).toBe(true);
    expect(shouldSkipStreamReadyRegister(register.actions)).toBe(false);

    const skipRegister = stepStreamReadyCallbackRegisterWithActions(
      initialStreamReadyCallbackRegisterState(),
      { kind: "stream/ready-callback-register-gate", callbackPresent: false },
    );
    expect(shouldRegisterStreamReadyNow(skipRegister.actions)).toBe(false);
    expect(shouldSkipStreamReadyRegister(skipRegister.actions)).toBe(true);

    const removePlan = stepStreamReadyCallbackUnregisterPlanWithActions(
      initialStreamReadyCallbackUnregisterPlanState(),
      { kind: "stream/ready-callback-unregister-plan-gate", index: 4 },
    );
    expect(
      shouldRemoveStreamReadyCallbackUnregisterPlan(removePlan.actions),
    ).toBe(true);
    expect(streamReadyCallbackUnregisterPlanIndex(removePlan.actions)).toBe(4);

    const remove = stepStreamReadyCallbackUnregisterWithActions(
      initialStreamReadyCallbackUnregisterState(),
      { kind: "stream/ready-callback-unregister-gate", index: 4 },
    );
    expect(shouldRemoveStreamReadyCallback(remove.actions)).toBe(true);
    expect(streamReadyCallbackUnregisterIndex(remove.actions)).toBe(4);

    const skipPlan = stepStreamReadyCallbackUnregisterPlanWithActions(
      initialStreamReadyCallbackUnregisterPlanState(),
      { kind: "stream/ready-callback-unregister-plan-gate", index: -1 },
    );
    expect(
      shouldRemoveStreamReadyCallbackUnregisterPlan(skipPlan.actions),
    ).toBe(false);
    expect(streamReadyCallbackUnregisterPlanIndex(skipPlan.actions)).toBeNull();

    const skip = stepStreamReadyCallbackUnregisterWithActions(
      initialStreamReadyCallbackUnregisterState(),
      { kind: "stream/ready-callback-unregister-gate", index: -1 },
    );
    expect(shouldRemoveStreamReadyCallback(skip.actions)).toBe(false);
    expect(streamReadyCallbackUnregisterIndex(skip.actions)).toBeNull();
  });
});
