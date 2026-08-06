/**
 * Pure link keepalive probe / reply framing (1-byte payloads).
 * Pack / classify framing conclusions leave via machine actions (no ad-hoc
 * `packLinkKeepaliveProbe` / `packLinkKeepaliveReply` /
 * `isLinkKeepaliveProbe` / `isLinkKeepaliveReply` reads beside the step).
 * Initiator ignore / responder reply gates conclude via machine actions
 * (no ad-hoc `shouldIgnoreInitiatorKeepaliveProbe` /
 * `shouldReplyKeepaliveProbe` reads beside the step).
 * Timing stays in link-watchdog; send/receive stays at the adapter edge.
 */
import type { Event, Intent } from "@twistedpear/effects";

export const LINK_KEEPALIVE_PROBE_BYTE = 0xff;
export const LINK_KEEPALIVE_REPLY_BYTE = 0xfe;

export function packLinkKeepaliveProbe(): Uint8Array {
  return new Uint8Array([LINK_KEEPALIVE_PROBE_BYTE]);
}

export function packLinkKeepaliveReply(): Uint8Array {
  return new Uint8Array([LINK_KEEPALIVE_REPLY_BYTE]);
}

export function isLinkKeepaliveProbe(data: Uint8Array): boolean {
  return data.length === 1 && data[0] === LINK_KEEPALIVE_PROBE_BYTE;
}

export function isLinkKeepaliveReply(data: Uint8Array): boolean {
  return data.length === 1 && data[0] === LINK_KEEPALIVE_REPLY_BYTE;
}

/** Whether an initiator should drop an inbound keepalive-probe DATA/KEEPALIVE packet. */
export function shouldIgnoreInitiatorKeepaliveProbe(input: {
  readonly initiator: boolean;
  readonly contextKeepalive: boolean;
  readonly probePayload: boolean;
}): boolean {
  return input.initiator && input.contextKeepalive && input.probePayload;
}

/**
 * shouldIgnoreInitiatorKeepaliveProbe gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIgnoreInitiatorKeepaliveProbe` reads beside
 * the step).
 */
export type IgnoreInitiatorKeepaliveProbeState = Record<string, never>;

export type IgnoreInitiatorKeepaliveProbeEvent =
  | Event
  | {
      readonly kind: "link-keepalive/ignore-initiator-probe-gate";

      readonly initiator: boolean;
      readonly contextKeepalive: boolean;
      readonly probePayload: boolean;
    };

export type IgnoreInitiatorKeepaliveProbeAction =
  { readonly kind: "ignore" } | { readonly kind: "proceed" };

export interface IgnoreInitiatorKeepaliveProbeStepResult {
  readonly state: IgnoreInitiatorKeepaliveProbeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IgnoreInitiatorKeepaliveProbeAction[];
}

export function initialIgnoreInitiatorKeepaliveProbeState(): IgnoreInitiatorKeepaliveProbeState {
  return {};
}

export function stepIgnoreInitiatorKeepaliveProbeWithActions(
  state: IgnoreInitiatorKeepaliveProbeState,
  event: IgnoreInitiatorKeepaliveProbeEvent,
): IgnoreInitiatorKeepaliveProbeStepResult {
  if (event.kind === "link-keepalive/ignore-initiator-probe-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldIgnoreInitiatorKeepaliveProbe({
            initiator: event.initiator,
            contextKeepalive: event.contextKeepalive,
            probePayload: event.probePayload,
          })
            ? "ignore"
            : "proceed",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreInitiatorKeepaliveProbeNow(
  actions: ReadonlyArray<IgnoreInitiatorKeepaliveProbeAction>,
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldProceedInitiatorKeepaliveProbe(
  actions: ReadonlyArray<IgnoreInitiatorKeepaliveProbeAction>,
): boolean {
  return actions.some((action) => action.kind === "proceed");
}
/** Whether a responder should reply to an inbound keepalive probe. */
export function shouldReplyKeepaliveProbe(input: {
  readonly initiator: boolean;
  readonly probePayload: boolean;
}): boolean {
  return !input.initiator && input.probePayload;
}

/**
 * shouldReplyKeepaliveProbe gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReplyKeepaliveProbe` reads beside
 * the step).
 */
export type ReplyKeepaliveProbeState = Record<string, never>;

export type ReplyKeepaliveProbeEvent =
  | Event
  | {
      readonly kind: "link-keepalive/reply-probe-gate";

      readonly initiator: boolean;
      readonly probePayload: boolean;
    };

export type ReplyKeepaliveProbeAction =
  { readonly kind: "reply" } | { readonly kind: "skip" };

export interface ReplyKeepaliveProbeStepResult {
  readonly state: ReplyKeepaliveProbeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReplyKeepaliveProbeAction[];
}

export function initialReplyKeepaliveProbeState(): ReplyKeepaliveProbeState {
  return {};
}

export function stepReplyKeepaliveProbeWithActions(
  state: ReplyKeepaliveProbeState,
  event: ReplyKeepaliveProbeEvent,
): ReplyKeepaliveProbeStepResult {
  if (event.kind === "link-keepalive/reply-probe-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReplyKeepaliveProbe({
            initiator: event.initiator,
            probePayload: event.probePayload,
          })
            ? "reply"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReplyKeepaliveProbeNow(
  actions: ReadonlyArray<ReplyKeepaliveProbeAction>,
): boolean {
  return actions.some((action) => action.kind === "reply");
}

export function shouldSkipKeepaliveProbeReply(
  actions: ReadonlyArray<ReplyKeepaliveProbeAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}
/**
 * Keepalive probe pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkKeepaliveProbe`
 * reads beside the step).
 */
export type PackLinkKeepaliveProbeState = Record<string, never>;

export type PackLinkKeepaliveProbeEvent =
  Event | { readonly kind: "link-keepalive/pack-probe-gate" };

export type PackLinkKeepaliveProbeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLinkKeepaliveProbeStepResult {
  readonly state: PackLinkKeepaliveProbeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkKeepaliveProbeAction[];
}

export function initialPackLinkKeepaliveProbeState(): PackLinkKeepaliveProbeState {
  return {};
}

export function stepPackLinkKeepaliveProbeWithActions(
  state: PackLinkKeepaliveProbeState,
  event: PackLinkKeepaliveProbeEvent,
): PackLinkKeepaliveProbeStepResult {
  if (event.kind === "link-keepalive/pack-probe-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: packLinkKeepaliveProbe() }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkKeepaliveProbe(
  actions: ReadonlyArray<PackLinkKeepaliveProbeAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract packed keepalive probe from step actions; null when no `use-raw`. */
export function packLinkKeepaliveProbeRawFromActions(
  actions: ReadonlyArray<PackLinkKeepaliveProbeAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Keepalive reply pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkKeepaliveReply`
 * reads beside the step).
 */
export type PackLinkKeepaliveReplyState = Record<string, never>;

export type PackLinkKeepaliveReplyEvent =
  Event | { readonly kind: "link-keepalive/pack-reply-gate" };

export type PackLinkKeepaliveReplyAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLinkKeepaliveReplyStepResult {
  readonly state: PackLinkKeepaliveReplyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkKeepaliveReplyAction[];
}

export function initialPackLinkKeepaliveReplyState(): PackLinkKeepaliveReplyState {
  return {};
}

export function stepPackLinkKeepaliveReplyWithActions(
  state: PackLinkKeepaliveReplyState,
  event: PackLinkKeepaliveReplyEvent,
): PackLinkKeepaliveReplyStepResult {
  if (event.kind === "link-keepalive/pack-reply-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: packLinkKeepaliveReply() }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkKeepaliveReply(
  actions: ReadonlyArray<PackLinkKeepaliveReplyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract packed keepalive reply from step actions; null when no `use-raw`. */
export function packLinkKeepaliveReplyRawFromActions(
  actions: ReadonlyArray<PackLinkKeepaliveReplyAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Keepalive payload classify framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkKeepaliveProbe` /
 * `isLinkKeepaliveReply` reads beside the step). Unrecognized payloads become
 * `reject`.
 */
export type ClassifyLinkKeepaliveState = Record<string, never>;

export type ClassifyLinkKeepaliveEvent =
  | Event
  | {
      readonly kind: "link-keepalive/classify-gate";
      readonly data: Uint8Array;
    };

export type ClassifyLinkKeepaliveAction =
  | { readonly kind: "probe" }
  | { readonly kind: "reply" }
  | { readonly kind: "reject" };

export interface ClassifyLinkKeepaliveStepResult {
  readonly state: ClassifyLinkKeepaliveState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClassifyLinkKeepaliveAction[];
}

export function initialClassifyLinkKeepaliveState(): ClassifyLinkKeepaliveState {
  return {};
}

export function stepClassifyLinkKeepaliveWithActions(
  state: ClassifyLinkKeepaliveState,
  event: ClassifyLinkKeepaliveEvent,
): ClassifyLinkKeepaliveStepResult {
  if (event.kind === "link-keepalive/classify-gate") {
    if (isLinkKeepaliveProbe(event.data)) {
      return { state, intents: [], actions: [{ kind: "probe" }] };
    }
    if (isLinkKeepaliveReply(event.data)) {
      return { state, intents: [], actions: [{ kind: "reply" }] };
    }
    return { state, intents: [], actions: [{ kind: "reject" }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClassifyLinkKeepaliveProbe(
  actions: ReadonlyArray<ClassifyLinkKeepaliveAction>,
): boolean {
  return actions.some((action) => action.kind === "probe");
}

export function shouldClassifyLinkKeepaliveReply(
  actions: ReadonlyArray<ClassifyLinkKeepaliveAction>,
): boolean {
  return actions.some((action) => action.kind === "reply");
}

export function shouldRejectClassifyLinkKeepalive(
  actions: ReadonlyArray<ClassifyLinkKeepaliveAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}
