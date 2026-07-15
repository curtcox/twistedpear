import {
  STREAM_ID_MAX as PROTOCOL_STREAM_ID_MAX,
  StreamSystemMessageTypes,
  initialClampStreamChunkTakeState,
  initialClampStreamDataChunkLengthState,
  initialClampStreamReadSizeState,
  initialPackStreamDataMessageState,
  initialStreamReadyCallbackUnregisterState,
  initialUnpackStreamDataMessageState,
  isStreamIdAssigned,
  packStreamDataMessageRawFromActions,
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
  shouldUsePackStreamDataMessage,
  shouldUseStreamChunkTake,
  shouldUseStreamDataChunkLength,
  shouldUseStreamReadSize,
  shouldUseUnpackStreamDataMessage,
  stepClampStreamChunkTakeWithActions,
  stepClampStreamDataChunkLengthWithActions,
  stepClampStreamReadSizeWithActions,
  stepPackStreamDataMessageWithActions,
  stepStreamReadyCallbackUnregisterWithActions,
  stepUnpackStreamDataMessageWithActions,
  streamChunkTakeFromActions,
  streamDataChunkLengthFromActions,
  streamDataMessageFieldsFromActions,
  streamReadSizeFromActions,
  streamReadyCallbackUnregisterIndex
} from "@twistedpear/protocol";
import { Channel, type ChannelMessage } from "./channel.js";

/** Mirrors RNS/Buffer.py StreamDataMessage system message type. */
export const SystemMessageTypes = StreamSystemMessageTypes;

/** Mirrors RNS/Buffer.py StreamDataMessage. */
export class StreamDataMessage implements ChannelMessage {
  static readonly MSGTYPE = SystemMessageTypes.SMT_STREAM_DATA;
  readonly MSGTYPE = StreamDataMessage.MSGTYPE;

  static readonly STREAM_ID_MAX = PROTOCOL_STREAM_ID_MAX;
  static readonly OVERHEAD = 8;
  static MAX_DATA_LEN = 256;

  streamId: number | null = null;
  data: Uint8Array = new Uint8Array(0);
  eof = false;
  compressed = false;

  constructor(options: { readonly streamId?: number; readonly data?: Uint8Array; readonly eof?: boolean } = {}) {
    if (options.streamId !== undefined) {
      this.streamId = options.streamId;
    }

    if (options.data !== undefined) {
      this.data = options.data;
    }

    if (options.eof === true) {
      this.eof = true;
    }
  }

  pack(): Uint8Array {
    if (!isStreamIdAssigned(this.streamId !== null)) {
      throw new Error("stream_id is required");
    }

    const { actions } = stepPackStreamDataMessageWithActions(initialPackStreamDataMessageState(), {
      kind: "stream-data/pack-gate",
      streamId: this.streamId!,
      data: this.data,
      eof: this.eof,
      compressed: this.compressed
    });
    if (shouldRejectPackStreamDataMessage(actions) || !shouldUsePackStreamDataMessage(actions)) {
      throw new Error("StreamDataMessage.pack: missing use-raw action");
    }
    const packed = packStreamDataMessageRawFromActions(actions);
    if (packed === null) {
      throw new Error("StreamDataMessage.pack: missing use-raw action");
    }
    return packed;
  }

  unpack(raw: Uint8Array): void {
    const { actions } = stepUnpackStreamDataMessageWithActions(initialUnpackStreamDataMessageState(), {
      kind: "stream-data/unpack-gate",
      data: raw
    });
    if (shouldRejectUnpackStreamDataMessage(actions) || !shouldUseUnpackStreamDataMessage(actions)) {
      throw new Error("StreamDataMessage is truncated");
    }
    const fields = streamDataMessageFieldsFromActions(actions);
    if (fields === null) {
      throw new Error("StreamDataMessage is truncated");
    }
    this.eof = fields.eof;
    this.compressed = fields.compressed;
    this.streamId = fields.streamId;
    this.data = fields.data;
  }
}

export type StreamReadyCallback = (readyBytes: number) => void;

/** Mirrors RNS/Buffer.py RawChannelReader. */
export class RawChannelReader {
  private chunks: Uint8Array[] = [];
  private bufferLength = 0;
  private eof = false;
  private readonly listeners: StreamReadyCallback[] = [];
  private readonly handler: (message: ChannelMessage) => boolean;

  constructor(
    private readonly streamId: number,
    private readonly channel: Channel
  ) {
    this.channel.registerMessageType(StreamDataMessage, { isSystemType: true });
    this.handler = (message) => {
      if (
        !(message instanceof StreamDataMessage) ||
        !shouldHandleStreamDataMessage({
          messageStreamId: message.streamId,
          expectedStreamId: this.streamId
        })
      ) {
        return false;
      }

      if (shouldAppendStreamData(message.data.length)) {
        this.append(message.data);
      }

      if (shouldMarkStreamEof(message.eof)) {
        this.eof = true;
      }

      for (const listener of this.listeners) {
        listener(this.bufferLength);
      }

      return true;
    };
    this.channel.addMessageHandler(this.handler);
  }

  addReadyCallback(callback: StreamReadyCallback): void {
    this.listeners.push(callback);
  }

  removeReadyCallback(callback: StreamReadyCallback): void {
    const stepped = stepStreamReadyCallbackUnregisterWithActions(
      initialStreamReadyCallbackUnregisterState(),
      {
        kind: "stream/ready-callback-unregister-gate",
        index: this.listeners.indexOf(callback)
      }
    );
    const index = streamReadyCallbackUnregisterIndex(stepped.actions);
    if (shouldRemoveStreamReadyCallback(stepped.actions) && index !== null) {
      this.listeners.splice(index, 1);
    }
  }

  read(size: number): Uint8Array | null {
    if (shouldDeferStreamRead(this.bufferLength, this.eof)) {
      return null;
    }

    const readSizeStepped = stepClampStreamReadSizeWithActions(
      initialClampStreamReadSizeState(),
      {
        kind: "stream/read-size-gate",
        size,
        bufferLength: this.bufferLength
      }
    );
    const clampedSize = shouldUseStreamReadSize(readSizeStepped.actions)
      ? streamReadSizeFromActions(readSizeStepped.actions)
      : null;
    if (clampedSize === null) {
      throw new Error("RawChannelReader: missing use-size action");
    }

    const output = new Uint8Array(clampedSize);
    let copied = 0;
    while (copied < output.length && this.chunks.length > 0) {
      const chunk = this.chunks[0]!;
      const takeStepped = stepClampStreamChunkTakeWithActions(
        initialClampStreamChunkTakeState(),
        {
          kind: "stream/chunk-take-gate",
          chunkLength: chunk.length,
          remaining: output.length - copied
        }
      );
      const take = shouldUseStreamChunkTake(takeStepped.actions)
        ? streamChunkTakeFromActions(takeStepped.actions)
        : null;
      if (take === null) {
        throw new Error("RawChannelReader: missing use-take action");
      }
      output.set(chunk.subarray(0, take), copied);
      copied += take;
      if (shouldConsumeStreamChunk(take, chunk.length)) {
        this.chunks.shift();
      } else {
        this.chunks[0] = chunk.subarray(take);
      }
    }

    this.bufferLength -= copied;
    return shouldReturnStreamReadResult(copied, this.eof) ? output : null;
  }

  close(): void {
    this.channel.removeMessageHandler(this.handler);
    this.listeners.length = 0;
  }

  private append(data: Uint8Array): void {
    if (!shouldAppendStreamData(data.length)) {
      return;
    }

    this.chunks.push(Uint8Array.from(data));
    this.bufferLength += data.length;
  }
}

/** Mirrors RNS/Buffer.py RawChannelWriter. */
export class RawChannelWriter {
  static readonly MAX_CHUNK_LEN = 1024 * 16;
  private eof = false;

  constructor(
    private readonly streamId: number,
    private readonly channel: Channel
  ) {}

  async write(data: Uint8Array): Promise<number> {
    const lengthStepped = stepClampStreamDataChunkLengthWithActions(
      initialClampStreamDataChunkLengthState(),
      {
        kind: "stream/data-chunk-length-gate",
        length: data.length,
        maxDataLen: StreamDataMessage.MAX_DATA_LEN,
        maxChunkLen: RawChannelWriter.MAX_CHUNK_LEN
      }
    );
    const length = shouldUseStreamDataChunkLength(lengthStepped.actions)
      ? streamDataChunkLengthFromActions(lengthStepped.actions)
      : null;
    if (length === null) {
      throw new Error("RawChannelWriter: missing use-length action");
    }
    const chunk = data.subarray(0, length);
    const message = new StreamDataMessage({
      streamId: this.streamId,
      data: chunk,
      eof: this.eof
    });
    await this.channel.send(message);
    return chunk.length;
  }

  async close(): Promise<void> {
    this.eof = true;
    await this.write(new Uint8Array(0));
  }
}

/** Mirrors RNS/Buffer.py helper constructors. */
export class Buffer {
  static createReader(
    streamId: number,
    channel: Channel,
    readyCallback?: StreamReadyCallback
  ): RawChannelReader {
    const reader = new RawChannelReader(streamId, channel);
    if (shouldRegisterStreamReadyCallback(readyCallback !== undefined)) {
      reader.addReadyCallback(readyCallback!);
    }

    return reader;
  }

  static createWriter(streamId: number, channel: Channel): RawChannelWriter {
    return new RawChannelWriter(streamId, channel);
  }
}
