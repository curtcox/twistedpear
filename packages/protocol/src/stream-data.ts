/**
 * Pure RNS channel StreamDataMessage header framing.
 * Compression / channel IO stay at the adapter edge.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `packStreamDataMessage` / `unpackStreamDataMessage` reads beside the step).
 * Stream ready-callback unregister conclusions leave via machine actions
 * (no ad-hoc `planUnregisterStreamReadyCallback` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

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

/**
 * StreamDataMessage pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packStreamDataMessage`
 * reads beside the step). Invalid stream ids become `reject` (helper may throw).
 */
export type PackStreamDataMessageState = Record<string, never>;

export type PackStreamDataMessageEvent =
  | Event
  | {
      readonly kind: "stream-data/pack-gate";
      readonly streamId: number;
      readonly data: Uint8Array;
      readonly eof?: boolean;
      readonly compressed?: boolean;
    };

export type PackStreamDataMessageAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackStreamDataMessageStepResult {
  readonly state: PackStreamDataMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackStreamDataMessageAction[];
}

export function initialPackStreamDataMessageState(): PackStreamDataMessageState {
  return {};
}

export function stepPackStreamDataMessageWithActions(
  state: PackStreamDataMessageState,
  event: PackStreamDataMessageEvent
): PackStreamDataMessageStepResult {
  if (event.kind === "stream-data/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packStreamDataMessage({
              streamId: event.streamId,
              data: event.data,
              ...(event.eof !== undefined ? { eof: event.eof } : {}),
              ...(event.compressed !== undefined ? { compressed: event.compressed } : {})
            })
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackStreamDataMessage(
  actions: ReadonlyArray<PackStreamDataMessageAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackStreamDataMessage(
  actions: ReadonlyArray<PackStreamDataMessageAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed stream-data bytes from step actions; null when no `use-raw`. */
export function packStreamDataMessageRawFromActions(
  actions: ReadonlyArray<PackStreamDataMessageAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * StreamDataMessage unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackStreamDataMessage`
 * reads beside the step). Truncated frames become `reject` (helper may throw).
 */
export type UnpackStreamDataMessageState = Record<string, never>;

export type UnpackStreamDataMessageEvent =
  | Event
  | {
      readonly kind: "stream-data/unpack-gate";
      readonly data: Uint8Array;
    };

export type UnpackStreamDataMessageAction =
  | { readonly kind: "use-fields"; readonly fields: StreamDataFields }
  | { readonly kind: "reject" };

export interface UnpackStreamDataMessageStepResult {
  readonly state: UnpackStreamDataMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackStreamDataMessageAction[];
}

export function initialUnpackStreamDataMessageState(): UnpackStreamDataMessageState {
  return {};
}

export function stepUnpackStreamDataMessageWithActions(
  state: UnpackStreamDataMessageState,
  event: UnpackStreamDataMessageEvent
): UnpackStreamDataMessageStepResult {
  if (event.kind === "stream-data/unpack-gate") {
    try {
      const fields = unpackStreamDataMessage(event.data);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackStreamDataMessage(
  actions: ReadonlyArray<UnpackStreamDataMessageAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackStreamDataMessage(
  actions: ReadonlyArray<UnpackStreamDataMessageAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked stream-data fields from step actions; null when no `use-fields`. */
export function streamDataMessageFieldsFromActions(
  actions: ReadonlyArray<UnpackStreamDataMessageAction>
): StreamDataFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
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

/** Whether the taken bytes consume the entire front chunk (shift vs residual slice). */
export function shouldConsumeStreamChunk(take: number, chunkLength: number): boolean {
  return take === chunkLength;
}

/** Whether an inbound stream-data message should mark the reader EOF. */
export function shouldMarkStreamEof(eof: boolean): boolean {
  return eof;
}

/** Whether a stream id has been assigned for packing. */
export function isStreamIdAssigned(streamIdPresent: boolean): boolean {
  return streamIdPresent;
}

/** Whether an inbound stream-data message belongs to this reader. */
export function shouldHandleStreamDataMessage(input: {
  readonly messageStreamId: number | null;
  readonly expectedStreamId: number;
}): boolean {
  return input.messageStreamId === input.expectedStreamId;
}

/** Whether createReader should register an optional ready-callback. */
export function shouldRegisterStreamReadyCallback(callbackPresent: boolean): boolean {
  return callbackPresent;
}

/**
 * Unregister a stream ready-callback: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterStreamReadyCallback(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterStreamReadyCallback}. */
export function shouldUnregisterStreamReadyCallback(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Stream ready-callback unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterStreamReadyCallback` reads beside the step).
 */
export type StreamReadyCallbackUnregisterState = Record<string, never>;

export type StreamReadyCallbackUnregisterEvent =
  | Event
  | {
      readonly kind: "stream/ready-callback-unregister-gate";
      readonly index: number;
    };

export type StreamReadyCallbackUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface StreamReadyCallbackUnregisterStepResult {
  readonly state: StreamReadyCallbackUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadyCallbackUnregisterAction[];
}

export function initialStreamReadyCallbackUnregisterState(): StreamReadyCallbackUnregisterState {
  return {};
}

export function stepStreamReadyCallbackUnregisterWithActions(
  state: StreamReadyCallbackUnregisterState,
  event: StreamReadyCallbackUnregisterEvent
): StreamReadyCallbackUnregisterStepResult {
  if (event.kind === "stream/ready-callback-unregister-gate") {
    const index = planUnregisterStreamReadyCallback(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function streamReadyCallbackUnregisterIndex(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemoveStreamReadyCallback(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}
