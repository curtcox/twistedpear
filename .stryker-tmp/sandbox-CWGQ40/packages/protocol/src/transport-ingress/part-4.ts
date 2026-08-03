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
import { planProofIngressKind } from "./part-3.js";
import type { ProofIngressKind, ProofIngressPlanAction, ProofIngressPlanEvent } from "./part-3.js";
/**
 * Proof ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planProofIngressKind` /
 * `plan ===` reads beside the step). Nested under {@link stepProofIngressWithActions}.
 */
type ProofIngressPlanGateEvent = Extract<ProofIngressPlanEvent, {
  readonly kind: "transport/proof-ingress-plan-gate";
}>;
const proofIngressPlanGate = defineGate<ProofIngressPlanGateEvent, ProofIngressPlanAction>(stryMutAct_9fa48("34197") ? {} : (stryCov_9fa48("34197"), {
  event: stryMutAct_9fa48("34198") ? "" : (stryCov_9fa48("34198"), "transport/proof-ingress-plan-gate"),
  actions: stryMutAct_9fa48("34199") ? [] : (stryCov_9fa48("34199"), [stryMutAct_9fa48("34200") ? "" : (stryCov_9fa48("34200"), "lrproof"), stryMutAct_9fa48("34201") ? "" : (stryCov_9fa48("34201"), "resource-prf"), stryMutAct_9fa48("34202") ? "" : (stryCov_9fa48("34202"), "receipt")]),
  decide: stryMutAct_9fa48("34203") ? () => undefined : (stryCov_9fa48("34203"), event => stryMutAct_9fa48("34204") ? [] : (stryCov_9fa48("34204"), [stryMutAct_9fa48("34205") ? {} : (stryCov_9fa48("34205"), {
    kind: planProofIngressKind(event.context)
  })]))
}));
export type ProofIngressPlanState = GateState;
export type ProofIngressPlanStepResult = GateStepResult<ProofIngressPlanAction>;
export const initialProofIngressPlanState = initialGateState;
export const stepProofIngressPlanWithActions = interpretGate(proofIngressPlanGate);

/** Extract the proof ingress plan from actions; null when empty. */
export const proofIngressPlanFromActions = gateConclusion<ProofIngressPlanAction, ProofIngressKind>(stryMutAct_9fa48("34206") ? "" : (stryCov_9fa48("34206"), "lrproof"), stryMutAct_9fa48("34207") ? "" : (stryCov_9fa48("34207"), "resource-prf"), stryMutAct_9fa48("34208") ? "" : (stryCov_9fa48("34208"), "receipt"));
export const shouldHandleProofLrproofPlan = gateConcluded<ProofIngressPlanAction>(stryMutAct_9fa48("34209") ? "" : (stryCov_9fa48("34209"), "lrproof"));
export const shouldHandleProofResourcePrfPlan = gateConcluded<ProofIngressPlanAction>(stryMutAct_9fa48("34210") ? "" : (stryCov_9fa48("34210"), "resource-prf"));
export const shouldHandleProofReceiptPlan = gateConcluded<ProofIngressPlanAction>(stryMutAct_9fa48("34211") ? "" : (stryCov_9fa48("34211"), "receipt"));

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
  if (stryMutAct_9fa48("34212")) {
    {}
  } else {
    stryCov_9fa48("34212");
    if (stryMutAct_9fa48("34215") ? false : stryMutAct_9fa48("34214") ? true : stryMutAct_9fa48("34213") ? input.outgoing : (stryCov_9fa48("34213", "34214", "34215"), !input.outgoing)) {
      if (stryMutAct_9fa48("34216")) {
        {}
      } else {
        stryCov_9fa48("34216");
        return stryMutAct_9fa48("34217") ? true : (stryCov_9fa48("34217"), false);
      }
    }
    if (stryMutAct_9fa48("34220") ? input.isExcludedInterface !== true : stryMutAct_9fa48("34219") ? false : stryMutAct_9fa48("34218") ? true : (stryCov_9fa48("34218", "34219", "34220"), input.isExcludedInterface === (stryMutAct_9fa48("34221") ? false : (stryCov_9fa48("34221"), true)))) {
      if (stryMutAct_9fa48("34222")) {
        {}
      } else {
        stryCov_9fa48("34222");
        return stryMutAct_9fa48("34223") ? true : (stryCov_9fa48("34223"), false);
      }
    }
    if (stryMutAct_9fa48("34226") ? input.requireAttached === true || input.isAttached !== true : stryMutAct_9fa48("34225") ? false : stryMutAct_9fa48("34224") ? true : (stryCov_9fa48("34224", "34225", "34226"), (stryMutAct_9fa48("34228") ? input.requireAttached !== true : stryMutAct_9fa48("34227") ? true : (stryCov_9fa48("34227", "34228"), input.requireAttached === (stryMutAct_9fa48("34229") ? false : (stryCov_9fa48("34229"), true)))) && (stryMutAct_9fa48("34231") ? input.isAttached === true : stryMutAct_9fa48("34230") ? true : (stryCov_9fa48("34230", "34231"), input.isAttached !== (stryMutAct_9fa48("34232") ? false : (stryCov_9fa48("34232"), true)))))) {
      if (stryMutAct_9fa48("34233")) {
        {}
      } else {
        stryCov_9fa48("34233");
        return stryMutAct_9fa48("34234") ? true : (stryCov_9fa48("34234"), false);
      }
    }
    return stryMutAct_9fa48("34235") ? false : (stryCov_9fa48("34235"), true);
  }
}

/**
 * shouldTransmitOnInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitOnInterface`
 * reads beside the step).
 */
type TransmitOnInterfaceGateEvent = Extract<TransmitOnInterfaceEvent, {
  readonly kind: "transport/transmit-on-interface-gate";
}>;
const transmitOnInterfaceGate = defineGate<TransmitOnInterfaceGateEvent, TransmitOnInterfaceAction>(stryMutAct_9fa48("34236") ? {} : (stryCov_9fa48("34236"), {
  event: stryMutAct_9fa48("34237") ? "" : (stryCov_9fa48("34237"), "transport/transmit-on-interface-gate"),
  actions: stryMutAct_9fa48("34238") ? [] : (stryCov_9fa48("34238"), [stryMutAct_9fa48("34239") ? "" : (stryCov_9fa48("34239"), "transmit"), stryMutAct_9fa48("34240") ? "" : (stryCov_9fa48("34240"), "skip")]),
  decide: stryMutAct_9fa48("34241") ? () => undefined : (stryCov_9fa48("34241"), event => stryMutAct_9fa48("34242") ? [] : (stryCov_9fa48("34242"), [stryMutAct_9fa48("34243") ? {} : (stryCov_9fa48("34243"), {
    kind: shouldTransmitOnInterface(stryMutAct_9fa48("34244") ? {} : (stryCov_9fa48("34244"), {
      outgoing: event.outgoing,
      ...((stryMutAct_9fa48("34247") ? event.isExcludedInterface === undefined : stryMutAct_9fa48("34246") ? false : stryMutAct_9fa48("34245") ? true : (stryCov_9fa48("34245", "34246", "34247"), event.isExcludedInterface !== undefined)) ? stryMutAct_9fa48("34248") ? {} : (stryCov_9fa48("34248"), {
        isExcludedInterface: event.isExcludedInterface
      }) : {}),
      ...((stryMutAct_9fa48("34251") ? event.requireAttached === undefined : stryMutAct_9fa48("34250") ? false : stryMutAct_9fa48("34249") ? true : (stryCov_9fa48("34249", "34250", "34251"), event.requireAttached !== undefined)) ? stryMutAct_9fa48("34252") ? {} : (stryCov_9fa48("34252"), {
        requireAttached: event.requireAttached
      }) : {}),
      ...((stryMutAct_9fa48("34255") ? event.isAttached === undefined : stryMutAct_9fa48("34254") ? false : stryMutAct_9fa48("34253") ? true : (stryCov_9fa48("34253", "34254", "34255"), event.isAttached !== undefined)) ? stryMutAct_9fa48("34256") ? {} : (stryCov_9fa48("34256"), {
        isAttached: event.isAttached
      }) : {})
    })) ? stryMutAct_9fa48("34257") ? "" : (stryCov_9fa48("34257"), "transmit") : stryMutAct_9fa48("34258") ? "" : (stryCov_9fa48("34258"), "skip")
  })]))
}));
export type TransmitOnInterfaceState = GateState;
export type TransmitOnInterfaceEvent = Event | {
  readonly kind: "transport/transmit-on-interface-gate";
  readonly outgoing: boolean;
  readonly isExcludedInterface?: boolean;
  readonly requireAttached?: boolean;
  readonly isAttached?: boolean;
};
export type TransmitOnInterfaceAction = {
  readonly kind: "transmit";
} | {
  readonly kind: "skip";
};
export type TransmitOnInterfaceStepResult = GateStepResult<TransmitOnInterfaceAction>;
export const initialTransmitOnInterfaceState = initialGateState;
export const stepTransmitOnInterfaceWithActions = interpretGate(transmitOnInterfaceGate);
export const shouldTransmitOnInterfaceNow = gateConcluded<TransmitOnInterfaceAction>(stryMutAct_9fa48("34259") ? "" : (stryCov_9fa48("34259"), "transmit"));
export const shouldSkipTransmitOnInterface = gateConcluded<TransmitOnInterfaceAction>(stryMutAct_9fa48("34260") ? "" : (stryCov_9fa48("34260"), "skip"));

/** Local IN destination match (announce / path-request answerer). */
export function shouldMatchLocalInboundDestination(input: {
  readonly hashMatches: boolean;
  readonly directionIn: boolean;
}): boolean {
  if (stryMutAct_9fa48("34261")) {
    {}
  } else {
    stryCov_9fa48("34261");
    return stryMutAct_9fa48("34264") ? input.hashMatches || input.directionIn : stryMutAct_9fa48("34263") ? false : stryMutAct_9fa48("34262") ? true : (stryCov_9fa48("34262", "34263", "34264"), input.hashMatches && input.directionIn);
  }
}

/**
 * shouldMatchLocalInboundDestination gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldMatchLocalInboundDestination` reads beside the step).
 */
type MatchLocalInboundDestinationGateEvent = Extract<MatchLocalInboundDestinationEvent, {
  readonly kind: "transport/match-local-inbound-destination-gate";
}>;
const matchLocalInboundDestinationGate = defineBooleanGate<MatchLocalInboundDestinationGateEvent, "match", "mismatch">(stryMutAct_9fa48("34265") ? {} : (stryCov_9fa48("34265"), {
  event: stryMutAct_9fa48("34266") ? "" : (stryCov_9fa48("34266"), "transport/match-local-inbound-destination-gate"),
  whenTrue: stryMutAct_9fa48("34267") ? "" : (stryCov_9fa48("34267"), "match"),
  whenFalse: stryMutAct_9fa48("34268") ? "" : (stryCov_9fa48("34268"), "mismatch"),
  decide: stryMutAct_9fa48("34269") ? () => undefined : (stryCov_9fa48("34269"), event => shouldMatchLocalInboundDestination(event))
}));
export type MatchLocalInboundDestinationState = GateState;
export type MatchLocalInboundDestinationEvent = Event | {
  readonly kind: "transport/match-local-inbound-destination-gate";
  readonly hashMatches: boolean;
  readonly directionIn: boolean;
};
export type MatchLocalInboundDestinationAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export type MatchLocalInboundDestinationStepResult = GateStepResult<MatchLocalInboundDestinationAction>;
export const initialMatchLocalInboundDestinationState = initialGateState;
export const stepMatchLocalInboundDestinationWithActions = interpretGate(matchLocalInboundDestinationGate);
export const shouldMatchLocalInboundDestinationNow = gateConcluded<MatchLocalInboundDestinationAction>(stryMutAct_9fa48("34270") ? "" : (stryCov_9fa48("34270"), "match"));
export const shouldMismatchLocalInboundDestination = gateConcluded<MatchLocalInboundDestinationAction>(stryMutAct_9fa48("34271") ? "" : (stryCov_9fa48("34271"), "mismatch"));

/** Local typed destination match (plain DATA delivery). */
export function shouldMatchLocalTypedDestination(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
}): boolean {
  if (stryMutAct_9fa48("34272")) {
    {}
  } else {
    stryCov_9fa48("34272");
    return stryMutAct_9fa48("34275") ? input.hashMatches || input.typeMatches : stryMutAct_9fa48("34274") ? false : stryMutAct_9fa48("34273") ? true : (stryCov_9fa48("34273", "34274", "34275"), input.hashMatches && input.typeMatches);
  }
}

/**
 * shouldMatchLocalTypedDestination gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldMatchLocalTypedDestination` reads beside the step).
 */
type MatchLocalTypedDestinationGateEvent = Extract<MatchLocalTypedDestinationEvent, {
  readonly kind: "transport/match-local-typed-destination-gate";
}>;
const matchLocalTypedDestinationGate = defineBooleanGate<MatchLocalTypedDestinationGateEvent, "match", "mismatch">(stryMutAct_9fa48("34276") ? {} : (stryCov_9fa48("34276"), {
  event: stryMutAct_9fa48("34277") ? "" : (stryCov_9fa48("34277"), "transport/match-local-typed-destination-gate"),
  whenTrue: stryMutAct_9fa48("34278") ? "" : (stryCov_9fa48("34278"), "match"),
  whenFalse: stryMutAct_9fa48("34279") ? "" : (stryCov_9fa48("34279"), "mismatch"),
  decide: stryMutAct_9fa48("34280") ? () => undefined : (stryCov_9fa48("34280"), event => shouldMatchLocalTypedDestination(event))
}));
export type MatchLocalTypedDestinationState = GateState;
export type MatchLocalTypedDestinationEvent = Event | {
  readonly kind: "transport/match-local-typed-destination-gate";
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
};
export type MatchLocalTypedDestinationAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export type MatchLocalTypedDestinationStepResult = GateStepResult<MatchLocalTypedDestinationAction>;
export const initialMatchLocalTypedDestinationState = initialGateState;
export const stepMatchLocalTypedDestinationWithActions = interpretGate(matchLocalTypedDestinationGate);
export const shouldMatchLocalTypedDestinationNow = gateConcluded<MatchLocalTypedDestinationAction>(stryMutAct_9fa48("34281") ? "" : (stryCov_9fa48("34281"), "match"));
export const shouldMismatchLocalTypedDestination = gateConcluded<MatchLocalTypedDestinationAction>(stryMutAct_9fa48("34282") ? "" : (stryCov_9fa48("34282"), "mismatch"));

/** Local LINKREQUEST dispatch (typed destination + handler present). */
export function shouldDispatchLocalLinkRequest(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
  readonly handlerPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("34283")) {
    {}
  } else {
    stryCov_9fa48("34283");
    return stryMutAct_9fa48("34286") ? input.hashMatches && input.typeMatches || input.handlerPresent : stryMutAct_9fa48("34285") ? false : stryMutAct_9fa48("34284") ? true : (stryCov_9fa48("34284", "34285", "34286"), (stryMutAct_9fa48("34288") ? input.hashMatches || input.typeMatches : stryMutAct_9fa48("34287") ? true : (stryCov_9fa48("34287", "34288"), input.hashMatches && input.typeMatches)) && input.handlerPresent);
  }
}

/**
 * shouldDispatchLocalLinkRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchLocalLinkRequest` reads beside the step).
 */
type DispatchLocalLinkRequestGateEvent = Extract<DispatchLocalLinkRequestEvent, {
  readonly kind: "transport/dispatch-local-link-request-gate";
}>;
const dispatchLocalLinkRequestGate = defineBooleanGate<DispatchLocalLinkRequestGateEvent, "dispatch", "skip">(stryMutAct_9fa48("34289") ? {} : (stryCov_9fa48("34289"), {
  event: stryMutAct_9fa48("34290") ? "" : (stryCov_9fa48("34290"), "transport/dispatch-local-link-request-gate"),
  whenTrue: stryMutAct_9fa48("34291") ? "" : (stryCov_9fa48("34291"), "dispatch"),
  whenFalse: stryMutAct_9fa48("34292") ? "" : (stryCov_9fa48("34292"), "skip"),
  decide: stryMutAct_9fa48("34293") ? () => undefined : (stryCov_9fa48("34293"), event => shouldDispatchLocalLinkRequest(event))
}));
export type DispatchLocalLinkRequestState = GateState;
export type DispatchLocalLinkRequestEvent = Event | {
  readonly kind: "transport/dispatch-local-link-request-gate";
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
  readonly handlerPresent: boolean;
};
export type DispatchLocalLinkRequestAction = {
  readonly kind: "dispatch";
} | {
  readonly kind: "skip";
};
export type DispatchLocalLinkRequestStepResult = GateStepResult<DispatchLocalLinkRequestAction>;
export const initialDispatchLocalLinkRequestState = initialGateState;
export const stepDispatchLocalLinkRequestWithActions = interpretGate(dispatchLocalLinkRequestGate);
export const shouldDispatchLocalLinkRequestNow = gateConcluded<DispatchLocalLinkRequestAction>(stryMutAct_9fa48("34294") ? "" : (stryCov_9fa48("34294"), "dispatch"));
export const shouldSkipDispatchLocalLinkRequest = gateConcluded<DispatchLocalLinkRequestAction>(stryMutAct_9fa48("34295") ? "" : (stryCov_9fa48("34295"), "skip"));

/**
 * After `planProofIngressKind === "lrproof"`: whether this pending link may validate.
 * `linkIdMatches` and hopsMatch stay as adapter-supplied booleans.
 */
export function shouldAcceptLinkLrProofCandidate(input: {
  readonly linkIdMatches: boolean;
  readonly hopsMatch: boolean;
}): boolean {
  if (stryMutAct_9fa48("34296")) {
    {}
  } else {
    stryCov_9fa48("34296");
    return stryMutAct_9fa48("34299") ? input.linkIdMatches || input.hopsMatch : stryMutAct_9fa48("34298") ? false : stryMutAct_9fa48("34297") ? true : (stryCov_9fa48("34297", "34298", "34299"), input.linkIdMatches && input.hopsMatch);
  }
}

/**
 * shouldAcceptLinkLrProofCandidate gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptLinkLrProofCandidate` reads beside the step).
 */
type AcceptLinkLrProofCandidateGateEvent = Extract<AcceptLinkLrProofCandidateEvent, {
  readonly kind: "transport/accept-link-lr-proof-candidate-gate";
}>;
const acceptLinkLrProofCandidateGate = defineBooleanGate<AcceptLinkLrProofCandidateGateEvent, "accept", "reject">(stryMutAct_9fa48("34300") ? {} : (stryCov_9fa48("34300"), {
  event: stryMutAct_9fa48("34301") ? "" : (stryCov_9fa48("34301"), "transport/accept-link-lr-proof-candidate-gate"),
  whenTrue: stryMutAct_9fa48("34302") ? "" : (stryCov_9fa48("34302"), "accept"),
  whenFalse: stryMutAct_9fa48("34303") ? "" : (stryCov_9fa48("34303"), "reject"),
  decide: stryMutAct_9fa48("34304") ? () => undefined : (stryCov_9fa48("34304"), event => shouldAcceptLinkLrProofCandidate(event))
}));
export type AcceptLinkLrProofCandidateState = GateState;
export type AcceptLinkLrProofCandidateEvent = Event | {
  readonly kind: "transport/accept-link-lr-proof-candidate-gate";
  readonly linkIdMatches: boolean;
  readonly hopsMatch: boolean;
};
export type AcceptLinkLrProofCandidateAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export type AcceptLinkLrProofCandidateStepResult = GateStepResult<AcceptLinkLrProofCandidateAction>;
export const initialAcceptLinkLrProofCandidateState = initialGateState;
export const stepAcceptLinkLrProofCandidateWithActions = interpretGate(acceptLinkLrProofCandidateGate);
export const shouldAcceptLinkLrProofCandidateNow = gateConcluded<AcceptLinkLrProofCandidateAction>(stryMutAct_9fa48("34305") ? "" : (stryCov_9fa48("34305"), "accept"));
export const shouldRejectLinkLrProofCandidate = gateConcluded<AcceptLinkLrProofCandidateAction>(stryMutAct_9fa48("34306") ? "" : (stryCov_9fa48("34306"), "reject"));
export type LocalPlainDataDeliveryPlan = "ignore" | "dispatch";

/**
 * Local plain DATA after path-request gate: destination present + decrypt present.
 * Proof emission stays via {@link planDestinationProof} at the adapter.
 */
export function planLocalPlainDataDelivery(input: {
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
}): LocalPlainDataDeliveryPlan {
  if (stryMutAct_9fa48("34307")) {
    {}
  } else {
    stryCov_9fa48("34307");
    if (stryMutAct_9fa48("34310") ? !input.destinationPresent && !input.plaintextPresent : stryMutAct_9fa48("34309") ? false : stryMutAct_9fa48("34308") ? true : (stryCov_9fa48("34308", "34309", "34310"), (stryMutAct_9fa48("34311") ? input.destinationPresent : (stryCov_9fa48("34311"), !input.destinationPresent)) || (stryMutAct_9fa48("34312") ? input.plaintextPresent : (stryCov_9fa48("34312"), !input.plaintextPresent)))) {
      if (stryMutAct_9fa48("34313")) {
        {}
      } else {
        stryCov_9fa48("34313");
        return stryMutAct_9fa48("34314") ? "" : (stryCov_9fa48("34314"), "ignore");
      }
    }
    return stryMutAct_9fa48("34315") ? "" : (stryCov_9fa48("34315"), "dispatch");
  }
}

/**
 * Proof ingress kind is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepProofIngressPlanWithActions}
 * (`lrproof`|`resource-prf`|`receipt`).
 */
type ProofIngressGateEvent = Extract<ProofIngressEvent, {
  readonly kind: "transport/proof-ingress-gate";
}>;
export const proofIngressGate = defineGate<ProofIngressGateEvent, ProofIngressAction>(stryMutAct_9fa48("34316") ? {} : (stryCov_9fa48("34316"), {
  event: stryMutAct_9fa48("34317") ? "" : (stryCov_9fa48("34317"), "transport/proof-ingress-gate"),
  actions: stryMutAct_9fa48("34318") ? [] : (stryCov_9fa48("34318"), [stryMutAct_9fa48("34319") ? "" : (stryCov_9fa48("34319"), "lrproof"), stryMutAct_9fa48("34320") ? "" : (stryCov_9fa48("34320"), "resource-prf"), stryMutAct_9fa48("34321") ? "" : (stryCov_9fa48("34321"), "receipt")]),
  decide: event => {
    if (stryMutAct_9fa48("34322")) {
      {}
    } else {
      stryCov_9fa48("34322");
      const plan = proofIngressPlanFromActions(decideGate(proofIngressPlanGate, stryMutAct_9fa48("34323") ? {} : (stryCov_9fa48("34323"), {
        ...event,
        kind: stryMutAct_9fa48("34324") ? "" : (stryCov_9fa48("34324"), "transport/proof-ingress-plan-gate")
      })));
      return (stryMutAct_9fa48("34327") ? plan !== null : stryMutAct_9fa48("34326") ? false : stryMutAct_9fa48("34325") ? true : (stryCov_9fa48("34325", "34326", "34327"), plan === null)) ? stryMutAct_9fa48("34328") ? ["Stryker was here"] : (stryCov_9fa48("34328"), []) : stryMutAct_9fa48("34329") ? [] : (stryCov_9fa48("34329"), [stryMutAct_9fa48("34330") ? {} : (stryCov_9fa48("34330"), {
        kind: plan
      })]);
    }
  }
}));
export type ProofIngressEvent = Event | {
  readonly kind: "transport/proof-ingress-gate";
  readonly context: number;
};
export type ProofIngressAction = {
  readonly kind: ProofIngressKind;
};
export const stepProofIngressWithActions = interpretGate(proofIngressGate);