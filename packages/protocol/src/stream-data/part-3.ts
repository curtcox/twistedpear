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
import type { StreamDataMessageHandleAction } from "./part-2.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function shouldHandleStreamDataMessageNow(
  actions: ReadonlyArray<StreamDataMessageHandleAction>,
): boolean {
  return hasActionOfKind(actions, "handle");
}

export function shouldIgnoreStreamDataMessage(
  actions: ReadonlyArray<StreamDataMessageHandleAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

/** Whether createReader should register an optional ready-callback. */
export function shouldRegisterStreamReadyCallback(
  callbackPresent: boolean,
): boolean {
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
  { readonly kind: "register" } | { readonly kind: "skip" };

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
  event: StreamReadyCallbackRegisterEvent,
): StreamReadyCallbackRegisterStepResult {
  if (event.kind === "stream/ready-callback-register-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterStreamReadyCallback(event.callbackPresent)
            ? "register"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterStreamReadyNow(
  actions: ReadonlyArray<StreamReadyCallbackRegisterAction>,
): boolean {
  return hasActionOfKind(actions, "register");
}

export function shouldSkipStreamReadyRegister(
  actions: ReadonlyArray<StreamReadyCallbackRegisterAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Unregister a stream ready-callback: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterStreamReadyCallback(
  index: number,
): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterStreamReadyCallback}. */
export function shouldUnregisterStreamReadyCallback(
  indexPresent: boolean,
): boolean {
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
  event: StreamReadyCallbackUnregisterPlanEvent,
): StreamReadyCallbackUnregisterPlanStepResult {
  if (event.kind === "stream/ready-callback-unregister-plan-gate") {
    const index = planUnregisterStreamReadyCallback(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function streamReadyCallbackUnregisterPlanIndex(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterPlanAction>,
): number | null {
  return firstActionOfKind(actions, "remove")?.index ?? null;
}

export function shouldRemoveStreamReadyCallbackUnregisterPlan(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterPlanAction>,
): boolean {
  return hasActionOfKind(actions, "remove");
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
  event: StreamReadyCallbackUnregisterEvent,
): StreamReadyCallbackUnregisterStepResult {
  if (event.kind === "stream/ready-callback-unregister-gate") {
    const planActions = stepStreamReadyCallbackUnregisterPlanWithActions(
      initialStreamReadyCallbackUnregisterPlanState(),
      {
        kind: "stream/ready-callback-unregister-plan-gate",
        index: event.index,
      },
    ).actions;
    const index = streamReadyCallbackUnregisterPlanIndex(planActions);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function streamReadyCallbackUnregisterIndex(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterAction>,
): number | null {
  return firstActionOfKind(actions, "remove")?.index ?? null;
}

export function shouldRemoveStreamReadyCallback(
  actions: ReadonlyArray<StreamReadyCallbackUnregisterAction>,
): boolean {
  return hasActionOfKind(actions, "remove");
}
