/** Extracted from transport-ingress.ts; the original module remains the public composition point. */
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
  type GateStepResult,
} from "@twistedpear/effects";
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  PACKET_DEST_TYPE_LINK,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF,
} from "../packet-header.js";
import { PacketContextCode } from "../packet-context.js";
import { equalByteArrays } from "../path-table.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";

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

  return (
    input.packetType === PACKET_TYPE_ANNOUNCE &&
    input.destinationType === PACKET_DEST_TYPE_SINGLE
  );
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

const packetFilterPlanGate = defineBooleanGate<
  PacketFilterPlanGateEvent,
  "accept",
  "reject"
>({
  event: "transport/packet-filter-plan-gate",
  whenTrue: "accept",
  whenFalse: "reject",
  decide: (event) => planPacketFilter(event),
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

export const stepPacketFilterPlanWithActions =
  interpretGate(packetFilterPlanGate);

/** Extract the packet-filter plan from actions; null when empty. */
export const packetFilterPlanFromActions = gateConclusion<
  PacketFilterPlanAction,
  PacketFilterPlan
>("accept", "reject");

export const shouldAcceptPacketFilterPlan =
  gateConcluded<PacketFilterPlanAction>("accept");

export const shouldRejectPacketFilterPlan =
  gateConcluded<PacketFilterPlanAction>("reject");

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
        kind: "transport/packet-filter-plan-gate",
      }),
    );
    return plan === null ? [] : [{ kind: plan }];
  },
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
  { readonly kind: "accept" } | { readonly kind: "reject" };

export type PacketFilterStepResult = GateStepResult<PacketFilterAction>;

export const initialPacketFilterState = initialGateState;

export const stepPacketFilterWithActions = interpretGate(packetFilterGate);

export const shouldAcceptPacketFilter =
  gateConcluded<PacketFilterAction>("accept");

export const shouldRejectPacketFilter =
  gateConcluded<PacketFilterAction>("reject");

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
  decide: (event) => shouldAcceptTransportPacket(event),
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
  { readonly kind: "accept" } | { readonly kind: "skip" };

export type AcceptTransportPacketStepResult =
  GateStepResult<AcceptTransportPacketAction>;

export const initialAcceptTransportPacketState = initialGateState;

export const stepAcceptTransportPacketWithActions = interpretGate(
  acceptTransportPacketGate,
);

export const shouldAcceptTransportPacketNow =
  gateConcluded<AcceptTransportPacketAction>("accept");

export const shouldSkipAcceptTransportPacket =
  gateConcluded<AcceptTransportPacketAction>("skip");

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
  decide: (event) => shouldDeferPacketHash(event),
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
  { readonly kind: "defer" } | { readonly kind: "remember-now" };

export type PacketHashDeferStepResult = GateStepResult<PacketHashDeferAction>;

export const initialPacketHashDeferState = initialGateState;

export const stepPacketHashDeferWithActions =
  interpretGate(packetHashDeferGate);

export const shouldDeferPacketHashActions =
  gateConcluded<PacketHashDeferAction>("defer");

export const shouldRememberPacketHashImmediately =
  gateConcluded<PacketHashDeferAction>("remember-now");

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
    if (
      input.packetHops === input.remainingHops ||
      input.packetHops === input.takenHops
    ) {
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
  decide: (event) => planLinkRelayTarget(event),
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

export type LinkRelayTargetPlanStepResult =
  GateStepResult<LinkRelayTargetPlanAction>;

export const initialLinkRelayTargetPlanState = initialGateState;

export const stepLinkRelayTargetPlanWithActions = interpretGate(
  linkRelayTargetPlanGate,
);

/** Extract the link relay target plan from actions; null when empty or ignore. */
export const linkRelayTargetPlanFromActions = gateConclusion<
  LinkRelayTargetPlanAction,
  LinkRelayTarget
>("outbound", "received");

export const shouldRelayLinkOutboundPlan =
  gateConcluded<LinkRelayTargetPlanAction>("outbound");

export const shouldRelayLinkReceivedPlan =
  gateConcluded<LinkRelayTargetPlanAction>("received");

export const shouldIgnoreLinkRelayTargetPlan =
  gateConcluded<LinkRelayTargetPlanAction>("ignore");

/** Whether link-relay may proceed after a link-table lookup hit. */
export function canLookupLinkRelayEntry(entryPresent: boolean): boolean {
  return entryPresent;
}

/**
 * canLookupLinkRelayEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLookupLinkRelayEntry`
 * reads beside the step).
 */
export type LookupLinkRelayEntryGateEvent = Extract<
  LookupLinkRelayEntryEvent,
  { readonly kind: "transport/lookup-link-relay-entry-gate" }
>;

export type LookupLinkRelayEntryEvent =
  | Event
  | {
      readonly kind: "transport/lookup-link-relay-entry-gate";
      readonly entryPresent: boolean;
    };

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

export const linkRelayTargetGate = defineGate<
  LinkRelayTargetGateEvent,
  LinkRelayTargetAction
>({
  event: "transport/link-relay-gate",
  actions: ["outbound", "received", "ignore"],
  decide: (event) => {
    const target = linkRelayTargetPlanFromActions(
      decideGate(linkRelayTargetPlanGate, {
        ...event,
        kind: "transport/link-relay-plan-gate",
      }),
    );
    return [{ kind: target ?? "ignore" }];
  },
});

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

export const stepLinkRelayTargetWithActions =
  interpretGate(linkRelayTargetGate);
