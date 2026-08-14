/** Extracted from transport-announce.ts; the original module remains the public composition point. */
/**
 * Pure transport announce / path-response / hop-clone field planning.
 * Packet construction and identity hashing stay at the adapter edge.
 * Announce ingress gate conclusions leave via machine actions (no ad-hoc
 * `planAnnounceIngressGates` reads beside the step). Hop-clone / transport
 * announce / path-response field conclusions leave via machine actions
 * (no ad-hoc `planClonePacketWithHops` / `planTransportAnnounceFields` /
 * `planPathResponseAnnounceFields` reads beside the step). Hop-clone /
 * transport-announce plans nest via
 * {@link stepClonePacketWithHopsPlanWithActions} /
 * {@link stepTransportAnnounceFieldsPlanWithActions} /
 * {@link stepPathResponseAnnounceFieldsPlanWithActions} (`use-fields`).
 * Announce ingress plan nested via
 * {@link stepAnnounceIngressGatesPlanWithActions} (`use-gates`).
 * Local-announce
 * ignore / handler dispatch / PATH_RESPONSE receive / aspect-filter match
 * conclusions leave via machine actions (no ad-hoc
 * `shouldIgnoreLocalAnnounce` / `canDispatchAnnounceHandlers` /
 * `shouldReceiveAnnouncePathResponse` / `shouldMatchAnnounceAspect` /
 * `shouldAcceptCachedPathResponsePacket` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { PACKET_CONTEXT_PATH_RESPONSE } from "../packet-context.js";
import { type PacketHeaderFields } from "../packet-header.js";
import {
  pathResponseAnnounceFieldsPlanFromActions,
  planPathResponseAnnounceFields,
} from "./part-1.js";
import type {
  PathResponseAnnounceFieldsAction,
  PathResponseAnnounceFieldsEvent,
  PathResponseAnnounceFieldsPlanAction,
  PathResponseAnnounceFieldsPlanEvent,
} from "./part-1.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
/**
 * Path-response announce field plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planPathResponseAnnounceFields` reads beside the step). Nested under
 * {@link stepPathResponseAnnounceFieldsWithActions}.
 */
export type PathResponseAnnounceFieldsPlanState = Record<string, never>;

export interface PathResponseAnnounceFieldsPlanStepResult {
  readonly state: PathResponseAnnounceFieldsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathResponseAnnounceFieldsPlanAction[];
}

export function initialPathResponseAnnounceFieldsPlanState(): PathResponseAnnounceFieldsPlanState {
  return {};
}

export function stepPathResponseAnnounceFieldsPlanWithActions(
  state: PathResponseAnnounceFieldsPlanState,
  event: PathResponseAnnounceFieldsPlanEvent,
): PathResponseAnnounceFieldsPlanStepResult {
  if (event.kind === "transport/path-response-announce-fields-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: planPathResponseAnnounceFields({
            source: event.source,
            transportId: event.transportId,
            hops: event.hops,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathResponseAnnounceFieldsPlan(
  actions: ReadonlyArray<PathResponseAnnounceFieldsPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/**
 * Path-response announce field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planPathResponseAnnounceFields` reads beside the step).
 * Plan nested via {@link stepPathResponseAnnounceFieldsPlanWithActions}
 * (`use-fields`).
 */
export type PathResponseAnnounceFieldsState = Record<string, never>;

export interface PathResponseAnnounceFieldsStepResult {
  readonly state: PathResponseAnnounceFieldsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathResponseAnnounceFieldsAction[];
}

export function initialPathResponseAnnounceFieldsState(): PathResponseAnnounceFieldsState {
  return {};
}

export function stepPathResponseAnnounceFieldsWithActions(
  state: PathResponseAnnounceFieldsState,
  event: PathResponseAnnounceFieldsEvent,
): PathResponseAnnounceFieldsStepResult {
  if (event.kind === "transport/path-response-announce-fields-gate") {
    const planActions = stepPathResponseAnnounceFieldsPlanWithActions(
      initialPathResponseAnnounceFieldsPlanState(),
      {
        kind: "transport/path-response-announce-fields-plan-gate",
        source: event.source,
        transportId: event.transportId,
        hops: event.hops,
      },
    ).actions;
    const fields = pathResponseAnnounceFieldsPlanFromActions(planActions);
    if (fields === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathResponseAnnounceFields(
  actions: ReadonlyArray<PathResponseAnnounceFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract path-response announce fields from step actions; null when no `use-fields`. */
export function pathResponseAnnounceFieldsFromActions(
  actions: ReadonlyArray<PathResponseAnnounceFieldsAction>,
): PacketHeaderFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

/** Whether a cached path-response announce packet decoded successfully. */
export function shouldAcceptCachedPathResponsePacket(
  decodedOk: boolean,
): boolean {
  return decodedOk;
}

/**
 * shouldAcceptCachedPathResponsePacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptCachedPathResponsePacket` reads beside the step).
 */
export type AcceptCachedPathResponsePacketState = Record<string, never>;

export type AcceptCachedPathResponsePacketEvent =
  | Event
  | {
      readonly kind: "path-response/accept-cached-packet-gate";
      readonly decodedOk: boolean;
    };

export type AcceptCachedPathResponsePacketAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptCachedPathResponsePacketStepResult {
  readonly state: AcceptCachedPathResponsePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptCachedPathResponsePacketAction[];
}

export function initialAcceptCachedPathResponsePacketState(): AcceptCachedPathResponsePacketState {
  return {};
}

export function stepAcceptCachedPathResponsePacketWithActions(
  state: AcceptCachedPathResponsePacketState,
  event: AcceptCachedPathResponsePacketEvent,
): AcceptCachedPathResponsePacketStepResult {
  if (event.kind === "path-response/accept-cached-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptCachedPathResponsePacket(event.decodedOk)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptCachedPathResponsePacketNow(
  actions: ReadonlyArray<AcceptCachedPathResponsePacketAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipAcceptCachedPathResponsePacket(
  actions: ReadonlyArray<AcceptCachedPathResponsePacketAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Whether an announce handler should receive this packet given PATH_RESPONSE opt-in.
 * Non-path-response announces always pass; path responses require `receivePathResponses === true`.
 */
export function shouldReceiveAnnouncePathResponse(input: {
  readonly context: number;
  readonly receivePathResponses?: boolean;
}): boolean {
  if (input.context !== PACKET_CONTEXT_PATH_RESPONSE) {
    return true;
  }
  return input.receivePathResponses === true;
}

/**
 * shouldReceiveAnnouncePathResponse gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldReceiveAnnouncePathResponse` reads beside the step).
 */
export type ReceiveAnnouncePathResponseState = Record<string, never>;

export type ReceiveAnnouncePathResponseEvent =
  | Event
  | {
      readonly kind: "announce/receive-path-response-gate";
      readonly context: number;
      readonly receivePathResponses?: boolean;
    };

export type ReceiveAnnouncePathResponseAction =
  { readonly kind: "receive" } | { readonly kind: "skip" };

export interface ReceiveAnnouncePathResponseStepResult {
  readonly state: ReceiveAnnouncePathResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReceiveAnnouncePathResponseAction[];
}

export function initialReceiveAnnouncePathResponseState(): ReceiveAnnouncePathResponseState {
  return {};
}

export function stepReceiveAnnouncePathResponseWithActions(
  state: ReceiveAnnouncePathResponseState,
  event: ReceiveAnnouncePathResponseEvent,
): ReceiveAnnouncePathResponseStepResult {
  if (event.kind === "announce/receive-path-response-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReceiveAnnouncePathResponse({
            context: event.context,
            ...(event.receivePathResponses !== undefined
              ? { receivePathResponses: event.receivePathResponses }
              : {}),
          })
            ? "receive"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReceiveAnnouncePathResponseNow(
  actions: ReadonlyArray<ReceiveAnnouncePathResponseAction>,
): boolean {
  return hasActionOfKind(actions, "receive");
}

export function shouldSkipAnnouncePathResponse(
  actions: ReadonlyArray<ReceiveAnnouncePathResponseAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Drop announces that target a local IN destination (already ours). */
export function shouldIgnoreLocalAnnounce(
  hasLocalInboundDestination: boolean,
): boolean {
  return hasLocalInboundDestination;
}

/**
 * shouldIgnoreLocalAnnounce gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIgnoreLocalAnnounce`
 * reads beside the step).
 */
export type IgnoreLocalAnnounceState = Record<string, never>;

export type IgnoreLocalAnnounceEvent =
  | Event
  | {
      readonly kind: "announce/ignore-local-gate";
      readonly hasLocalInboundDestination: boolean;
    };

export type IgnoreLocalAnnounceAction =
  { readonly kind: "ignore" } | { readonly kind: "proceed" };

export interface IgnoreLocalAnnounceStepResult {
  readonly state: IgnoreLocalAnnounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IgnoreLocalAnnounceAction[];
}

export function initialIgnoreLocalAnnounceState(): IgnoreLocalAnnounceState {
  return {};
}

export function stepIgnoreLocalAnnounceWithActions(
  state: IgnoreLocalAnnounceState,
  event: IgnoreLocalAnnounceEvent,
): IgnoreLocalAnnounceStepResult {
  if (event.kind === "announce/ignore-local-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldIgnoreLocalAnnounce(event.hasLocalInboundDestination)
            ? "ignore"
            : "proceed",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreLocalAnnounceNow(
  actions: ReadonlyArray<IgnoreLocalAnnounceAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldProceedLocalAnnounce(
  actions: ReadonlyArray<IgnoreLocalAnnounceAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

/** Whether announce-handler fanout may run after Identity.recall. */
export function canDispatchAnnounceHandlers(identityPresent: boolean): boolean {
  return identityPresent;
}

/**
 * canDispatchAnnounceHandlers gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canDispatchAnnounceHandlers`
 * reads beside the step).
 */
export type DispatchAnnounceHandlersState = Record<string, never>;

export type DispatchAnnounceHandlersEvent =
  | Event
  | {
      readonly kind: "announce/dispatch-handlers-gate";
      readonly identityPresent: boolean;
    };

export type DispatchAnnounceHandlersAction =
  { readonly kind: "dispatch" } | { readonly kind: "skip" };

export interface DispatchAnnounceHandlersStepResult {
  readonly state: DispatchAnnounceHandlersState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchAnnounceHandlersAction[];
}

export function initialDispatchAnnounceHandlersState(): DispatchAnnounceHandlersState {
  return {};
}

export function stepDispatchAnnounceHandlersWithActions(
  state: DispatchAnnounceHandlersState,
  event: DispatchAnnounceHandlersEvent,
): DispatchAnnounceHandlersStepResult {
  if (event.kind === "announce/dispatch-handlers-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canDispatchAnnounceHandlers(event.identityPresent)
            ? "dispatch"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchAnnounceHandlersNow(
  actions: ReadonlyArray<DispatchAnnounceHandlersAction>,
): boolean {
  return hasActionOfKind(actions, "dispatch");
}

export function shouldSkipDispatchAnnounceHandlers(
  actions: ReadonlyArray<DispatchAnnounceHandlersAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Whether an announce handler's optional aspect filter matches the packet hash.
 * Filter parse / Destination.hash stay at the adapter edge as boolean inputs.
 */
export function shouldMatchAnnounceAspect(input: {
  readonly hasFilter: boolean;
  readonly filterParsed: boolean;
  readonly hashMatches: boolean;
}): boolean {
  if (!input.hasFilter) {
    return true;
  }
  return input.filterParsed && input.hashMatches;
}

/**
 * shouldMatchAnnounceAspect gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldMatchAnnounceAspect`
 * reads beside the step).
 */
export type MatchAnnounceAspectState = Record<string, never>;

export type MatchAnnounceAspectEvent =
  | Event
  | {
      readonly kind: "announce/match-aspect-gate";
      readonly hasFilter: boolean;
      readonly filterParsed: boolean;
      readonly hashMatches: boolean;
    };

export type MatchAnnounceAspectAction =
  { readonly kind: "match" } | { readonly kind: "mismatch" };

export interface MatchAnnounceAspectStepResult {
  readonly state: MatchAnnounceAspectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MatchAnnounceAspectAction[];
}

export function initialMatchAnnounceAspectState(): MatchAnnounceAspectState {
  return {};
}
