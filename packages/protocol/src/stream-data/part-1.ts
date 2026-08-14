/** Extracted from stream-data.ts; the original module remains the public composition point. */
/**
 * Pure RNS channel StreamDataMessage header framing.
 * Compression / channel IO stay at the adapter edge.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `packStreamDataMessage` / `unpackStreamDataMessage` reads beside the step).
 * Stream ready-callback unregister conclusions leave via machine actions
 * (no ad-hoc `planUnregisterStreamReadyCallback` reads beside the step).
 * Unregister plan nested via {@link stepStreamReadyCallbackUnregisterPlanWithActions}.
 * Write chunk-length / read-size / chunk-take clamp conclusions leave via
 * machine actions (no ad-hoc `clampStreamDataChunkLength` /
 * `clampStreamReadSize` / `clampStreamChunkTake` reads beside the step).
 * Append / read-defer / read-return / chunk-consume / eof-mark / stream-id /
 * message-handle / ready-callback-register conclusions leave via machine
 * actions (no ad-hoc `shouldAppendStreamData` / `shouldDeferStreamRead` /
 * `shouldReturnStreamReadResult` / `shouldConsumeStreamChunk` /
 * `shouldMarkStreamEof` / `isStreamIdAssigned` /
 * `shouldHandleStreamDataMessage` / `shouldRegisterStreamReadyCallback`
 * reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";

export const STREAM_DATA_HEADER_SIZE = 2;
export const STREAM_ID_MAX = 0x3fff;
export const STREAM_DATA_FLAG_EOF = 0x8000;
export const STREAM_DATA_FLAG_COMPRESSED = 0x4000;

/** Mirrors RNS/Buffer.py StreamDataMessage system message type. */
export const STREAM_DATA_MSGTYPE = 0xff00;

export const StreamSystemMessageTypes = {
  SMT_STREAM_DATA: STREAM_DATA_MSGTYPE,
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
    data: raw.subarray(STREAM_DATA_HEADER_SIZE),
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
  event: PackStreamDataMessageEvent,
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
              ...(event.compressed !== undefined
                ? { compressed: event.compressed }
                : {}),
            }),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackStreamDataMessage(
  actions: ReadonlyArray<PackStreamDataMessageAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectPackStreamDataMessage(
  actions: ReadonlyArray<PackStreamDataMessageAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract packed stream-data bytes from step actions; null when no `use-raw`. */
export function packStreamDataMessageRawFromActions(
  actions: ReadonlyArray<PackStreamDataMessageAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
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
  event: UnpackStreamDataMessageEvent,
): UnpackStreamDataMessageStepResult {
  if (event.kind === "stream-data/unpack-gate") {
    try {
      const fields = unpackStreamDataMessage(event.data);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackStreamDataMessage(
  actions: ReadonlyArray<UnpackStreamDataMessageAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectUnpackStreamDataMessage(
  actions: ReadonlyArray<UnpackStreamDataMessageAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract unpacked stream-data fields from step actions; null when no `use-fields`. */
export function streamDataMessageFieldsFromActions(
  actions: ReadonlyArray<UnpackStreamDataMessageAction>,
): StreamDataFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

/** Clamp a write buffer to stream max data length and writer max chunk length. */
export function clampStreamDataChunkLength(
  length: number,
  maxDataLen: number,
  maxChunkLen: number,
): number {
  return Math.min(length, maxDataLen, maxChunkLen);
}

/**
 * Stream write chunk-length clamp is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `clampStreamDataChunkLength`
 * reads beside the step).
 */
export type ClampStreamDataChunkLengthState = Record<string, never>;

export type ClampStreamDataChunkLengthEvent =
  | Event
  | {
      readonly kind: "stream/data-chunk-length-gate";
      readonly length: number;
      readonly maxDataLen: number;
      readonly maxChunkLen: number;
    };

export type ClampStreamDataChunkLengthAction = {
  readonly kind: "use-length";
  readonly length: number;
};

export interface ClampStreamDataChunkLengthStepResult {
  readonly state: ClampStreamDataChunkLengthState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClampStreamDataChunkLengthAction[];
}

export function initialClampStreamDataChunkLengthState(): ClampStreamDataChunkLengthState {
  return {};
}

export function stepClampStreamDataChunkLengthWithActions(
  state: ClampStreamDataChunkLengthState,
  event: ClampStreamDataChunkLengthEvent,
): ClampStreamDataChunkLengthStepResult {
  if (event.kind === "stream/data-chunk-length-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-length",
          length: clampStreamDataChunkLength(
            event.length,
            event.maxDataLen,
            event.maxChunkLen,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStreamDataChunkLength(
  actions: ReadonlyArray<ClampStreamDataChunkLengthAction>,
): boolean {
  return hasActionOfKind(actions, "use-length");
}

/** Extract clamped write chunk length from step actions; null when no `use-length`. */
export function streamDataChunkLengthFromActions(
  actions: ReadonlyArray<ClampStreamDataChunkLengthAction>,
): number | null {
  return firstActionOfKind(actions, "use-length")?.length ?? null;
}

/** Whether inbound stream payload bytes should be appended to the reader buffer. */
export function shouldAppendStreamData(length: number): boolean {
  return length > 0;
}

/**
 * Stream append gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAppendStreamData`
 * reads beside the step).
 */
export type AppendStreamDataState = Record<string, never>;

export type AppendStreamDataEvent =
  | Event
  | {
      readonly kind: "stream/append-gate";
      readonly length: number;
    };

export type AppendStreamDataAction =
  { readonly kind: "append" } | { readonly kind: "skip" };

export interface AppendStreamDataStepResult {
  readonly state: AppendStreamDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AppendStreamDataAction[];
}

export function initialAppendStreamDataState(): AppendStreamDataState {
  return {};
}

export function stepAppendStreamDataWithActions(
  state: AppendStreamDataState,
  event: AppendStreamDataEvent,
): AppendStreamDataStepResult {
  if (event.kind === "stream/append-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: shouldAppendStreamData(event.length) ? "append" : "skip" },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldPerformStreamAppend(
  actions: ReadonlyArray<AppendStreamDataAction>,
): boolean {
  return hasActionOfKind(actions, "append");
}

export function shouldSkipStreamAppend(
  actions: ReadonlyArray<AppendStreamDataAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Clamp a reader request size to available buffered bytes. */
export function clampStreamReadSize(
  size: number,
  bufferLength: number,
): number {
  return Math.min(size, bufferLength);
}

/**
 * Stream read-size clamp is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `clampStreamReadSize`
 * reads beside the step).
 */
export type ClampStreamReadSizeState = Record<string, never>;

export type ClampStreamReadSizeEvent =
  | Event
  | {
      readonly kind: "stream/read-size-gate";
      readonly size: number;
      readonly bufferLength: number;
    };

export type ClampStreamReadSizeAction = {
  readonly kind: "use-size";
  readonly size: number;
};

export interface ClampStreamReadSizeStepResult {
  readonly state: ClampStreamReadSizeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClampStreamReadSizeAction[];
}

export function initialClampStreamReadSizeState(): ClampStreamReadSizeState {
  return {};
}

export function stepClampStreamReadSizeWithActions(
  state: ClampStreamReadSizeState,
  event: ClampStreamReadSizeEvent,
): ClampStreamReadSizeStepResult {
  if (event.kind === "stream/read-size-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-size",
          size: clampStreamReadSize(event.size, event.bufferLength),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStreamReadSize(
  actions: ReadonlyArray<ClampStreamReadSizeAction>,
): boolean {
  return hasActionOfKind(actions, "use-size");
}

/** Extract clamped read size from step actions; null when no `use-size`. */
export function streamReadSizeFromActions(
  actions: ReadonlyArray<ClampStreamReadSizeAction>,
): number | null {
  return firstActionOfKind(actions, "use-size")?.size ?? null;
}

/** Whether a read should wait for more data (empty buffer before EOF). */
export function shouldDeferStreamRead(
  bufferLength: number,
  eof: boolean,
): boolean {
  return bufferLength === 0 && !eof;
}

/**
 * Stream read-defer gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDeferStreamRead`
 * reads beside the step).
 */
export type StreamReadDeferState = Record<string, never>;
