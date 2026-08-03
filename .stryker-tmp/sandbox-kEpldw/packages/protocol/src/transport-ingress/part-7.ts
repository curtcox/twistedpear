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
import { proofIngressGate } from "./part-4.js";
import { localPlainDataDeliveryGate, packetHashRememberGate } from "./part-5.js";
import { linkDataIngressTargetGate, reverseRelayOutcomeGate } from "./part-6.js";
import type { ReverseRelayOutcome } from "./part-2.js";
import type { ProofIngressKind, TransportIngressDispatchAction } from "./part-3.js";
import type { LocalPlainDataDeliveryPlan, ProofIngressAction } from "./part-4.js";
import type { LinkDataIngressTarget, LocalPlainDataDeliveryAction, PacketHashRememberAction, PacketHashRememberPlan } from "./part-5.js";
import type { LinkDataIngressTargetAction, ReverseRelayOutcomeAction } from "./part-6.js";
export const shouldDispatchTransportProof = gateConcluded<TransportIngressDispatchAction>(stryMutAct_9fa48("34569") ? "" : (stryCov_9fa48("34569"), "proof"));
export const shouldIgnoreTransportIngressDispatch = gateConcluded<TransportIngressDispatchAction>(stryMutAct_9fa48("34570") ? "" : (stryCov_9fa48("34570"), "ignore"));
export type LinkDataIngressTargetState = GateState;
export type LinkDataIngressTargetStepResult = GateStepResult<LinkDataIngressTargetAction>;
export const initialLinkDataIngressTargetState = initialGateState;
export const stepLinkDataIngressTarget: StepFn<LinkDataIngressTargetState> = gateStepFn(linkDataIngressTargetGate);
export const linkDataIngressTargetFromActions = gateConclusion<LinkDataIngressTargetAction, LinkDataIngressTarget>(stryMutAct_9fa48("34571") ? "" : (stryCov_9fa48("34571"), "active"), stryMutAct_9fa48("34572") ? "" : (stryCov_9fa48("34572"), "pending"), stryMutAct_9fa48("34573") ? "" : (stryCov_9fa48("34573"), "none"));
export const shouldIngressLinkDataActive = gateConcluded<LinkDataIngressTargetAction>(stryMutAct_9fa48("34574") ? "" : (stryCov_9fa48("34574"), "active"));
export const shouldIngressLinkDataPending = gateConcluded<LinkDataIngressTargetAction>(stryMutAct_9fa48("34575") ? "" : (stryCov_9fa48("34575"), "pending"));
export const shouldIngressLinkDataNone = gateConcluded<LinkDataIngressTargetAction>(stryMutAct_9fa48("34576") ? "" : (stryCov_9fa48("34576"), "none"));
export type ReverseRelayOutcomeState = GateState;
export type ReverseRelayOutcomeStepResult = GateStepResult<ReverseRelayOutcomeAction>;
export const initialReverseRelayOutcomeState = initialGateState;
export const stepReverseRelayOutcome: StepFn<ReverseRelayOutcomeState> = gateStepFn(reverseRelayOutcomeGate);
export const reverseRelayOutcomeFromActions = gateConclusion<ReverseRelayOutcomeAction, ReverseRelayOutcome>(stryMutAct_9fa48("34577") ? "" : (stryCov_9fa48("34577"), "relay"), stryMutAct_9fa48("34578") ? "" : (stryCov_9fa48("34578"), "delete-expired"), stryMutAct_9fa48("34579") ? "" : (stryCov_9fa48("34579"), "ignore"));
export const shouldRelayReversePacketActions = gateConcluded<ReverseRelayOutcomeAction>(stryMutAct_9fa48("34580") ? "" : (stryCov_9fa48("34580"), "relay"));
export const shouldDeleteExpiredReverseEntryActions = gateConcluded<ReverseRelayOutcomeAction>(stryMutAct_9fa48("34581") ? "" : (stryCov_9fa48("34581"), "delete-expired"));
export const shouldIgnoreReverseRelayOutcome = gateConcluded<ReverseRelayOutcomeAction>(stryMutAct_9fa48("34582") ? "" : (stryCov_9fa48("34582"), "ignore"));
export type PacketHashRememberState = GateState;
export type PacketHashRememberStepResult = GateStepResult<PacketHashRememberAction>;
export const initialPacketHashRememberState = initialGateState;
export const stepPacketHashRemember: StepFn<PacketHashRememberState> = gateStepFn(packetHashRememberGate);
export const packetHashRememberFromActions = gateConclusion<PacketHashRememberAction, PacketHashRememberPlan>(stryMutAct_9fa48("34583") ? "" : (stryCov_9fa48("34583"), "now"), stryMutAct_9fa48("34584") ? "" : (stryCov_9fa48("34584"), "after-relay"));
export const shouldRememberPacketHashNowActions = gateConcluded<PacketHashRememberAction>(stryMutAct_9fa48("34585") ? "" : (stryCov_9fa48("34585"), "now"));
export const shouldRememberPacketHashAfterRelayActions = gateConcluded<PacketHashRememberAction>(stryMutAct_9fa48("34586") ? "" : (stryCov_9fa48("34586"), "after-relay"));
export type LocalPlainDataDeliveryState = GateState;
export type LocalPlainDataDeliveryStepResult = GateStepResult<LocalPlainDataDeliveryAction>;
export const initialLocalPlainDataDeliveryState = initialGateState;
export const stepLocalPlainDataDelivery: StepFn<LocalPlainDataDeliveryState> = gateStepFn(localPlainDataDeliveryGate);
export const localPlainDataDeliveryFromActions = gateConclusion<LocalPlainDataDeliveryAction, LocalPlainDataDeliveryPlan>(stryMutAct_9fa48("34587") ? "" : (stryCov_9fa48("34587"), "dispatch"), stryMutAct_9fa48("34588") ? "" : (stryCov_9fa48("34588"), "ignore"));
export const shouldDispatchLocalPlainDataDeliveryActions = gateConcluded<LocalPlainDataDeliveryAction>(stryMutAct_9fa48("34589") ? "" : (stryCov_9fa48("34589"), "dispatch"));
export const shouldIgnoreLocalPlainDataDelivery = gateConcluded<LocalPlainDataDeliveryAction>(stryMutAct_9fa48("34590") ? "" : (stryCov_9fa48("34590"), "ignore"));
export type ProofIngressState = GateState;
export type ProofIngressStepResult = GateStepResult<ProofIngressAction>;
export const initialProofIngressState = initialGateState;
export const stepProofIngress: StepFn<ProofIngressState> = gateStepFn(proofIngressGate);
export const proofIngressKindFromActions = gateConclusion<ProofIngressAction, ProofIngressKind>(stryMutAct_9fa48("34591") ? "" : (stryCov_9fa48("34591"), "lrproof"), stryMutAct_9fa48("34592") ? "" : (stryCov_9fa48("34592"), "resource-prf"), stryMutAct_9fa48("34593") ? "" : (stryCov_9fa48("34593"), "receipt"));
export const shouldHandleProofLrproof = gateConcluded<ProofIngressAction>(stryMutAct_9fa48("34594") ? "" : (stryCov_9fa48("34594"), "lrproof"));
export const shouldHandleProofResourcePrf = gateConcluded<ProofIngressAction>(stryMutAct_9fa48("34595") ? "" : (stryCov_9fa48("34595"), "resource-prf"));
export const shouldHandleProofReceipt = gateConcluded<ProofIngressAction>(stryMutAct_9fa48("34596") ? "" : (stryCov_9fa48("34596"), "receipt"));