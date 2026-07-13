/**
 * Pure RNS channel StreamDataMessage header framing.
 * Compression / channel IO stay at the adapter edge.
 */

export const STREAM_DATA_HEADER_SIZE = 2;
export const STREAM_ID_MAX = 0x3fff;
export const STREAM_DATA_FLAG_EOF = 0x8000;
export const STREAM_DATA_FLAG_COMPRESSED = 0x4000;

/** Mirrors RNS/Buffer.py StreamDataMessage system message type. */
export const STREAM_DATA_MSGTYPE = 0xff00;

export const StreamSystemMessageTypes = {
  SMT_STREAM_DATA: STREAM_DATA_MSGTYPE
} as const;

export type StreamSystemMessageTypeValue =
  (typeof StreamSystemMessageTypes)[keyof typeof StreamSystemMessageTypes];

export interface StreamDataFields {
  readonly streamId: number;
  readonly data: Uint8Array;
  readonly eof: boolean;
  readonly compressed: boolean;
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

export function packStreamDataMessage(fields: {
  readonly streamId: number;
  readonly data: Uint8Array;
  readonly eof?: boolean;
  readonly compressed?: boolean;
}): Uint8Array {
  if (fields.streamId < 0 || fields.streamId > STREAM_ID_MAX) {
    throw new Error(`stream_id must be between 0 and ${STREAM_ID_MAX}`);
  }

  let headerValue = fields.streamId & STREAM_ID_MAX;
  if (fields.eof === true) {
    headerValue |= STREAM_DATA_FLAG_EOF;
  }
  if (fields.compressed === true) {
    headerValue |= STREAM_DATA_FLAG_COMPRESSED;
  }

  const header = new Uint8Array(STREAM_DATA_HEADER_SIZE);
  const view = new DataView(header.buffer);
  view.setUint16(0, headerValue, false);
  return concatBytes(header, fields.data);
}

export function unpackStreamDataMessage(raw: Uint8Array): StreamDataFields {
  if (raw.length < STREAM_DATA_HEADER_SIZE) {
    throw new Error("StreamDataMessage is truncated");
  }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const headerValue = view.getUint16(0, false);
  return {
    eof: (headerValue & STREAM_DATA_FLAG_EOF) > 0,
    compressed: (headerValue & STREAM_DATA_FLAG_COMPRESSED) > 0,
    streamId: headerValue & STREAM_ID_MAX,
    data: raw.subarray(STREAM_DATA_HEADER_SIZE)
  };
}

/** Clamp a write buffer to stream max data length and writer max chunk length. */
export function clampStreamDataChunkLength(
  length: number,
  maxDataLen: number,
  maxChunkLen: number
): number {
  return Math.min(length, maxDataLen, maxChunkLen);
}

/** Whether inbound stream payload bytes should be appended to the reader buffer. */
export function shouldAppendStreamData(length: number): boolean {
  return length > 0;
}

/** Clamp a reader request size to available buffered bytes. */
export function clampStreamReadSize(size: number, bufferLength: number): number {
  return Math.min(size, bufferLength);
}

/** Whether a read should wait for more data (empty buffer before EOF). */
export function shouldDeferStreamRead(bufferLength: number, eof: boolean): boolean {
  return bufferLength === 0 && !eof;
}

/** Whether a read produced a returnable buffer (bytes copied or EOF empty result). */
export function shouldReturnStreamReadResult(copied: number, eof: boolean): boolean {
  return copied > 0 || eof;
}

/** Bytes to take from the current chunk into the remaining read window. */
export function clampStreamChunkTake(chunkLength: number, remaining: number): number {
  return Math.min(chunkLength, remaining);
}
