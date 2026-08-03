/** Extracted from transport-ingress.ts; the original module remains the public composition point. */
// @ts-nocheck

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
 */function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { decideGate, defineBooleanGate, defineGate, defineOptionGate, gateConcluded, gateConclusion, gatePayload, gateStepFn, initialGateState, interpretGate, type GateState, type GateStepResult } from "@twistedpear/effects";
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_DEST_TYPE_LINK, PACKET_DEST_TYPE_SINGLE, PACKET_TYPE_ANNOUNCE, PACKET_TYPE_DATA, PACKET_TYPE_LINKREQUEST, PACKET_TYPE_PROOF } from "../packet-header.js";
import { PacketContextCode } from "../packet-context.js";
import { equalByteArrays } from "../path-table.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { recordReverseTableEntryGate } from "./part-2.js";
export type RecordReverseTableEntryAction = {
  readonly kind: "record";
} | {
  readonly kind: "skip";
};
export type RecordReverseTableEntryStepResult = GateStepResult<RecordReverseTableEntryAction>;
export const initialRecordReverseTableEntryState = initialGateState;
export const stepRecordReverseTableEntryWithActions = interpretGate(recordReverseTableEntryGate);
export const shouldRecordReverseTableEntryNow = gateConcluded<RecordReverseTableEntryAction>(stryMutAct_9fa48("34067") ? "" : (stryCov_9fa48("34067"), "record"));
export const shouldSkipRecordReverseTableEntry = gateConcluded<RecordReverseTableEntryAction>(stryMutAct_9fa48("34068") ? "" : (stryCov_9fa48("34068"), "skip"));

/** Whether inbound DATA is a local path-request (PLAIN + path-request hash). */
export function isLocalPathRequestPacket(input: {
  readonly destinationTypePlain: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  if (stryMutAct_9fa48("34069")) {
    {}
  } else {
    stryCov_9fa48("34069");
    return stryMutAct_9fa48("34072") ? input.destinationTypePlain || input.destinationHashMatches : stryMutAct_9fa48("34071") ? false : stryMutAct_9fa48("34070") ? true : (stryCov_9fa48("34070", "34071", "34072"), input.destinationTypePlain && input.destinationHashMatches);
  }
}

/**
 * Local path-request packet gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLocalPathRequestPacket`
 * reads beside the step).
 */
type LocalPathRequestPacketGateEvent = Extract<LocalPathRequestPacketEvent, {
  readonly kind: "transport/local-path-request-packet-gate";
}>;
const localPathRequestPacketGate = defineBooleanGate<LocalPathRequestPacketGateEvent, "path-request", "other">(stryMutAct_9fa48("34073") ? {} : (stryCov_9fa48("34073"), {
  event: stryMutAct_9fa48("34074") ? "" : (stryCov_9fa48("34074"), "transport/local-path-request-packet-gate"),
  whenTrue: stryMutAct_9fa48("34075") ? "" : (stryCov_9fa48("34075"), "path-request"),
  whenFalse: stryMutAct_9fa48("34076") ? "" : (stryCov_9fa48("34076"), "other"),
  decide: stryMutAct_9fa48("34077") ? () => undefined : (stryCov_9fa48("34077"), event => isLocalPathRequestPacket(event))
}));
export type LocalPathRequestPacketState = GateState;
export type LocalPathRequestPacketEvent = Intent | {
  readonly kind: "transport/local-path-request-packet-gate";
  readonly destinationTypePlain: boolean;
  readonly destinationHashMatches: boolean;
};
export type LocalPathRequestPacketAction = {
  readonly kind: "path-request";
} | {
  readonly kind: "other";
};
export type LocalPathRequestPacketStepResult = GateStepResult<LocalPathRequestPacketAction>;
export const initialLocalPathRequestPacketState = initialGateState;
export const stepLocalPathRequestPacketWithActions = interpretGate(localPathRequestPacketGate);
export const shouldTreatLocalPathRequestPacket = gateConcluded<LocalPathRequestPacketAction>(stryMutAct_9fa48("34078") ? "" : (stryCov_9fa48("34078"), "path-request"));
export const shouldTreatLocalPathRequestPacketOther = gateConcluded<LocalPathRequestPacketAction>(stryMutAct_9fa48("34079") ? "" : (stryCov_9fa48("34079"), "other"));

/**
 * Whether a link-table packet may be relayed (not ANNOUNCE / LINKREQUEST).
 * Link-table lookup and hop/interface targeting stay at the adapter edge.
 */
export function canRelayLinkPacket(packetType: number): boolean {
  if (stryMutAct_9fa48("34080")) {
    {}
  } else {
    stryCov_9fa48("34080");
    return stryMutAct_9fa48("34083") ? packetType !== PACKET_TYPE_ANNOUNCE || packetType !== PACKET_TYPE_LINKREQUEST : stryMutAct_9fa48("34082") ? false : stryMutAct_9fa48("34081") ? true : (stryCov_9fa48("34081", "34082", "34083"), (stryMutAct_9fa48("34085") ? packetType === PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("34084") ? true : (stryCov_9fa48("34084", "34085"), packetType !== PACKET_TYPE_ANNOUNCE)) && (stryMutAct_9fa48("34087") ? packetType === PACKET_TYPE_LINKREQUEST : stryMutAct_9fa48("34086") ? true : (stryCov_9fa48("34086", "34087"), packetType !== PACKET_TYPE_LINKREQUEST)));
  }
}

/**
 * canRelayLinkPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRelayLinkPacket` reads
 * beside the step).
 */
type RelayLinkPacketAllowGateEvent = Extract<RelayLinkPacketAllowEvent, {
  readonly kind: "transport/relay-link-packet-allow-gate";
}>;
const relayLinkPacketAllowGate = defineBooleanGate<RelayLinkPacketAllowGateEvent, "allow", "deny">(stryMutAct_9fa48("34088") ? {} : (stryCov_9fa48("34088"), {
  event: stryMutAct_9fa48("34089") ? "" : (stryCov_9fa48("34089"), "transport/relay-link-packet-allow-gate"),
  whenTrue: stryMutAct_9fa48("34090") ? "" : (stryCov_9fa48("34090"), "allow"),
  whenFalse: stryMutAct_9fa48("34091") ? "" : (stryCov_9fa48("34091"), "deny"),
  decide: stryMutAct_9fa48("34092") ? () => undefined : (stryCov_9fa48("34092"), event => canRelayLinkPacket(event.packetType))
}));
export type RelayLinkPacketAllowState = GateState;
export type RelayLinkPacketAllowEvent = Event | {
  readonly kind: "transport/relay-link-packet-allow-gate";
  readonly packetType: number;
};
export type RelayLinkPacketAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export type RelayLinkPacketAllowStepResult = GateStepResult<RelayLinkPacketAllowAction>;
export const initialRelayLinkPacketAllowState = initialGateState;
export const stepRelayLinkPacketAllowWithActions = interpretGate(relayLinkPacketAllowGate);
export const shouldAllowRelayLinkPacket = gateConcluded<RelayLinkPacketAllowAction>(stryMutAct_9fa48("34093") ? "" : (stryCov_9fa48("34093"), "allow"));
export const shouldDenyRelayLinkPacket = gateConcluded<RelayLinkPacketAllowAction>(stryMutAct_9fa48("34094") ? "" : (stryCov_9fa48("34094"), "deny"));

/**
 * Whether a reverse-table proof may be relayed (PROOF + live reverse entry).
 * Interface identity is checked separately via {@link shouldRelayReverseOnInterface}.
 */
export function canRelayReversePacket(input: {
  readonly isProof: boolean;
  readonly hasEntry: boolean;
  readonly entryExpired: boolean;
}): boolean {
  if (stryMutAct_9fa48("34095")) {
    {}
  } else {
    stryCov_9fa48("34095");
    return stryMutAct_9fa48("34098") ? input.isProof && input.hasEntry || !input.entryExpired : stryMutAct_9fa48("34097") ? false : stryMutAct_9fa48("34096") ? true : (stryCov_9fa48("34096", "34097", "34098"), (stryMutAct_9fa48("34100") ? input.isProof || input.hasEntry : stryMutAct_9fa48("34099") ? true : (stryCov_9fa48("34099", "34100"), input.isProof && input.hasEntry)) && (stryMutAct_9fa48("34101") ? input.entryExpired : (stryCov_9fa48("34101"), !input.entryExpired)));
  }
}

/**
 * canRelayReversePacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRelayReversePacket`
 * reads beside the step).
 */
type RelayReversePacketAllowGateEvent = Extract<RelayReversePacketAllowEvent, {
  readonly kind: "transport/relay-reverse-packet-allow-gate";
}>;
const relayReversePacketAllowGate = defineBooleanGate<RelayReversePacketAllowGateEvent, "allow", "deny">(stryMutAct_9fa48("34102") ? {} : (stryCov_9fa48("34102"), {
  event: stryMutAct_9fa48("34103") ? "" : (stryCov_9fa48("34103"), "transport/relay-reverse-packet-allow-gate"),
  whenTrue: stryMutAct_9fa48("34104") ? "" : (stryCov_9fa48("34104"), "allow"),
  whenFalse: stryMutAct_9fa48("34105") ? "" : (stryCov_9fa48("34105"), "deny"),
  decide: stryMutAct_9fa48("34106") ? () => undefined : (stryCov_9fa48("34106"), event => canRelayReversePacket(event))
}));
export type RelayReversePacketAllowState = GateState;
export type RelayReversePacketAllowEvent = Event | {
  readonly kind: "transport/relay-reverse-packet-allow-gate";
  readonly isProof: boolean;
  readonly hasEntry: boolean;
  readonly entryExpired: boolean;
};
export type RelayReversePacketAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export type RelayReversePacketAllowStepResult = GateStepResult<RelayReversePacketAllowAction>;
export const initialRelayReversePacketAllowState = initialGateState;
export const stepRelayReversePacketAllowWithActions = interpretGate(relayReversePacketAllowGate);
export const shouldAllowRelayReversePacket = gateConcluded<RelayReversePacketAllowAction>(stryMutAct_9fa48("34107") ? "" : (stryCov_9fa48("34107"), "allow"));
export const shouldDenyRelayReversePacket = gateConcluded<RelayReversePacketAllowAction>(stryMutAct_9fa48("34108") ? "" : (stryCov_9fa48("34108"), "deny"));

/** Whether reverse relay should use this iface (must be the reverse entry's outbound). */
export function shouldRelayReverseOnInterface(ifaceIsOutbound: boolean): boolean {
  if (stryMutAct_9fa48("34109")) {
    {}
  } else {
    stryCov_9fa48("34109");
    return ifaceIsOutbound;
  }
}

/**
 * shouldRelayReverseOnInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRelayReverseOnInterface`
 * reads beside the step).
 */
type RelayReverseOnInterfaceGateEvent = Extract<RelayReverseOnInterfaceEvent, {
  readonly kind: "transport/relay-reverse-on-interface-gate";
}>;
const relayReverseOnInterfaceGate = defineBooleanGate<RelayReverseOnInterfaceGateEvent, "match", "mismatch">(stryMutAct_9fa48("34110") ? {} : (stryCov_9fa48("34110"), {
  event: stryMutAct_9fa48("34111") ? "" : (stryCov_9fa48("34111"), "transport/relay-reverse-on-interface-gate"),
  whenTrue: stryMutAct_9fa48("34112") ? "" : (stryCov_9fa48("34112"), "match"),
  whenFalse: stryMutAct_9fa48("34113") ? "" : (stryCov_9fa48("34113"), "mismatch"),
  decide: stryMutAct_9fa48("34114") ? () => undefined : (stryCov_9fa48("34114"), event => shouldRelayReverseOnInterface(event.ifaceIsOutbound))
}));
export type RelayReverseOnInterfaceState = GateState;
export type RelayReverseOnInterfaceEvent = Event | {
  readonly kind: "transport/relay-reverse-on-interface-gate";
  readonly ifaceIsOutbound: boolean;
};
export type RelayReverseOnInterfaceAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export type RelayReverseOnInterfaceStepResult = GateStepResult<RelayReverseOnInterfaceAction>;
export const initialRelayReverseOnInterfaceState = initialGateState;
export const stepRelayReverseOnInterfaceWithActions = interpretGate(relayReverseOnInterfaceGate);
export const shouldMatchRelayReverseOnInterface = gateConcluded<RelayReverseOnInterfaceAction>(stryMutAct_9fa48("34115") ? "" : (stryCov_9fa48("34115"), "match"));
export const shouldMismatchRelayReverseOnInterface = gateConcluded<RelayReverseOnInterfaceAction>(stryMutAct_9fa48("34116") ? "" : (stryCov_9fa48("34116"), "mismatch"));

/** Pure type → handler dispatch after transport accept / relay. */
export type TransportIngressDispatch = "announce" | "link-request" | "link-data" | "plain-data" | "proof" | "ignore";
export function planTransportIngressDispatch(input: {
  readonly packetType: number;
  readonly destinationType: number;
}): TransportIngressDispatch {
  if (stryMutAct_9fa48("34117")) {
    {}
  } else {
    stryCov_9fa48("34117");
    if (stryMutAct_9fa48("34120") ? input.packetType !== PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("34119") ? false : stryMutAct_9fa48("34118") ? true : (stryCov_9fa48("34118", "34119", "34120"), input.packetType === PACKET_TYPE_ANNOUNCE)) {
      if (stryMutAct_9fa48("34121")) {
        {}
      } else {
        stryCov_9fa48("34121");
        return stryMutAct_9fa48("34122") ? "" : (stryCov_9fa48("34122"), "announce");
      }
    }
    if (stryMutAct_9fa48("34125") ? input.packetType !== PACKET_TYPE_LINKREQUEST : stryMutAct_9fa48("34124") ? false : stryMutAct_9fa48("34123") ? true : (stryCov_9fa48("34123", "34124", "34125"), input.packetType === PACKET_TYPE_LINKREQUEST)) {
      if (stryMutAct_9fa48("34126")) {
        {}
      } else {
        stryCov_9fa48("34126");
        return stryMutAct_9fa48("34127") ? "" : (stryCov_9fa48("34127"), "link-request");
      }
    }
    if (stryMutAct_9fa48("34130") ? input.packetType !== PACKET_TYPE_DATA : stryMutAct_9fa48("34129") ? false : stryMutAct_9fa48("34128") ? true : (stryCov_9fa48("34128", "34129", "34130"), input.packetType === PACKET_TYPE_DATA)) {
      if (stryMutAct_9fa48("34131")) {
        {}
      } else {
        stryCov_9fa48("34131");
        return (stryMutAct_9fa48("34134") ? input.destinationType !== PACKET_DEST_TYPE_LINK : stryMutAct_9fa48("34133") ? false : stryMutAct_9fa48("34132") ? true : (stryCov_9fa48("34132", "34133", "34134"), input.destinationType === PACKET_DEST_TYPE_LINK)) ? stryMutAct_9fa48("34135") ? "" : (stryCov_9fa48("34135"), "link-data") : stryMutAct_9fa48("34136") ? "" : (stryCov_9fa48("34136"), "plain-data");
      }
    }
    if (stryMutAct_9fa48("34139") ? input.packetType !== PACKET_TYPE_PROOF : stryMutAct_9fa48("34138") ? false : stryMutAct_9fa48("34137") ? true : (stryCov_9fa48("34137", "34138", "34139"), input.packetType === PACKET_TYPE_PROOF)) {
      if (stryMutAct_9fa48("34140")) {
        {}
      } else {
        stryCov_9fa48("34140");
        return stryMutAct_9fa48("34141") ? "" : (stryCov_9fa48("34141"), "proof");
      }
    }
    return stryMutAct_9fa48("34142") ? "" : (stryCov_9fa48("34142"), "ignore");
  }
}

/**
 * Transport-ingress-dispatch plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planTransportIngressDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepTransportIngressDispatchWithActions}.
 */
type TransportIngressDispatchPlanGateEvent = Extract<TransportIngressDispatchPlanEvent, {
  readonly kind: "transport/ingress-dispatch-plan-gate";
}>;
const transportIngressDispatchPlanGate = defineGate<TransportIngressDispatchPlanGateEvent, TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34143") ? {} : (stryCov_9fa48("34143"), {
  event: stryMutAct_9fa48("34144") ? "" : (stryCov_9fa48("34144"), "transport/ingress-dispatch-plan-gate"),
  actions: stryMutAct_9fa48("34145") ? [] : (stryCov_9fa48("34145"), [stryMutAct_9fa48("34146") ? "" : (stryCov_9fa48("34146"), "announce"), stryMutAct_9fa48("34147") ? "" : (stryCov_9fa48("34147"), "link-request"), stryMutAct_9fa48("34148") ? "" : (stryCov_9fa48("34148"), "link-data"), stryMutAct_9fa48("34149") ? "" : (stryCov_9fa48("34149"), "plain-data"), stryMutAct_9fa48("34150") ? "" : (stryCov_9fa48("34150"), "proof"), stryMutAct_9fa48("34151") ? "" : (stryCov_9fa48("34151"), "ignore")]),
  decide: stryMutAct_9fa48("34152") ? () => undefined : (stryCov_9fa48("34152"), event => stryMutAct_9fa48("34153") ? [] : (stryCov_9fa48("34153"), [stryMutAct_9fa48("34154") ? {} : (stryCov_9fa48("34154"), {
    kind: planTransportIngressDispatch(event)
  })]))
}));
export type TransportIngressDispatchPlanState = GateState;
export type TransportIngressDispatchPlanEvent = Event | {
  readonly kind: "transport/ingress-dispatch-plan-gate";
  readonly packetType: number;
  readonly destinationType: number;
};
export type TransportIngressDispatchPlanAction = {
  readonly kind: TransportIngressDispatch;
};
export type TransportIngressDispatchPlanStepResult = GateStepResult<TransportIngressDispatchPlanAction>;
export const initialTransportIngressDispatchPlanState = initialGateState;
export const stepTransportIngressDispatchPlanWithActions = interpretGate(transportIngressDispatchPlanGate);

/** Extract the transport ingress dispatch plan from actions; null when empty. */
export const transportIngressDispatchPlanFromActions = gateConclusion<TransportIngressDispatchPlanAction, TransportIngressDispatch>(stryMutAct_9fa48("34155") ? "" : (stryCov_9fa48("34155"), "announce"), stryMutAct_9fa48("34156") ? "" : (stryCov_9fa48("34156"), "link-request"), stryMutAct_9fa48("34157") ? "" : (stryCov_9fa48("34157"), "link-data"), stryMutAct_9fa48("34158") ? "" : (stryCov_9fa48("34158"), "plain-data"), stryMutAct_9fa48("34159") ? "" : (stryCov_9fa48("34159"), "proof"), stryMutAct_9fa48("34160") ? "" : (stryCov_9fa48("34160"), "ignore"));
export const shouldDispatchTransportAnnouncePlan = gateConcluded<TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34161") ? "" : (stryCov_9fa48("34161"), "announce"));
export const shouldDispatchTransportLinkRequestPlan = gateConcluded<TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34162") ? "" : (stryCov_9fa48("34162"), "link-request"));
export const shouldDispatchTransportLinkDataPlan = gateConcluded<TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34163") ? "" : (stryCov_9fa48("34163"), "link-data"));
export const shouldDispatchTransportPlainDataPlan = gateConcluded<TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34164") ? "" : (stryCov_9fa48("34164"), "plain-data"));
export const shouldDispatchTransportProofPlan = gateConcluded<TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34165") ? "" : (stryCov_9fa48("34165"), "proof"));
export const shouldIgnoreTransportIngressDispatchPlan = gateConcluded<TransportIngressDispatchPlanAction>(stryMutAct_9fa48("34166") ? "" : (stryCov_9fa48("34166"), "ignore"));

/** Pure proof-context → handler kind. */
export type ProofIngressKind = "lrproof" | "resource-prf" | "receipt";
export function planProofIngressKind(context: number): ProofIngressKind {
  if (stryMutAct_9fa48("34167")) {
    {}
  } else {
    stryCov_9fa48("34167");
    if (stryMutAct_9fa48("34170") ? context !== PacketContextCode.LRPROOF : stryMutAct_9fa48("34169") ? false : stryMutAct_9fa48("34168") ? true : (stryCov_9fa48("34168", "34169", "34170"), context === PacketContextCode.LRPROOF)) {
      if (stryMutAct_9fa48("34171")) {
        {}
      } else {
        stryCov_9fa48("34171");
        return stryMutAct_9fa48("34172") ? "" : (stryCov_9fa48("34172"), "lrproof");
      }
    }
    if (stryMutAct_9fa48("34175") ? context !== PacketContextCode.RESOURCE_PRF : stryMutAct_9fa48("34174") ? false : stryMutAct_9fa48("34173") ? true : (stryCov_9fa48("34173", "34174", "34175"), context === PacketContextCode.RESOURCE_PRF)) {
      if (stryMutAct_9fa48("34176")) {
        {}
      } else {
        stryCov_9fa48("34176");
        return stryMutAct_9fa48("34177") ? "" : (stryCov_9fa48("34177"), "resource-prf");
      }
    }
    return stryMutAct_9fa48("34178") ? "" : (stryCov_9fa48("34178"), "receipt");
  }
}
export type ProofIngressPlanEvent = Event | {
  readonly kind: "transport/proof-ingress-plan-gate";
  readonly context: number;
};
export type ProofIngressPlanAction = {
  readonly kind: ProofIngressKind;
};

/**
 * Transport ingress dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepTransportIngressDispatchPlanWithActions}
 * (`announce`|`link-request`|`link-data`|`plain-data`|`proof`|`ignore`).
 */
type TransportIngressDispatchGateEvent = Extract<TransportIngressDispatchEvent, {
  readonly kind: "transport/ingress-dispatch-gate";
}>;
export const transportIngressDispatchGate = defineGate<TransportIngressDispatchGateEvent, TransportIngressDispatchAction>(stryMutAct_9fa48("34179") ? {} : (stryCov_9fa48("34179"), {
  event: stryMutAct_9fa48("34180") ? "" : (stryCov_9fa48("34180"), "transport/ingress-dispatch-gate"),
  actions: stryMutAct_9fa48("34181") ? [] : (stryCov_9fa48("34181"), [stryMutAct_9fa48("34182") ? "" : (stryCov_9fa48("34182"), "announce"), stryMutAct_9fa48("34183") ? "" : (stryCov_9fa48("34183"), "link-request"), stryMutAct_9fa48("34184") ? "" : (stryCov_9fa48("34184"), "link-data"), stryMutAct_9fa48("34185") ? "" : (stryCov_9fa48("34185"), "plain-data"), stryMutAct_9fa48("34186") ? "" : (stryCov_9fa48("34186"), "proof"), stryMutAct_9fa48("34187") ? "" : (stryCov_9fa48("34187"), "ignore")]),
  decide: event => {
    if (stryMutAct_9fa48("34188")) {
      {}
    } else {
      stryCov_9fa48("34188");
      const plan = transportIngressDispatchPlanFromActions(decideGate(transportIngressDispatchPlanGate, stryMutAct_9fa48("34189") ? {} : (stryCov_9fa48("34189"), {
        ...event,
        kind: stryMutAct_9fa48("34190") ? "" : (stryCov_9fa48("34190"), "transport/ingress-dispatch-plan-gate")
      })));
      return (stryMutAct_9fa48("34193") ? plan !== null : stryMutAct_9fa48("34192") ? false : stryMutAct_9fa48("34191") ? true : (stryCov_9fa48("34191", "34192", "34193"), plan === null)) ? stryMutAct_9fa48("34194") ? ["Stryker was here"] : (stryCov_9fa48("34194"), []) : stryMutAct_9fa48("34195") ? [] : (stryCov_9fa48("34195"), [stryMutAct_9fa48("34196") ? {} : (stryCov_9fa48("34196"), {
        kind: plan
      })]);
    }
  }
}));
export type TransportIngressDispatchEvent = Event | {
  readonly kind: "transport/ingress-dispatch-gate";
  readonly packetType: number;
  readonly destinationType: number;
};
export type TransportIngressDispatchAction = {
  readonly kind: TransportIngressDispatch;
};
export const stepTransportIngressDispatchWithActions = interpretGate(transportIngressDispatchGate);