/**
 * Pure transport ingress accept / filter / packet-hash deferral / relay decisions.
 * Hash tables and interface identity stay at the adapter edge as boolean inputs.
 * Ingress dispatch / matching-link-id index / link-data target / reverse-relay /
 * hash-remember / packet-hash defer / local plain-data / link-relay conclusions
 * leave via machine actions (no ad-hoc plan / `indexOfMatchingLinkId` reads
 * beside the step). Ingress-dispatch / link-data-ingress-target / link-relay-target /
 * reverse-relay / packet-hash-remember / local-plain-data / proof-ingress /
 * packet-filter plans nested via {@link stepTransportIngressDispatchPlanWithActions} /
 * {@link stepLinkDataIngressTargetPlanWithActions} /
 * {@link stepLinkRelayTargetPlanWithActions} /
 * {@link stepReverseRelayOutcomePlanWithActions} /
 * {@link stepPacketHashRememberPlanWithActions} /
 * {@link stepLocalPlainDataDeliveryPlanWithActions} /
 * {@link stepProofIngressPlanWithActions} /
 * {@link stepPacketFilterPlanWithActions}.
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
import {
  decideGate,
  defineBooleanGate,
  defineGate,
  defineOptionGate,
  gateConcluded,
  gateConclusion,
  gatePayload,
  gateStepFn,
  initialGateState,
  interpretGate,
  type GateState,
  type GateStepResult
} from "@twistedpear/effects";
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
 * Packet-filter plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFilter` reads
 * beside the step). Nested under {@link stepPacketFilterWithActions}.
 */
export type PacketFilterPlan = "accept" | "reject";

type PacketFilterPlanGateEvent = Extract<
  PacketFilterPlanEvent,
  { readonly kind: "transport/packet-filter-plan-gate" }
>;

const packetFilterPlanGate = defineBooleanGate<PacketFilterPlanGateEvent, "accept", "reject">({
  event: "transport/packet-filter-plan-gate",
  whenTrue: "accept",
  whenFalse: "reject",
  decide: (event) => planPacketFilter(event)
});

export type PacketFilterPlanState = GateState;

export type PacketFilterPlanEvent =
  | Event
  | {
      readonly kind: "transport/packet-filter-plan-gate";
      readonly transportId: Uint8Array | null;
      readonly localTransportHash: Uint8Array;
      readonly packetType: number;
      readonly destinationType: number;
      readonly alreadySeenHash: boolean;
    };

export type PacketFilterPlanAction = { readonly kind: PacketFilterPlan };

export type PacketFilterPlanStepResult = GateStepResult<PacketFilterPlanAction>;

export const initialPacketFilterPlanState = initialGateState;

export const stepPacketFilterPlanWithActions = interpretGate(packetFilterPlanGate);

/** Extract the packet-filter plan from actions; null when empty. */
export const packetFilterPlanFromActions = gateConclusion<
  PacketFilterPlanAction,
  PacketFilterPlan
>("accept", "reject");

export const shouldAcceptPacketFilterPlan = gateConcluded<PacketFilterPlanAction>("accept");

export const shouldRejectPacketFilterPlan = gateConcluded<PacketFilterPlanAction>("reject");

/**
 * Packet filter gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFilter` reads
 * beside the step).
 * Plan nested via {@link stepPacketFilterPlanWithActions} (`accept`|`reject`).
 */
type PacketFilterGateEvent = Extract<
  PacketFilterEvent,
  { readonly kind: "transport/packet-filter-gate" }
>;

const packetFilterGate = defineGate<PacketFilterGateEvent, PacketFilterAction>({
  event: "transport/packet-filter-gate",
  actions: ["accept", "reject"],
  decide: (event) => {
    const plan = packetFilterPlanFromActions(
      decideGate(packetFilterPlanGate, {
        ...event,
        kind: "transport/packet-filter-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type PacketFilterState = GateState;

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

export type PacketFilterStepResult = GateStepResult<PacketFilterAction>;

export const initialPacketFilterState = initialGateState;

export const stepPacketFilterWithActions = interpretGate(packetFilterGate);

export const shouldAcceptPacketFilter = gateConcluded<PacketFilterAction>("accept");

export const shouldRejectPacketFilter = gateConcluded<PacketFilterAction>("reject");

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
type AcceptTransportPacketGateEvent = Extract<
  AcceptTransportPacketEvent,
  { readonly kind: "transport/accept-packet-gate" }
>;

const acceptTransportPacketGate = defineBooleanGate<
  AcceptTransportPacketGateEvent,
  "accept",
  "skip"
>({
  event: "transport/accept-packet-gate",
  whenTrue: "accept",
  whenFalse: "skip",
  decide: (event) => shouldAcceptTransportPacket(event)
});

export type AcceptTransportPacketState = GateState;

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

export type AcceptTransportPacketStepResult = GateStepResult<AcceptTransportPacketAction>;

export const initialAcceptTransportPacketState = initialGateState;

export const stepAcceptTransportPacketWithActions = interpretGate(acceptTransportPacketGate);

export const shouldAcceptTransportPacketNow = gateConcluded<
  AcceptTransportPacketAction
>("accept");

export const shouldSkipAcceptTransportPacket = gateConcluded<
  AcceptTransportPacketAction
>("skip");

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
type PacketHashDeferGateEvent = Extract<
  PacketHashDeferEvent,
  { readonly kind: "transport/packet-hash-defer-gate" }
>;

const packetHashDeferGate = defineBooleanGate<
  PacketHashDeferGateEvent,
  "defer",
  "remember-now"
>({
  event: "transport/packet-hash-defer-gate",
  whenTrue: "defer",
  whenFalse: "remember-now",
  decide: (event) => shouldDeferPacketHash(event)
});

export type PacketHashDeferState = GateState;

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

export type PacketHashDeferStepResult = GateStepResult<PacketHashDeferAction>;

export const initialPacketHashDeferState = initialGateState;

export const stepPacketHashDeferWithActions = interpretGate(packetHashDeferGate);

export const shouldDeferPacketHashActions = gateConcluded<PacketHashDeferAction>("defer");

export const shouldRememberPacketHashImmediately = gateConcluded<
  PacketHashDeferAction
>("remember-now");

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

/**
 * Link relay target plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRelayTarget` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkRelayTargetWithActions}.
 */
type LinkRelayTargetPlanGateEvent = Extract<
  LinkRelayTargetPlanEvent,
  { readonly kind: "transport/link-relay-plan-gate" }
>;

const linkRelayTargetPlanGate = defineOptionGate<
  LinkRelayTargetPlanGateEvent,
  "outbound" | "received",
  "ignore"
>({
  event: "transport/link-relay-plan-gate",
  kinds: ["outbound", "received"],
  none: "ignore",
  decide: (event) => planLinkRelayTarget(event)
});

export type LinkRelayTargetPlanState = GateState;

export type LinkRelayTargetPlanEvent =
  | Event
  | {
      readonly kind: "transport/link-relay-plan-gate";
      readonly sameInterface: boolean;
      readonly ifaceIsOutbound: boolean;
      readonly ifaceIsReceived: boolean;
      readonly packetHops: number;
      readonly remainingHops: number;
      readonly takenHops: number;
    };

export type LinkRelayTargetPlanAction = {
  readonly kind: LinkRelayTarget | "ignore";
};

export type LinkRelayTargetPlanStepResult = GateStepResult<LinkRelayTargetPlanAction>;

export const initialLinkRelayTargetPlanState = initialGateState;

export const stepLinkRelayTargetPlanWithActions = interpretGate(linkRelayTargetPlanGate);

/** Extract the link relay target plan from actions; null when empty or ignore. */
export const linkRelayTargetPlanFromActions = gateConclusion<
  LinkRelayTargetPlanAction,
  LinkRelayTarget
>("outbound", "received");

export const shouldRelayLinkOutboundPlan = gateConcluded<LinkRelayTargetPlanAction>("outbound");

export const shouldRelayLinkReceivedPlan = gateConcluded<LinkRelayTargetPlanAction>("received");

export const shouldIgnoreLinkRelayTargetPlan = gateConcluded<
  LinkRelayTargetPlanAction
>("ignore");

/** Whether link-relay may proceed after a link-table lookup hit. */
export function canLookupLinkRelayEntry(entryPresent: boolean): boolean {
  return entryPresent;
}

/**
 * canLookupLinkRelayEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLookupLinkRelayEntry`
 * reads beside the step).
 */
type LookupLinkRelayEntryGateEvent = Extract<
  LookupLinkRelayEntryEvent,
  { readonly kind: "transport/lookup-link-relay-entry-gate" }
>;

const lookupLinkRelayEntryGate = defineBooleanGate<
  LookupLinkRelayEntryGateEvent,
  "hit",
  "miss"
>({
  event: "transport/lookup-link-relay-entry-gate",
  whenTrue: "hit",
  whenFalse: "miss",
  decide: (event) => canLookupLinkRelayEntry(event.entryPresent)
});

export type LookupLinkRelayEntryState = GateState;

export type LookupLinkRelayEntryEvent =
  | Event
  | {
      readonly kind: "transport/lookup-link-relay-entry-gate";
      readonly entryPresent: boolean;
    };

export type LookupLinkRelayEntryAction =
  | { readonly kind: "hit" }
  | { readonly kind: "miss" };

export type LookupLinkRelayEntryStepResult = GateStepResult<LookupLinkRelayEntryAction>;

export const initialLookupLinkRelayEntryState = initialGateState;

export const stepLookupLinkRelayEntryWithActions = interpretGate(lookupLinkRelayEntryGate);

export const shouldHitLookupLinkRelayEntry = gateConcluded<LookupLinkRelayEntryAction>("hit");

export const shouldMissLookupLinkRelayEntry = gateConcluded<LookupLinkRelayEntryAction>("miss");

/** Whether link-relay may transmit after {@link planLinkRelayTarget} resolves an iface. */
export function shouldTransmitLinkRelay(outboundPresent: boolean): boolean {
  return outboundPresent;
}

/**
 * shouldTransmitLinkRelay gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitLinkRelay`
 * reads beside the step).
 */
type TransmitLinkRelayGateEvent = Extract<
  TransmitLinkRelayEvent,
  { readonly kind: "transport/transmit-link-relay-gate" }
>;

const transmitLinkRelayGate = defineBooleanGate<
  TransmitLinkRelayGateEvent,
  "transmit",
  "skip"
>({
  event: "transport/transmit-link-relay-gate",
  whenTrue: "transmit",
  whenFalse: "skip",
  decide: (event) => shouldTransmitLinkRelay(event.outboundPresent)
});

export type TransmitLinkRelayState = GateState;

export type TransmitLinkRelayEvent =
  | Event
  | {
      readonly kind: "transport/transmit-link-relay-gate";
      readonly outboundPresent: boolean;
    };

export type TransmitLinkRelayAction =
  | { readonly kind: "transmit" }
  | { readonly kind: "skip" };

export type TransmitLinkRelayStepResult = GateStepResult<TransmitLinkRelayAction>;

export const initialTransmitLinkRelayState = initialGateState;

export const stepTransmitLinkRelayWithActions = interpretGate(transmitLinkRelayGate);

export const shouldTransmitLinkRelayNow = gateConcluded<TransmitLinkRelayAction>("transmit");

export const shouldSkipTransmitLinkRelay = gateConcluded<TransmitLinkRelayAction>("skip");

/**
 * Link relay target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkRelayTargetPlanWithActions}
 * (`outbound`|`received`|`ignore`).
 */
type LinkRelayTargetGateEvent = Extract<
  LinkRelayTargetEvent,
  { readonly kind: "transport/link-relay-gate" }
>;

const linkRelayTargetGate = defineGate<LinkRelayTargetGateEvent, LinkRelayTargetAction>({
  event: "transport/link-relay-gate",
  actions: ["outbound", "received", "ignore"],
  decide: (event) => {
    const target = linkRelayTargetPlanFromActions(
      decideGate(linkRelayTargetPlanGate, {
        ...event,
        kind: "transport/link-relay-plan-gate"
      })
    );
    return [{ kind: target ?? "ignore" }];
  }
});

export type LinkRelayTargetState = GateState;

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

export type LinkRelayTargetStepResult = GateStepResult<LinkRelayTargetAction>;

export const initialLinkRelayTargetState = initialGateState;

export const stepLinkRelayTarget: StepFn<LinkRelayTargetState> = gateStepFn(
  linkRelayTargetGate
);

export const stepLinkRelayTargetWithActions = interpretGate(linkRelayTargetGate);

export const linkRelayTargetFromActions = gateConclusion<
  LinkRelayTargetAction,
  LinkRelayTarget
>("outbound", "received");

export const shouldRelayLinkOutbound = gateConcluded<LinkRelayTargetAction>("outbound");

export const shouldRelayLinkReceived = gateConcluded<LinkRelayTargetAction>("received");

export const shouldIgnoreLinkRelayTarget = gateConcluded<LinkRelayTargetAction>("ignore");

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
type TransmitReverseRelayGateEvent = Extract<
  TransmitReverseRelayEvent,
  { readonly kind: "transport/transmit-reverse-relay-gate" }
>;

const transmitReverseRelayGate = defineBooleanGate<
  TransmitReverseRelayGateEvent,
  "transmit",
  "skip"
>({
  event: "transport/transmit-reverse-relay-gate",
  whenTrue: "transmit",
  whenFalse: "skip",
  decide: (event) => shouldTransmitReverseRelay(event)
});

export type TransmitReverseRelayState = GateState;

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

export type TransmitReverseRelayStepResult = GateStepResult<TransmitReverseRelayAction>;

export const initialTransmitReverseRelayState = initialGateState;

export const stepTransmitReverseRelayWithActions = interpretGate(transmitReverseRelayGate);

export const shouldTransmitReverseRelayNow = gateConcluded<
  TransmitReverseRelayAction
>("transmit");

export const shouldSkipTransmitReverseRelay = gateConcluded<TransmitReverseRelayAction>("skip");

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
type ReverseEntryExpiredGateEvent = Extract<
  ReverseEntryExpiredEvent,
  { readonly kind: "transport/reverse-entry-expired-gate" }
>;

const reverseEntryExpiredGate = defineGate<
  ReverseEntryExpiredGateEvent,
  ReverseEntryExpiredAction
>({
  event: "transport/reverse-entry-expired-gate",
  actions: ["expired", "live"],
  decide: (event) => {
    const expiredInput =
      event.timeoutSeconds === undefined
        ? { timestamp: event.timestamp, nowSeconds: event.nowSeconds }
        : {
            timestamp: event.timestamp,
            nowSeconds: event.nowSeconds,
            timeoutSeconds: event.timeoutSeconds
          };
    return [{ kind: isReverseEntryExpired(expiredInput) ? "expired" : "live" }];
  }
});

export type ReverseEntryExpiredState = GateState;

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

export type ReverseEntryExpiredStepResult = GateStepResult<ReverseEntryExpiredAction>;

export const initialReverseEntryExpiredState = initialGateState;

export const stepReverseEntryExpiredWithActions = interpretGate(reverseEntryExpiredGate);

export const shouldTreatReverseEntryExpired = gateConcluded<
  ReverseEntryExpiredAction
>("expired");

export const shouldTreatReverseEntryLive = gateConcluded<ReverseEntryExpiredAction>("live");

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
type RelayTransportPacketAllowGateEvent = Extract<
  RelayTransportPacketAllowEvent,
  { readonly kind: "transport/relay-transport-packet-allow-gate" }
>;

const relayTransportPacketAllowGate = defineBooleanGate<
  RelayTransportPacketAllowGateEvent,
  "allow",
  "deny"
>({
  event: "transport/relay-transport-packet-allow-gate",
  whenTrue: "allow",
  whenFalse: "deny",
  decide: (event) => canRelayTransportPacket(event)
});

export type RelayTransportPacketAllowState = GateState;

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

export type RelayTransportPacketAllowStepResult = GateStepResult<
  RelayTransportPacketAllowAction
>;

export const initialRelayTransportPacketAllowState = initialGateState;

export const stepRelayTransportPacketAllowWithActions = interpretGate(
  relayTransportPacketAllowGate
);

export const shouldAllowRelayTransportPacket = gateConcluded<
  RelayTransportPacketAllowAction
>("allow");

export const shouldDenyRelayTransportPacket = gateConcluded<
  RelayTransportPacketAllowAction
>("deny");

/** Whether a relayed packet should create/update a link-relay table entry. */
export function shouldRecordLinkRelayTableEntry(packetType: number): boolean {
  return packetType === PACKET_TYPE_LINKREQUEST;
}

/**
 * shouldRecordLinkRelayTableEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRecordLinkRelayTableEntry`
 * reads beside the step).
 */
type RecordLinkRelayTableEntryGateEvent = Extract<
  RecordLinkRelayTableEntryEvent,
  { readonly kind: "transport/record-link-relay-table-entry-gate" }
>;

const recordLinkRelayTableEntryGate = defineBooleanGate<
  RecordLinkRelayTableEntryGateEvent,
  "record",
  "skip"
>({
  event: "transport/record-link-relay-table-entry-gate",
  whenTrue: "record",
  whenFalse: "skip",
  decide: (event) => shouldRecordLinkRelayTableEntry(event.packetType)
});

export type RecordLinkRelayTableEntryState = GateState;

export type RecordLinkRelayTableEntryEvent =
  | Event
  | {
      readonly kind: "transport/record-link-relay-table-entry-gate";
      readonly packetType: number;
    };

export type RecordLinkRelayTableEntryAction =
  | { readonly kind: "record" }
  | { readonly kind: "skip" };

export type RecordLinkRelayTableEntryStepResult = GateStepResult<
  RecordLinkRelayTableEntryAction
>;

export const initialRecordLinkRelayTableEntryState = initialGateState;

export const stepRecordLinkRelayTableEntryWithActions = interpretGate(
  recordLinkRelayTableEntryGate
);

export const shouldRecordLinkRelayTableEntryNow = gateConcluded<
  RecordLinkRelayTableEntryAction
>("record");

export const shouldSkipRecordLinkRelayTableEntry = gateConcluded<
  RecordLinkRelayTableEntryAction
>("skip");

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
type RecordReverseTableEntryGateEvent = Extract<
  RecordReverseTableEntryEvent,
  { readonly kind: "transport/record-reverse-table-entry-gate" }
>;

const recordReverseTableEntryGate = defineBooleanGate<
  RecordReverseTableEntryGateEvent,
  "record",
  "skip"
>({
  event: "transport/record-reverse-table-entry-gate",
  whenTrue: "record",
  whenFalse: "skip",
  decide: (event) => shouldRecordReverseTableEntry(event)
});

export type RecordReverseTableEntryState = GateState;

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

export type RecordReverseTableEntryStepResult = GateStepResult<RecordReverseTableEntryAction>;

export const initialRecordReverseTableEntryState = initialGateState;

export const stepRecordReverseTableEntryWithActions = interpretGate(
  recordReverseTableEntryGate
);

export const shouldRecordReverseTableEntryNow = gateConcluded<
  RecordReverseTableEntryAction
>("record");

export const shouldSkipRecordReverseTableEntry = gateConcluded<
  RecordReverseTableEntryAction
>("skip");

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
type LocalPathRequestPacketGateEvent = Extract<
  LocalPathRequestPacketEvent,
  { readonly kind: "transport/local-path-request-packet-gate" }
>;

const localPathRequestPacketGate = defineBooleanGate<
  LocalPathRequestPacketGateEvent,
  "path-request",
  "other"
>({
  event: "transport/local-path-request-packet-gate",
  whenTrue: "path-request",
  whenFalse: "other",
  decide: (event) => isLocalPathRequestPacket(event)
});

export type LocalPathRequestPacketState = GateState;

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

export type LocalPathRequestPacketStepResult = GateStepResult<LocalPathRequestPacketAction>;

export const initialLocalPathRequestPacketState = initialGateState;

export const stepLocalPathRequestPacketWithActions = interpretGate(localPathRequestPacketGate);

export const shouldTreatLocalPathRequestPacket = gateConcluded<
  LocalPathRequestPacketAction
>("path-request");

export const shouldTreatLocalPathRequestPacketOther = gateConcluded<
  LocalPathRequestPacketAction
>("other");

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
type RelayLinkPacketAllowGateEvent = Extract<
  RelayLinkPacketAllowEvent,
  { readonly kind: "transport/relay-link-packet-allow-gate" }
>;

const relayLinkPacketAllowGate = defineBooleanGate<
  RelayLinkPacketAllowGateEvent,
  "allow",
  "deny"
>({
  event: "transport/relay-link-packet-allow-gate",
  whenTrue: "allow",
  whenFalse: "deny",
  decide: (event) => canRelayLinkPacket(event.packetType)
});

export type RelayLinkPacketAllowState = GateState;

export type RelayLinkPacketAllowEvent =
  | Event
  | {
      readonly kind: "transport/relay-link-packet-allow-gate";
      readonly packetType: number;
    };

export type RelayLinkPacketAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export type RelayLinkPacketAllowStepResult = GateStepResult<RelayLinkPacketAllowAction>;

export const initialRelayLinkPacketAllowState = initialGateState;

export const stepRelayLinkPacketAllowWithActions = interpretGate(relayLinkPacketAllowGate);

export const shouldAllowRelayLinkPacket = gateConcluded<RelayLinkPacketAllowAction>("allow");

export const shouldDenyRelayLinkPacket = gateConcluded<RelayLinkPacketAllowAction>("deny");

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
type RelayReversePacketAllowGateEvent = Extract<
  RelayReversePacketAllowEvent,
  { readonly kind: "transport/relay-reverse-packet-allow-gate" }
>;

const relayReversePacketAllowGate = defineBooleanGate<
  RelayReversePacketAllowGateEvent,
  "allow",
  "deny"
>({
  event: "transport/relay-reverse-packet-allow-gate",
  whenTrue: "allow",
  whenFalse: "deny",
  decide: (event) => canRelayReversePacket(event)
});

export type RelayReversePacketAllowState = GateState;

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

export type RelayReversePacketAllowStepResult = GateStepResult<RelayReversePacketAllowAction>;

export const initialRelayReversePacketAllowState = initialGateState;

export const stepRelayReversePacketAllowWithActions = interpretGate(
  relayReversePacketAllowGate
);

export const shouldAllowRelayReversePacket = gateConcluded<
  RelayReversePacketAllowAction
>("allow");

export const shouldDenyRelayReversePacket = gateConcluded<
  RelayReversePacketAllowAction
>("deny");

/** Whether reverse relay should use this iface (must be the reverse entry's outbound). */
export function shouldRelayReverseOnInterface(ifaceIsOutbound: boolean): boolean {
  return ifaceIsOutbound;
}

/**
 * shouldRelayReverseOnInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRelayReverseOnInterface`
 * reads beside the step).
 */
type RelayReverseOnInterfaceGateEvent = Extract<
  RelayReverseOnInterfaceEvent,
  { readonly kind: "transport/relay-reverse-on-interface-gate" }
>;

const relayReverseOnInterfaceGate = defineBooleanGate<
  RelayReverseOnInterfaceGateEvent,
  "match",
  "mismatch"
>({
  event: "transport/relay-reverse-on-interface-gate",
  whenTrue: "match",
  whenFalse: "mismatch",
  decide: (event) => shouldRelayReverseOnInterface(event.ifaceIsOutbound)
});

export type RelayReverseOnInterfaceState = GateState;

export type RelayReverseOnInterfaceEvent =
  | Event
  | {
      readonly kind: "transport/relay-reverse-on-interface-gate";
      readonly ifaceIsOutbound: boolean;
    };

export type RelayReverseOnInterfaceAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export type RelayReverseOnInterfaceStepResult = GateStepResult<RelayReverseOnInterfaceAction>;

export const initialRelayReverseOnInterfaceState = initialGateState;

export const stepRelayReverseOnInterfaceWithActions = interpretGate(
  relayReverseOnInterfaceGate
);

export const shouldMatchRelayReverseOnInterface = gateConcluded<
  RelayReverseOnInterfaceAction
>("match");

export const shouldMismatchRelayReverseOnInterface = gateConcluded<
  RelayReverseOnInterfaceAction
>("mismatch");

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
type TransportIngressDispatchPlanGateEvent = Extract<
  TransportIngressDispatchPlanEvent,
  { readonly kind: "transport/ingress-dispatch-plan-gate" }
>;

const transportIngressDispatchPlanGate = defineGate<
  TransportIngressDispatchPlanGateEvent,
  TransportIngressDispatchPlanAction
>({
  event: "transport/ingress-dispatch-plan-gate",
  actions: ["announce", "link-request", "link-data", "plain-data", "proof", "ignore"],
  decide: (event) => [{ kind: planTransportIngressDispatch(event) }]
});

export type TransportIngressDispatchPlanState = GateState;

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

export type TransportIngressDispatchPlanStepResult = GateStepResult<
  TransportIngressDispatchPlanAction
>;

export const initialTransportIngressDispatchPlanState = initialGateState;

export const stepTransportIngressDispatchPlanWithActions = interpretGate(
  transportIngressDispatchPlanGate
);

/** Extract the transport ingress dispatch plan from actions; null when empty. */
export const transportIngressDispatchPlanFromActions = gateConclusion<
  TransportIngressDispatchPlanAction,
  TransportIngressDispatch
>("announce", "link-request", "link-data", "plain-data", "proof", "ignore");

export const shouldDispatchTransportAnnouncePlan = gateConcluded<
  TransportIngressDispatchPlanAction
>("announce");

export const shouldDispatchTransportLinkRequestPlan = gateConcluded<
  TransportIngressDispatchPlanAction
>("link-request");

export const shouldDispatchTransportLinkDataPlan = gateConcluded<
  TransportIngressDispatchPlanAction
>("link-data");

export const shouldDispatchTransportPlainDataPlan = gateConcluded<
  TransportIngressDispatchPlanAction
>("plain-data");

export const shouldDispatchTransportProofPlan = gateConcluded<
  TransportIngressDispatchPlanAction
>("proof");

export const shouldIgnoreTransportIngressDispatchPlan = gateConcluded<
  TransportIngressDispatchPlanAction
>("ignore");

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
 * Proof ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planProofIngressKind` /
 * `plan ===` reads beside the step). Nested under {@link stepProofIngressWithActions}.
 */
type ProofIngressPlanGateEvent = Extract<
  ProofIngressPlanEvent,
  { readonly kind: "transport/proof-ingress-plan-gate" }
>;

const proofIngressPlanGate = defineGate<ProofIngressPlanGateEvent, ProofIngressPlanAction>({
  event: "transport/proof-ingress-plan-gate",
  actions: ["lrproof", "resource-prf", "receipt"],
  decide: (event) => [{ kind: planProofIngressKind(event.context) }]
});

export type ProofIngressPlanState = GateState;

export type ProofIngressPlanEvent =
  | Event
  | {
      readonly kind: "transport/proof-ingress-plan-gate";
      readonly context: number;
    };

export type ProofIngressPlanAction = { readonly kind: ProofIngressKind };

export type ProofIngressPlanStepResult = GateStepResult<ProofIngressPlanAction>;

export const initialProofIngressPlanState = initialGateState;

export const stepProofIngressPlanWithActions = interpretGate(proofIngressPlanGate);

/** Extract the proof ingress plan from actions; null when empty. */
export const proofIngressPlanFromActions = gateConclusion<
  ProofIngressPlanAction,
  ProofIngressKind
>("lrproof", "resource-prf", "receipt");

export const shouldHandleProofLrproofPlan = gateConcluded<ProofIngressPlanAction>("lrproof");

export const shouldHandleProofResourcePrfPlan = gateConcluded<
  ProofIngressPlanAction
>("resource-prf");

export const shouldHandleProofReceiptPlan = gateConcluded<ProofIngressPlanAction>("receipt");

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
type TransmitOnInterfaceGateEvent = Extract<
  TransmitOnInterfaceEvent,
  { readonly kind: "transport/transmit-on-interface-gate" }
>;

const transmitOnInterfaceGate = defineGate<
  TransmitOnInterfaceGateEvent,
  TransmitOnInterfaceAction
>({
  event: "transport/transmit-on-interface-gate",
  actions: ["transmit", "skip"],
  decide: (event) => [
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
});

export type TransmitOnInterfaceState = GateState;

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

export type TransmitOnInterfaceStepResult = GateStepResult<TransmitOnInterfaceAction>;

export const initialTransmitOnInterfaceState = initialGateState;

export const stepTransmitOnInterfaceWithActions = interpretGate(transmitOnInterfaceGate);

export const shouldTransmitOnInterfaceNow = gateConcluded<
  TransmitOnInterfaceAction
>("transmit");

export const shouldSkipTransmitOnInterface = gateConcluded<TransmitOnInterfaceAction>("skip");

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
type MatchLocalInboundDestinationGateEvent = Extract<
  MatchLocalInboundDestinationEvent,
  { readonly kind: "transport/match-local-inbound-destination-gate" }
>;

const matchLocalInboundDestinationGate = defineBooleanGate<
  MatchLocalInboundDestinationGateEvent,
  "match",
  "mismatch"
>({
  event: "transport/match-local-inbound-destination-gate",
  whenTrue: "match",
  whenFalse: "mismatch",
  decide: (event) => shouldMatchLocalInboundDestination(event)
});

export type MatchLocalInboundDestinationState = GateState;

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

export type MatchLocalInboundDestinationStepResult = GateStepResult<
  MatchLocalInboundDestinationAction
>;

export const initialMatchLocalInboundDestinationState = initialGateState;

export const stepMatchLocalInboundDestinationWithActions = interpretGate(
  matchLocalInboundDestinationGate
);

export const shouldMatchLocalInboundDestinationNow = gateConcluded<
  MatchLocalInboundDestinationAction
>("match");

export const shouldMismatchLocalInboundDestination = gateConcluded<
  MatchLocalInboundDestinationAction
>("mismatch");

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
type MatchLocalTypedDestinationGateEvent = Extract<
  MatchLocalTypedDestinationEvent,
  { readonly kind: "transport/match-local-typed-destination-gate" }
>;

const matchLocalTypedDestinationGate = defineBooleanGate<
  MatchLocalTypedDestinationGateEvent,
  "match",
  "mismatch"
>({
  event: "transport/match-local-typed-destination-gate",
  whenTrue: "match",
  whenFalse: "mismatch",
  decide: (event) => shouldMatchLocalTypedDestination(event)
});

export type MatchLocalTypedDestinationState = GateState;

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

export type MatchLocalTypedDestinationStepResult = GateStepResult<
  MatchLocalTypedDestinationAction
>;

export const initialMatchLocalTypedDestinationState = initialGateState;

export const stepMatchLocalTypedDestinationWithActions = interpretGate(
  matchLocalTypedDestinationGate
);

export const shouldMatchLocalTypedDestinationNow = gateConcluded<
  MatchLocalTypedDestinationAction
>("match");

export const shouldMismatchLocalTypedDestination = gateConcluded<
  MatchLocalTypedDestinationAction
>("mismatch");

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
type DispatchLocalLinkRequestGateEvent = Extract<
  DispatchLocalLinkRequestEvent,
  { readonly kind: "transport/dispatch-local-link-request-gate" }
>;

const dispatchLocalLinkRequestGate = defineBooleanGate<
  DispatchLocalLinkRequestGateEvent,
  "dispatch",
  "skip"
>({
  event: "transport/dispatch-local-link-request-gate",
  whenTrue: "dispatch",
  whenFalse: "skip",
  decide: (event) => shouldDispatchLocalLinkRequest(event)
});

export type DispatchLocalLinkRequestState = GateState;

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

export type DispatchLocalLinkRequestStepResult = GateStepResult<DispatchLocalLinkRequestAction>;

export const initialDispatchLocalLinkRequestState = initialGateState;

export const stepDispatchLocalLinkRequestWithActions = interpretGate(
  dispatchLocalLinkRequestGate
);

export const shouldDispatchLocalLinkRequestNow = gateConcluded<
  DispatchLocalLinkRequestAction
>("dispatch");

export const shouldSkipDispatchLocalLinkRequest = gateConcluded<
  DispatchLocalLinkRequestAction
>("skip");

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
type AcceptLinkLrProofCandidateGateEvent = Extract<
  AcceptLinkLrProofCandidateEvent,
  { readonly kind: "transport/accept-link-lr-proof-candidate-gate" }
>;

const acceptLinkLrProofCandidateGate = defineBooleanGate<
  AcceptLinkLrProofCandidateGateEvent,
  "accept",
  "reject"
>({
  event: "transport/accept-link-lr-proof-candidate-gate",
  whenTrue: "accept",
  whenFalse: "reject",
  decide: (event) => shouldAcceptLinkLrProofCandidate(event)
});

export type AcceptLinkLrProofCandidateState = GateState;

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

export type AcceptLinkLrProofCandidateStepResult = GateStepResult<
  AcceptLinkLrProofCandidateAction
>;

export const initialAcceptLinkLrProofCandidateState = initialGateState;

export const stepAcceptLinkLrProofCandidateWithActions = interpretGate(
  acceptLinkLrProofCandidateGate
);

export const shouldAcceptLinkLrProofCandidateNow = gateConcluded<
  AcceptLinkLrProofCandidateAction
>("accept");

export const shouldRejectLinkLrProofCandidate = gateConcluded<
  AcceptLinkLrProofCandidateAction
>("reject");

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
 * Local plain-data delivery plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLocalPlainDataDelivery` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLocalPlainDataDeliveryWithActions}.
 */
type LocalPlainDataDeliveryPlanGateEvent = Extract<
  LocalPlainDataDeliveryPlanEvent,
  { readonly kind: "transport/local-plain-data-plan-gate" }
>;

const localPlainDataDeliveryPlanGate = defineGate<
  LocalPlainDataDeliveryPlanGateEvent,
  LocalPlainDataDeliveryPlanAction
>({
  event: "transport/local-plain-data-plan-gate",
  actions: ["dispatch", "ignore"],
  decide: (event) => [{ kind: planLocalPlainDataDelivery(event) }]
});

export type LocalPlainDataDeliveryPlanState = GateState;

export type LocalPlainDataDeliveryPlanEvent =
  | Event
  | {
      readonly kind: "transport/local-plain-data-plan-gate";
      readonly destinationPresent: boolean;
      readonly plaintextPresent: boolean;
    };

export type LocalPlainDataDeliveryPlanAction = {
  readonly kind: LocalPlainDataDeliveryPlan;
};

export type LocalPlainDataDeliveryPlanStepResult = GateStepResult<
  LocalPlainDataDeliveryPlanAction
>;

export const initialLocalPlainDataDeliveryPlanState = initialGateState;

export const stepLocalPlainDataDeliveryPlanWithActions = interpretGate(
  localPlainDataDeliveryPlanGate
);

/** Extract the local plain-data delivery plan from actions; null when empty. */
export const localPlainDataDeliveryPlanFromActions = gateConclusion<
  LocalPlainDataDeliveryPlanAction,
  LocalPlainDataDeliveryPlan
>("dispatch", "ignore");

export const shouldDispatchLocalPlainDataDeliveryPlan = gateConcluded<
  LocalPlainDataDeliveryPlanAction
>("dispatch");

export const shouldIgnoreLocalPlainDataDeliveryPlan = gateConcluded<
  LocalPlainDataDeliveryPlanAction
>("ignore");

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
type DispatchLocalPlainDataDeliveryGateEvent = Extract<
  DispatchLocalPlainDataDeliveryEvent,
  { readonly kind: "transport/dispatch-local-plain-data-gate" }
>;

const dispatchLocalPlainDataDeliveryGate = defineBooleanGate<
  DispatchLocalPlainDataDeliveryGateEvent,
  "dispatch",
  "skip"
>({
  event: "transport/dispatch-local-plain-data-gate",
  whenTrue: "dispatch",
  whenFalse: "skip",
  decide: (event) => shouldDispatchLocalPlainDataDelivery(event)
});

export type DispatchLocalPlainDataDeliveryState = GateState;

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

export type DispatchLocalPlainDataDeliveryStepResult = GateStepResult<
  DispatchLocalPlainDataDeliveryAction
>;

export const initialDispatchLocalPlainDataDeliveryState = initialGateState;

export const stepDispatchLocalPlainDataDeliveryWithActions = interpretGate(
  dispatchLocalPlainDataDeliveryGate
);

export const shouldDispatchLocalPlainDataDeliveryNow = gateConcluded<
  DispatchLocalPlainDataDeliveryAction
>("dispatch");

export const shouldSkipDispatchLocalPlainDataDelivery = gateConcluded<
  DispatchLocalPlainDataDeliveryAction
>("skip");

export type PacketHashRememberPlan = "now" | "after-relay";

/**
 * When to record a packet hash: immediately, or after deferred relay attempts.
 * Complements {@link shouldDeferPacketHash}.
 */
export function planPacketHashRemember(deferred: boolean): PacketHashRememberPlan {
  return deferred ? "after-relay" : "now";
}

/**
 * Packet-hash remember plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketHashRemember` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketHashRememberWithActions}.
 */
type PacketHashRememberPlanGateEvent = Extract<
  PacketHashRememberPlanEvent,
  { readonly kind: "transport/packet-hash-remember-plan-gate" }
>;

const packetHashRememberPlanGate = defineGate<
  PacketHashRememberPlanGateEvent,
  PacketHashRememberPlanAction
>({
  event: "transport/packet-hash-remember-plan-gate",
  actions: ["now", "after-relay"],
  decide: (event) => [{ kind: planPacketHashRemember(event.deferred) }]
});

export type PacketHashRememberPlanState = GateState;

export type PacketHashRememberPlanEvent =
  | Event
  | {
      readonly kind: "transport/packet-hash-remember-plan-gate";
      readonly deferred: boolean;
    };

export type PacketHashRememberPlanAction = { readonly kind: PacketHashRememberPlan };

export type PacketHashRememberPlanStepResult = GateStepResult<PacketHashRememberPlanAction>;

export const initialPacketHashRememberPlanState = initialGateState;

export const stepPacketHashRememberPlanWithActions = interpretGate(packetHashRememberPlanGate);

/** Extract the packet-hash remember plan from actions; null when empty. */
export const packetHashRememberPlanFromActions = gateConclusion<
  PacketHashRememberPlanAction,
  PacketHashRememberPlan
>("now", "after-relay");

export const shouldRememberPacketHashNowPlan = gateConcluded<
  PacketHashRememberPlanAction
>("now");

export const shouldRememberPacketHashAfterRelayPlan = gateConcluded<
  PacketHashRememberPlanAction
>("after-relay");

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
type DispatchResourceProofToLinkGateEvent = Extract<
  DispatchResourceProofToLinkEvent,
  { readonly kind: "transport/dispatch-resource-proof-to-link-gate" }
>;

const dispatchResourceProofToLinkGate = defineBooleanGate<
  DispatchResourceProofToLinkGateEvent,
  "dispatch",
  "skip"
>({
  event: "transport/dispatch-resource-proof-to-link-gate",
  whenTrue: "dispatch",
  whenFalse: "skip",
  decide: (event) => shouldDispatchResourceProofToLink(event.activeIndexPresent)
});

export type DispatchResourceProofToLinkState = GateState;

export type DispatchResourceProofToLinkEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-resource-proof-to-link-gate";
      readonly activeIndexPresent: boolean;
    };

export type DispatchResourceProofToLinkAction =
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

export type DispatchResourceProofToLinkStepResult = GateStepResult<
  DispatchResourceProofToLinkAction
>;

export const initialDispatchResourceProofToLinkState = initialGateState;

export const stepDispatchResourceProofToLinkWithActions = interpretGate(
  dispatchResourceProofToLinkGate
);

export const shouldDispatchResourceProofToLinkNow = gateConcluded<
  DispatchResourceProofToLinkAction
>("dispatch");

export const shouldSkipDispatchResourceProofToLink = gateConcluded<
  DispatchResourceProofToLinkAction
>("skip");

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
type IndexOfMatchingLinkIdGateEvent = Extract<
  IndexOfMatchingLinkIdEvent,
  { readonly kind: "transport/matching-link-id-index-gate" }
>;

const indexOfMatchingLinkIdGate = defineGate<
  IndexOfMatchingLinkIdGateEvent,
  IndexOfMatchingLinkIdAction
>({
  event: "transport/matching-link-id-index-gate",
  actions: ["use-index", "miss"],
  decide: (event) => {
    const index = indexOfMatchingLinkId(event);
    return index === null ? [{ kind: "miss" }] : [{ kind: "use-index", index }];
  }
});

export type IndexOfMatchingLinkIdState = GateState;

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

export type IndexOfMatchingLinkIdStepResult = GateStepResult<IndexOfMatchingLinkIdAction>;

export const initialIndexOfMatchingLinkIdState = initialGateState;

export const stepIndexOfMatchingLinkIdWithActions = interpretGate(indexOfMatchingLinkIdGate);

export const shouldUseMatchingLinkIdIndex = gateConcluded<
  IndexOfMatchingLinkIdAction
>("use-index");

export const shouldMissMatchingLinkIdIndex = gateConcluded<IndexOfMatchingLinkIdAction>("miss");

/** Extract matching link-id index from step actions; null when no `use-index`. */
export const matchingLinkIdIndexFromActions = gatePayload<
  IndexOfMatchingLinkIdAction,
  "use-index",
  "index"
>("use-index", "index");

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
type LinkDataIngressTargetPlanGateEvent = Extract<
  LinkDataIngressTargetPlanEvent,
  { readonly kind: "transport/link-data-ingress-plan-gate" }
>;

const linkDataIngressTargetPlanGate = defineGate<
  LinkDataIngressTargetPlanGateEvent,
  LinkDataIngressTargetPlanAction
>({
  event: "transport/link-data-ingress-plan-gate",
  actions: ["active", "pending", "none"],
  decide: (event) => [{ kind: planLinkDataIngressTarget(event) }]
});

export type LinkDataIngressTargetPlanState = GateState;

export type LinkDataIngressTargetPlanEvent =
  | Event
  | {
      readonly kind: "transport/link-data-ingress-plan-gate";
      readonly activeIndex: number | null;
      readonly pendingIndex: number | null;
    };

export type LinkDataIngressTargetPlanAction = { readonly kind: LinkDataIngressTarget };

export type LinkDataIngressTargetPlanStepResult = GateStepResult<
  LinkDataIngressTargetPlanAction
>;

export const initialLinkDataIngressTargetPlanState = initialGateState;

export const stepLinkDataIngressTargetPlanWithActions = interpretGate(
  linkDataIngressTargetPlanGate
);

/** Extract the link-data ingress target plan from actions; null when empty. */
export const linkDataIngressTargetPlanFromActions = gateConclusion<
  LinkDataIngressTargetPlanAction,
  LinkDataIngressTarget
>("active", "pending", "none");

export const shouldIngressLinkDataActivePlan = gateConcluded<
  LinkDataIngressTargetPlanAction
>("active");

export const shouldIngressLinkDataPendingPlan = gateConcluded<
  LinkDataIngressTargetPlanAction
>("pending");

export const shouldIngressLinkDataNonePlan = gateConcluded<
  LinkDataIngressTargetPlanAction
>("none");

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

/**
 * Reverse-relay outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planReverseRelayOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepReverseRelayOutcomeWithActions}.
 */
type ReverseRelayOutcomePlanGateEvent = Extract<
  ReverseRelayOutcomePlanEvent,
  { readonly kind: "transport/reverse-relay-plan-gate" }
>;

const reverseRelayOutcomePlanGate = defineGate<
  ReverseRelayOutcomePlanGateEvent,
  ReverseRelayOutcomePlanAction
>({
  event: "transport/reverse-relay-plan-gate",
  actions: ["relay", "delete-expired", "ignore"],
  decide: (event) => [{ kind: planReverseRelayOutcome(event) }]
});

export type ReverseRelayOutcomePlanState = GateState;

export type ReverseRelayOutcomePlanEvent =
  | Event
  | {
      readonly kind: "transport/reverse-relay-plan-gate";
      readonly canRelay: boolean;
      readonly entryExpired: boolean;
      readonly ifaceIsOutbound: boolean;
    };

export type ReverseRelayOutcomePlanAction = { readonly kind: ReverseRelayOutcome };

export type ReverseRelayOutcomePlanStepResult = GateStepResult<ReverseRelayOutcomePlanAction>;

export const initialReverseRelayOutcomePlanState = initialGateState;

export const stepReverseRelayOutcomePlanWithActions = interpretGate(
  reverseRelayOutcomePlanGate
);

/** Extract the reverse-relay outcome plan from actions; null when empty. */
export const reverseRelayOutcomePlanFromActions = gateConclusion<
  ReverseRelayOutcomePlanAction,
  ReverseRelayOutcome
>("relay", "delete-expired", "ignore");

export const shouldRelayReversePacketPlan = gateConcluded<
  ReverseRelayOutcomePlanAction
>("relay");

export const shouldDeleteExpiredReverseEntryPlan = gateConcluded<
  ReverseRelayOutcomePlanAction
>("delete-expired");

export const shouldIgnoreReverseRelayOutcomePlan = gateConcluded<
  ReverseRelayOutcomePlanAction
>("ignore");

/** Whether a transport list should receive a new member (not already present). */
export function shouldRegisterTransportMember(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * shouldRegisterTransportMember gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterTransportMember` reads beside the step).
 */
type RegisterTransportMemberGateEvent = Extract<
  RegisterTransportMemberEvent,
  { readonly kind: "transport/member-register-gate" }
>;

const registerTransportMemberGate = defineBooleanGate<
  RegisterTransportMemberGateEvent,
  "register",
  "skip"
>({
  event: "transport/member-register-gate",
  whenTrue: "register",
  whenFalse: "skip",
  decide: (event) => shouldRegisterTransportMember(event.alreadyPresent)
});

export type RegisterTransportMemberState = GateState;

export type RegisterTransportMemberEvent =
  | Event
  | {
      readonly kind: "transport/member-register-gate";
      readonly alreadyPresent: boolean;
    };

export type RegisterTransportMemberAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export type RegisterTransportMemberStepResult = GateStepResult<RegisterTransportMemberAction>;

export const initialRegisterTransportMemberState = initialGateState;

export const stepRegisterTransportMemberWithActions = interpretGate(
  registerTransportMemberGate
);

export const shouldRegisterTransportMemberNow = gateConcluded<
  RegisterTransportMemberAction
>("register");

export const shouldSkipRegisterTransportMember = gateConcluded<
  RegisterTransportMemberAction
>("skip");

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
 * Transport-member unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step). Nested under
 * {@link stepTransportMemberUnregisterWithActions}.
 */
type TransportMemberUnregisterPlanGateEvent = Extract<
  TransportMemberUnregisterPlanEvent,
  { readonly kind: "transport/member-unregister-plan-gate" }
>;

const transportMemberUnregisterPlanGate = defineGate<
  TransportMemberUnregisterPlanGateEvent,
  TransportMemberUnregisterPlanAction
>({
  event: "transport/member-unregister-plan-gate",
  actions: ["remove"],
  decide: (event) => {
    const index = planUnregisterTransportMember(event.index);
    return index === null ? [] : [{ kind: "remove", index }];
  }
});

export type TransportMemberUnregisterPlanState = GateState;

export type TransportMemberUnregisterPlanEvent =
  | Event
  | {
      readonly kind: "transport/member-unregister-plan-gate";
      readonly index: number;
    };

export type TransportMemberUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};

export type TransportMemberUnregisterPlanStepResult = GateStepResult<
  TransportMemberUnregisterPlanAction
>;

export const initialTransportMemberUnregisterPlanState = initialGateState;

export const stepTransportMemberUnregisterPlanWithActions = interpretGate(
  transportMemberUnregisterPlanGate
);

export const transportMemberUnregisterPlanIndex = gatePayload<
  TransportMemberUnregisterPlanAction,
  "remove",
  "index"
>("remove", "index");

export const shouldRemoveTransportMemberUnregisterPlan = gateConcluded<
  TransportMemberUnregisterPlanAction
>("remove");

/**
 * Transport-member unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step).
 * Plan nested via {@link stepTransportMemberUnregisterPlanWithActions}
 * (`remove`).
 */
type TransportMemberUnregisterGateEvent = Extract<
  TransportMemberUnregisterEvent,
  { readonly kind: "transport/member-unregister-gate" }
>;

const transportMemberUnregisterGate = defineGate<
  TransportMemberUnregisterGateEvent,
  TransportMemberUnregisterAction
>({
  event: "transport/member-unregister-gate",
  actions: ["remove"],
  decide: (event) => {
    const index = transportMemberUnregisterPlanIndex(
      decideGate(transportMemberUnregisterPlanGate, {
        kind: "transport/member-unregister-plan-gate",
        index: event.index
      })
    );
    return index === null ? [] : [{ kind: "remove", index }];
  }
});

export type TransportMemberUnregisterState = GateState;

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

export type TransportMemberUnregisterStepResult = GateStepResult<
  TransportMemberUnregisterAction
>;

export const initialTransportMemberUnregisterState = initialGateState;

export const stepTransportMemberUnregisterWithActions = interpretGate(
  transportMemberUnregisterGate
);

export const transportMemberUnregisterIndex = gatePayload<
  TransportMemberUnregisterAction,
  "remove",
  "index"
>("remove", "index");

export const shouldRemoveTransportMember = gateConcluded<
  TransportMemberUnregisterAction
>("remove");

/**
 * Transport ingress dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepTransportIngressDispatchPlanWithActions}
 * (`announce`|`link-request`|`link-data`|`plain-data`|`proof`|`ignore`).
 */
type TransportIngressDispatchGateEvent = Extract<
  TransportIngressDispatchEvent,
  { readonly kind: "transport/ingress-dispatch-gate" }
>;

const transportIngressDispatchGate = defineGate<
  TransportIngressDispatchGateEvent,
  TransportIngressDispatchAction
>({
  event: "transport/ingress-dispatch-gate",
  actions: ["announce", "link-request", "link-data", "plain-data", "proof", "ignore"],
  decide: (event) => {
    const plan = transportIngressDispatchPlanFromActions(
      decideGate(transportIngressDispatchPlanGate, {
        ...event,
        kind: "transport/ingress-dispatch-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type TransportIngressDispatchState = GateState;

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

export type TransportIngressDispatchStepResult = GateStepResult<TransportIngressDispatchAction>;

export const initialTransportIngressDispatchState = initialGateState;

export const stepTransportIngressDispatch: StepFn<TransportIngressDispatchState> = gateStepFn(
  transportIngressDispatchGate
);

export const stepTransportIngressDispatchWithActions = interpretGate(
  transportIngressDispatchGate
);

export const transportIngressDispatchFromActions = gateConclusion<
  TransportIngressDispatchAction,
  TransportIngressDispatch
>("announce", "link-request", "link-data", "plain-data", "proof", "ignore");

export const shouldDispatchTransportAnnounce = gateConcluded<
  TransportIngressDispatchAction
>("announce");

export const shouldDispatchTransportLinkRequest = gateConcluded<
  TransportIngressDispatchAction
>("link-request");

export const shouldDispatchTransportLinkData = gateConcluded<
  TransportIngressDispatchAction
>("link-data");

export const shouldDispatchTransportPlainData = gateConcluded<
  TransportIngressDispatchAction
>("plain-data");

export const shouldDispatchTransportProof = gateConcluded<
  TransportIngressDispatchAction
>("proof");

export const shouldIgnoreTransportIngressDispatch = gateConcluded<
  TransportIngressDispatchAction
>("ignore");

/**
 * Link-data ingress target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkDataIngressTargetPlanWithActions}
 * (`active`|`pending`|`none`).
 */
type LinkDataIngressTargetGateEvent = Extract<
  LinkDataIngressTargetEvent,
  { readonly kind: "transport/link-data-ingress-gate" }
>;

const linkDataIngressTargetGate = defineGate<
  LinkDataIngressTargetGateEvent,
  LinkDataIngressTargetAction
>({
  event: "transport/link-data-ingress-gate",
  actions: ["active", "pending", "none"],
  decide: (event) => {
    const plan = linkDataIngressTargetPlanFromActions(
      decideGate(linkDataIngressTargetPlanGate, {
        ...event,
        kind: "transport/link-data-ingress-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type LinkDataIngressTargetState = GateState;

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

export type LinkDataIngressTargetStepResult = GateStepResult<LinkDataIngressTargetAction>;

export const initialLinkDataIngressTargetState = initialGateState;

export const stepLinkDataIngressTarget: StepFn<LinkDataIngressTargetState> = gateStepFn(
  linkDataIngressTargetGate
);

export const stepLinkDataIngressTargetWithActions = interpretGate(linkDataIngressTargetGate);

export const linkDataIngressTargetFromActions = gateConclusion<
  LinkDataIngressTargetAction,
  LinkDataIngressTarget
>("active", "pending", "none");

export const shouldIngressLinkDataActive = gateConcluded<LinkDataIngressTargetAction>("active");

export const shouldIngressLinkDataPending = gateConcluded<
  LinkDataIngressTargetAction
>("pending");

export const shouldIngressLinkDataNone = gateConcluded<LinkDataIngressTargetAction>("none");

/**
 * Reverse-relay outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepReverseRelayOutcomePlanWithActions}
 * (`relay`|`delete-expired`|`ignore`).
 */
type ReverseRelayOutcomeGateEvent = Extract<
  ReverseRelayOutcomeEvent,
  { readonly kind: "transport/reverse-relay-gate" }
>;

const reverseRelayOutcomeGate = defineGate<
  ReverseRelayOutcomeGateEvent,
  ReverseRelayOutcomeAction
>({
  event: "transport/reverse-relay-gate",
  actions: ["relay", "delete-expired", "ignore"],
  decide: (event) => {
    const plan = reverseRelayOutcomePlanFromActions(
      decideGate(reverseRelayOutcomePlanGate, {
        ...event,
        kind: "transport/reverse-relay-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type ReverseRelayOutcomeState = GateState;

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

export type ReverseRelayOutcomeStepResult = GateStepResult<ReverseRelayOutcomeAction>;

export const initialReverseRelayOutcomeState = initialGateState;

export const stepReverseRelayOutcome: StepFn<ReverseRelayOutcomeState> = gateStepFn(
  reverseRelayOutcomeGate
);

export const stepReverseRelayOutcomeWithActions = interpretGate(reverseRelayOutcomeGate);

export const reverseRelayOutcomeFromActions = gateConclusion<
  ReverseRelayOutcomeAction,
  ReverseRelayOutcome
>("relay", "delete-expired", "ignore");

export const shouldRelayReversePacketActions = gateConcluded<
  ReverseRelayOutcomeAction
>("relay");

export const shouldDeleteExpiredReverseEntryActions = gateConcluded<
  ReverseRelayOutcomeAction
>("delete-expired");

export const shouldIgnoreReverseRelayOutcome = gateConcluded<
  ReverseRelayOutcomeAction
>("ignore");

/**
 * Packet-hash remember timing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketHashRememberPlanWithActions} (`now`|`after-relay`).
 */
type PacketHashRememberGateEvent = Extract<
  PacketHashRememberEvent,
  { readonly kind: "transport/packet-hash-remember-gate" }
>;

const packetHashRememberGate = defineGate<
  PacketHashRememberGateEvent,
  PacketHashRememberAction
>({
  event: "transport/packet-hash-remember-gate",
  actions: ["now", "after-relay"],
  decide: (event) => {
    const plan = packetHashRememberPlanFromActions(
      decideGate(packetHashRememberPlanGate, {
        ...event,
        kind: "transport/packet-hash-remember-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type PacketHashRememberState = GateState;

export type PacketHashRememberEvent =
  | Event
  | {
      readonly kind: "transport/packet-hash-remember-gate";
      readonly deferred: boolean;
    };

export type PacketHashRememberAction = {
  readonly kind: PacketHashRememberPlan;
};

export type PacketHashRememberStepResult = GateStepResult<PacketHashRememberAction>;

export const initialPacketHashRememberState = initialGateState;

export const stepPacketHashRemember: StepFn<PacketHashRememberState> = gateStepFn(
  packetHashRememberGate
);

export const stepPacketHashRememberWithActions = interpretGate(packetHashRememberGate);

export const packetHashRememberFromActions = gateConclusion<
  PacketHashRememberAction,
  PacketHashRememberPlan
>("now", "after-relay");

export const shouldRememberPacketHashNowActions = gateConcluded<
  PacketHashRememberAction
>("now");

export const shouldRememberPacketHashAfterRelayActions = gateConcluded<
  PacketHashRememberAction
>("after-relay");

/**
 * Local plain-data delivery is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLocalPlainDataDeliveryPlanWithActions}
 * (`dispatch`|`ignore`).
 */
type LocalPlainDataDeliveryGateEvent = Extract<
  LocalPlainDataDeliveryEvent,
  { readonly kind: "transport/local-plain-data-gate" }
>;

const localPlainDataDeliveryGate = defineGate<
  LocalPlainDataDeliveryGateEvent,
  LocalPlainDataDeliveryAction
>({
  event: "transport/local-plain-data-gate",
  actions: ["dispatch", "ignore"],
  decide: (event) => {
    const plan = localPlainDataDeliveryPlanFromActions(
      decideGate(localPlainDataDeliveryPlanGate, {
        ...event,
        kind: "transport/local-plain-data-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type LocalPlainDataDeliveryState = GateState;

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

export type LocalPlainDataDeliveryStepResult = GateStepResult<LocalPlainDataDeliveryAction>;

export const initialLocalPlainDataDeliveryState = initialGateState;

export const stepLocalPlainDataDelivery: StepFn<LocalPlainDataDeliveryState> = gateStepFn(
  localPlainDataDeliveryGate
);

export const stepLocalPlainDataDeliveryWithActions = interpretGate(localPlainDataDeliveryGate);

export const localPlainDataDeliveryFromActions = gateConclusion<
  LocalPlainDataDeliveryAction,
  LocalPlainDataDeliveryPlan
>("dispatch", "ignore");

export const shouldDispatchLocalPlainDataDeliveryActions = gateConcluded<
  LocalPlainDataDeliveryAction
>("dispatch");

export const shouldIgnoreLocalPlainDataDelivery = gateConcluded<
  LocalPlainDataDeliveryAction
>("ignore");

/**
 * Proof ingress kind is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepProofIngressPlanWithActions}
 * (`lrproof`|`resource-prf`|`receipt`).
 */
type ProofIngressGateEvent = Extract<
  ProofIngressEvent,
  { readonly kind: "transport/proof-ingress-gate" }
>;

const proofIngressGate = defineGate<ProofIngressGateEvent, ProofIngressAction>({
  event: "transport/proof-ingress-gate",
  actions: ["lrproof", "resource-prf", "receipt"],
  decide: (event) => {
    const plan = proofIngressPlanFromActions(
      decideGate(proofIngressPlanGate, {
        ...event,
        kind: "transport/proof-ingress-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type ProofIngressState = GateState;

export type ProofIngressEvent =
  | Event
  | {
      readonly kind: "transport/proof-ingress-gate";
      readonly context: number;
    };

export type ProofIngressAction = {
  readonly kind: ProofIngressKind;
};

export type ProofIngressStepResult = GateStepResult<ProofIngressAction>;

export const initialProofIngressState = initialGateState;

export const stepProofIngress: StepFn<ProofIngressState> = gateStepFn(proofIngressGate);

export const stepProofIngressWithActions = interpretGate(proofIngressGate);

export const proofIngressKindFromActions = gateConclusion<
  ProofIngressAction,
  ProofIngressKind
>("lrproof", "resource-prf", "receipt");

export const shouldHandleProofLrproof = gateConcluded<ProofIngressAction>("lrproof");

export const shouldHandleProofResourcePrf = gateConcluded<ProofIngressAction>("resource-prf");

export const shouldHandleProofReceipt = gateConcluded<ProofIngressAction>("receipt");
