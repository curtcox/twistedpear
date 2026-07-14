/**
 * Pure transport ingress accept / filter / packet-hash deferral / relay decisions.
 * Hash tables and interface identity stay at the adapter edge as boolean inputs.
 * Ingress dispatch / link-data target / reverse-relay / hash-remember /
 * local plain-data / link-relay conclusions leave via machine actions (no ad-hoc
 * plan reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  PACKET_DEST_TYPE_LINK,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF
} from "./packet-header.js";
import { PacketContextCode } from "./packet-context.js";
import { equalByteArrays } from "./path-table.js";
import { TRANSPORT_TRANSPORT } from "./transport-framing.js";

/** Mirrors RNS/Transport.py local rebroadcast limit. */
export const LOCAL_REBROADCASTS_MAX = 2;
/** Mirrors RNS/Transport.py reverse-table entry lifetime. */
export const REVERSE_TIMEOUT_SECONDS = 8 * 60;

/**
 * Plan leaf packet-filter accept (foreign transport-id + seen-hash rules).
 * Hash-set membership is supplied as `alreadySeenHash`.
 */
export function planPacketFilter(input: {
  readonly transportId: Uint8Array | null;
  readonly localTransportHash: Uint8Array;
  readonly packetType: number;
  readonly destinationType: number;
  readonly alreadySeenHash: boolean;
}): boolean {
  if (input.transportId !== null && input.packetType !== PACKET_TYPE_ANNOUNCE) {
    if (!equalByteArrays(input.transportId, input.localTransportHash)) {
      return false;
    }
  }

  if (!input.alreadySeenHash) {
    return true;
  }

  return input.packetType === PACKET_TYPE_ANNOUNCE && input.destinationType === PACKET_DEST_TYPE_SINGLE;
}

/**
 * Packet filter gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFilter` reads
 * beside the step).
 */
export type PacketFilterState = Record<string, never>;

export type PacketFilterEvent =
  | Event
  | {
      readonly kind: "transport/packet-filter-gate";
      readonly transportId: Uint8Array | null;
      readonly localTransportHash: Uint8Array;
      readonly packetType: number;
      readonly destinationType: number;
      readonly alreadySeenHash: boolean;
    };

export type PacketFilterAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface PacketFilterStepResult {
  readonly state: PacketFilterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketFilterAction[];
}

export function initialPacketFilterState(): PacketFilterState {
  return {};
}

export function stepPacketFilterWithActions(
  state: PacketFilterState,
  event: PacketFilterEvent
): PacketFilterStepResult {
  if (event.kind === "transport/packet-filter-gate") {
    const accept = planPacketFilter({
      transportId: event.transportId,
      localTransportHash: event.localTransportHash,
      packetType: event.packetType,
      destinationType: event.destinationType,
      alreadySeenHash: event.alreadySeenHash
    });
    return {
      state,
      intents: [],
      actions: [{ kind: accept ? "accept" : "reject" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptPacketFilter(
  actions: ReadonlyArray<PacketFilterAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldAcceptTransportPacket(input: {
  readonly filterPassed: boolean;
  readonly packetType: number;
  readonly transportType: number;
  readonly hasForeignTransportId: boolean;
  readonly alreadySeenHash: boolean;
}): boolean {
  if (input.filterPassed) {
    return true;
  }

  if (
    input.packetType === PACKET_TYPE_ANNOUNCE &&
    input.transportType === TRANSPORT_TRANSPORT &&
    input.hasForeignTransportId
  ) {
    return !input.alreadySeenHash;
  }

  return false;
}

export function shouldDeferPacketHash(input: {
  readonly packetType: number;
  readonly context: number;
  readonly destinationInLinkTable: boolean;
}): boolean {
  if (
    input.packetType === PACKET_TYPE_PROOF &&
    input.context === PacketContextCode.LRPROOF
  ) {
    return true;
  }
  return input.destinationInLinkTable;
}

/** Which link-table interface should carry a relayed link packet, if any. */
export type LinkRelayTarget = "outbound" | "received";

/**
 * Plan link-packet relay direction from link-table hops / interface identity.
 * Transmit stays at the adapter edge.
 */
export function planLinkRelayTarget(input: {
  readonly sameInterface: boolean;
  readonly ifaceIsOutbound: boolean;
  readonly ifaceIsReceived: boolean;
  readonly packetHops: number;
  readonly remainingHops: number;
  readonly takenHops: number;
}): LinkRelayTarget | null {
  if (input.sameInterface) {
    if (input.packetHops === input.remainingHops || input.packetHops === input.takenHops) {
      return "outbound";
    }
    return null;
  }
  if (input.ifaceIsOutbound && input.packetHops === input.remainingHops) {
    return "received";
  }
  if (input.ifaceIsReceived && input.packetHops === input.takenHops) {
    return "outbound";
  }
  return null;
}

/** Whether link-relay may proceed after a link-table lookup hit. */
export function canLookupLinkRelayEntry(entryPresent: boolean): boolean {
  return entryPresent;
}

/** Whether link-relay may transmit after {@link planLinkRelayTarget} resolves an iface. */
export function shouldTransmitLinkRelay(outboundPresent: boolean): boolean {
  return outboundPresent;
}

/**
 * Link relay target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LinkRelayTargetState = Record<string, never>;

export type LinkRelayTargetEvent =
  | Event
  | {
      readonly kind: "transport/link-relay-gate";
      readonly sameInterface: boolean;
      readonly ifaceIsOutbound: boolean;
      readonly ifaceIsReceived: boolean;
      readonly packetHops: number;
      readonly remainingHops: number;
      readonly takenHops: number;
    };

export type LinkRelayTargetAction = {
  readonly kind: LinkRelayTarget | "ignore";
};

export interface LinkRelayTargetStepResult {
  readonly state: LinkRelayTargetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRelayTargetAction[];
}

export function initialLinkRelayTargetState(): LinkRelayTargetState {
  return {};
}

export const stepLinkRelayTarget: StepFn<LinkRelayTargetState> = (state, event) => {
  const result = stepLinkRelayTargetInner(state, event as LinkRelayTargetEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkRelayTargetWithActions(
  state: LinkRelayTargetState,
  event: LinkRelayTargetEvent
): LinkRelayTargetStepResult {
  return stepLinkRelayTargetInner(state, event);
}

export function linkRelayTargetFromActions(
  actions: ReadonlyArray<LinkRelayTargetAction>
): LinkRelayTarget | null {
  const action = actions[0];
  if (action === undefined || action.kind === "ignore") {
    return null;
  }
  return action.kind;
}

export function shouldRelayLinkOutbound(
  actions: ReadonlyArray<LinkRelayTargetAction>
): boolean {
  return actions.some((action) => action.kind === "outbound");
}

export function shouldRelayLinkReceived(
  actions: ReadonlyArray<LinkRelayTargetAction>
): boolean {
  return actions.some((action) => action.kind === "received");
}

export function shouldIgnoreLinkRelayTarget(
  actions: ReadonlyArray<LinkRelayTargetAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepLinkRelayTargetInner(
  state: LinkRelayTargetState,
  event: LinkRelayTargetEvent
): LinkRelayTargetStepResult {
  if (event.kind === "transport/link-relay-gate") {
    const target = planLinkRelayTarget({
      sameInterface: event.sameInterface,
      ifaceIsOutbound: event.ifaceIsOutbound,
      ifaceIsReceived: event.ifaceIsReceived,
      packetHops: event.packetHops,
      remainingHops: event.remainingHops,
      takenHops: event.takenHops
    });
    return {
      state,
      intents: [],
      actions: [{ kind: target ?? "ignore" }]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether reverse-table should delete an expired entry (delete-expired outcome). */
export function shouldDeleteExpiredReverseEntry(deleteExpired: boolean): boolean {
  return deleteExpired;
}

/**
 * Whether reverse relay may transmit after {@link planReverseRelayOutcome} resolves relay
 * and a table entry is still present.
 */
export function shouldTransmitReverseRelay(input: {
  readonly relayOk: boolean;
  readonly entryPresent: boolean;
}): boolean {
  return input.relayOk && input.entryPresent;
}

/** True when a reverse-table entry is past its lifetime. */
export function isReverseEntryExpired(input: {
  readonly timestamp: number;
  readonly nowSeconds: number;
  readonly timeoutSeconds?: number;
}): boolean {
  const timeoutSeconds = input.timeoutSeconds ?? REVERSE_TIMEOUT_SECONDS;
  return input.nowSeconds > input.timestamp + timeoutSeconds;
}

/**
 * Whether this node should relay a transport-wrapped packet (local transport-id,
 * non-announce, known path).
 */
export function canRelayTransportPacket(input: {
  readonly transportIdPresent: boolean;
  readonly isAnnounce: boolean;
  readonly transportIdMatchesLocal: boolean;
  readonly hasPath: boolean;
}): boolean {
  return (
    input.transportIdPresent &&
    !input.isAnnounce &&
    input.transportIdMatchesLocal &&
    input.hasPath
  );
}

/** Whether a relayed packet should create/update a link-relay table entry. */
export function shouldRecordLinkRelayTableEntry(packetType: number): boolean {
  return packetType === PACKET_TYPE_LINKREQUEST;
}

/**
 * Whether a relayed packet should create/update a reverse-table entry
 * (everything except LRPROOF proofs).
 */
export function shouldRecordReverseTableEntry(input: {
  readonly packetType: number;
  readonly context: number;
}): boolean {
  return !(
    input.packetType === PACKET_TYPE_PROOF &&
    input.context === PacketContextCode.LRPROOF
  );
}

/** Whether inbound DATA is a local path-request (PLAIN + path-request hash). */
export function isLocalPathRequestPacket(input: {
  readonly destinationTypePlain: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.destinationTypePlain && input.destinationHashMatches;
}

/**
 * Whether a link-table packet may be relayed (not ANNOUNCE / LINKREQUEST).
 * Link-table lookup and hop/interface targeting stay at the adapter edge.
 */
export function canRelayLinkPacket(packetType: number): boolean {
  return (
    packetType !== PACKET_TYPE_ANNOUNCE && packetType !== PACKET_TYPE_LINKREQUEST
  );
}

/**
 * Whether a reverse-table proof may be relayed (PROOF + live reverse entry).
 * Interface identity is checked separately via {@link shouldRelayReverseOnInterface}.
 */
export function canRelayReversePacket(input: {
  readonly isProof: boolean;
  readonly hasEntry: boolean;
  readonly entryExpired: boolean;
}): boolean {
  return input.isProof && input.hasEntry && !input.entryExpired;
}

/** Whether reverse relay should use this iface (must be the reverse entry's outbound). */
export function shouldRelayReverseOnInterface(ifaceIsOutbound: boolean): boolean {
  return ifaceIsOutbound;
}

/** Pure type → handler dispatch after transport accept / relay. */
export type TransportIngressDispatch =
  | "announce"
  | "link-request"
  | "link-data"
  | "plain-data"
  | "proof"
  | "ignore";

export function planTransportIngressDispatch(input: {
  readonly packetType: number;
  readonly destinationType: number;
}): TransportIngressDispatch {
  if (input.packetType === PACKET_TYPE_ANNOUNCE) {
    return "announce";
  }
  if (input.packetType === PACKET_TYPE_LINKREQUEST) {
    return "link-request";
  }
  if (input.packetType === PACKET_TYPE_DATA) {
    return input.destinationType === PACKET_DEST_TYPE_LINK ? "link-data" : "plain-data";
  }
  if (input.packetType === PACKET_TYPE_PROOF) {
    return "proof";
  }
  return "ignore";
}

/** Pure proof-context → handler kind. */
export type ProofIngressKind = "lrproof" | "resource-prf" | "receipt";

export function planProofIngressKind(context: number): ProofIngressKind {
  if (context === PacketContextCode.LRPROOF) {
    return "lrproof";
  }
  if (context === PacketContextCode.RESOURCE_PRF) {
    return "resource-prf";
  }
  return "receipt";
}

/**
 * Whether a packet should leave on this interface (outgoing + optional exclude /
 * attached-interface constraints).
 */
export function shouldTransmitOnInterface(input: {
  readonly outgoing: boolean;
  readonly isExcludedInterface?: boolean;
  readonly requireAttached?: boolean;
  readonly isAttached?: boolean;
}): boolean {
  if (!input.outgoing) {
    return false;
  }
  if (input.isExcludedInterface === true) {
    return false;
  }
  if (input.requireAttached === true && input.isAttached !== true) {
    return false;
  }
  return true;
}

/** Local IN destination match (announce / path-request answerer). */
export function shouldMatchLocalInboundDestination(input: {
  readonly hashMatches: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.hashMatches && input.directionIn;
}

/** Local typed destination match (plain DATA delivery). */
export function shouldMatchLocalTypedDestination(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
}): boolean {
  return input.hashMatches && input.typeMatches;
}

/** Local LINKREQUEST dispatch (typed destination + handler present). */
export function shouldDispatchLocalLinkRequest(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
  readonly handlerPresent: boolean;
}): boolean {
  return input.hashMatches && input.typeMatches && input.handlerPresent;
}

/**
 * After `planProofIngressKind === "lrproof"`: whether this pending link may validate.
 * `linkIdMatches` and hopsMatch stay as adapter-supplied booleans.
 */
export function shouldAcceptLinkLrProofCandidate(input: {
  readonly linkIdMatches: boolean;
  readonly hopsMatch: boolean;
}): boolean {
  return input.linkIdMatches && input.hopsMatch;
}

export type LocalPlainDataDeliveryPlan = "ignore" | "dispatch";

/**
 * Local plain DATA after path-request gate: destination present + decrypt present.
 * Proof emission stays via {@link planDestinationProof} at the adapter.
 */
export function planLocalPlainDataDelivery(input: {
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
}): LocalPlainDataDeliveryPlan {
  if (!input.destinationPresent || !input.plaintextPresent) {
    return "ignore";
  }
  return "dispatch";
}

/**
 * Whether local plain DATA may dispatch after {@link planLocalPlainDataDelivery}
 * and destination/plaintext references remain present for narrowing.
 */
export function shouldDispatchLocalPlainDataDelivery(input: {
  readonly planDispatch: boolean;
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
}): boolean {
  return input.planDispatch && input.destinationPresent && input.plaintextPresent;
}

export type PacketHashRememberPlan = "now" | "after-relay";

/**
 * When to record a packet hash: immediately, or after deferred relay attempts.
 * Complements {@link shouldDeferPacketHash}.
 */
export function planPacketHashRemember(deferred: boolean): PacketHashRememberPlan {
  return deferred ? "after-relay" : "now";
}

/** Whether inbound should record the packet hash immediately (non-deferred). */
export function shouldRememberPacketHashNow(rememberNow: boolean): boolean {
  return rememberNow;
}

/** Whether inbound should record the packet hash after deferred relay attempts. */
export function shouldRememberPacketHashAfterRelay(rememberAfterRelay: boolean): boolean {
  return rememberAfterRelay;
}

/** Whether RESOURCE_PRF ingress should dispatch to a matched active link. */
export function shouldDispatchResourceProofToLink(activeIndexPresent: boolean): boolean {
  return activeIndexPresent;
}

/** Index of a link-id in a list (link-data / resource-prf ingress). */
export function indexOfMatchingLinkId(input: {
  readonly linkIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  for (let index = 0; index < input.linkIds.length; index += 1) {
    const linkId = input.linkIds[index];
    if (linkId != null && equalByteArrays(linkId, input.target)) {
      return index;
    }
  }
  return null;
}

export type LinkDataIngressTarget = "active" | "pending" | "none";

/**
 * Prefer active then pending link-id match for DATA / resource-proof ingress.
 */
export function planLinkDataIngressTarget(input: {
  readonly activeIndex: number | null;
  readonly pendingIndex: number | null;
}): LinkDataIngressTarget {
  if (input.activeIndex !== null) {
    return "active";
  }
  if (input.pendingIndex !== null) {
    return "pending";
  }
  return "none";
}

export type ReverseRelayOutcome = "relay" | "delete-expired" | "ignore";

/**
 * Reverse-table proof relay: compose can-relay + expiry cleanup + interface gate.
 */
export function planReverseRelayOutcome(input: {
  readonly canRelay: boolean;
  readonly entryExpired: boolean;
  readonly ifaceIsOutbound: boolean;
}): ReverseRelayOutcome {
  if (!input.canRelay) {
    return input.entryExpired ? "delete-expired" : "ignore";
  }
  if (!input.ifaceIsOutbound) {
    return "ignore";
  }
  return "relay";
}

/** Whether a transport list should receive a new member (not already present). */
export function shouldRegisterTransportMember(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * Unregister from a transport list: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterTransportMember(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterTransportMember}. */
export function shouldUnregisterTransportMember(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Transport ingress dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type TransportIngressDispatchState = Record<string, never>;

export type TransportIngressDispatchEvent =
  | Event
  | {
      readonly kind: "transport/ingress-dispatch-gate";
      readonly packetType: number;
      readonly destinationType: number;
    };

export type TransportIngressDispatchAction = {
  readonly kind: TransportIngressDispatch;
};

export interface TransportIngressDispatchStepResult {
  readonly state: TransportIngressDispatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportIngressDispatchAction[];
}

export function initialTransportIngressDispatchState(): TransportIngressDispatchState {
  return {};
}

export const stepTransportIngressDispatch: StepFn<TransportIngressDispatchState> = (
  state,
  event
) => {
  const result = stepTransportIngressDispatchInner(
    state,
    event as TransportIngressDispatchEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepTransportIngressDispatchWithActions(
  state: TransportIngressDispatchState,
  event: TransportIngressDispatchEvent
): TransportIngressDispatchStepResult {
  return stepTransportIngressDispatchInner(state, event);
}

export function transportIngressDispatchFromActions(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): TransportIngressDispatch | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldDispatchTransportAnnounce(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "announce");
}

export function shouldDispatchTransportLinkRequest(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "link-request");
}

export function shouldDispatchTransportLinkData(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "link-data");
}

export function shouldDispatchTransportPlainData(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "plain-data");
}

export function shouldDispatchTransportProof(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "proof");
}

export function shouldIgnoreTransportIngressDispatch(
  actions: ReadonlyArray<TransportIngressDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepTransportIngressDispatchInner(
  state: TransportIngressDispatchState,
  event: TransportIngressDispatchEvent
): TransportIngressDispatchStepResult {
  if (event.kind === "transport/ingress-dispatch-gate") {
    const plan = planTransportIngressDispatch({
      packetType: event.packetType,
      destinationType: event.destinationType
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Link-data ingress target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LinkDataIngressTargetState = Record<string, never>;

export type LinkDataIngressTargetEvent =
  | Event
  | {
      readonly kind: "transport/link-data-ingress-gate";
      readonly activeIndex: number | null;
      readonly pendingIndex: number | null;
    };

export type LinkDataIngressTargetAction = {
  readonly kind: LinkDataIngressTarget;
};

export interface LinkDataIngressTargetStepResult {
  readonly state: LinkDataIngressTargetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkDataIngressTargetAction[];
}

export function initialLinkDataIngressTargetState(): LinkDataIngressTargetState {
  return {};
}

export const stepLinkDataIngressTarget: StepFn<LinkDataIngressTargetState> = (state, event) => {
  const result = stepLinkDataIngressTargetInner(state, event as LinkDataIngressTargetEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkDataIngressTargetWithActions(
  state: LinkDataIngressTargetState,
  event: LinkDataIngressTargetEvent
): LinkDataIngressTargetStepResult {
  return stepLinkDataIngressTargetInner(state, event);
}

export function linkDataIngressTargetFromActions(
  actions: ReadonlyArray<LinkDataIngressTargetAction>
): LinkDataIngressTarget | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldIngressLinkDataActive(
  actions: ReadonlyArray<LinkDataIngressTargetAction>
): boolean {
  return actions.some((action) => action.kind === "active");
}

export function shouldIngressLinkDataPending(
  actions: ReadonlyArray<LinkDataIngressTargetAction>
): boolean {
  return actions.some((action) => action.kind === "pending");
}

export function shouldIngressLinkDataNone(
  actions: ReadonlyArray<LinkDataIngressTargetAction>
): boolean {
  return actions.some((action) => action.kind === "none");
}

function stepLinkDataIngressTargetInner(
  state: LinkDataIngressTargetState,
  event: LinkDataIngressTargetEvent
): LinkDataIngressTargetStepResult {
  if (event.kind === "transport/link-data-ingress-gate") {
    const plan = planLinkDataIngressTarget({
      activeIndex: event.activeIndex,
      pendingIndex: event.pendingIndex
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Reverse-relay outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ReverseRelayOutcomeState = Record<string, never>;

export type ReverseRelayOutcomeEvent =
  | Event
  | {
      readonly kind: "transport/reverse-relay-gate";
      readonly canRelay: boolean;
      readonly entryExpired: boolean;
      readonly ifaceIsOutbound: boolean;
    };

export type ReverseRelayOutcomeAction = {
  readonly kind: ReverseRelayOutcome;
};

export interface ReverseRelayOutcomeStepResult {
  readonly state: ReverseRelayOutcomeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReverseRelayOutcomeAction[];
}

export function initialReverseRelayOutcomeState(): ReverseRelayOutcomeState {
  return {};
}

export const stepReverseRelayOutcome: StepFn<ReverseRelayOutcomeState> = (state, event) => {
  const result = stepReverseRelayOutcomeInner(state, event as ReverseRelayOutcomeEvent);
  return { state: result.state, intents: result.intents };
};

export function stepReverseRelayOutcomeWithActions(
  state: ReverseRelayOutcomeState,
  event: ReverseRelayOutcomeEvent
): ReverseRelayOutcomeStepResult {
  return stepReverseRelayOutcomeInner(state, event);
}

export function reverseRelayOutcomeFromActions(
  actions: ReadonlyArray<ReverseRelayOutcomeAction>
): ReverseRelayOutcome | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldRelayReversePacketActions(
  actions: ReadonlyArray<ReverseRelayOutcomeAction>
): boolean {
  return actions.some((action) => action.kind === "relay");
}

export function shouldDeleteExpiredReverseEntryActions(
  actions: ReadonlyArray<ReverseRelayOutcomeAction>
): boolean {
  return actions.some((action) => action.kind === "delete-expired");
}

export function shouldIgnoreReverseRelayOutcome(
  actions: ReadonlyArray<ReverseRelayOutcomeAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepReverseRelayOutcomeInner(
  state: ReverseRelayOutcomeState,
  event: ReverseRelayOutcomeEvent
): ReverseRelayOutcomeStepResult {
  if (event.kind === "transport/reverse-relay-gate") {
    const plan = planReverseRelayOutcome({
      canRelay: event.canRelay,
      entryExpired: event.entryExpired,
      ifaceIsOutbound: event.ifaceIsOutbound
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Packet-hash remember timing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type PacketHashRememberState = Record<string, never>;

export type PacketHashRememberEvent =
  | Event
  | {
      readonly kind: "transport/packet-hash-remember-gate";
      readonly deferred: boolean;
    };

export type PacketHashRememberAction = {
  readonly kind: PacketHashRememberPlan;
};

export interface PacketHashRememberStepResult {
  readonly state: PacketHashRememberState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketHashRememberAction[];
}

export function initialPacketHashRememberState(): PacketHashRememberState {
  return {};
}

export const stepPacketHashRemember: StepFn<PacketHashRememberState> = (state, event) => {
  const result = stepPacketHashRememberInner(state, event as PacketHashRememberEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPacketHashRememberWithActions(
  state: PacketHashRememberState,
  event: PacketHashRememberEvent
): PacketHashRememberStepResult {
  return stepPacketHashRememberInner(state, event);
}

export function packetHashRememberFromActions(
  actions: ReadonlyArray<PacketHashRememberAction>
): PacketHashRememberPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldRememberPacketHashNowActions(
  actions: ReadonlyArray<PacketHashRememberAction>
): boolean {
  return actions.some((action) => action.kind === "now");
}

export function shouldRememberPacketHashAfterRelayActions(
  actions: ReadonlyArray<PacketHashRememberAction>
): boolean {
  return actions.some((action) => action.kind === "after-relay");
}

function stepPacketHashRememberInner(
  state: PacketHashRememberState,
  event: PacketHashRememberEvent
): PacketHashRememberStepResult {
  if (event.kind === "transport/packet-hash-remember-gate") {
    const plan = planPacketHashRemember(event.deferred);
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Local plain-data delivery is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LocalPlainDataDeliveryState = Record<string, never>;

export type LocalPlainDataDeliveryEvent =
  | Event
  | {
      readonly kind: "transport/local-plain-data-gate";
      readonly destinationPresent: boolean;
      readonly plaintextPresent: boolean;
    };

export type LocalPlainDataDeliveryAction = {
  readonly kind: LocalPlainDataDeliveryPlan;
};

export interface LocalPlainDataDeliveryStepResult {
  readonly state: LocalPlainDataDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LocalPlainDataDeliveryAction[];
}

export function initialLocalPlainDataDeliveryState(): LocalPlainDataDeliveryState {
  return {};
}

export const stepLocalPlainDataDelivery: StepFn<LocalPlainDataDeliveryState> = (state, event) => {
  const result = stepLocalPlainDataDeliveryInner(state, event as LocalPlainDataDeliveryEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLocalPlainDataDeliveryWithActions(
  state: LocalPlainDataDeliveryState,
  event: LocalPlainDataDeliveryEvent
): LocalPlainDataDeliveryStepResult {
  return stepLocalPlainDataDeliveryInner(state, event);
}

export function localPlainDataDeliveryFromActions(
  actions: ReadonlyArray<LocalPlainDataDeliveryAction>
): LocalPlainDataDeliveryPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldDispatchLocalPlainDataDeliveryActions(
  actions: ReadonlyArray<LocalPlainDataDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "dispatch");
}

export function shouldIgnoreLocalPlainDataDelivery(
  actions: ReadonlyArray<LocalPlainDataDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepLocalPlainDataDeliveryInner(
  state: LocalPlainDataDeliveryState,
  event: LocalPlainDataDeliveryEvent
): LocalPlainDataDeliveryStepResult {
  if (event.kind === "transport/local-plain-data-gate") {
    const plan = planLocalPlainDataDelivery({
      destinationPresent: event.destinationPresent,
      plaintextPresent: event.plaintextPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Proof ingress kind is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ProofIngressState = Record<string, never>;

export type ProofIngressEvent =
  | Event
  | {
      readonly kind: "transport/proof-ingress-gate";
      readonly context: number;
    };

export type ProofIngressAction = {
  readonly kind: ProofIngressKind;
};

export interface ProofIngressStepResult {
  readonly state: ProofIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProofIngressAction[];
}

export function initialProofIngressState(): ProofIngressState {
  return {};
}

export const stepProofIngress: StepFn<ProofIngressState> = (state, event) => {
  const result = stepProofIngressInner(state, event as ProofIngressEvent);
  return { state: result.state, intents: result.intents };
};

export function stepProofIngressWithActions(
  state: ProofIngressState,
  event: ProofIngressEvent
): ProofIngressStepResult {
  return stepProofIngressInner(state, event);
}

export function proofIngressKindFromActions(
  actions: ReadonlyArray<ProofIngressAction>
): ProofIngressKind | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldHandleProofLrproof(
  actions: ReadonlyArray<ProofIngressAction>
): boolean {
  return actions.some((action) => action.kind === "lrproof");
}

export function shouldHandleProofResourcePrf(
  actions: ReadonlyArray<ProofIngressAction>
): boolean {
  return actions.some((action) => action.kind === "resource-prf");
}

export function shouldHandleProofReceipt(
  actions: ReadonlyArray<ProofIngressAction>
): boolean {
  return actions.some((action) => action.kind === "receipt");
}

function stepProofIngressInner(
  state: ProofIngressState,
  event: ProofIngressEvent
): ProofIngressStepResult {
  if (event.kind === "transport/proof-ingress-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planProofIngressKind(event.context) }]
    };
  }

  return { state, intents: [], actions: [] };
}
