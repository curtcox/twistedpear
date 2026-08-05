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
} from "../packet-header.js";
import { PacketContextCode } from "../packet-context.js";
import { equalByteArrays } from "../path-table.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { recordReverseTableEntryGate } from "./part-2.js";
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

export type ProofIngressPlanEvent =
  | Event
  | {
      readonly kind: "transport/proof-ingress-plan-gate";
      readonly context: number;
    };

export type ProofIngressPlanAction = { readonly kind: ProofIngressKind };

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

export const transportIngressDispatchGate = defineGate<
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

export const stepTransportIngressDispatchWithActions = interpretGate(
  transportIngressDispatchGate
);
