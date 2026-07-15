/**
 * Pure transport ingress accept / filter / packet-hash deferral / relay decisions.
 * Hash tables and interface identity stay at the adapter edge as boolean inputs.
 * Ingress dispatch / matching-link-id index / link-data target / reverse-relay /
 * hash-remember / packet-hash defer / local plain-data / link-relay conclusions
 * leave via machine actions (no ad-hoc plan / `indexOfMatchingLinkId` reads
 * beside the step). Ingress-dispatch / link-data-ingress-target plans nested via
 * {@link stepTransportIngressDispatchPlanWithActions} /
 * {@link stepLinkDataIngressTargetPlanWithActions}.
 * Transport-wrap relay allow, link/reverse table-record, link-packet relay allow,
 * link-table lookup, link-relay transmit, reverse-packet allow, reverse iface
 * match, reverse-entry expiry, reverse-relay transmit, interface transmit, local
 * destination match/dispatch, LR-proof accept, resource-prf dispatch, and
 * transport-member register conclude via machine actions (no ad-hoc
 * `canRelayTransportPacket` / `shouldRecordLinkRelayTableEntry` /
 * `shouldRecordReverseTableEntry` / `isLocalPathRequestPacket` /
 * `canRelayLinkPacket` / `canLookupLinkRelayEntry` /
 * `shouldTransmitLinkRelay` / `canRelayReversePacket` /
 * `shouldRelayReverseOnInterface` / `isReverseEntryExpired` /
 * `shouldTransmitReverseRelay` / `shouldTransmitOnInterface` /
 * `shouldMatchLocalInboundDestination` / `shouldMatchLocalTypedDestination` /
 * `shouldDispatchLocalLinkRequest` / `shouldAcceptLinkLrProofCandidate` /
 * `shouldDispatchResourceProofToLink` / `shouldRegisterTransportMember`
 * reads beside the step).
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

/**
 * Transport-packet accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptTransportPacket`
 * reads beside the step).
 */
export type AcceptTransportPacketState = Record<string, never>;

export type AcceptTransportPacketEvent =
  | Event
  | {
      readonly kind: "transport/accept-packet-gate";
      readonly filterPassed: boolean;
      readonly packetType: number;
      readonly transportType: number;
      readonly hasForeignTransportId: boolean;
      readonly alreadySeenHash: boolean;
    };

export type AcceptTransportPacketAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptTransportPacketStepResult {
  readonly state: AcceptTransportPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptTransportPacketAction[];
}

export function initialAcceptTransportPacketState(): AcceptTransportPacketState {
  return {};
}

export function stepAcceptTransportPacketWithActions(
  state: AcceptTransportPacketState,
  event: AcceptTransportPacketEvent
): AcceptTransportPacketStepResult {
  if (event.kind === "transport/accept-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptTransportPacket({
            filterPassed: event.filterPassed,
            packetType: event.packetType,
            transportType: event.transportType,
            hasForeignTransportId: event.hasForeignTransportId,
            alreadySeenHash: event.alreadySeenHash
          })
            ? "accept"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptTransportPacketNow(
  actions: ReadonlyArray<AcceptTransportPacketAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptTransportPacket(
  actions: ReadonlyArray<AcceptTransportPacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * Packet-hash deferral is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDeferPacketHash`
 * reads beside the step).
 */
export type PacketHashDeferState = Record<string, never>;

export type PacketHashDeferEvent =
  | Event
  | {
      readonly kind: "transport/packet-hash-defer-gate";
      readonly packetType: number;
      readonly context: number;
      readonly destinationInLinkTable: boolean;
    };

export type PacketHashDeferAction =
  | { readonly kind: "defer" }
  | { readonly kind: "remember-now" };

export interface PacketHashDeferStepResult {
  readonly state: PacketHashDeferState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketHashDeferAction[];
}

export function initialPacketHashDeferState(): PacketHashDeferState {
  return {};
}

export function stepPacketHashDeferWithActions(
  state: PacketHashDeferState,
  event: PacketHashDeferEvent
): PacketHashDeferStepResult {
  if (event.kind === "transport/packet-hash-defer-gate") {
    const defer = shouldDeferPacketHash({
      packetType: event.packetType,
      context: event.context,
      destinationInLinkTable: event.destinationInLinkTable
    });
    return {
      state,
      intents: [],
      actions: [{ kind: defer ? "defer" : "remember-now" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDeferPacketHashActions(
  actions: ReadonlyArray<PacketHashDeferAction>
): boolean {
  return actions.some((action) => action.kind === "defer");
}

export function shouldRememberPacketHashImmediately(
  actions: ReadonlyArray<PacketHashDeferAction>
): boolean {
  return actions.some((action) => action.kind === "remember-now");
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

/**
 * canLookupLinkRelayEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLookupLinkRelayEntry`
 * reads beside the step).
 */
export type LookupLinkRelayEntryState = Record<string, never>;

export type LookupLinkRelayEntryEvent =
  | Event
  | {
      readonly kind: "transport/lookup-link-relay-entry-gate";
      readonly entryPresent: boolean;
    };

export type LookupLinkRelayEntryAction =
  | { readonly kind: "hit" }
  | { readonly kind: "miss" };

export interface LookupLinkRelayEntryStepResult {
  readonly state: LookupLinkRelayEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LookupLinkRelayEntryAction[];
}

export function initialLookupLinkRelayEntryState(): LookupLinkRelayEntryState {
  return {};
}

export function stepLookupLinkRelayEntryWithActions(
  state: LookupLinkRelayEntryState,
  event: LookupLinkRelayEntryEvent
): LookupLinkRelayEntryStepResult {
  if (event.kind === "transport/lookup-link-relay-entry-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: canLookupLinkRelayEntry(event.entryPresent) ? "hit" : "miss" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldHitLookupLinkRelayEntry(
  actions: ReadonlyArray<LookupLinkRelayEntryAction>
): boolean {
  return actions.some((action) => action.kind === "hit");
}

export function shouldMissLookupLinkRelayEntry(
  actions: ReadonlyArray<LookupLinkRelayEntryAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

/** Whether link-relay may transmit after {@link planLinkRelayTarget} resolves an iface. */
export function shouldTransmitLinkRelay(outboundPresent: boolean): boolean {
  return outboundPresent;
}

/**
 * shouldTransmitLinkRelay gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitLinkRelay`
 * reads beside the step).
 */
export type TransmitLinkRelayState = Record<string, never>;

export type TransmitLinkRelayEvent =
  | Event
  | {
      readonly kind: "transport/transmit-link-relay-gate";
      readonly outboundPresent: boolean;
    };

export type TransmitLinkRelayAction =
  | { readonly kind: "transmit" }
  | { readonly kind: "skip" };

export interface TransmitLinkRelayStepResult {
  readonly state: TransmitLinkRelayState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransmitLinkRelayAction[];
}

export function initialTransmitLinkRelayState(): TransmitLinkRelayState {
  return {};
}

export function stepTransmitLinkRelayWithActions(
  state: TransmitLinkRelayState,
  event: TransmitLinkRelayEvent
): TransmitLinkRelayStepResult {
  if (event.kind === "transport/transmit-link-relay-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: shouldTransmitLinkRelay(event.outboundPresent) ? "transmit" : "skip" }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTransmitLinkRelayNow(
  actions: ReadonlyArray<TransmitLinkRelayAction>
): boolean {
  return actions.some((action) => action.kind === "transmit");
}

export function shouldSkipTransmitLinkRelay(
  actions: ReadonlyArray<TransmitLinkRelayAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * shouldTransmitReverseRelay gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitReverseRelay`
 * reads beside the step).
 */
export type TransmitReverseRelayState = Record<string, never>;

export type TransmitReverseRelayEvent =
  | Event
  | {
      readonly kind: "transport/transmit-reverse-relay-gate";
      readonly relayOk: boolean;
      readonly entryPresent: boolean;
    };

export type TransmitReverseRelayAction =
  | { readonly kind: "transmit" }
  | { readonly kind: "skip" };

export interface TransmitReverseRelayStepResult {
  readonly state: TransmitReverseRelayState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransmitReverseRelayAction[];
}

export function initialTransmitReverseRelayState(): TransmitReverseRelayState {
  return {};
}

export function stepTransmitReverseRelayWithActions(
  state: TransmitReverseRelayState,
  event: TransmitReverseRelayEvent
): TransmitReverseRelayStepResult {
  if (event.kind === "transport/transmit-reverse-relay-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTransmitReverseRelay({
            relayOk: event.relayOk,
            entryPresent: event.entryPresent
          })
            ? "transmit"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTransmitReverseRelayNow(
  actions: ReadonlyArray<TransmitReverseRelayAction>
): boolean {
  return actions.some((action) => action.kind === "transmit");
}

export function shouldSkipTransmitReverseRelay(
  actions: ReadonlyArray<TransmitReverseRelayAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
 * isReverseEntryExpired gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isReverseEntryExpired`
 * reads beside the step).
 */
export type ReverseEntryExpiredState = Record<string, never>;

export type ReverseEntryExpiredEvent =
  | Event
  | {
      readonly kind: "transport/reverse-entry-expired-gate";
      readonly timestamp: number;
      readonly nowSeconds: number;
      readonly timeoutSeconds?: number;
    };

export type ReverseEntryExpiredAction =
  | { readonly kind: "expired" }
  | { readonly kind: "live" };

export interface ReverseEntryExpiredStepResult {
  readonly state: ReverseEntryExpiredState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReverseEntryExpiredAction[];
}

export function initialReverseEntryExpiredState(): ReverseEntryExpiredState {
  return {};
}

export function stepReverseEntryExpiredWithActions(
  state: ReverseEntryExpiredState,
  event: ReverseEntryExpiredEvent
): ReverseEntryExpiredStepResult {
  if (event.kind === "transport/reverse-entry-expired-gate") {
    const expiredInput =
      event.timeoutSeconds === undefined
        ? { timestamp: event.timestamp, nowSeconds: event.nowSeconds }
        : {
            timestamp: event.timestamp,
            nowSeconds: event.nowSeconds,
            timeoutSeconds: event.timeoutSeconds
          };
    return {
      state,
      intents: [],
      actions: [{ kind: isReverseEntryExpired(expiredInput) ? "expired" : "live" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatReverseEntryExpired(
  actions: ReadonlyArray<ReverseEntryExpiredAction>
): boolean {
  return actions.some((action) => action.kind === "expired");
}

export function shouldTreatReverseEntryLive(
  actions: ReadonlyArray<ReverseEntryExpiredAction>
): boolean {
  return actions.some((action) => action.kind === "live");
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

/**
 * canRelayTransportPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRelayTransportPacket`
 * reads beside the step).
 */
export type RelayTransportPacketAllowState = Record<string, never>;

export type RelayTransportPacketAllowEvent =
  | Event
  | {
      readonly kind: "transport/relay-transport-packet-allow-gate";
      readonly transportIdPresent: boolean;
      readonly isAnnounce: boolean;
      readonly transportIdMatchesLocal: boolean;
      readonly hasPath: boolean;
    };

export type RelayTransportPacketAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface RelayTransportPacketAllowStepResult {
  readonly state: RelayTransportPacketAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RelayTransportPacketAllowAction[];
}

export function initialRelayTransportPacketAllowState(): RelayTransportPacketAllowState {
  return {};
}

export function stepRelayTransportPacketAllowWithActions(
  state: RelayTransportPacketAllowState,
  event: RelayTransportPacketAllowEvent
): RelayTransportPacketAllowStepResult {
  if (event.kind === "transport/relay-transport-packet-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRelayTransportPacket({
            transportIdPresent: event.transportIdPresent,
            isAnnounce: event.isAnnounce,
            transportIdMatchesLocal: event.transportIdMatchesLocal,
            hasPath: event.hasPath
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowRelayTransportPacket(
  actions: ReadonlyArray<RelayTransportPacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyRelayTransportPacket(
  actions: ReadonlyArray<RelayTransportPacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether a relayed packet should create/update a link-relay table entry. */
export function shouldRecordLinkRelayTableEntry(packetType: number): boolean {
  return packetType === PACKET_TYPE_LINKREQUEST;
}

/**
 * shouldRecordLinkRelayTableEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRecordLinkRelayTableEntry`
 * reads beside the step).
 */
export type RecordLinkRelayTableEntryState = Record<string, never>;

export type RecordLinkRelayTableEntryEvent =
  | Event
  | {
      readonly kind: "transport/record-link-relay-table-entry-gate";
      readonly packetType: number;
    };

export type RecordLinkRelayTableEntryAction =
  | { readonly kind: "record" }
  | { readonly kind: "skip" };

export interface RecordLinkRelayTableEntryStepResult {
  readonly state: RecordLinkRelayTableEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RecordLinkRelayTableEntryAction[];
}

export function initialRecordLinkRelayTableEntryState(): RecordLinkRelayTableEntryState {
  return {};
}

export function stepRecordLinkRelayTableEntryWithActions(
  state: RecordLinkRelayTableEntryState,
  event: RecordLinkRelayTableEntryEvent
): RecordLinkRelayTableEntryStepResult {
  if (event.kind === "transport/record-link-relay-table-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRecordLinkRelayTableEntry(event.packetType) ? "record" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRecordLinkRelayTableEntryNow(
  actions: ReadonlyArray<RecordLinkRelayTableEntryAction>
): boolean {
  return actions.some((action) => action.kind === "record");
}

export function shouldSkipRecordLinkRelayTableEntry(
  actions: ReadonlyArray<RecordLinkRelayTableEntryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * shouldRecordReverseTableEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRecordReverseTableEntry`
 * reads beside the step).
 */
export type RecordReverseTableEntryState = Record<string, never>;

export type RecordReverseTableEntryEvent =
  | Event
  | {
      readonly kind: "transport/record-reverse-table-entry-gate";
      readonly packetType: number;
      readonly context: number;
    };

export type RecordReverseTableEntryAction =
  | { readonly kind: "record" }
  | { readonly kind: "skip" };

export interface RecordReverseTableEntryStepResult {
  readonly state: RecordReverseTableEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RecordReverseTableEntryAction[];
}

export function initialRecordReverseTableEntryState(): RecordReverseTableEntryState {
  return {};
}

export function stepRecordReverseTableEntryWithActions(
  state: RecordReverseTableEntryState,
  event: RecordReverseTableEntryEvent
): RecordReverseTableEntryStepResult {
  if (event.kind === "transport/record-reverse-table-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRecordReverseTableEntry({
            packetType: event.packetType,
            context: event.context
          })
            ? "record"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRecordReverseTableEntryNow(
  actions: ReadonlyArray<RecordReverseTableEntryAction>
): boolean {
  return actions.some((action) => action.kind === "record");
}

export function shouldSkipRecordReverseTableEntry(
  actions: ReadonlyArray<RecordReverseTableEntryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether inbound DATA is a local path-request (PLAIN + path-request hash). */
export function isLocalPathRequestPacket(input: {
  readonly destinationTypePlain: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.destinationTypePlain && input.destinationHashMatches;
}

/**
 * Local path-request packet gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLocalPathRequestPacket`
 * reads beside the step).
 */
export type LocalPathRequestPacketState = Record<string, never>;

export type LocalPathRequestPacketEvent =
  | Intent
  | {
      readonly kind: "transport/local-path-request-packet-gate";
      readonly destinationTypePlain: boolean;
      readonly destinationHashMatches: boolean;
    };

export type LocalPathRequestPacketAction =
  | { readonly kind: "path-request" }
  | { readonly kind: "other" };

export interface LocalPathRequestPacketStepResult {
  readonly state: LocalPathRequestPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LocalPathRequestPacketAction[];
}

export function initialLocalPathRequestPacketState(): LocalPathRequestPacketState {
  return {};
}

export function stepLocalPathRequestPacketWithActions(
  state: LocalPathRequestPacketState,
  event: LocalPathRequestPacketEvent
): LocalPathRequestPacketStepResult {
  if (event.kind === "transport/local-path-request-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLocalPathRequestPacket({
            destinationTypePlain: event.destinationTypePlain,
            destinationHashMatches: event.destinationHashMatches
          })
            ? "path-request"
            : "other"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatLocalPathRequestPacket(
  actions: ReadonlyArray<LocalPathRequestPacketAction>
): boolean {
  return actions.some((action) => action.kind === "path-request");
}

export function shouldTreatLocalPathRequestPacketOther(
  actions: ReadonlyArray<LocalPathRequestPacketAction>
): boolean {
  return actions.some((action) => action.kind === "other");
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
 * canRelayLinkPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRelayLinkPacket` reads
 * beside the step).
 */
export type RelayLinkPacketAllowState = Record<string, never>;

export type RelayLinkPacketAllowEvent =
  | Event
  | {
      readonly kind: "transport/relay-link-packet-allow-gate";
      readonly packetType: number;
    };

export type RelayLinkPacketAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface RelayLinkPacketAllowStepResult {
  readonly state: RelayLinkPacketAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RelayLinkPacketAllowAction[];
}

export function initialRelayLinkPacketAllowState(): RelayLinkPacketAllowState {
  return {};
}

export function stepRelayLinkPacketAllowWithActions(
  state: RelayLinkPacketAllowState,
  event: RelayLinkPacketAllowEvent
): RelayLinkPacketAllowStepResult {
  if (event.kind === "transport/relay-link-packet-allow-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: canRelayLinkPacket(event.packetType) ? "allow" : "deny" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowRelayLinkPacket(
  actions: ReadonlyArray<RelayLinkPacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyRelayLinkPacket(
  actions: ReadonlyArray<RelayLinkPacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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

/**
 * canRelayReversePacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRelayReversePacket`
 * reads beside the step).
 */
export type RelayReversePacketAllowState = Record<string, never>;

export type RelayReversePacketAllowEvent =
  | Event
  | {
      readonly kind: "transport/relay-reverse-packet-allow-gate";
      readonly isProof: boolean;
      readonly hasEntry: boolean;
      readonly entryExpired: boolean;
    };

export type RelayReversePacketAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface RelayReversePacketAllowStepResult {
  readonly state: RelayReversePacketAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RelayReversePacketAllowAction[];
}

export function initialRelayReversePacketAllowState(): RelayReversePacketAllowState {
  return {};
}

export function stepRelayReversePacketAllowWithActions(
  state: RelayReversePacketAllowState,
  event: RelayReversePacketAllowEvent
): RelayReversePacketAllowStepResult {
  if (event.kind === "transport/relay-reverse-packet-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRelayReversePacket({
            isProof: event.isProof,
            hasEntry: event.hasEntry,
            entryExpired: event.entryExpired
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowRelayReversePacket(
  actions: ReadonlyArray<RelayReversePacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyRelayReversePacket(
  actions: ReadonlyArray<RelayReversePacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether reverse relay should use this iface (must be the reverse entry's outbound). */
export function shouldRelayReverseOnInterface(ifaceIsOutbound: boolean): boolean {
  return ifaceIsOutbound;
}

/**
 * shouldRelayReverseOnInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRelayReverseOnInterface`
 * reads beside the step).
 */
export type RelayReverseOnInterfaceState = Record<string, never>;

export type RelayReverseOnInterfaceEvent =
  | Event
  | {
      readonly kind: "transport/relay-reverse-on-interface-gate";
      readonly ifaceIsOutbound: boolean;
    };

export type RelayReverseOnInterfaceAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export interface RelayReverseOnInterfaceStepResult {
  readonly state: RelayReverseOnInterfaceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RelayReverseOnInterfaceAction[];
}

export function initialRelayReverseOnInterfaceState(): RelayReverseOnInterfaceState {
  return {};
}

export function stepRelayReverseOnInterfaceWithActions(
  state: RelayReverseOnInterfaceState,
  event: RelayReverseOnInterfaceEvent
): RelayReverseOnInterfaceStepResult {
  if (event.kind === "transport/relay-reverse-on-interface-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRelayReverseOnInterface(event.ifaceIsOutbound) ? "match" : "mismatch"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchRelayReverseOnInterface(
  actions: ReadonlyArray<RelayReverseOnInterfaceAction>
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchRelayReverseOnInterface(
  actions: ReadonlyArray<RelayReverseOnInterfaceAction>
): boolean {
  return actions.some((action) => action.kind === "mismatch");
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

/**
 * Transport-ingress-dispatch plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planTransportIngressDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepTransportIngressDispatchWithActions}.
 */
export type TransportIngressDispatchPlanState = Record<string, never>;

export type TransportIngressDispatchPlanEvent =
  | Event
  | {
      readonly kind: "transport/ingress-dispatch-plan-gate";
      readonly packetType: number;
      readonly destinationType: number;
    };

export type TransportIngressDispatchPlanAction = {
  readonly kind: TransportIngressDispatch;
};

export interface TransportIngressDispatchPlanStepResult {
  readonly state: TransportIngressDispatchPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportIngressDispatchPlanAction[];
}

export function initialTransportIngressDispatchPlanState(): TransportIngressDispatchPlanState {
  return {};
}

export function stepTransportIngressDispatchPlanWithActions(
  state: TransportIngressDispatchPlanState,
  event: TransportIngressDispatchPlanEvent
): TransportIngressDispatchPlanStepResult {
  if (event.kind === "transport/ingress-dispatch-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planTransportIngressDispatch({
            packetType: event.packetType,
            destinationType: event.destinationType
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the transport ingress dispatch plan from actions; null when empty. */
export function transportIngressDispatchPlanFromActions(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): TransportIngressDispatch | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "announce" ||
      entry.kind === "link-request" ||
      entry.kind === "link-data" ||
      entry.kind === "plain-data" ||
      entry.kind === "proof" ||
      entry.kind === "ignore"
  );
  return action?.kind ?? null;
}

export function shouldDispatchTransportAnnouncePlan(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): boolean {
  return actions.some((action) => action.kind === "announce");
}

export function shouldDispatchTransportLinkRequestPlan(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): boolean {
  return actions.some((action) => action.kind === "link-request");
}

export function shouldDispatchTransportLinkDataPlan(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): boolean {
  return actions.some((action) => action.kind === "link-data");
}

export function shouldDispatchTransportPlainDataPlan(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): boolean {
  return actions.some((action) => action.kind === "plain-data");
}

export function shouldDispatchTransportProofPlan(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): boolean {
  return actions.some((action) => action.kind === "proof");
}

export function shouldIgnoreTransportIngressDispatchPlan(
  actions: ReadonlyArray<TransportIngressDispatchPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
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

/**
 * shouldTransmitOnInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitOnInterface`
 * reads beside the step).
 */
export type TransmitOnInterfaceState = Record<string, never>;

export type TransmitOnInterfaceEvent =
  | Event
  | {
      readonly kind: "transport/transmit-on-interface-gate";
      readonly outgoing: boolean;
      readonly isExcludedInterface?: boolean;
      readonly requireAttached?: boolean;
      readonly isAttached?: boolean;
    };

export type TransmitOnInterfaceAction =
  | { readonly kind: "transmit" }
  | { readonly kind: "skip" };

export interface TransmitOnInterfaceStepResult {
  readonly state: TransmitOnInterfaceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransmitOnInterfaceAction[];
}

export function initialTransmitOnInterfaceState(): TransmitOnInterfaceState {
  return {};
}

export function stepTransmitOnInterfaceWithActions(
  state: TransmitOnInterfaceState,
  event: TransmitOnInterfaceEvent
): TransmitOnInterfaceStepResult {
  if (event.kind === "transport/transmit-on-interface-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTransmitOnInterface({
            outgoing: event.outgoing,
            ...(event.isExcludedInterface !== undefined
              ? { isExcludedInterface: event.isExcludedInterface }
              : {}),
            ...(event.requireAttached !== undefined
              ? { requireAttached: event.requireAttached }
              : {}),
            ...(event.isAttached !== undefined ? { isAttached: event.isAttached } : {})
          })
            ? "transmit"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTransmitOnInterfaceNow(
  actions: ReadonlyArray<TransmitOnInterfaceAction>
): boolean {
  return actions.some((action) => action.kind === "transmit");
}

export function shouldSkipTransmitOnInterface(
  actions: ReadonlyArray<TransmitOnInterfaceAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Local IN destination match (announce / path-request answerer). */
export function shouldMatchLocalInboundDestination(input: {
  readonly hashMatches: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.hashMatches && input.directionIn;
}

/**
 * shouldMatchLocalInboundDestination gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldMatchLocalInboundDestination` reads beside the step).
 */
export type MatchLocalInboundDestinationState = Record<string, never>;

export type MatchLocalInboundDestinationEvent =
  | Event
  | {
      readonly kind: "transport/match-local-inbound-destination-gate";
      readonly hashMatches: boolean;
      readonly directionIn: boolean;
    };

export type MatchLocalInboundDestinationAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export interface MatchLocalInboundDestinationStepResult {
  readonly state: MatchLocalInboundDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MatchLocalInboundDestinationAction[];
}

export function initialMatchLocalInboundDestinationState(): MatchLocalInboundDestinationState {
  return {};
}

export function stepMatchLocalInboundDestinationWithActions(
  state: MatchLocalInboundDestinationState,
  event: MatchLocalInboundDestinationEvent
): MatchLocalInboundDestinationStepResult {
  if (event.kind === "transport/match-local-inbound-destination-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldMatchLocalInboundDestination({
            hashMatches: event.hashMatches,
            directionIn: event.directionIn
          })
            ? "match"
            : "mismatch"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchLocalInboundDestinationNow(
  actions: ReadonlyArray<MatchLocalInboundDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchLocalInboundDestination(
  actions: ReadonlyArray<MatchLocalInboundDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "mismatch");
}

/** Local typed destination match (plain DATA delivery). */
export function shouldMatchLocalTypedDestination(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
}): boolean {
  return input.hashMatches && input.typeMatches;
}

/**
 * shouldMatchLocalTypedDestination gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldMatchLocalTypedDestination` reads beside the step).
 */
export type MatchLocalTypedDestinationState = Record<string, never>;

export type MatchLocalTypedDestinationEvent =
  | Event
  | {
      readonly kind: "transport/match-local-typed-destination-gate";
      readonly hashMatches: boolean;
      readonly typeMatches: boolean;
    };

export type MatchLocalTypedDestinationAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export interface MatchLocalTypedDestinationStepResult {
  readonly state: MatchLocalTypedDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MatchLocalTypedDestinationAction[];
}

export function initialMatchLocalTypedDestinationState(): MatchLocalTypedDestinationState {
  return {};
}

export function stepMatchLocalTypedDestinationWithActions(
  state: MatchLocalTypedDestinationState,
  event: MatchLocalTypedDestinationEvent
): MatchLocalTypedDestinationStepResult {
  if (event.kind === "transport/match-local-typed-destination-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldMatchLocalTypedDestination({
            hashMatches: event.hashMatches,
            typeMatches: event.typeMatches
          })
            ? "match"
            : "mismatch"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchLocalTypedDestinationNow(
  actions: ReadonlyArray<MatchLocalTypedDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchLocalTypedDestination(
  actions: ReadonlyArray<MatchLocalTypedDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "mismatch");
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
 * shouldDispatchLocalLinkRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchLocalLinkRequest` reads beside the step).
 */
export type DispatchLocalLinkRequestState = Record<string, never>;

export type DispatchLocalLinkRequestEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-local-link-request-gate";
      readonly hashMatches: boolean;
      readonly typeMatches: boolean;
      readonly handlerPresent: boolean;
    };

export type DispatchLocalLinkRequestAction =
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

export interface DispatchLocalLinkRequestStepResult {
  readonly state: DispatchLocalLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchLocalLinkRequestAction[];
}

export function initialDispatchLocalLinkRequestState(): DispatchLocalLinkRequestState {
  return {};
}

export function stepDispatchLocalLinkRequestWithActions(
  state: DispatchLocalLinkRequestState,
  event: DispatchLocalLinkRequestEvent
): DispatchLocalLinkRequestStepResult {
  if (event.kind === "transport/dispatch-local-link-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDispatchLocalLinkRequest({
            hashMatches: event.hashMatches,
            typeMatches: event.typeMatches,
            handlerPresent: event.handlerPresent
          })
            ? "dispatch"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchLocalLinkRequestNow(
  actions: ReadonlyArray<DispatchLocalLinkRequestAction>
): boolean {
  return actions.some((action) => action.kind === "dispatch");
}

export function shouldSkipDispatchLocalLinkRequest(
  actions: ReadonlyArray<DispatchLocalLinkRequestAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * shouldAcceptLinkLrProofCandidate gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptLinkLrProofCandidate` reads beside the step).
 */
export type AcceptLinkLrProofCandidateState = Record<string, never>;

export type AcceptLinkLrProofCandidateEvent =
  | Event
  | {
      readonly kind: "transport/accept-link-lr-proof-candidate-gate";
      readonly linkIdMatches: boolean;
      readonly hopsMatch: boolean;
    };

export type AcceptLinkLrProofCandidateAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface AcceptLinkLrProofCandidateStepResult {
  readonly state: AcceptLinkLrProofCandidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkLrProofCandidateAction[];
}

export function initialAcceptLinkLrProofCandidateState(): AcceptLinkLrProofCandidateState {
  return {};
}

export function stepAcceptLinkLrProofCandidateWithActions(
  state: AcceptLinkLrProofCandidateState,
  event: AcceptLinkLrProofCandidateEvent
): AcceptLinkLrProofCandidateStepResult {
  if (event.kind === "transport/accept-link-lr-proof-candidate-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptLinkLrProofCandidate({
            linkIdMatches: event.linkIdMatches,
            hopsMatch: event.hopsMatch
          })
            ? "accept"
            : "reject"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkLrProofCandidateNow(
  actions: ReadonlyArray<AcceptLinkLrProofCandidateAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkLrProofCandidate(
  actions: ReadonlyArray<AcceptLinkLrProofCandidateAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
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

/**
 * Local plain-data dispatch-after-plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchLocalPlainDataDelivery` reads beside the step).
 */
export type DispatchLocalPlainDataDeliveryState = Record<string, never>;

export type DispatchLocalPlainDataDeliveryEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-local-plain-data-gate";
      readonly planDispatch: boolean;
      readonly destinationPresent: boolean;
      readonly plaintextPresent: boolean;
    };

export type DispatchLocalPlainDataDeliveryAction =
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

export interface DispatchLocalPlainDataDeliveryStepResult {
  readonly state: DispatchLocalPlainDataDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchLocalPlainDataDeliveryAction[];
}

export function initialDispatchLocalPlainDataDeliveryState(): DispatchLocalPlainDataDeliveryState {
  return {};
}

export function stepDispatchLocalPlainDataDeliveryWithActions(
  state: DispatchLocalPlainDataDeliveryState,
  event: DispatchLocalPlainDataDeliveryEvent
): DispatchLocalPlainDataDeliveryStepResult {
  if (event.kind === "transport/dispatch-local-plain-data-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDispatchLocalPlainDataDelivery({
            planDispatch: event.planDispatch,
            destinationPresent: event.destinationPresent,
            plaintextPresent: event.plaintextPresent
          })
            ? "dispatch"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchLocalPlainDataDeliveryNow(
  actions: ReadonlyArray<DispatchLocalPlainDataDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "dispatch");
}

export function shouldSkipDispatchLocalPlainDataDelivery(
  actions: ReadonlyArray<DispatchLocalPlainDataDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * shouldDispatchResourceProofToLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchResourceProofToLink` reads beside the step).
 */
export type DispatchResourceProofToLinkState = Record<string, never>;

export type DispatchResourceProofToLinkEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-resource-proof-to-link-gate";
      readonly activeIndexPresent: boolean;
    };

export type DispatchResourceProofToLinkAction =
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

export interface DispatchResourceProofToLinkStepResult {
  readonly state: DispatchResourceProofToLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchResourceProofToLinkAction[];
}

export function initialDispatchResourceProofToLinkState(): DispatchResourceProofToLinkState {
  return {};
}

export function stepDispatchResourceProofToLinkWithActions(
  state: DispatchResourceProofToLinkState,
  event: DispatchResourceProofToLinkEvent
): DispatchResourceProofToLinkStepResult {
  if (event.kind === "transport/dispatch-resource-proof-to-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDispatchResourceProofToLink(event.activeIndexPresent)
            ? "dispatch"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchResourceProofToLinkNow(
  actions: ReadonlyArray<DispatchResourceProofToLinkAction>
): boolean {
  return actions.some((action) => action.kind === "dispatch");
}

export function shouldSkipDispatchResourceProofToLink(
  actions: ReadonlyArray<DispatchResourceProofToLinkAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

/**
 * Matching link-id index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfMatchingLinkId`
 * reads beside the step).
 */
export type IndexOfMatchingLinkIdState = Record<string, never>;

export type IndexOfMatchingLinkIdEvent =
  | Event
  | {
      readonly kind: "transport/matching-link-id-index-gate";
      readonly linkIds: ReadonlyArray<Uint8Array>;
      readonly target: Uint8Array;
    };

export type IndexOfMatchingLinkIdAction =
  | { readonly kind: "use-index"; readonly index: number }
  | { readonly kind: "miss" };

export interface IndexOfMatchingLinkIdStepResult {
  readonly state: IndexOfMatchingLinkIdState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfMatchingLinkIdAction[];
}

export function initialIndexOfMatchingLinkIdState(): IndexOfMatchingLinkIdState {
  return {};
}

export function stepIndexOfMatchingLinkIdWithActions(
  state: IndexOfMatchingLinkIdState,
  event: IndexOfMatchingLinkIdEvent
): IndexOfMatchingLinkIdStepResult {
  if (event.kind === "transport/matching-link-id-index-gate") {
    const index = indexOfMatchingLinkId({
      linkIds: event.linkIds,
      target: event.target
    });
    return {
      state,
      intents: [],
      actions:
        index === null
          ? [{ kind: "miss" }]
          : [{ kind: "use-index", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseMatchingLinkIdIndex(
  actions: ReadonlyArray<IndexOfMatchingLinkIdAction>
): boolean {
  return actions.some((action) => action.kind === "use-index");
}

export function shouldMissMatchingLinkIdIndex(
  actions: ReadonlyArray<IndexOfMatchingLinkIdAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

/** Extract matching link-id index from step actions; null when no `use-index`. */
export function matchingLinkIdIndexFromActions(
  actions: ReadonlyArray<IndexOfMatchingLinkIdAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-index");
  return action?.kind === "use-index" ? action.index : null;
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

/**
 * Link-data ingress target plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkDataIngressTarget` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkDataIngressTargetWithActions}.
 */
export type LinkDataIngressTargetPlanState = Record<string, never>;

export type LinkDataIngressTargetPlanEvent =
  | Event
  | {
      readonly kind: "transport/link-data-ingress-plan-gate";
      readonly activeIndex: number | null;
      readonly pendingIndex: number | null;
    };

export type LinkDataIngressTargetPlanAction = { readonly kind: LinkDataIngressTarget };

export interface LinkDataIngressTargetPlanStepResult {
  readonly state: LinkDataIngressTargetPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkDataIngressTargetPlanAction[];
}

export function initialLinkDataIngressTargetPlanState(): LinkDataIngressTargetPlanState {
  return {};
}

export function stepLinkDataIngressTargetPlanWithActions(
  state: LinkDataIngressTargetPlanState,
  event: LinkDataIngressTargetPlanEvent
): LinkDataIngressTargetPlanStepResult {
  if (event.kind === "transport/link-data-ingress-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkDataIngressTarget({
            activeIndex: event.activeIndex,
            pendingIndex: event.pendingIndex
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the link-data ingress target plan from actions; null when empty. */
export function linkDataIngressTargetPlanFromActions(
  actions: ReadonlyArray<LinkDataIngressTargetPlanAction>
): LinkDataIngressTarget | null {
  const action = actions.find(
    (entry) => entry.kind === "active" || entry.kind === "pending" || entry.kind === "none"
  );
  return action?.kind ?? null;
}

export function shouldIngressLinkDataActivePlan(
  actions: ReadonlyArray<LinkDataIngressTargetPlanAction>
): boolean {
  return actions.some((action) => action.kind === "active");
}

export function shouldIngressLinkDataPendingPlan(
  actions: ReadonlyArray<LinkDataIngressTargetPlanAction>
): boolean {
  return actions.some((action) => action.kind === "pending");
}

export function shouldIngressLinkDataNonePlan(
  actions: ReadonlyArray<LinkDataIngressTargetPlanAction>
): boolean {
  return actions.some((action) => action.kind === "none");
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
 * shouldRegisterTransportMember gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterTransportMember` reads beside the step).
 */
export type RegisterTransportMemberState = Record<string, never>;

export type RegisterTransportMemberEvent =
  | Event
  | {
      readonly kind: "transport/member-register-gate";
      readonly alreadyPresent: boolean;
    };

export type RegisterTransportMemberAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export interface RegisterTransportMemberStepResult {
  readonly state: RegisterTransportMemberState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterTransportMemberAction[];
}

export function initialRegisterTransportMemberState(): RegisterTransportMemberState {
  return {};
}

export function stepRegisterTransportMemberWithActions(
  state: RegisterTransportMemberState,
  event: RegisterTransportMemberEvent
): RegisterTransportMemberStepResult {
  if (event.kind === "transport/member-register-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterTransportMember(event.alreadyPresent) ? "register" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterTransportMemberNow(
  actions: ReadonlyArray<RegisterTransportMemberAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipRegisterTransportMember(
  actions: ReadonlyArray<RegisterTransportMemberAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
 * Transport-member unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step).
 */
export type TransportMemberUnregisterState = Record<string, never>;

export type TransportMemberUnregisterEvent =
  | Event
  | {
      readonly kind: "transport/member-unregister-gate";
      readonly index: number;
    };

export type TransportMemberUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface TransportMemberUnregisterStepResult {
  readonly state: TransportMemberUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportMemberUnregisterAction[];
}

export function initialTransportMemberUnregisterState(): TransportMemberUnregisterState {
  return {};
}

export function stepTransportMemberUnregisterWithActions(
  state: TransportMemberUnregisterState,
  event: TransportMemberUnregisterEvent
): TransportMemberUnregisterStepResult {
  if (event.kind === "transport/member-unregister-gate") {
    const index = planUnregisterTransportMember(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function transportMemberUnregisterIndex(
  actions: ReadonlyArray<TransportMemberUnregisterAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemoveTransportMember(
  actions: ReadonlyArray<TransportMemberUnregisterAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/**
 * Transport ingress dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepTransportIngressDispatchPlanWithActions}
 * (`announce`|`link-request`|`link-data`|`plain-data`|`proof`|`ignore`).
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
    const planActions = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: event.packetType,
        destinationType: event.destinationType
      }
    ).actions;
    const plan = transportIngressDispatchPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Link-data ingress target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkDataIngressTargetPlanWithActions}
 * (`active`|`pending`|`none`).
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
    const planActions = stepLinkDataIngressTargetPlanWithActions(
      initialLinkDataIngressTargetPlanState(),
      {
        kind: "transport/link-data-ingress-plan-gate",
        activeIndex: event.activeIndex,
        pendingIndex: event.pendingIndex
      }
    ).actions;
    const plan = linkDataIngressTargetPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
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
