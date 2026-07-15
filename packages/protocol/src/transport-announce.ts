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
 * {@link stepTransportAnnounceFieldsPlanWithActions} (`use-fields`).
 * Local-announce
 * ignore / handler dispatch / PATH_RESPONSE receive / aspect-filter match
 * conclusions leave via machine actions (no ad-hoc
 * `shouldIgnoreLocalAnnounce` / `canDispatchAnnounceHandlers` /
 * `shouldReceiveAnnouncePathResponse` / `shouldMatchAnnounceAspect` /
 * `shouldAcceptCachedPathResponsePacket` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  PACKET_CONTEXT_PATH_RESPONSE,
  PACKET_CONTEXT_NONE
} from "./packet-context.js";
import {
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  type PacketHeaderFields
} from "./packet-header.js";
import { TRANSPORT_TRANSPORT } from "./transport-framing.js";

export { PACKET_CONTEXT_NONE, PACKET_CONTEXT_PATH_RESPONSE };

export interface TransportAnnounceSource {
  readonly contextFlag: number;
  readonly destinationType: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
}

/** Clone packet header fields with a new hop count. */
export function planClonePacketWithHops(
  source: PacketHeaderFields,
  hops: number
): PacketHeaderFields {
  return {
    headerType: source.headerType,
    contextFlag: source.contextFlag,
    transportType: source.transportType,
    destinationType: source.destinationType,
    packetType: source.packetType,
    hops,
    transportId: source.transportId,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data
  };
}

/**
 * Packet hop-clone field plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planClonePacketWithHops`
 * reads beside the step). Nested under {@link stepClonePacketWithHopsWithActions}.
 */
export type ClonePacketWithHopsPlanState = Record<string, never>;

export type ClonePacketWithHopsPlanEvent =
  | Event
  | {
      readonly kind: "transport/clone-packet-with-hops-plan-gate";
      readonly source: PacketHeaderFields;
      readonly hops: number;
    };

export type ClonePacketWithHopsPlanAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

export interface ClonePacketWithHopsPlanStepResult {
  readonly state: ClonePacketWithHopsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClonePacketWithHopsPlanAction[];
}

export function initialClonePacketWithHopsPlanState(): ClonePacketWithHopsPlanState {
  return {};
}

export function stepClonePacketWithHopsPlanWithActions(
  state: ClonePacketWithHopsPlanState,
  event: ClonePacketWithHopsPlanEvent
): ClonePacketWithHopsPlanStepResult {
  if (event.kind === "transport/clone-packet-with-hops-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: planClonePacketWithHops(event.source, event.hops)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseClonePacketWithHopsPlan(
  actions: ReadonlyArray<ClonePacketWithHopsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract hop-clone fields from plan actions; null when no `use-fields` action. */
export function clonePacketWithHopsPlanFieldsFromActions(
  actions: ReadonlyArray<ClonePacketWithHopsPlanAction>
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Packet hop-clone field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planClonePacketWithHops`
 * reads beside the step).
 * Plan nested via {@link stepClonePacketWithHopsPlanWithActions} (`use-fields`).
 */
export type ClonePacketWithHopsState = Record<string, never>;

export type ClonePacketWithHopsEvent =
  | Event
  | {
      readonly kind: "transport/clone-packet-with-hops-gate";
      readonly source: PacketHeaderFields;
      readonly hops: number;
    };

export type ClonePacketWithHopsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

export interface ClonePacketWithHopsStepResult {
  readonly state: ClonePacketWithHopsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClonePacketWithHopsAction[];
}

export function initialClonePacketWithHopsState(): ClonePacketWithHopsState {
  return {};
}

export function stepClonePacketWithHopsWithActions(
  state: ClonePacketWithHopsState,
  event: ClonePacketWithHopsEvent
): ClonePacketWithHopsStepResult {
  if (event.kind === "transport/clone-packet-with-hops-gate") {
    const planActions = stepClonePacketWithHopsPlanWithActions(
      initialClonePacketWithHopsPlanState(),
      {
        kind: "transport/clone-packet-with-hops-plan-gate",
        source: event.source,
        hops: event.hops
      }
    ).actions;
    const fields = clonePacketWithHopsPlanFieldsFromActions(planActions);
    if (fields === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseClonePacketWithHops(
  actions: ReadonlyArray<ClonePacketWithHopsAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract hop-clone fields from step actions; null when no `use-fields` action. */
export function clonePacketWithHopsFieldsFromActions(
  actions: ReadonlyArray<ClonePacketWithHopsAction>
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/** HEADER_2 transport-wrapped announce rebroadcast fields. */
export function planTransportAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  return {
    headerType: PACKET_HEADER_2,
    contextFlag: input.source.contextFlag,
    transportType: TRANSPORT_TRANSPORT,
    destinationType: input.source.destinationType,
    packetType: PACKET_TYPE_ANNOUNCE,
    hops: input.hops,
    transportId: input.transportId,
    destinationHash: input.source.destinationHash,
    context: input.source.context,
    data: input.source.data
  };
}

/**
 * Transport announce field plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planTransportAnnounceFields`
 * reads beside the step). Nested under
 * {@link stepTransportAnnounceFieldsWithActions}.
 */
export type TransportAnnounceFieldsPlanState = Record<string, never>;

export type TransportAnnounceFieldsPlanEvent =
  | Event
  | {
      readonly kind: "transport/announce-fields-plan-gate";
      readonly source: TransportAnnounceSource;
      readonly transportId: Uint8Array;
      readonly hops: number;
    };

export type TransportAnnounceFieldsPlanAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

export interface TransportAnnounceFieldsPlanStepResult {
  readonly state: TransportAnnounceFieldsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportAnnounceFieldsPlanAction[];
}

export function initialTransportAnnounceFieldsPlanState(): TransportAnnounceFieldsPlanState {
  return {};
}

export function stepTransportAnnounceFieldsPlanWithActions(
  state: TransportAnnounceFieldsPlanState,
  event: TransportAnnounceFieldsPlanEvent
): TransportAnnounceFieldsPlanStepResult {
  if (event.kind === "transport/announce-fields-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: planTransportAnnounceFields({
            source: event.source,
            transportId: event.transportId,
            hops: event.hops
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseTransportAnnounceFieldsPlan(
  actions: ReadonlyArray<TransportAnnounceFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract transport announce fields from plan actions; null when no `use-fields`. */
export function transportAnnounceFieldsPlanFromActions(
  actions: ReadonlyArray<TransportAnnounceFieldsPlanAction>
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Transport announce field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planTransportAnnounceFields`
 * reads beside the step).
 * Plan nested via {@link stepTransportAnnounceFieldsPlanWithActions} (`use-fields`).
 */
export type TransportAnnounceFieldsState = Record<string, never>;

export type TransportAnnounceFieldsEvent =
  | Event
  | {
      readonly kind: "transport/announce-fields-gate";
      readonly source: TransportAnnounceSource;
      readonly transportId: Uint8Array;
      readonly hops: number;
    };

export type TransportAnnounceFieldsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

export interface TransportAnnounceFieldsStepResult {
  readonly state: TransportAnnounceFieldsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportAnnounceFieldsAction[];
}

export function initialTransportAnnounceFieldsState(): TransportAnnounceFieldsState {
  return {};
}

export function stepTransportAnnounceFieldsWithActions(
  state: TransportAnnounceFieldsState,
  event: TransportAnnounceFieldsEvent
): TransportAnnounceFieldsStepResult {
  if (event.kind === "transport/announce-fields-gate") {
    const planActions = stepTransportAnnounceFieldsPlanWithActions(
      initialTransportAnnounceFieldsPlanState(),
      {
        kind: "transport/announce-fields-plan-gate",
        source: event.source,
        transportId: event.transportId,
        hops: event.hops
      }
    ).actions;
    const fields = transportAnnounceFieldsPlanFromActions(planActions);
    if (fields === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseTransportAnnounceFields(
  actions: ReadonlyArray<TransportAnnounceFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract transport announce fields from step actions; null when no `use-fields`. */
export function transportAnnounceFieldsFromActions(
  actions: ReadonlyArray<TransportAnnounceFieldsAction>
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/** HEADER_2 transport path-response announce fields. */
export function planPathResponseAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  return {
    ...planTransportAnnounceFields(input),
    context: PACKET_CONTEXT_PATH_RESPONSE
  };
}

/**
 * Path-response announce field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planPathResponseAnnounceFields` reads beside the step).
 */
export type PathResponseAnnounceFieldsState = Record<string, never>;

export type PathResponseAnnounceFieldsEvent =
  | Event
  | {
      readonly kind: "transport/path-response-announce-fields-gate";
      readonly source: TransportAnnounceSource;
      readonly transportId: Uint8Array;
      readonly hops: number;
    };

export type PathResponseAnnounceFieldsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

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
  event: PathResponseAnnounceFieldsEvent
): PathResponseAnnounceFieldsStepResult {
  if (event.kind === "transport/path-response-announce-fields-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: planPathResponseAnnounceFields({
            source: event.source,
            transportId: event.transportId,
            hops: event.hops
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathResponseAnnounceFields(
  actions: ReadonlyArray<PathResponseAnnounceFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract path-response announce fields from step actions; null when no `use-fields`. */
export function pathResponseAnnounceFieldsFromActions(
  actions: ReadonlyArray<PathResponseAnnounceFieldsAction>
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/** Whether a cached path-response announce packet decoded successfully. */
export function shouldAcceptCachedPathResponsePacket(decodedOk: boolean): boolean {
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

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
  event: AcceptCachedPathResponsePacketEvent
): AcceptCachedPathResponsePacketStepResult {
  if (event.kind === "path-response/accept-cached-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptCachedPathResponsePacket(event.decodedOk) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptCachedPathResponsePacketNow(
  actions: ReadonlyArray<AcceptCachedPathResponsePacketAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptCachedPathResponsePacket(
  actions: ReadonlyArray<AcceptCachedPathResponsePacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
  | { readonly kind: "receive" }
  | { readonly kind: "skip" };

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
  event: ReceiveAnnouncePathResponseEvent
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
              : {})
          })
            ? "receive"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReceiveAnnouncePathResponseNow(
  actions: ReadonlyArray<ReceiveAnnouncePathResponseAction>
): boolean {
  return actions.some((action) => action.kind === "receive");
}

export function shouldSkipAnnouncePathResponse(
  actions: ReadonlyArray<ReceiveAnnouncePathResponseAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Drop announces that target a local IN destination (already ours). */
export function shouldIgnoreLocalAnnounce(hasLocalInboundDestination: boolean): boolean {
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
  | { readonly kind: "ignore" }
  | { readonly kind: "proceed" };

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
  event: IgnoreLocalAnnounceEvent
): IgnoreLocalAnnounceStepResult {
  if (event.kind === "announce/ignore-local-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldIgnoreLocalAnnounce(event.hasLocalInboundDestination)
            ? "ignore"
            : "proceed"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreLocalAnnounceNow(
  actions: ReadonlyArray<IgnoreLocalAnnounceAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldProceedLocalAnnounce(
  actions: ReadonlyArray<IgnoreLocalAnnounceAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
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
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

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
  event: DispatchAnnounceHandlersEvent
): DispatchAnnounceHandlersStepResult {
  if (event.kind === "announce/dispatch-handlers-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canDispatchAnnounceHandlers(event.identityPresent) ? "dispatch" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchAnnounceHandlersNow(
  actions: ReadonlyArray<DispatchAnnounceHandlersAction>
): boolean {
  return actions.some((action) => action.kind === "dispatch");
}

export function shouldSkipDispatchAnnounceHandlers(
  actions: ReadonlyArray<DispatchAnnounceHandlersAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export interface MatchAnnounceAspectStepResult {
  readonly state: MatchAnnounceAspectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MatchAnnounceAspectAction[];
}

export function initialMatchAnnounceAspectState(): MatchAnnounceAspectState {
  return {};
}

export function stepMatchAnnounceAspectWithActions(
  state: MatchAnnounceAspectState,
  event: MatchAnnounceAspectEvent
): MatchAnnounceAspectStepResult {
  if (event.kind === "announce/match-aspect-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldMatchAnnounceAspect({
            hasFilter: event.hasFilter,
            filterParsed: event.filterParsed,
            hashMatches: event.hashMatches
          })
            ? "match"
            : "mismatch"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchAnnounceAspectNow(
  actions: ReadonlyArray<MatchAnnounceAspectAction>
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchAnnounceAspect(
  actions: ReadonlyArray<MatchAnnounceAspectAction>
): boolean {
  return actions.some((action) => action.kind === "mismatch");
}

export interface AnnounceIngressGates {
  readonly applyRateLimit: boolean;
  readonly recordRate: boolean;
  readonly rebroadcast: boolean;
}

/**
 * PATH_RESPONSE announces skip rate-limit / rate-record / rebroadcast.
 * Non-path-response announces enable all three.
 */
export function planAnnounceIngressGates(context: number): AnnounceIngressGates {
  const allow = context !== PACKET_CONTEXT_PATH_RESPONSE;
  return {
    applyRateLimit: allow,
    recordRate: allow,
    rebroadcast: allow
  };
}

/**
 * Announce ingress gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type AnnounceIngressGatesState = Record<string, never>;

export type AnnounceIngressGatesEvent =
  | Event
  | {
      readonly kind: "announce/ingress-gates";
      readonly context: number;
    };

export type AnnounceIngressGatesAction =
  | { readonly kind: "apply-rate-limit" }
  | { readonly kind: "record-rate" }
  | { readonly kind: "rebroadcast" };

export interface AnnounceIngressGatesStepResult {
  readonly state: AnnounceIngressGatesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceIngressGatesAction[];
}

export function initialAnnounceIngressGatesState(): AnnounceIngressGatesState {
  return {};
}

export const stepAnnounceIngressGates: StepFn<AnnounceIngressGatesState> = (state, event) => {
  const result = stepAnnounceIngressGatesInner(state, event as AnnounceIngressGatesEvent);
  return { state: result.state, intents: result.intents };
};

export function stepAnnounceIngressGatesWithActions(
  state: AnnounceIngressGatesState,
  event: AnnounceIngressGatesEvent
): AnnounceIngressGatesStepResult {
  return stepAnnounceIngressGatesInner(state, event);
}

export function shouldApplyAnnounceRateLimit(
  actions: ReadonlyArray<AnnounceIngressGatesAction>
): boolean {
  return actions.some((action) => action.kind === "apply-rate-limit");
}

export function shouldRecordAnnounceRate(
  actions: ReadonlyArray<AnnounceIngressGatesAction>
): boolean {
  return actions.some((action) => action.kind === "record-rate");
}

export function shouldRebroadcastAnnounce(
  actions: ReadonlyArray<AnnounceIngressGatesAction>
): boolean {
  return actions.some((action) => action.kind === "rebroadcast");
}

function stepAnnounceIngressGatesInner(
  state: AnnounceIngressGatesState,
  event: AnnounceIngressGatesEvent
): AnnounceIngressGatesStepResult {
  if (event.kind === "announce/ingress-gates") {
    const plan = planAnnounceIngressGates(event.context);
    const actions: AnnounceIngressGatesAction[] = [];
    if (plan.applyRateLimit) {
      actions.push({ kind: "apply-rate-limit" });
    }
    if (plan.recordRate) {
      actions.push({ kind: "record-rate" });
    }
    if (plan.rebroadcast) {
      actions.push({ kind: "rebroadcast" });
    }
    return { state, intents: [], actions };
  }

  return { state, intents: [], actions: [] };
}
