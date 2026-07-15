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
  event: ClampStreamDataChunkLengthEvent
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
            event.maxChunkLen
          )
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStreamDataChunkLength(
  actions: ReadonlyArray<ClampStreamDataChunkLengthAction>
): boolean {
  return actions.some((action) => action.kind === "use-length");
}

/** Extract clamped write chunk length from step actions; null when no `use-length`. */
export function streamDataChunkLengthFromActions(
  actions: ReadonlyArray<ClampStreamDataChunkLengthAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-length");
  return action?.kind === "use-length" ? action.length : null;
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
  | { readonly kind: "append" }
  | { readonly kind: "skip" };

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
  event: AppendStreamDataEvent
): AppendStreamDataStepResult {
  if (event.kind === "stream/append-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: shouldAppendStreamData(event.length) ? "append" : "skip" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldPerformStreamAppend(
  actions: ReadonlyArray<AppendStreamDataAction>
): boolean {
  return actions.some((action) => action.kind === "append");
}

export function shouldSkipStreamAppend(
  actions: ReadonlyArray<AppendStreamDataAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Clamp a reader request size to available buffered bytes. */
export function clampStreamReadSize(size: number, bufferLength: number): number {
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
  event: ClampStreamReadSizeEvent
): ClampStreamReadSizeStepResult {
  if (event.kind === "stream/read-size-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-size",
          size: clampStreamReadSize(event.size, event.bufferLength)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStreamReadSize(
  actions: ReadonlyArray<ClampStreamReadSizeAction>
): boolean {
  return actions.some((action) => action.kind === "use-size");
}

/** Extract clamped read size from step actions; null when no `use-size`. */
export function streamReadSizeFromActions(
  actions: ReadonlyArray<ClampStreamReadSizeAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-size");
  return action?.kind === "use-size" ? action.size : null;
}

/** Whether a read should wait for more data (empty buffer before EOF). */
export function shouldDeferStreamRead(bufferLength: number, eof: boolean): boolean {
  return bufferLength === 0 && !eof;
}

/**
 * Stream read-defer gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDeferStreamRead`
 * reads beside the step).
 */
export type StreamReadDeferState = Record<string, never>;

export type StreamReadDeferEvent =
  | Event
  | {
      readonly kind: "stream/read-defer-gate";
      readonly bufferLength: number;
      readonly eof: boolean;
    };

export type StreamReadDeferAction =
  | { readonly kind: "defer" }
  | { readonly kind: "proceed" };

export interface StreamReadDeferStepResult {
  readonly state: StreamReadDeferState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadDeferAction[];
}

export function initialStreamReadDeferState(): StreamReadDeferState {
  return {};
}

export function stepStreamReadDeferWithActions(
  state: StreamReadDeferState,
  event: StreamReadDeferEvent
): StreamReadDeferStepResult {
  if (event.kind === "stream/read-defer-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDeferStreamRead(event.bufferLength, event.eof) ? "defer" : "proceed"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldStreamReadDefer(
  actions: ReadonlyArray<StreamReadDeferAction>
): boolean {
  return actions.some((action) => action.kind === "defer");
}

export function shouldStreamReadProceed(
  actions: ReadonlyArray<StreamReadDeferAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

/** Whether a read produced a returnable buffer (bytes copied or EOF empty result). */
export function shouldReturnStreamReadResult(copied: number, eof: boolean): boolean {
  return copied > 0 || eof;
}

/**
 * Stream read-return gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReturnStreamReadResult`
 * reads beside the step).
 */
export type StreamReadReturnState = Record<string, never>;

export type StreamReadReturnEvent =
  | Event
  | {
      readonly kind: "stream/read-return-gate";
      readonly copied: number;
      readonly eof: boolean;
    };

export type StreamReadReturnAction =
  | { readonly kind: "yield" }
  | { readonly kind: "skip" };

export interface StreamReadReturnStepResult {
  readonly state: StreamReadReturnState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadReturnAction[];
}

export function initialStreamReadReturnState(): StreamReadReturnState {
  return {};
}

export function stepStreamReadReturnWithActions(
  state: StreamReadReturnState,
  event: StreamReadReturnEvent
): StreamReadReturnStepResult {
  if (event.kind === "stream/read-return-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReturnStreamReadResult(event.copied, event.eof) ? "yield" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldYieldStreamRead(
  actions: ReadonlyArray<StreamReadReturnAction>
): boolean {
  return actions.some((action) => action.kind === "yield");
}

export function shouldSkipStreamReadYield(
  actions: ReadonlyArray<StreamReadReturnAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Bytes to take from the current chunk into the remaining read window. */
export function clampStreamChunkTake(chunkLength: number, remaining: number): number {
  return Math.min(chunkLength, remaining);
}

/**
 * Stream chunk-take clamp is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `clampStreamChunkTake`
 * reads beside the step).
 */
export type ClampStreamChunkTakeState = Record<string, never>;

export type ClampStreamChunkTakeEvent =
  | Event
  | {
      readonly kind: "stream/chunk-take-gate";
      readonly chunkLength: number;
      readonly remaining: number;
    };

export type ClampStreamChunkTakeAction = {
  readonly kind: "use-take";
  readonly take: number;
};

export interface ClampStreamChunkTakeStepResult {
  readonly state: ClampStreamChunkTakeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClampStreamChunkTakeAction[];
}

export function initialClampStreamChunkTakeState(): ClampStreamChunkTakeState {
  return {};
}

export function stepClampStreamChunkTakeWithActions(
  state: ClampStreamChunkTakeState,
  event: ClampStreamChunkTakeEvent
): ClampStreamChunkTakeStepResult {
  if (event.kind === "stream/chunk-take-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-take",
          take: clampStreamChunkTake(event.chunkLength, event.remaining)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStreamChunkTake(
  actions: ReadonlyArray<ClampStreamChunkTakeAction>
): boolean {
  return actions.some((action) => action.kind === "use-take");
}

/** Extract clamped chunk take from step actions; null when no `use-take`. */
export function streamChunkTakeFromActions(
  actions: ReadonlyArray<ClampStreamChunkTakeAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-take");
  return action?.kind === "use-take" ? action.take : null;
}

/** Whether the taken bytes consume the entire front chunk (shift vs residual slice). */
export function shouldConsumeStreamChunk(take: number, chunkLength: number): boolean {
  return take === chunkLength;
}

/**
 * Stream chunk-consume gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldConsumeStreamChunk`
 * reads beside the step).
 */
export type StreamChunkConsumeState = Record<string, never>;

export type StreamChunkConsumeEvent =
  | Event
  | {
      readonly kind: "stream/chunk-consume-gate";
      readonly take: number;
      readonly chunkLength: number;
    };

export type StreamChunkConsumeAction =
  | { readonly kind: "consume" }
  | { readonly kind: "residual" };

export interface StreamChunkConsumeStepResult {
  readonly state: StreamChunkConsumeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamChunkConsumeAction[];
}

export function initialStreamChunkConsumeState(): StreamChunkConsumeState {
  return {};
}

export function stepStreamChunkConsumeWithActions(
  state: StreamChunkConsumeState,
  event: StreamChunkConsumeEvent
): StreamChunkConsumeStepResult {
  if (event.kind === "stream/chunk-consume-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldConsumeStreamChunk(event.take, event.chunkLength)
            ? "consume"
            : "residual"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldStreamChunkConsume(
  actions: ReadonlyArray<StreamChunkConsumeAction>
): boolean {
  return actions.some((action) => action.kind === "consume");
}

export function shouldStreamChunkResidual(
  actions: ReadonlyArray<StreamChunkConsumeAction>
): boolean {
  return actions.some((action) => action.kind === "residual");
}

/** Whether an inbound stream-data message should mark the reader EOF. */
export function shouldMarkStreamEof(eof: boolean): boolean {
  return eof;
}

/**
 * Stream EOF-mark gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldMarkStreamEof`
 * reads beside the step).
 */
export type StreamEofMarkState = Record<string, never>;

export type StreamEofMarkEvent =
  | Event
  | {
      readonly kind: "stream/eof-mark-gate";
      readonly eof: boolean;
    };

export type StreamEofMarkAction =
  | { readonly kind: "mark" }
  | { readonly kind: "skip" };

export interface StreamEofMarkStepResult {
  readonly state: StreamEofMarkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamEofMarkAction[];
}

export function initialStreamEofMarkState(): StreamEofMarkState {
  return {};
}

export function stepStreamEofMarkWithActions(
  state: StreamEofMarkState,
  event: StreamEofMarkEvent
): StreamEofMarkStepResult {
  if (event.kind === "stream/eof-mark-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: shouldMarkStreamEof(event.eof) ? "mark" : "skip" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldStreamEofMark(
  actions: ReadonlyArray<StreamEofMarkAction>
): boolean {
  return actions.some((action) => action.kind === "mark");
}

export function shouldSkipStreamEofMark(
  actions: ReadonlyArray<StreamEofMarkAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a stream id has been assigned for packing. */
export function isStreamIdAssigned(streamIdPresent: boolean): boolean {
  return streamIdPresent;
}

/**
 * Stream-id assigned gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isStreamIdAssigned`
 * reads beside the step).
 */
export type StreamIdAssignedState = Record<string, never>;

export type StreamIdAssignedEvent =
  | Event
  | {
      readonly kind: "stream/id-assigned-gate";
      readonly streamIdPresent: boolean;
    };

export type StreamIdAssignedAction =
  | { readonly kind: "assigned" }
  | { readonly kind: "unassigned" };

export interface StreamIdAssignedStepResult {
  readonly state: StreamIdAssignedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamIdAssignedAction[];
}

export function initialStreamIdAssignedState(): StreamIdAssignedState {
  return {};
}

export function stepStreamIdAssignedWithActions(
  state: StreamIdAssignedState,
  event: StreamIdAssignedEvent
): StreamIdAssignedStepResult {
  if (event.kind === "stream/id-assigned-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isStreamIdAssigned(event.streamIdPresent) ? "assigned" : "unassigned"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldStreamIdAssigned(
  actions: ReadonlyArray<StreamIdAssignedAction>
): boolean {
  return actions.some((action) => action.kind === "assigned");
}

export function shouldStreamIdUnassigned(
  actions: ReadonlyArray<StreamIdAssignedAction>
): boolean {
  return actions.some((action) => action.kind === "unassigned");
}

/** Whether an inbound stream-data message belongs to this reader. */
export function shouldHandleStreamDataMessage(input: {
  readonly messageStreamId: number | null;
  readonly expectedStreamId: number;
}): boolean {
  return input.messageStreamId === input.expectedStreamId;
}

/**
 * Stream-data message handle gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandleStreamDataMessage`
 * reads beside the step).
 */
export type StreamDataMessageHandleState = Record<string, never>;

export type StreamDataMessageHandleEvent =
  | Event
  | {
      readonly kind: "stream/data-message-handle-gate";
      readonly messageStreamId: number | null;
      readonly expectedStreamId: number;
    };

export type StreamDataMessageHandleAction =
  | { readonly kind: "handle" }
  | { readonly kind: "ignore" };

export interface StreamDataMessageHandleStepResult {
  readonly state: StreamDataMessageHandleState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamDataMessageHandleAction[];
}

export function initialStreamDataMessageHandleState(): StreamDataMessageHandleState {
  return {};
}

export function stepStreamDataMessageHandleWithActions(
  state: StreamDataMessageHandleState,
  event: StreamDataMessageHandleEvent
): StreamDataMessageHandleStepResult {
  if (event.kind === "stream/data-message-handle-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldHandleStreamDataMessage({
            messageStreamId: event.messageStreamId,
            expectedStreamId: event.expectedStreamId
          })
            ? "handle"
            : "ignore"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldHandleStreamDataMessageNow(
  actions: ReadonlyArray<StreamDataMessageHandleAction>
): boolean {
  return actions.some((action) => action.kind === "handle");
}

export function shouldIgnoreStreamDataMessage(
  actions: ReadonlyArray<StreamDataMessageHandleAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

/** Whether createReader should register an optional ready-callback. */
export function shouldRegisterStreamReadyCallback(callbackPresent: boolean): boolean {
  return callbackPresent;
}

/**
 * Stream ready-callback register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterStreamReadyCallback` reads beside the step).
 */
export type StreamReadyCallbackRegisterState = Record<string, never>;

export type StreamReadyCallbackRegisterEvent =
  | Event
  | {
      readonly kind: "stream/ready-callback-register-gate";
      readonly callbackPresent: boolean;
    };

export type StreamReadyCallbackRegisterAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export interface StreamReadyCallbackRegisterStepResult {
  readonly state: StreamReadyCallbackRegisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadyCallbackRegisterAction[];
}

export function initialStreamReadyCallbackRegisterState(): StreamReadyCallbackRegisterState {
  return {};
}

export function stepStreamReadyCallbackRegisterWithActions(
  state: StreamReadyCallbackRegisterState,
  event: StreamReadyCallbackRegisterEvent
): StreamReadyCallbackRegisterStepResult {
  if (event.kind === "stream/ready-callback-register-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterStreamReadyCallback(event.callbackPresent)
            ? "register"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterStreamReadyNow(
  actions: ReadonlyArray<StreamReadyCallbackRegisterAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipStreamReadyRegister(
  actions: ReadonlyArray<StreamReadyCallbackRegisterAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
 * Stream ready-callback unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterStreamReadyCallback` reads beside the step). Nested under
 * {@link stepStreamReadyCallbackUnregisterWithActions}.
 */
export type StreamReadyCallbackUnregisterPlanState = Record<string, never>;

export type StreamReadyCallbackUnregisterPlanEvent =
  | Event
  | {
      readonly kind: "stream/ready-callback-unregister-plan-gate";
      readonly index: number;
    };

export type StreamReadyCallbackUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface StreamReadyCallbackUnregisterPlanStepResult {
  readonly state: StreamReadyCallbackUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadyCallbackUnregisterPlanAction[];
}

export function initialStreamReadyCallbackUnregisterPlanState(): StreamReadyCallbackUnregisterPlanState {
  return {};
}

export function stepStreamReadyCallbackUnregisterPlanWithActions(
  state: StreamReadyCallbackUnregisterPlanState,
  event: StreamReadyCallbackUnregisterPlanEvent
): StreamReadyCallbackUnregisterPlanStepResult {
  if (event.kind === "stream/ready-callback-unregister-plan-gate") {
    const index = planUnregisterStreamReadyCallback(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function streamReadyCallbackUnregisterPlanIndex(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterPlanAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemoveStreamReadyCallbackUnregisterPlan(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterPlanAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/**
 * Stream ready-callback unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterStreamReadyCallback` reads beside the step).
 * Plan nested via {@link stepStreamReadyCallbackUnregisterPlanWithActions}
 * (`remove`).
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
    const planActions = stepStreamReadyCallbackUnregisterPlanWithActions(
      initialStreamReadyCallbackUnregisterPlanState(),
      {
        kind: "stream/ready-callback-unregister-plan-gate",
        index: event.index
      }
    ).actions;
    const index = streamReadyCallbackUnregisterPlanIndex(planActions);
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
