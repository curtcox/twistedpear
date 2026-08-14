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
  defineBooleanGate,
  defineGate,
  gateConcluded,
  gateConclusion,
  gateStepFn,
  initialGateState,
  interpretGate,
  type GateState,
  type GateStepResult,
} from "@twistedpear/effects";
import type { Event, StepFn } from "@twistedpear/effects";
import {
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF,
} from "../packet-header.js";
import { PacketContextCode } from "../packet-context.js";
import {
  REVERSE_TIMEOUT_SECONDS,
  canLookupLinkRelayEntry,
  linkRelayTargetGate,
} from "./part-1.js";
import type {
  LinkRelayTarget,
  LinkRelayTargetAction,
  LookupLinkRelayEntryGateEvent,
} from "./part-1.js";
const lookupLinkRelayEntryGate = defineBooleanGate<
  LookupLinkRelayEntryGateEvent,
  "hit",
  "miss"
>({
  event: "transport/lookup-link-relay-entry-gate",
  whenTrue: "hit",
  whenFalse: "miss",
  decide: (event) => canLookupLinkRelayEntry(event.entryPresent),
});

export type LookupLinkRelayEntryState = GateState;

export type LookupLinkRelayEntryAction =
  { readonly kind: "hit" } | { readonly kind: "miss" };

export type LookupLinkRelayEntryStepResult =
  GateStepResult<LookupLinkRelayEntryAction>;

export const initialLookupLinkRelayEntryState = initialGateState;

export const stepLookupLinkRelayEntryWithActions = interpretGate(
  lookupLinkRelayEntryGate,
);

export const shouldHitLookupLinkRelayEntry =
  gateConcluded<LookupLinkRelayEntryAction>("hit");

export const shouldMissLookupLinkRelayEntry =
  gateConcluded<LookupLinkRelayEntryAction>("miss");

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
  decide: (event) => shouldTransmitLinkRelay(event.outboundPresent),
});

export type TransmitLinkRelayState = GateState;

export type TransmitLinkRelayEvent =
  | Event
  | {
      readonly kind: "transport/transmit-link-relay-gate";
      readonly outboundPresent: boolean;
    };

export type TransmitLinkRelayAction =
  { readonly kind: "transmit" } | { readonly kind: "skip" };

export type TransmitLinkRelayStepResult =
  GateStepResult<TransmitLinkRelayAction>;

export const initialTransmitLinkRelayState = initialGateState;

export const stepTransmitLinkRelayWithActions = interpretGate(
  transmitLinkRelayGate,
);

export const shouldTransmitLinkRelayNow =
  gateConcluded<TransmitLinkRelayAction>("transmit");

export const shouldSkipTransmitLinkRelay =
  gateConcluded<TransmitLinkRelayAction>("skip");

export type LinkRelayTargetState = GateState;

export type LinkRelayTargetStepResult = GateStepResult<LinkRelayTargetAction>;

export const initialLinkRelayTargetState = initialGateState;

export const stepLinkRelayTarget: StepFn<LinkRelayTargetState> =
  gateStepFn(linkRelayTargetGate);

export const linkRelayTargetFromActions = gateConclusion<
  LinkRelayTargetAction,
  LinkRelayTarget
>("outbound", "received");

export const shouldRelayLinkOutbound =
  gateConcluded<LinkRelayTargetAction>("outbound");

export const shouldRelayLinkReceived =
  gateConcluded<LinkRelayTargetAction>("received");

export const shouldIgnoreLinkRelayTarget =
  gateConcluded<LinkRelayTargetAction>("ignore");

/** Whether reverse-table should delete an expired entry (delete-expired outcome). */
export function shouldDeleteExpiredReverseEntry(
  deleteExpired: boolean,
): boolean {
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
  decide: (event) => shouldTransmitReverseRelay(event),
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
  { readonly kind: "transmit" } | { readonly kind: "skip" };

export type TransmitReverseRelayStepResult =
  GateStepResult<TransmitReverseRelayAction>;

export const initialTransmitReverseRelayState = initialGateState;

export const stepTransmitReverseRelayWithActions = interpretGate(
  transmitReverseRelayGate,
);

export const shouldTransmitReverseRelayNow =
  gateConcluded<TransmitReverseRelayAction>("transmit");

export const shouldSkipTransmitReverseRelay =
  gateConcluded<TransmitReverseRelayAction>("skip");

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
            timeoutSeconds: event.timeoutSeconds,
          };
    return [{ kind: isReverseEntryExpired(expiredInput) ? "expired" : "live" }];
  },
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
  { readonly kind: "expired" } | { readonly kind: "live" };

export type ReverseEntryExpiredStepResult =
  GateStepResult<ReverseEntryExpiredAction>;

export const initialReverseEntryExpiredState = initialGateState;

export const stepReverseEntryExpiredWithActions = interpretGate(
  reverseEntryExpiredGate,
);

export const shouldTreatReverseEntryExpired =
  gateConcluded<ReverseEntryExpiredAction>("expired");

export const shouldTreatReverseEntryLive =
  gateConcluded<ReverseEntryExpiredAction>("live");

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
  decide: (event) => canRelayTransportPacket(event),
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
  { readonly kind: "allow" } | { readonly kind: "deny" };

export type RelayTransportPacketAllowStepResult =
  GateStepResult<RelayTransportPacketAllowAction>;

export const initialRelayTransportPacketAllowState = initialGateState;

export const stepRelayTransportPacketAllowWithActions = interpretGate(
  relayTransportPacketAllowGate,
);

export const shouldAllowRelayTransportPacket =
  gateConcluded<RelayTransportPacketAllowAction>("allow");

export const shouldDenyRelayTransportPacket =
  gateConcluded<RelayTransportPacketAllowAction>("deny");

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
  decide: (event) => shouldRecordLinkRelayTableEntry(event.packetType),
});

export type RecordLinkRelayTableEntryState = GateState;

export type RecordLinkRelayTableEntryEvent =
  | Event
  | {
      readonly kind: "transport/record-link-relay-table-entry-gate";
      readonly packetType: number;
    };

export type RecordLinkRelayTableEntryAction =
  { readonly kind: "record" } | { readonly kind: "skip" };

export type RecordLinkRelayTableEntryStepResult =
  GateStepResult<RecordLinkRelayTableEntryAction>;

export const initialRecordLinkRelayTableEntryState = initialGateState;

export const stepRecordLinkRelayTableEntryWithActions = interpretGate(
  recordLinkRelayTableEntryGate,
);

export const shouldRecordLinkRelayTableEntryNow =
  gateConcluded<RecordLinkRelayTableEntryAction>("record");

export const shouldSkipRecordLinkRelayTableEntry =
  gateConcluded<RecordLinkRelayTableEntryAction>("skip");

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

export const recordReverseTableEntryGate = defineBooleanGate<
  RecordReverseTableEntryGateEvent,
  "record",
  "skip"
>({
  event: "transport/record-reverse-table-entry-gate",
  whenTrue: "record",
  whenFalse: "skip",
  decide: (event) => shouldRecordReverseTableEntry(event),
});

export type RecordReverseTableEntryState = GateState;

export type RecordReverseTableEntryEvent =
  | Event
  | {
      readonly kind: "transport/record-reverse-table-entry-gate";
      readonly packetType: number;
      readonly context: number;
    };

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
