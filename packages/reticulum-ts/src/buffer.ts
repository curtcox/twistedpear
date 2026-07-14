import {
  STREAM_ID_MAX as PROTOCOL_STREAM_ID_MAX,
  StreamSystemMessageTypes,
  clampStreamChunkTake,
  clampStreamDataChunkLength,
  clampStreamReadSize,
  isStreamIdAssigned,
  packStreamDataMessage,
  planUnregisterStreamReadyCallback,
  shouldAppendStreamData,
  shouldConsumeStreamChunk,
  shouldDeferStreamRead,
  shouldHandleStreamDataMessage,
  shouldMarkStreamEof,
  shouldRegisterStreamReadyCallback,
  shouldReturnStreamReadResult,
  unpackStreamDataMessage
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

    return packStreamDataMessage({
      streamId: this.streamId!,
      data: this.data,
      eof: this.eof,
      compressed: this.compressed
    });
  }

  unpack(raw: Uint8Array): void {
    const fields = unpackStreamDataMessage(raw);
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
    const index = planUnregisterStreamReadyCallback(this.listeners.indexOf(callback));
    if (index !== null) {
      this.listeners.splice(index, 1);
    }
  }

  read(size: number): Uint8Array | null {
    if (shouldDeferStreamRead(this.bufferLength, this.eof)) {
      return null;
    }

    const output = new Uint8Array(clampStreamReadSize(size, this.bufferLength));
    let copied = 0;
    while (copied < output.length && this.chunks.length > 0) {
      const chunk = this.chunks[0]!;
      const take = clampStreamChunkTake(chunk.length, output.length - copied);
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
    const chunk = data.subarray(
      0,
      clampStreamDataChunkLength(data.length, StreamDataMessage.MAX_DATA_LEN, RawChannelWriter.MAX_CHUNK_LEN)
    );
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
