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
import { REVERSE_TIMEOUT_SECONDS, canLookupLinkRelayEntry, linkRelayTargetGate, planLinkRelayTarget } from "./part-1.js";
import type { LinkRelayTarget, LinkRelayTargetAction, LookupLinkRelayEntryGateEvent } from "./part-1.js";
const lookupLinkRelayEntryGate = defineBooleanGate<LookupLinkRelayEntryGateEvent, "hit", "miss">(stryMutAct_9fa48("33957") ? {} : (stryCov_9fa48("33957"), {
  event: stryMutAct_9fa48("33958") ? "" : (stryCov_9fa48("33958"), "transport/lookup-link-relay-entry-gate"),
  whenTrue: stryMutAct_9fa48("33959") ? "" : (stryCov_9fa48("33959"), "hit"),
  whenFalse: stryMutAct_9fa48("33960") ? "" : (stryCov_9fa48("33960"), "miss"),
  decide: stryMutAct_9fa48("33961") ? () => undefined : (stryCov_9fa48("33961"), event => canLookupLinkRelayEntry(event.entryPresent))
}));
export type LookupLinkRelayEntryState = GateState;
export type LookupLinkRelayEntryAction = {
  readonly kind: "hit";
} | {
  readonly kind: "miss";
};
export type LookupLinkRelayEntryStepResult = GateStepResult<LookupLinkRelayEntryAction>;
export const initialLookupLinkRelayEntryState = initialGateState;
export const stepLookupLinkRelayEntryWithActions = interpretGate(lookupLinkRelayEntryGate);
export const shouldHitLookupLinkRelayEntry = gateConcluded<LookupLinkRelayEntryAction>(stryMutAct_9fa48("33962") ? "" : (stryCov_9fa48("33962"), "hit"));
export const shouldMissLookupLinkRelayEntry = gateConcluded<LookupLinkRelayEntryAction>(stryMutAct_9fa48("33963") ? "" : (stryCov_9fa48("33963"), "miss"));

/** Whether link-relay may transmit after {@link planLinkRelayTarget} resolves an iface. */
export function shouldTransmitLinkRelay(outboundPresent: boolean): boolean {
  if (stryMutAct_9fa48("33964")) {
    {}
  } else {
    stryCov_9fa48("33964");
    return outboundPresent;
  }
}

/**
 * shouldTransmitLinkRelay gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitLinkRelay`
 * reads beside the step).
 */
type TransmitLinkRelayGateEvent = Extract<TransmitLinkRelayEvent, {
  readonly kind: "transport/transmit-link-relay-gate";
}>;
const transmitLinkRelayGate = defineBooleanGate<TransmitLinkRelayGateEvent, "transmit", "skip">(stryMutAct_9fa48("33965") ? {} : (stryCov_9fa48("33965"), {
  event: stryMutAct_9fa48("33966") ? "" : (stryCov_9fa48("33966"), "transport/transmit-link-relay-gate"),
  whenTrue: stryMutAct_9fa48("33967") ? "" : (stryCov_9fa48("33967"), "transmit"),
  whenFalse: stryMutAct_9fa48("33968") ? "" : (stryCov_9fa48("33968"), "skip"),
  decide: stryMutAct_9fa48("33969") ? () => undefined : (stryCov_9fa48("33969"), event => shouldTransmitLinkRelay(event.outboundPresent))
}));
export type TransmitLinkRelayState = GateState;
export type TransmitLinkRelayEvent = Event | {
  readonly kind: "transport/transmit-link-relay-gate";
  readonly outboundPresent: boolean;
};
export type TransmitLinkRelayAction = {
  readonly kind: "transmit";
} | {
  readonly kind: "skip";
};
export type TransmitLinkRelayStepResult = GateStepResult<TransmitLinkRelayAction>;
export const initialTransmitLinkRelayState = initialGateState;
export const stepTransmitLinkRelayWithActions = interpretGate(transmitLinkRelayGate);
export const shouldTransmitLinkRelayNow = gateConcluded<TransmitLinkRelayAction>(stryMutAct_9fa48("33970") ? "" : (stryCov_9fa48("33970"), "transmit"));
export const shouldSkipTransmitLinkRelay = gateConcluded<TransmitLinkRelayAction>(stryMutAct_9fa48("33971") ? "" : (stryCov_9fa48("33971"), "skip"));
export type LinkRelayTargetState = GateState;
export type LinkRelayTargetStepResult = GateStepResult<LinkRelayTargetAction>;
export const initialLinkRelayTargetState = initialGateState;
export const stepLinkRelayTarget: StepFn<LinkRelayTargetState> = gateStepFn(linkRelayTargetGate);
export const linkRelayTargetFromActions = gateConclusion<LinkRelayTargetAction, LinkRelayTarget>(stryMutAct_9fa48("33972") ? "" : (stryCov_9fa48("33972"), "outbound"), stryMutAct_9fa48("33973") ? "" : (stryCov_9fa48("33973"), "received"));
export const shouldRelayLinkOutbound = gateConcluded<LinkRelayTargetAction>(stryMutAct_9fa48("33974") ? "" : (stryCov_9fa48("33974"), "outbound"));
export const shouldRelayLinkReceived = gateConcluded<LinkRelayTargetAction>(stryMutAct_9fa48("33975") ? "" : (stryCov_9fa48("33975"), "received"));
export const shouldIgnoreLinkRelayTarget = gateConcluded<LinkRelayTargetAction>(stryMutAct_9fa48("33976") ? "" : (stryCov_9fa48("33976"), "ignore"));

/** Whether reverse-table should delete an expired entry (delete-expired outcome). */
export function shouldDeleteExpiredReverseEntry(deleteExpired: boolean): boolean {
  if (stryMutAct_9fa48("33977")) {
    {}
  } else {
    stryCov_9fa48("33977");
    return deleteExpired;
  }
}

/**
 * Whether reverse relay may transmit after {@link planReverseRelayOutcome} resolves relay
 * and a table entry is still present.
 */
export function shouldTransmitReverseRelay(input: {
  readonly relayOk: boolean;
  readonly entryPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("33978")) {
    {}
  } else {
    stryCov_9fa48("33978");
    return stryMutAct_9fa48("33981") ? input.relayOk || input.entryPresent : stryMutAct_9fa48("33980") ? false : stryMutAct_9fa48("33979") ? true : (stryCov_9fa48("33979", "33980", "33981"), input.relayOk && input.entryPresent);
  }
}

/**
 * shouldTransmitReverseRelay gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitReverseRelay`
 * reads beside the step).
 */
type TransmitReverseRelayGateEvent = Extract<TransmitReverseRelayEvent, {
  readonly kind: "transport/transmit-reverse-relay-gate";
}>;
const transmitReverseRelayGate = defineBooleanGate<TransmitReverseRelayGateEvent, "transmit", "skip">(stryMutAct_9fa48("33982") ? {} : (stryCov_9fa48("33982"), {
  event: stryMutAct_9fa48("33983") ? "" : (stryCov_9fa48("33983"), "transport/transmit-reverse-relay-gate"),
  whenTrue: stryMutAct_9fa48("33984") ? "" : (stryCov_9fa48("33984"), "transmit"),
  whenFalse: stryMutAct_9fa48("33985") ? "" : (stryCov_9fa48("33985"), "skip"),
  decide: stryMutAct_9fa48("33986") ? () => undefined : (stryCov_9fa48("33986"), event => shouldTransmitReverseRelay(event))
}));
export type TransmitReverseRelayState = GateState;
export type TransmitReverseRelayEvent = Event | {
  readonly kind: "transport/transmit-reverse-relay-gate";
  readonly relayOk: boolean;
  readonly entryPresent: boolean;
};
export type TransmitReverseRelayAction = {
  readonly kind: "transmit";
} | {
  readonly kind: "skip";
};
export type TransmitReverseRelayStepResult = GateStepResult<TransmitReverseRelayAction>;
export const initialTransmitReverseRelayState = initialGateState;
export const stepTransmitReverseRelayWithActions = interpretGate(transmitReverseRelayGate);
export const shouldTransmitReverseRelayNow = gateConcluded<TransmitReverseRelayAction>(stryMutAct_9fa48("33987") ? "" : (stryCov_9fa48("33987"), "transmit"));
export const shouldSkipTransmitReverseRelay = gateConcluded<TransmitReverseRelayAction>(stryMutAct_9fa48("33988") ? "" : (stryCov_9fa48("33988"), "skip"));

/** True when a reverse-table entry is past its lifetime. */
export function isReverseEntryExpired(input: {
  readonly timestamp: number;
  readonly nowSeconds: number;
  readonly timeoutSeconds?: number;
}): boolean {
  if (stryMutAct_9fa48("33989")) {
    {}
  } else {
    stryCov_9fa48("33989");
    const timeoutSeconds = stryMutAct_9fa48("33990") ? input.timeoutSeconds && REVERSE_TIMEOUT_SECONDS : (stryCov_9fa48("33990"), input.timeoutSeconds ?? REVERSE_TIMEOUT_SECONDS);
    return stryMutAct_9fa48("33994") ? input.nowSeconds <= input.timestamp + timeoutSeconds : stryMutAct_9fa48("33993") ? input.nowSeconds >= input.timestamp + timeoutSeconds : stryMutAct_9fa48("33992") ? false : stryMutAct_9fa48("33991") ? true : (stryCov_9fa48("33991", "33992", "33993", "33994"), input.nowSeconds > (stryMutAct_9fa48("33995") ? input.timestamp - timeoutSeconds : (stryCov_9fa48("33995"), input.timestamp + timeoutSeconds)));
  }
}

/**
 * isReverseEntryExpired gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isReverseEntryExpired`
 * reads beside the step).
 */
type ReverseEntryExpiredGateEvent = Extract<ReverseEntryExpiredEvent, {
  readonly kind: "transport/reverse-entry-expired-gate";
}>;
const reverseEntryExpiredGate = defineGate<ReverseEntryExpiredGateEvent, ReverseEntryExpiredAction>(stryMutAct_9fa48("33996") ? {} : (stryCov_9fa48("33996"), {
  event: stryMutAct_9fa48("33997") ? "" : (stryCov_9fa48("33997"), "transport/reverse-entry-expired-gate"),
  actions: stryMutAct_9fa48("33998") ? [] : (stryCov_9fa48("33998"), [stryMutAct_9fa48("33999") ? "" : (stryCov_9fa48("33999"), "expired"), stryMutAct_9fa48("34000") ? "" : (stryCov_9fa48("34000"), "live")]),
  decide: event => {
    if (stryMutAct_9fa48("34001")) {
      {}
    } else {
      stryCov_9fa48("34001");
      const expiredInput = (stryMutAct_9fa48("34004") ? event.timeoutSeconds !== undefined : stryMutAct_9fa48("34003") ? false : stryMutAct_9fa48("34002") ? true : (stryCov_9fa48("34002", "34003", "34004"), event.timeoutSeconds === undefined)) ? stryMutAct_9fa48("34005") ? {} : (stryCov_9fa48("34005"), {
        timestamp: event.timestamp,
        nowSeconds: event.nowSeconds
      }) : stryMutAct_9fa48("34006") ? {} : (stryCov_9fa48("34006"), {
        timestamp: event.timestamp,
        nowSeconds: event.nowSeconds,
        timeoutSeconds: event.timeoutSeconds
      });
      return stryMutAct_9fa48("34007") ? [] : (stryCov_9fa48("34007"), [stryMutAct_9fa48("34008") ? {} : (stryCov_9fa48("34008"), {
        kind: isReverseEntryExpired(expiredInput) ? stryMutAct_9fa48("34009") ? "" : (stryCov_9fa48("34009"), "expired") : stryMutAct_9fa48("34010") ? "" : (stryCov_9fa48("34010"), "live")
      })]);
    }
  }
}));
export type ReverseEntryExpiredState = GateState;
export type ReverseEntryExpiredEvent = Event | {
  readonly kind: "transport/reverse-entry-expired-gate";
  readonly timestamp: number;
  readonly nowSeconds: number;
  readonly timeoutSeconds?: number;
};
export type ReverseEntryExpiredAction = {
  readonly kind: "expired";
} | {
  readonly kind: "live";
};
export type ReverseEntryExpiredStepResult = GateStepResult<ReverseEntryExpiredAction>;
export const initialReverseEntryExpiredState = initialGateState;
export const stepReverseEntryExpiredWithActions = interpretGate(reverseEntryExpiredGate);
export const shouldTreatReverseEntryExpired = gateConcluded<ReverseEntryExpiredAction>(stryMutAct_9fa48("34011") ? "" : (stryCov_9fa48("34011"), "expired"));
export const shouldTreatReverseEntryLive = gateConcluded<ReverseEntryExpiredAction>(stryMutAct_9fa48("34012") ? "" : (stryCov_9fa48("34012"), "live"));

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
  if (stryMutAct_9fa48("34013")) {
    {}
  } else {
    stryCov_9fa48("34013");
    return stryMutAct_9fa48("34016") ? input.transportIdPresent && !input.isAnnounce && input.transportIdMatchesLocal || input.hasPath : stryMutAct_9fa48("34015") ? false : stryMutAct_9fa48("34014") ? true : (stryCov_9fa48("34014", "34015", "34016"), (stryMutAct_9fa48("34018") ? input.transportIdPresent && !input.isAnnounce || input.transportIdMatchesLocal : stryMutAct_9fa48("34017") ? true : (stryCov_9fa48("34017", "34018"), (stryMutAct_9fa48("34020") ? input.transportIdPresent || !input.isAnnounce : stryMutAct_9fa48("34019") ? true : (stryCov_9fa48("34019", "34020"), input.transportIdPresent && (stryMutAct_9fa48("34021") ? input.isAnnounce : (stryCov_9fa48("34021"), !input.isAnnounce)))) && input.transportIdMatchesLocal)) && input.hasPath);
  }
}

/**
 * canRelayTransportPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRelayTransportPacket`
 * reads beside the step).
 */
type RelayTransportPacketAllowGateEvent = Extract<RelayTransportPacketAllowEvent, {
  readonly kind: "transport/relay-transport-packet-allow-gate";
}>;
const relayTransportPacketAllowGate = defineBooleanGate<RelayTransportPacketAllowGateEvent, "allow", "deny">(stryMutAct_9fa48("34022") ? {} : (stryCov_9fa48("34022"), {
  event: stryMutAct_9fa48("34023") ? "" : (stryCov_9fa48("34023"), "transport/relay-transport-packet-allow-gate"),
  whenTrue: stryMutAct_9fa48("34024") ? "" : (stryCov_9fa48("34024"), "allow"),
  whenFalse: stryMutAct_9fa48("34025") ? "" : (stryCov_9fa48("34025"), "deny"),
  decide: stryMutAct_9fa48("34026") ? () => undefined : (stryCov_9fa48("34026"), event => canRelayTransportPacket(event))
}));
export type RelayTransportPacketAllowState = GateState;
export type RelayTransportPacketAllowEvent = Event | {
  readonly kind: "transport/relay-transport-packet-allow-gate";
  readonly transportIdPresent: boolean;
  readonly isAnnounce: boolean;
  readonly transportIdMatchesLocal: boolean;
  readonly hasPath: boolean;
};
export type RelayTransportPacketAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export type RelayTransportPacketAllowStepResult = GateStepResult<RelayTransportPacketAllowAction>;
export const initialRelayTransportPacketAllowState = initialGateState;
export const stepRelayTransportPacketAllowWithActions = interpretGate(relayTransportPacketAllowGate);
export const shouldAllowRelayTransportPacket = gateConcluded<RelayTransportPacketAllowAction>(stryMutAct_9fa48("34027") ? "" : (stryCov_9fa48("34027"), "allow"));
export const shouldDenyRelayTransportPacket = gateConcluded<RelayTransportPacketAllowAction>(stryMutAct_9fa48("34028") ? "" : (stryCov_9fa48("34028"), "deny"));

/** Whether a relayed packet should create/update a link-relay table entry. */
export function shouldRecordLinkRelayTableEntry(packetType: number): boolean {
  if (stryMutAct_9fa48("34029")) {
    {}
  } else {
    stryCov_9fa48("34029");
    return stryMutAct_9fa48("34032") ? packetType !== PACKET_TYPE_LINKREQUEST : stryMutAct_9fa48("34031") ? false : stryMutAct_9fa48("34030") ? true : (stryCov_9fa48("34030", "34031", "34032"), packetType === PACKET_TYPE_LINKREQUEST);
  }
}

/**
 * shouldRecordLinkRelayTableEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRecordLinkRelayTableEntry`
 * reads beside the step).
 */
type RecordLinkRelayTableEntryGateEvent = Extract<RecordLinkRelayTableEntryEvent, {
  readonly kind: "transport/record-link-relay-table-entry-gate";
}>;
const recordLinkRelayTableEntryGate = defineBooleanGate<RecordLinkRelayTableEntryGateEvent, "record", "skip">(stryMutAct_9fa48("34033") ? {} : (stryCov_9fa48("34033"), {
  event: stryMutAct_9fa48("34034") ? "" : (stryCov_9fa48("34034"), "transport/record-link-relay-table-entry-gate"),
  whenTrue: stryMutAct_9fa48("34035") ? "" : (stryCov_9fa48("34035"), "record"),
  whenFalse: stryMutAct_9fa48("34036") ? "" : (stryCov_9fa48("34036"), "skip"),
  decide: stryMutAct_9fa48("34037") ? () => undefined : (stryCov_9fa48("34037"), event => shouldRecordLinkRelayTableEntry(event.packetType))
}));
export type RecordLinkRelayTableEntryState = GateState;
export type RecordLinkRelayTableEntryEvent = Event | {
  readonly kind: "transport/record-link-relay-table-entry-gate";
  readonly packetType: number;
};
export type RecordLinkRelayTableEntryAction = {
  readonly kind: "record";
} | {
  readonly kind: "skip";
};
export type RecordLinkRelayTableEntryStepResult = GateStepResult<RecordLinkRelayTableEntryAction>;
export const initialRecordLinkRelayTableEntryState = initialGateState;
export const stepRecordLinkRelayTableEntryWithActions = interpretGate(recordLinkRelayTableEntryGate);
export const shouldRecordLinkRelayTableEntryNow = gateConcluded<RecordLinkRelayTableEntryAction>(stryMutAct_9fa48("34038") ? "" : (stryCov_9fa48("34038"), "record"));
export const shouldSkipRecordLinkRelayTableEntry = gateConcluded<RecordLinkRelayTableEntryAction>(stryMutAct_9fa48("34039") ? "" : (stryCov_9fa48("34039"), "skip"));

/**
 * Whether a relayed packet should create/update a reverse-table entry
 * (everything except LRPROOF proofs).
 */
export function shouldRecordReverseTableEntry(input: {
  readonly packetType: number;
  readonly context: number;
}): boolean {
  if (stryMutAct_9fa48("34040")) {
    {}
  } else {
    stryCov_9fa48("34040");
    return stryMutAct_9fa48("34041") ? input.packetType === PACKET_TYPE_PROOF && input.context === PacketContextCode.LRPROOF : (stryCov_9fa48("34041"), !(stryMutAct_9fa48("34044") ? input.packetType === PACKET_TYPE_PROOF || input.context === PacketContextCode.LRPROOF : stryMutAct_9fa48("34043") ? false : stryMutAct_9fa48("34042") ? true : (stryCov_9fa48("34042", "34043", "34044"), (stryMutAct_9fa48("34046") ? input.packetType !== PACKET_TYPE_PROOF : stryMutAct_9fa48("34045") ? true : (stryCov_9fa48("34045", "34046"), input.packetType === PACKET_TYPE_PROOF)) && (stryMutAct_9fa48("34048") ? input.context !== PacketContextCode.LRPROOF : stryMutAct_9fa48("34047") ? true : (stryCov_9fa48("34047", "34048"), input.context === PacketContextCode.LRPROOF)))));
  }
}

/**
 * shouldRecordReverseTableEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRecordReverseTableEntry`
 * reads beside the step).
 */
type RecordReverseTableEntryGateEvent = Extract<RecordReverseTableEntryEvent, {
  readonly kind: "transport/record-reverse-table-entry-gate";
}>;
export const recordReverseTableEntryGate = defineBooleanGate<RecordReverseTableEntryGateEvent, "record", "skip">(stryMutAct_9fa48("34049") ? {} : (stryCov_9fa48("34049"), {
  event: stryMutAct_9fa48("34050") ? "" : (stryCov_9fa48("34050"), "transport/record-reverse-table-entry-gate"),
  whenTrue: stryMutAct_9fa48("34051") ? "" : (stryCov_9fa48("34051"), "record"),
  whenFalse: stryMutAct_9fa48("34052") ? "" : (stryCov_9fa48("34052"), "skip"),
  decide: stryMutAct_9fa48("34053") ? () => undefined : (stryCov_9fa48("34053"), event => shouldRecordReverseTableEntry(event))
}));
export type RecordReverseTableEntryState = GateState;
export type RecordReverseTableEntryEvent = Event | {
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
  if (stryMutAct_9fa48("34054")) {
    {}
  } else {
    stryCov_9fa48("34054");
    if (stryMutAct_9fa48("34057") ? false : stryMutAct_9fa48("34056") ? true : stryMutAct_9fa48("34055") ? input.canRelay : (stryCov_9fa48("34055", "34056", "34057"), !input.canRelay)) {
      if (stryMutAct_9fa48("34058")) {
        {}
      } else {
        stryCov_9fa48("34058");
        return input.entryExpired ? stryMutAct_9fa48("34059") ? "" : (stryCov_9fa48("34059"), "delete-expired") : stryMutAct_9fa48("34060") ? "" : (stryCov_9fa48("34060"), "ignore");
      }
    }
    if (stryMutAct_9fa48("34063") ? false : stryMutAct_9fa48("34062") ? true : stryMutAct_9fa48("34061") ? input.ifaceIsOutbound : (stryCov_9fa48("34061", "34062", "34063"), !input.ifaceIsOutbound)) {
      if (stryMutAct_9fa48("34064")) {
        {}
      } else {
        stryCov_9fa48("34064");
        return stryMutAct_9fa48("34065") ? "" : (stryCov_9fa48("34065"), "ignore");
      }
    }
    return stryMutAct_9fa48("34066") ? "" : (stryCov_9fa48("34066"), "relay");
  }
}