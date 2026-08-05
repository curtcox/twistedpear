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
import { shouldDeferStreamRead } from "./part-1.js";
import type { StreamReadDeferState } from "./part-1.js";
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
