import { Channel, type ChannelMessage } from "./channel.js";

/** Mirrors RNS/Buffer.py StreamDataMessage system message type. */
export const SystemMessageTypes = {
  SMT_STREAM_DATA: 0xff00
} as const;

/** Mirrors RNS/Buffer.py StreamDataMessage. */
export class StreamDataMessage implements ChannelMessage {
  static readonly MSGTYPE = SystemMessageTypes.SMT_STREAM_DATA;
  readonly MSGTYPE = StreamDataMessage.MSGTYPE;

  static readonly STREAM_ID_MAX = 0x3fff;
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
    if (this.streamId === null) {
      throw new Error("stream_id is required");
    }

    let headerValue = this.streamId & 0x3fff;
    if (this.eof) {
      headerValue |= 0x8000;
    }

    if (this.compressed) {
      headerValue |= 0x4000;
    }

    const header = new Uint8Array(2);
    const view = new DataView(header.buffer);
    view.setUint16(0, headerValue, false);
    return concatBytes(header, this.data);
  }

  unpack(raw: Uint8Array): void {
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const headerValue = view.getUint16(0, false);
    this.eof = (headerValue & 0x8000) > 0;
    this.compressed = (headerValue & 0x4000) > 0;
    this.streamId = headerValue & 0x3fff;
    this.data = raw.subarray(2);
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
      if (!(message instanceof StreamDataMessage) || message.streamId !== this.streamId) {
        return false;
      }

      if (message.data.length > 0) {
        this.append(message.data);
      }

      if (message.eof) {
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
    const index = this.listeners.indexOf(callback);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  read(size: number): Uint8Array | null {
    if (this.bufferLength === 0 && !this.eof) {
      return null;
    }

    const output = new Uint8Array(Math.min(size, this.bufferLength));
    let copied = 0;
    while (copied < output.length && this.chunks.length > 0) {
      const chunk = this.chunks[0]!;
      const take = Math.min(chunk.length, output.length - copied);
      output.set(chunk.subarray(0, take), copied);
      copied += take;
      if (take === chunk.length) {
        this.chunks.shift();
      } else {
        this.chunks[0] = chunk.subarray(take);
      }
    }

    this.bufferLength -= copied;
    return copied > 0 || this.eof ? output : null;
  }

  close(): void {
    this.channel.removeMessageHandler(this.handler);
    this.listeners.length = 0;
  }

  private append(data: Uint8Array): void {
    if (data.length === 0) {
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
    const chunk = data.subarray(0, Math.min(data.length, StreamDataMessage.MAX_DATA_LEN, RawChannelWriter.MAX_CHUNK_LEN));
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
    if (readyCallback !== undefined) {
      reader.addReadyCallback(readyCallback);
    }

    return reader;
  }

  static createWriter(streamId: number, channel: Channel): RawChannelWriter {
    return new RawChannelWriter(streamId, channel);
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
