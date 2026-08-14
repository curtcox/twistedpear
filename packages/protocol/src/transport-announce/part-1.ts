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
import {
  PACKET_CONTEXT_PATH_RESPONSE,
  PACKET_CONTEXT_NONE,
} from "../packet-context.js";
import {
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  type PacketHeaderFields,
} from "../packet-header.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";

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
  hops: number,
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
    data: source.data,
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
  event: ClonePacketWithHopsPlanEvent,
): ClonePacketWithHopsPlanStepResult {
  if (event.kind === "transport/clone-packet-with-hops-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: planClonePacketWithHops(event.source, event.hops),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseClonePacketWithHopsPlan(
  actions: ReadonlyArray<ClonePacketWithHopsPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract hop-clone fields from plan actions; null when no `use-fields` action. */
export function clonePacketWithHopsPlanFieldsFromActions(
  actions: ReadonlyArray<ClonePacketWithHopsPlanAction>,
): PacketHeaderFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
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
  event: ClonePacketWithHopsEvent,
): ClonePacketWithHopsStepResult {
  if (event.kind === "transport/clone-packet-with-hops-gate") {
    const planActions = stepClonePacketWithHopsPlanWithActions(
      initialClonePacketWithHopsPlanState(),
      {
        kind: "transport/clone-packet-with-hops-plan-gate",
        source: event.source,
        hops: event.hops,
      },
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
          fields,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseClonePacketWithHops(
  actions: ReadonlyArray<ClonePacketWithHopsAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract hop-clone fields from step actions; null when no `use-fields` action. */
export function clonePacketWithHopsFieldsFromActions(
  actions: ReadonlyArray<ClonePacketWithHopsAction>,
): PacketHeaderFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
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
    data: input.source.data,
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
  event: TransportAnnounceFieldsPlanEvent,
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
            hops: event.hops,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseTransportAnnounceFieldsPlan(
  actions: ReadonlyArray<TransportAnnounceFieldsPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract transport announce fields from plan actions; null when no `use-fields`. */
export function transportAnnounceFieldsPlanFromActions(
  actions: ReadonlyArray<TransportAnnounceFieldsPlanAction>,
): PacketHeaderFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
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
  event: TransportAnnounceFieldsEvent,
): TransportAnnounceFieldsStepResult {
  if (event.kind === "transport/announce-fields-gate") {
    const planActions = stepTransportAnnounceFieldsPlanWithActions(
      initialTransportAnnounceFieldsPlanState(),
      {
        kind: "transport/announce-fields-plan-gate",
        source: event.source,
        transportId: event.transportId,
        hops: event.hops,
      },
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
          fields,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseTransportAnnounceFields(
  actions: ReadonlyArray<TransportAnnounceFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract transport announce fields from step actions; null when no `use-fields`. */
export function transportAnnounceFieldsFromActions(
  actions: ReadonlyArray<TransportAnnounceFieldsAction>,
): PacketHeaderFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

/** HEADER_2 transport path-response announce fields. */
export function planPathResponseAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  return {
    ...planTransportAnnounceFields(input),
    context: PACKET_CONTEXT_PATH_RESPONSE,
  };
}

export type PathResponseAnnounceFieldsPlanEvent =
  | Event
  | {
      readonly kind: "transport/path-response-announce-fields-plan-gate";
      readonly source: TransportAnnounceSource;
      readonly transportId: Uint8Array;
      readonly hops: number;
    };

export type PathResponseAnnounceFieldsPlanAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

/** Extract path-response announce fields from plan actions; null when no `use-fields`. */
export function pathResponseAnnounceFieldsPlanFromActions(
  actions: ReadonlyArray<PathResponseAnnounceFieldsPlanAction>,
): PacketHeaderFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

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
