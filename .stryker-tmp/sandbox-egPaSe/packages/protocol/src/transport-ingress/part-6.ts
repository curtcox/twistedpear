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
import { planReverseRelayOutcome } from "./part-2.js";
import { transportIngressDispatchGate } from "./part-3.js";
import { planLinkDataIngressTarget } from "./part-5.js";
import type { ReverseRelayOutcome } from "./part-2.js";
import type { TransportIngressDispatch, TransportIngressDispatchAction } from "./part-3.js";
import type { LinkDataIngressTarget } from "./part-5.js";
/**
 * Link-data ingress target plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkDataIngressTarget` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkDataIngressTargetWithActions}.
 */
type LinkDataIngressTargetPlanGateEvent = Extract<LinkDataIngressTargetPlanEvent, {
  readonly kind: "transport/link-data-ingress-plan-gate";
}>;
const linkDataIngressTargetPlanGate = defineGate<LinkDataIngressTargetPlanGateEvent, LinkDataIngressTargetPlanAction>(stryMutAct_9fa48("34452") ? {} : (stryCov_9fa48("34452"), {
  event: stryMutAct_9fa48("34453") ? "" : (stryCov_9fa48("34453"), "transport/link-data-ingress-plan-gate"),
  actions: stryMutAct_9fa48("34454") ? [] : (stryCov_9fa48("34454"), [stryMutAct_9fa48("34455") ? "" : (stryCov_9fa48("34455"), "active"), stryMutAct_9fa48("34456") ? "" : (stryCov_9fa48("34456"), "pending"), stryMutAct_9fa48("34457") ? "" : (stryCov_9fa48("34457"), "none")]),
  decide: stryMutAct_9fa48("34458") ? () => undefined : (stryCov_9fa48("34458"), event => stryMutAct_9fa48("34459") ? [] : (stryCov_9fa48("34459"), [stryMutAct_9fa48("34460") ? {} : (stryCov_9fa48("34460"), {
    kind: planLinkDataIngressTarget(event)
  })]))
}));
export type LinkDataIngressTargetPlanState = GateState;
export type LinkDataIngressTargetPlanEvent = Event | {
  readonly kind: "transport/link-data-ingress-plan-gate";
  readonly activeIndex: number | null;
  readonly pendingIndex: number | null;
};
export type LinkDataIngressTargetPlanAction = {
  readonly kind: LinkDataIngressTarget;
};
export type LinkDataIngressTargetPlanStepResult = GateStepResult<LinkDataIngressTargetPlanAction>;
export const initialLinkDataIngressTargetPlanState = initialGateState;
export const stepLinkDataIngressTargetPlanWithActions = interpretGate(linkDataIngressTargetPlanGate);

/** Extract the link-data ingress target plan from actions; null when empty. */
export const linkDataIngressTargetPlanFromActions = gateConclusion<LinkDataIngressTargetPlanAction, LinkDataIngressTarget>(stryMutAct_9fa48("34461") ? "" : (stryCov_9fa48("34461"), "active"), stryMutAct_9fa48("34462") ? "" : (stryCov_9fa48("34462"), "pending"), stryMutAct_9fa48("34463") ? "" : (stryCov_9fa48("34463"), "none"));
export const shouldIngressLinkDataActivePlan = gateConcluded<LinkDataIngressTargetPlanAction>(stryMutAct_9fa48("34464") ? "" : (stryCov_9fa48("34464"), "active"));
export const shouldIngressLinkDataPendingPlan = gateConcluded<LinkDataIngressTargetPlanAction>(stryMutAct_9fa48("34465") ? "" : (stryCov_9fa48("34465"), "pending"));
export const shouldIngressLinkDataNonePlan = gateConcluded<LinkDataIngressTargetPlanAction>(stryMutAct_9fa48("34466") ? "" : (stryCov_9fa48("34466"), "none"));

/**
 * Reverse-relay outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planReverseRelayOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepReverseRelayOutcomeWithActions}.
 */
type ReverseRelayOutcomePlanGateEvent = Extract<ReverseRelayOutcomePlanEvent, {
  readonly kind: "transport/reverse-relay-plan-gate";
}>;
const reverseRelayOutcomePlanGate = defineGate<ReverseRelayOutcomePlanGateEvent, ReverseRelayOutcomePlanAction>(stryMutAct_9fa48("34467") ? {} : (stryCov_9fa48("34467"), {
  event: stryMutAct_9fa48("34468") ? "" : (stryCov_9fa48("34468"), "transport/reverse-relay-plan-gate"),
  actions: stryMutAct_9fa48("34469") ? [] : (stryCov_9fa48("34469"), [stryMutAct_9fa48("34470") ? "" : (stryCov_9fa48("34470"), "relay"), stryMutAct_9fa48("34471") ? "" : (stryCov_9fa48("34471"), "delete-expired"), stryMutAct_9fa48("34472") ? "" : (stryCov_9fa48("34472"), "ignore")]),
  decide: stryMutAct_9fa48("34473") ? () => undefined : (stryCov_9fa48("34473"), event => stryMutAct_9fa48("34474") ? [] : (stryCov_9fa48("34474"), [stryMutAct_9fa48("34475") ? {} : (stryCov_9fa48("34475"), {
    kind: planReverseRelayOutcome(event)
  })]))
}));
export type ReverseRelayOutcomePlanState = GateState;
export type ReverseRelayOutcomePlanEvent = Event | {
  readonly kind: "transport/reverse-relay-plan-gate";
  readonly canRelay: boolean;
  readonly entryExpired: boolean;
  readonly ifaceIsOutbound: boolean;
};
export type ReverseRelayOutcomePlanAction = {
  readonly kind: ReverseRelayOutcome;
};
export type ReverseRelayOutcomePlanStepResult = GateStepResult<ReverseRelayOutcomePlanAction>;
export const initialReverseRelayOutcomePlanState = initialGateState;
export const stepReverseRelayOutcomePlanWithActions = interpretGate(reverseRelayOutcomePlanGate);

/** Extract the reverse-relay outcome plan from actions; null when empty. */
export const reverseRelayOutcomePlanFromActions = gateConclusion<ReverseRelayOutcomePlanAction, ReverseRelayOutcome>(stryMutAct_9fa48("34476") ? "" : (stryCov_9fa48("34476"), "relay"), stryMutAct_9fa48("34477") ? "" : (stryCov_9fa48("34477"), "delete-expired"), stryMutAct_9fa48("34478") ? "" : (stryCov_9fa48("34478"), "ignore"));
export const shouldRelayReversePacketPlan = gateConcluded<ReverseRelayOutcomePlanAction>(stryMutAct_9fa48("34479") ? "" : (stryCov_9fa48("34479"), "relay"));
export const shouldDeleteExpiredReverseEntryPlan = gateConcluded<ReverseRelayOutcomePlanAction>(stryMutAct_9fa48("34480") ? "" : (stryCov_9fa48("34480"), "delete-expired"));
export const shouldIgnoreReverseRelayOutcomePlan = gateConcluded<ReverseRelayOutcomePlanAction>(stryMutAct_9fa48("34481") ? "" : (stryCov_9fa48("34481"), "ignore"));

/** Whether a transport list should receive a new member (not already present). */
export function shouldRegisterTransportMember(alreadyPresent: boolean): boolean {
  if (stryMutAct_9fa48("34482")) {
    {}
  } else {
    stryCov_9fa48("34482");
    return stryMutAct_9fa48("34483") ? alreadyPresent : (stryCov_9fa48("34483"), !alreadyPresent);
  }
}

/**
 * shouldRegisterTransportMember gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterTransportMember` reads beside the step).
 */
type RegisterTransportMemberGateEvent = Extract<RegisterTransportMemberEvent, {
  readonly kind: "transport/member-register-gate";
}>;
const registerTransportMemberGate = defineBooleanGate<RegisterTransportMemberGateEvent, "register", "skip">(stryMutAct_9fa48("34484") ? {} : (stryCov_9fa48("34484"), {
  event: stryMutAct_9fa48("34485") ? "" : (stryCov_9fa48("34485"), "transport/member-register-gate"),
  whenTrue: stryMutAct_9fa48("34486") ? "" : (stryCov_9fa48("34486"), "register"),
  whenFalse: stryMutAct_9fa48("34487") ? "" : (stryCov_9fa48("34487"), "skip"),
  decide: stryMutAct_9fa48("34488") ? () => undefined : (stryCov_9fa48("34488"), event => shouldRegisterTransportMember(event.alreadyPresent))
}));
export type RegisterTransportMemberState = GateState;
export type RegisterTransportMemberEvent = Event | {
  readonly kind: "transport/member-register-gate";
  readonly alreadyPresent: boolean;
};
export type RegisterTransportMemberAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export type RegisterTransportMemberStepResult = GateStepResult<RegisterTransportMemberAction>;
export const initialRegisterTransportMemberState = initialGateState;
export const stepRegisterTransportMemberWithActions = interpretGate(registerTransportMemberGate);
export const shouldRegisterTransportMemberNow = gateConcluded<RegisterTransportMemberAction>(stryMutAct_9fa48("34489") ? "" : (stryCov_9fa48("34489"), "register"));
export const shouldSkipRegisterTransportMember = gateConcluded<RegisterTransportMemberAction>(stryMutAct_9fa48("34490") ? "" : (stryCov_9fa48("34490"), "skip"));

/**
 * Unregister from a transport list: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterTransportMember(index: number): number | null {
  if (stryMutAct_9fa48("34491")) {
    {}
  } else {
    stryCov_9fa48("34491");
    return (stryMutAct_9fa48("34495") ? index < 0 : stryMutAct_9fa48("34494") ? index > 0 : stryMutAct_9fa48("34493") ? false : stryMutAct_9fa48("34492") ? true : (stryCov_9fa48("34492", "34493", "34494", "34495"), index >= 0)) ? index : null;
  }
}

/** Whether unregister may splice after {@link planUnregisterTransportMember}. */
export function shouldUnregisterTransportMember(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("34496")) {
    {}
  } else {
    stryCov_9fa48("34496");
    return indexPresent;
  }
}

/**
 * Transport-member unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step). Nested under
 * {@link stepTransportMemberUnregisterWithActions}.
 */
type TransportMemberUnregisterPlanGateEvent = Extract<TransportMemberUnregisterPlanEvent, {
  readonly kind: "transport/member-unregister-plan-gate";
}>;
const transportMemberUnregisterPlanGate = defineGate<TransportMemberUnregisterPlanGateEvent, TransportMemberUnregisterPlanAction>(stryMutAct_9fa48("34497") ? {} : (stryCov_9fa48("34497"), {
  event: stryMutAct_9fa48("34498") ? "" : (stryCov_9fa48("34498"), "transport/member-unregister-plan-gate"),
  actions: stryMutAct_9fa48("34499") ? [] : (stryCov_9fa48("34499"), [stryMutAct_9fa48("34500") ? "" : (stryCov_9fa48("34500"), "remove")]),
  decide: event => {
    if (stryMutAct_9fa48("34501")) {
      {}
    } else {
      stryCov_9fa48("34501");
      const index = planUnregisterTransportMember(event.index);
      return (stryMutAct_9fa48("34504") ? index !== null : stryMutAct_9fa48("34503") ? false : stryMutAct_9fa48("34502") ? true : (stryCov_9fa48("34502", "34503", "34504"), index === null)) ? stryMutAct_9fa48("34505") ? ["Stryker was here"] : (stryCov_9fa48("34505"), []) : stryMutAct_9fa48("34506") ? [] : (stryCov_9fa48("34506"), [stryMutAct_9fa48("34507") ? {} : (stryCov_9fa48("34507"), {
        kind: stryMutAct_9fa48("34508") ? "" : (stryCov_9fa48("34508"), "remove"),
        index
      })]);
    }
  }
}));
export type TransportMemberUnregisterPlanState = GateState;
export type TransportMemberUnregisterPlanEvent = Event | {
  readonly kind: "transport/member-unregister-plan-gate";
  readonly index: number;
};
export type TransportMemberUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};
export type TransportMemberUnregisterPlanStepResult = GateStepResult<TransportMemberUnregisterPlanAction>;
export const initialTransportMemberUnregisterPlanState = initialGateState;
export const stepTransportMemberUnregisterPlanWithActions = interpretGate(transportMemberUnregisterPlanGate);
export const transportMemberUnregisterPlanIndex = gatePayload<TransportMemberUnregisterPlanAction, "remove", "index">(stryMutAct_9fa48("34509") ? "" : (stryCov_9fa48("34509"), "remove"), stryMutAct_9fa48("34510") ? "" : (stryCov_9fa48("34510"), "index"));
export const shouldRemoveTransportMemberUnregisterPlan = gateConcluded<TransportMemberUnregisterPlanAction>(stryMutAct_9fa48("34511") ? "" : (stryCov_9fa48("34511"), "remove"));

/**
 * Transport-member unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step).
 * Plan nested via {@link stepTransportMemberUnregisterPlanWithActions}
 * (`remove`).
 */
type TransportMemberUnregisterGateEvent = Extract<TransportMemberUnregisterEvent, {
  readonly kind: "transport/member-unregister-gate";
}>;
const transportMemberUnregisterGate = defineGate<TransportMemberUnregisterGateEvent, TransportMemberUnregisterAction>(stryMutAct_9fa48("34512") ? {} : (stryCov_9fa48("34512"), {
  event: stryMutAct_9fa48("34513") ? "" : (stryCov_9fa48("34513"), "transport/member-unregister-gate"),
  actions: stryMutAct_9fa48("34514") ? [] : (stryCov_9fa48("34514"), [stryMutAct_9fa48("34515") ? "" : (stryCov_9fa48("34515"), "remove")]),
  decide: event => {
    if (stryMutAct_9fa48("34516")) {
      {}
    } else {
      stryCov_9fa48("34516");
      const index = transportMemberUnregisterPlanIndex(decideGate(transportMemberUnregisterPlanGate, stryMutAct_9fa48("34517") ? {} : (stryCov_9fa48("34517"), {
        kind: stryMutAct_9fa48("34518") ? "" : (stryCov_9fa48("34518"), "transport/member-unregister-plan-gate"),
        index: event.index
      })));
      return (stryMutAct_9fa48("34521") ? index !== null : stryMutAct_9fa48("34520") ? false : stryMutAct_9fa48("34519") ? true : (stryCov_9fa48("34519", "34520", "34521"), index === null)) ? stryMutAct_9fa48("34522") ? ["Stryker was here"] : (stryCov_9fa48("34522"), []) : stryMutAct_9fa48("34523") ? [] : (stryCov_9fa48("34523"), [stryMutAct_9fa48("34524") ? {} : (stryCov_9fa48("34524"), {
        kind: stryMutAct_9fa48("34525") ? "" : (stryCov_9fa48("34525"), "remove"),
        index
      })]);
    }
  }
}));
export type TransportMemberUnregisterState = GateState;
export type TransportMemberUnregisterEvent = Event | {
  readonly kind: "transport/member-unregister-gate";
  readonly index: number;
};
export type TransportMemberUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};
export type TransportMemberUnregisterStepResult = GateStepResult<TransportMemberUnregisterAction>;
export const initialTransportMemberUnregisterState = initialGateState;
export const stepTransportMemberUnregisterWithActions = interpretGate(transportMemberUnregisterGate);
export const transportMemberUnregisterIndex = gatePayload<TransportMemberUnregisterAction, "remove", "index">(stryMutAct_9fa48("34526") ? "" : (stryCov_9fa48("34526"), "remove"), stryMutAct_9fa48("34527") ? "" : (stryCov_9fa48("34527"), "index"));
export const shouldRemoveTransportMember = gateConcluded<TransportMemberUnregisterAction>(stryMutAct_9fa48("34528") ? "" : (stryCov_9fa48("34528"), "remove"));
export type TransportIngressDispatchState = GateState;
export type TransportIngressDispatchStepResult = GateStepResult<TransportIngressDispatchAction>;
export const initialTransportIngressDispatchState = initialGateState;
export const stepTransportIngressDispatch: StepFn<TransportIngressDispatchState> = gateStepFn(transportIngressDispatchGate);
export const transportIngressDispatchFromActions = gateConclusion<TransportIngressDispatchAction, TransportIngressDispatch>(stryMutAct_9fa48("34529") ? "" : (stryCov_9fa48("34529"), "announce"), stryMutAct_9fa48("34530") ? "" : (stryCov_9fa48("34530"), "link-request"), stryMutAct_9fa48("34531") ? "" : (stryCov_9fa48("34531"), "link-data"), stryMutAct_9fa48("34532") ? "" : (stryCov_9fa48("34532"), "plain-data"), stryMutAct_9fa48("34533") ? "" : (stryCov_9fa48("34533"), "proof"), stryMutAct_9fa48("34534") ? "" : (stryCov_9fa48("34534"), "ignore"));
export const shouldDispatchTransportAnnounce = gateConcluded<TransportIngressDispatchAction>(stryMutAct_9fa48("34535") ? "" : (stryCov_9fa48("34535"), "announce"));
export const shouldDispatchTransportLinkRequest = gateConcluded<TransportIngressDispatchAction>(stryMutAct_9fa48("34536") ? "" : (stryCov_9fa48("34536"), "link-request"));
export const shouldDispatchTransportLinkData = gateConcluded<TransportIngressDispatchAction>(stryMutAct_9fa48("34537") ? "" : (stryCov_9fa48("34537"), "link-data"));
export const shouldDispatchTransportPlainData = gateConcluded<TransportIngressDispatchAction>(stryMutAct_9fa48("34538") ? "" : (stryCov_9fa48("34538"), "plain-data"));

/**
 * Link-data ingress target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkDataIngressTargetPlanWithActions}
 * (`active`|`pending`|`none`).
 */
type LinkDataIngressTargetGateEvent = Extract<LinkDataIngressTargetEvent, {
  readonly kind: "transport/link-data-ingress-gate";
}>;
export const linkDataIngressTargetGate = defineGate<LinkDataIngressTargetGateEvent, LinkDataIngressTargetAction>(stryMutAct_9fa48("34539") ? {} : (stryCov_9fa48("34539"), {
  event: stryMutAct_9fa48("34540") ? "" : (stryCov_9fa48("34540"), "transport/link-data-ingress-gate"),
  actions: stryMutAct_9fa48("34541") ? [] : (stryCov_9fa48("34541"), [stryMutAct_9fa48("34542") ? "" : (stryCov_9fa48("34542"), "active"), stryMutAct_9fa48("34543") ? "" : (stryCov_9fa48("34543"), "pending"), stryMutAct_9fa48("34544") ? "" : (stryCov_9fa48("34544"), "none")]),
  decide: event => {
    if (stryMutAct_9fa48("34545")) {
      {}
    } else {
      stryCov_9fa48("34545");
      const plan = linkDataIngressTargetPlanFromActions(decideGate(linkDataIngressTargetPlanGate, stryMutAct_9fa48("34546") ? {} : (stryCov_9fa48("34546"), {
        ...event,
        kind: stryMutAct_9fa48("34547") ? "" : (stryCov_9fa48("34547"), "transport/link-data-ingress-plan-gate")
      })));
      return (stryMutAct_9fa48("34550") ? plan !== null : stryMutAct_9fa48("34549") ? false : stryMutAct_9fa48("34548") ? true : (stryCov_9fa48("34548", "34549", "34550"), plan === null)) ? stryMutAct_9fa48("34551") ? ["Stryker was here"] : (stryCov_9fa48("34551"), []) : stryMutAct_9fa48("34552") ? [] : (stryCov_9fa48("34552"), [stryMutAct_9fa48("34553") ? {} : (stryCov_9fa48("34553"), {
        kind: plan
      })]);
    }
  }
}));
export type LinkDataIngressTargetEvent = Event | {
  readonly kind: "transport/link-data-ingress-gate";
  readonly activeIndex: number | null;
  readonly pendingIndex: number | null;
};
export type LinkDataIngressTargetAction = {
  readonly kind: LinkDataIngressTarget;
};
export const stepLinkDataIngressTargetWithActions = interpretGate(linkDataIngressTargetGate);

/**
 * Reverse-relay outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepReverseRelayOutcomePlanWithActions}
 * (`relay`|`delete-expired`|`ignore`).
 */
type ReverseRelayOutcomeGateEvent = Extract<ReverseRelayOutcomeEvent, {
  readonly kind: "transport/reverse-relay-gate";
}>;
export const reverseRelayOutcomeGate = defineGate<ReverseRelayOutcomeGateEvent, ReverseRelayOutcomeAction>(stryMutAct_9fa48("34554") ? {} : (stryCov_9fa48("34554"), {
  event: stryMutAct_9fa48("34555") ? "" : (stryCov_9fa48("34555"), "transport/reverse-relay-gate"),
  actions: stryMutAct_9fa48("34556") ? [] : (stryCov_9fa48("34556"), [stryMutAct_9fa48("34557") ? "" : (stryCov_9fa48("34557"), "relay"), stryMutAct_9fa48("34558") ? "" : (stryCov_9fa48("34558"), "delete-expired"), stryMutAct_9fa48("34559") ? "" : (stryCov_9fa48("34559"), "ignore")]),
  decide: event => {
    if (stryMutAct_9fa48("34560")) {
      {}
    } else {
      stryCov_9fa48("34560");
      const plan = reverseRelayOutcomePlanFromActions(decideGate(reverseRelayOutcomePlanGate, stryMutAct_9fa48("34561") ? {} : (stryCov_9fa48("34561"), {
        ...event,
        kind: stryMutAct_9fa48("34562") ? "" : (stryCov_9fa48("34562"), "transport/reverse-relay-plan-gate")
      })));
      return (stryMutAct_9fa48("34565") ? plan !== null : stryMutAct_9fa48("34564") ? false : stryMutAct_9fa48("34563") ? true : (stryCov_9fa48("34563", "34564", "34565"), plan === null)) ? stryMutAct_9fa48("34566") ? ["Stryker was here"] : (stryCov_9fa48("34566"), []) : stryMutAct_9fa48("34567") ? [] : (stryCov_9fa48("34567"), [stryMutAct_9fa48("34568") ? {} : (stryCov_9fa48("34568"), {
        kind: plan
      })]);
    }
  }
}));
export type ReverseRelayOutcomeEvent = Event | {
  readonly kind: "transport/reverse-relay-gate";
  readonly canRelay: boolean;
  readonly entryExpired: boolean;
  readonly ifaceIsOutbound: boolean;
};
export type ReverseRelayOutcomeAction = {
  readonly kind: ReverseRelayOutcome;
};
export const stepReverseRelayOutcomeWithActions = interpretGate(reverseRelayOutcomeGate);