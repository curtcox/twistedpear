import { describe, expect, it } from "vitest";
import {
  STREAM_DATA_MSGTYPE,
  STREAM_ID_MAX,
  StreamSystemMessageTypes,
  clampStreamChunkTake,
  clampStreamDataChunkLength,
  clampStreamReadSize,
  initialClampStreamChunkTakeState,
  initialClampStreamDataChunkLengthState,
  initialClampStreamReadSizeState,
  initialPackStreamDataMessageState,
  initialUnpackStreamDataMessageState,
  isStreamIdAssigned,
  packStreamDataMessage,
  packStreamDataMessageRawFromActions,
  planUnregisterStreamReadyCallback,
  shouldAppendStreamData,
  shouldConsumeStreamChunk,
  shouldDeferStreamRead,
  shouldHandleStreamDataMessage,
  shouldMarkStreamEof,
  shouldRegisterStreamReadyCallback,
  shouldRejectPackStreamDataMessage,
  shouldRejectUnpackStreamDataMessage,
  shouldRemoveStreamReadyCallback,
  shouldReturnStreamReadResult,
  shouldUnregisterStreamReadyCallback,
  shouldUsePackStreamDataMessage,
  shouldUseStreamChunkTake,
  shouldUseStreamDataChunkLength,
  shouldUseStreamReadSize,
  shouldUseUnpackStreamDataMessage,
  initialStreamReadyCallbackUnregisterState,
  stepClampStreamChunkTakeWithActions,
  stepClampStreamDataChunkLengthWithActions,
  stepClampStreamReadSizeWithActions,
  stepPackStreamDataMessageWithActions,
  stepUnpackStreamDataMessageWithActions,
  streamChunkTakeFromActions,
  streamDataChunkLengthFromActions,
  streamDataMessageFieldsFromActions,
  streamReadSizeFromActions,
  streamReadyCallbackUnregisterIndex,
  stepStreamReadyCallbackUnregisterWithActions,
  unpackStreamDataMessage
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
      compressed: true
    });
    const fields = unpackStreamDataMessage(packed);
    expect(fields.streamId).toBe(42);
    expect(fields.eof).toBe(true);
    expect(fields.compressed).toBe(true);
    expect([...fields.data]).toEqual([9, 8, 7]);
  });

  it("packs and unpacks via WithActions steps", () => {
    const packStepped = stepPackStreamDataMessageWithActions(initialPackStreamDataMessageState(), {
      kind: "stream-data/pack-gate",
      streamId: 42,
      data: new Uint8Array([9, 8, 7]),
      eof: true,
      compressed: true
    });
    expect(shouldUsePackStreamDataMessage(packStepped.actions)).toBe(true);
    expect(shouldRejectPackStreamDataMessage(packStepped.actions)).toBe(false);
    const packed = packStreamDataMessageRawFromActions(packStepped.actions);
    expect(packed).not.toBeNull();

    const unpackStepped = stepUnpackStreamDataMessageWithActions(
      initialUnpackStreamDataMessageState(),
      { kind: "stream-data/unpack-gate", data: packed! }
    );
    expect(shouldUseUnpackStreamDataMessage(unpackStepped.actions)).toBe(true);
    expect(shouldRejectUnpackStreamDataMessage(unpackStepped.actions)).toBe(false);
    const fields = streamDataMessageFieldsFromActions(unpackStepped.actions);
    expect(fields).toEqual({
      streamId: 42,
      eof: true,
      compressed: true,
      data: new Uint8Array([9, 8, 7])
    });
  });

  it("rejects invalid stream ids", () => {
    expect(() =>
      packStreamDataMessage({ streamId: STREAM_ID_MAX + 1, data: new Uint8Array(0) })
    ).toThrow(/stream_id/);

    const rejected = stepPackStreamDataMessageWithActions(initialPackStreamDataMessageState(), {
      kind: "stream-data/pack-gate",
      streamId: STREAM_ID_MAX + 1,
      data: new Uint8Array(0)
    });
    expect(shouldRejectPackStreamDataMessage(rejected.actions)).toBe(true);
    expect(shouldUsePackStreamDataMessage(rejected.actions)).toBe(false);
    expect(packStreamDataMessageRawFromActions(rejected.actions)).toBeNull();
  });

  it("rejects truncated unpack via WithActions", () => {
    const rejected = stepUnpackStreamDataMessageWithActions(initialUnpackStreamDataMessageState(), {
      kind: "stream-data/unpack-gate",
      data: new Uint8Array([1])
    });
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
        maxChunkLen: 16_384
      }
    );
    expect(shouldUseStreamDataChunkLength(capped.actions)).toBe(true);
    expect(streamDataChunkLengthFromActions(capped.actions)).toBe(256);

    const empty = stepClampStreamDataChunkLengthWithActions(
      initialClampStreamDataChunkLengthState(),
      {
        kind: "noop"
      } as never
    );
    expect(shouldUseStreamDataChunkLength(empty.actions)).toBe(false);
    expect(streamDataChunkLengthFromActions(empty.actions)).toBeNull();
  });

  it("skips empty stream payloads for append", () => {
    expect(shouldAppendStreamData(0)).toBe(false);
    expect(shouldAppendStreamData(1)).toBe(true);
  });

  it("clamps reader size to buffered length", () => {
    expect(clampStreamReadSize(100, 40)).toBe(40);
    expect(clampStreamReadSize(10, 40)).toBe(10);
    expect(clampStreamReadSize(0, 0)).toBe(0);

    const clamped = stepClampStreamReadSizeWithActions(initialClampStreamReadSizeState(), {
      kind: "stream/read-size-gate",
      size: 100,
      bufferLength: 40
    });
    expect(shouldUseStreamReadSize(clamped.actions)).toBe(true);
    expect(streamReadSizeFromActions(clamped.actions)).toBe(40);

    const empty = stepClampStreamReadSizeWithActions(initialClampStreamReadSizeState(), {
      kind: "noop"
    } as never);
    expect(shouldUseStreamReadSize(empty.actions)).toBe(false);
    expect(streamReadSizeFromActions(empty.actions)).toBeNull();
  });

  it("defers read when buffer is empty before EOF", () => {
    expect(shouldDeferStreamRead(0, false)).toBe(true);
    expect(shouldDeferStreamRead(0, true)).toBe(false);
    expect(shouldDeferStreamRead(10, false)).toBe(false);
  });

  it("returns read results when bytes copied or EOF", () => {
    expect(shouldReturnStreamReadResult(0, false)).toBe(false);
    expect(shouldReturnStreamReadResult(0, true)).toBe(true);
    expect(shouldReturnStreamReadResult(3, false)).toBe(true);
  });

  it("clamps per-chunk take to remaining read window", () => {
    expect(clampStreamChunkTake(100, 40)).toBe(40);
    expect(clampStreamChunkTake(10, 40)).toBe(10);
    expect(clampStreamChunkTake(0, 5)).toBe(0);

    const clamped = stepClampStreamChunkTakeWithActions(initialClampStreamChunkTakeState(), {
      kind: "stream/chunk-take-gate",
      chunkLength: 100,
      remaining: 40
    });
    expect(shouldUseStreamChunkTake(clamped.actions)).toBe(true);
    expect(streamChunkTakeFromActions(clamped.actions)).toBe(40);

    const empty = stepClampStreamChunkTakeWithActions(initialClampStreamChunkTakeState(), {
      kind: "noop"
    } as never);
    expect(shouldUseStreamChunkTake(empty.actions)).toBe(false);
    expect(streamChunkTakeFromActions(empty.actions)).toBeNull();
  });

  it("consumes a chunk when take equals chunk length", () => {
    expect(shouldConsumeStreamChunk(10, 10)).toBe(true);
    expect(shouldConsumeStreamChunk(5, 10)).toBe(false);
  });

  it("marks reader EOF from stream-data eof flag", () => {
    expect(shouldMarkStreamEof(true)).toBe(true);
    expect(shouldMarkStreamEof(false)).toBe(false);
  });

  it("requires an assigned stream id for packing", () => {
    expect(isStreamIdAssigned(true)).toBe(true);
    expect(isStreamIdAssigned(false)).toBe(false);
  });

  it("handles stream-data messages for matching stream ids", () => {
    expect(
      shouldHandleStreamDataMessage({ messageStreamId: 3, expectedStreamId: 3 })
    ).toBe(true);
    expect(
      shouldHandleStreamDataMessage({ messageStreamId: 3, expectedStreamId: 4 })
    ).toBe(false);
    expect(
      shouldHandleStreamDataMessage({ messageStreamId: null, expectedStreamId: 3 })
    ).toBe(false);
  });

  it("plans stream ready-callback register and unregister", () => {
    expect(shouldRegisterStreamReadyCallback(true)).toBe(true);
    expect(shouldRegisterStreamReadyCallback(false)).toBe(false);
    expect(planUnregisterStreamReadyCallback(0)).toBe(0);
    expect(planUnregisterStreamReadyCallback(4)).toBe(4);
    expect(planUnregisterStreamReadyCallback(-1)).toBeNull();
    expect(shouldUnregisterStreamReadyCallback(true)).toBe(true);
    expect(shouldUnregisterStreamReadyCallback(false)).toBe(false);

    const remove = stepStreamReadyCallbackUnregisterWithActions(
      initialStreamReadyCallbackUnregisterState(),
      { kind: "stream/ready-callback-unregister-gate", index: 4 }
    );
    expect(shouldRemoveStreamReadyCallback(remove.actions)).toBe(true);
    expect(streamReadyCallbackUnregisterIndex(remove.actions)).toBe(4);

    const skip = stepStreamReadyCallbackUnregisterWithActions(
      initialStreamReadyCallbackUnregisterState(),
      { kind: "stream/ready-callback-unregister-gate", index: -1 }
    );
    expect(shouldRemoveStreamReadyCallback(skip.actions)).toBe(false);
    expect(streamReadyCallbackUnregisterIndex(skip.actions)).toBeNull();
  });
});
