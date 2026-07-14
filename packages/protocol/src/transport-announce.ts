/**
 * Pure transport announce / path-response / hop-clone field planning.
 * Packet construction and identity hashing stay at the adapter edge.
 * Announce ingress gate conclusions leave via machine actions (no ad-hoc
 * `planAnnounceIngressGates` reads beside the step).
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

/** Whether a cached path-response announce packet decoded successfully. */
export function shouldAcceptCachedPathResponsePacket(decodedOk: boolean): boolean {
  return decodedOk;
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

/** Drop announces that target a local IN destination (already ours). */
export function shouldIgnoreLocalAnnounce(hasLocalInboundDestination: boolean): boolean {
  return hasLocalInboundDestination;
}

/** Whether announce-handler fanout may run after Identity.recall. */
export function canDispatchAnnounceHandlers(identityPresent: boolean): boolean {
  return identityPresent;
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
