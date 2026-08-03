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

/** Mirrors RNS/Transport.py local rebroadcast limit. */
export const LOCAL_REBROADCASTS_MAX = 2;

/** Mirrors RNS/Transport.py reverse-table entry lifetime. */
export const REVERSE_TIMEOUT_SECONDS = stryMutAct_9fa48("33811") ? 8 / 60 : (stryCov_9fa48("33811"), 8 * 60);

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
  if (stryMutAct_9fa48("33812")) {
    {}
  } else {
    stryCov_9fa48("33812");
    if (stryMutAct_9fa48("33815") ? input.transportId !== null || input.packetType !== PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("33814") ? false : stryMutAct_9fa48("33813") ? true : (stryCov_9fa48("33813", "33814", "33815"), (stryMutAct_9fa48("33817") ? input.transportId === null : stryMutAct_9fa48("33816") ? true : (stryCov_9fa48("33816", "33817"), input.transportId !== null)) && (stryMutAct_9fa48("33819") ? input.packetType === PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("33818") ? true : (stryCov_9fa48("33818", "33819"), input.packetType !== PACKET_TYPE_ANNOUNCE)))) {
      if (stryMutAct_9fa48("33820")) {
        {}
      } else {
        stryCov_9fa48("33820");
        if (stryMutAct_9fa48("33823") ? false : stryMutAct_9fa48("33822") ? true : stryMutAct_9fa48("33821") ? equalByteArrays(input.transportId, input.localTransportHash) : (stryCov_9fa48("33821", "33822", "33823"), !equalByteArrays(input.transportId, input.localTransportHash))) {
          if (stryMutAct_9fa48("33824")) {
            {}
          } else {
            stryCov_9fa48("33824");
            return stryMutAct_9fa48("33825") ? true : (stryCov_9fa48("33825"), false);
          }
        }
      }
    }
    if (stryMutAct_9fa48("33828") ? false : stryMutAct_9fa48("33827") ? true : stryMutAct_9fa48("33826") ? input.alreadySeenHash : (stryCov_9fa48("33826", "33827", "33828"), !input.alreadySeenHash)) {
      if (stryMutAct_9fa48("33829")) {
        {}
      } else {
        stryCov_9fa48("33829");
        return stryMutAct_9fa48("33830") ? false : (stryCov_9fa48("33830"), true);
      }
    }
    return stryMutAct_9fa48("33833") ? input.packetType === PACKET_TYPE_ANNOUNCE || input.destinationType === PACKET_DEST_TYPE_SINGLE : stryMutAct_9fa48("33832") ? false : stryMutAct_9fa48("33831") ? true : (stryCov_9fa48("33831", "33832", "33833"), (stryMutAct_9fa48("33835") ? input.packetType !== PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("33834") ? true : (stryCov_9fa48("33834", "33835"), input.packetType === PACKET_TYPE_ANNOUNCE)) && (stryMutAct_9fa48("33837") ? input.destinationType !== PACKET_DEST_TYPE_SINGLE : stryMutAct_9fa48("33836") ? true : (stryCov_9fa48("33836", "33837"), input.destinationType === PACKET_DEST_TYPE_SINGLE)));
  }
}

/**
 * Packet-filter plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFilter` reads
 * beside the step). Nested under {@link stepPacketFilterWithActions}.
 */
export type PacketFilterPlan = "accept" | "reject";
type PacketFilterPlanGateEvent = Extract<PacketFilterPlanEvent, {
  readonly kind: "transport/packet-filter-plan-gate";
}>;
const packetFilterPlanGate = defineBooleanGate<PacketFilterPlanGateEvent, "accept", "reject">(stryMutAct_9fa48("33838") ? {} : (stryCov_9fa48("33838"), {
  event: stryMutAct_9fa48("33839") ? "" : (stryCov_9fa48("33839"), "transport/packet-filter-plan-gate"),
  whenTrue: stryMutAct_9fa48("33840") ? "" : (stryCov_9fa48("33840"), "accept"),
  whenFalse: stryMutAct_9fa48("33841") ? "" : (stryCov_9fa48("33841"), "reject"),
  decide: stryMutAct_9fa48("33842") ? () => undefined : (stryCov_9fa48("33842"), event => planPacketFilter(event))
}));
export type PacketFilterPlanState = GateState;
export type PacketFilterPlanEvent = Event | {
  readonly kind: "transport/packet-filter-plan-gate";
  readonly transportId: Uint8Array | null;
  readonly localTransportHash: Uint8Array;
  readonly packetType: number;
  readonly destinationType: number;
  readonly alreadySeenHash: boolean;
};
export type PacketFilterPlanAction = {
  readonly kind: PacketFilterPlan;
};
export type PacketFilterPlanStepResult = GateStepResult<PacketFilterPlanAction>;
export const initialPacketFilterPlanState = initialGateState;
export const stepPacketFilterPlanWithActions = interpretGate(packetFilterPlanGate);

/** Extract the packet-filter plan from actions; null when empty. */
export const packetFilterPlanFromActions = gateConclusion<PacketFilterPlanAction, PacketFilterPlan>(stryMutAct_9fa48("33843") ? "" : (stryCov_9fa48("33843"), "accept"), stryMutAct_9fa48("33844") ? "" : (stryCov_9fa48("33844"), "reject"));
export const shouldAcceptPacketFilterPlan = gateConcluded<PacketFilterPlanAction>(stryMutAct_9fa48("33845") ? "" : (stryCov_9fa48("33845"), "accept"));
export const shouldRejectPacketFilterPlan = gateConcluded<PacketFilterPlanAction>(stryMutAct_9fa48("33846") ? "" : (stryCov_9fa48("33846"), "reject"));

/**
 * Packet filter gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFilter` reads
 * beside the step).
 * Plan nested via {@link stepPacketFilterPlanWithActions} (`accept`|`reject`).
 */
type PacketFilterGateEvent = Extract<PacketFilterEvent, {
  readonly kind: "transport/packet-filter-gate";
}>;
const packetFilterGate = defineGate<PacketFilterGateEvent, PacketFilterAction>(stryMutAct_9fa48("33847") ? {} : (stryCov_9fa48("33847"), {
  event: stryMutAct_9fa48("33848") ? "" : (stryCov_9fa48("33848"), "transport/packet-filter-gate"),
  actions: stryMutAct_9fa48("33849") ? [] : (stryCov_9fa48("33849"), [stryMutAct_9fa48("33850") ? "" : (stryCov_9fa48("33850"), "accept"), stryMutAct_9fa48("33851") ? "" : (stryCov_9fa48("33851"), "reject")]),
  decide: event => {
    if (stryMutAct_9fa48("33852")) {
      {}
    } else {
      stryCov_9fa48("33852");
      const plan = packetFilterPlanFromActions(decideGate(packetFilterPlanGate, stryMutAct_9fa48("33853") ? {} : (stryCov_9fa48("33853"), {
        ...event,
        kind: stryMutAct_9fa48("33854") ? "" : (stryCov_9fa48("33854"), "transport/packet-filter-plan-gate")
      })));
      return (stryMutAct_9fa48("33857") ? plan !== null : stryMutAct_9fa48("33856") ? false : stryMutAct_9fa48("33855") ? true : (stryCov_9fa48("33855", "33856", "33857"), plan === null)) ? stryMutAct_9fa48("33858") ? ["Stryker was here"] : (stryCov_9fa48("33858"), []) : stryMutAct_9fa48("33859") ? [] : (stryCov_9fa48("33859"), [stryMutAct_9fa48("33860") ? {} : (stryCov_9fa48("33860"), {
        kind: plan
      })]);
    }
  }
}));
export type PacketFilterState = GateState;
export type PacketFilterEvent = Event | {
  readonly kind: "transport/packet-filter-gate";
  readonly transportId: Uint8Array | null;
  readonly localTransportHash: Uint8Array;
  readonly packetType: number;
  readonly destinationType: number;
  readonly alreadySeenHash: boolean;
};
export type PacketFilterAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export type PacketFilterStepResult = GateStepResult<PacketFilterAction>;
export const initialPacketFilterState = initialGateState;
export const stepPacketFilterWithActions = interpretGate(packetFilterGate);
export const shouldAcceptPacketFilter = gateConcluded<PacketFilterAction>(stryMutAct_9fa48("33861") ? "" : (stryCov_9fa48("33861"), "accept"));
export const shouldRejectPacketFilter = gateConcluded<PacketFilterAction>(stryMutAct_9fa48("33862") ? "" : (stryCov_9fa48("33862"), "reject"));
export function shouldAcceptTransportPacket(input: {
  readonly filterPassed: boolean;
  readonly packetType: number;
  readonly transportType: number;
  readonly hasForeignTransportId: boolean;
  readonly alreadySeenHash: boolean;
}): boolean {
  if (stryMutAct_9fa48("33863")) {
    {}
  } else {
    stryCov_9fa48("33863");
    if (stryMutAct_9fa48("33865") ? false : stryMutAct_9fa48("33864") ? true : (stryCov_9fa48("33864", "33865"), input.filterPassed)) {
      if (stryMutAct_9fa48("33866")) {
        {}
      } else {
        stryCov_9fa48("33866");
        return stryMutAct_9fa48("33867") ? false : (stryCov_9fa48("33867"), true);
      }
    }
    if (stryMutAct_9fa48("33870") ? input.packetType === PACKET_TYPE_ANNOUNCE && input.transportType === TRANSPORT_TRANSPORT || input.hasForeignTransportId : stryMutAct_9fa48("33869") ? false : stryMutAct_9fa48("33868") ? true : (stryCov_9fa48("33868", "33869", "33870"), (stryMutAct_9fa48("33872") ? input.packetType === PACKET_TYPE_ANNOUNCE || input.transportType === TRANSPORT_TRANSPORT : stryMutAct_9fa48("33871") ? true : (stryCov_9fa48("33871", "33872"), (stryMutAct_9fa48("33874") ? input.packetType !== PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("33873") ? true : (stryCov_9fa48("33873", "33874"), input.packetType === PACKET_TYPE_ANNOUNCE)) && (stryMutAct_9fa48("33876") ? input.transportType !== TRANSPORT_TRANSPORT : stryMutAct_9fa48("33875") ? true : (stryCov_9fa48("33875", "33876"), input.transportType === TRANSPORT_TRANSPORT)))) && input.hasForeignTransportId)) {
      if (stryMutAct_9fa48("33877")) {
        {}
      } else {
        stryCov_9fa48("33877");
        return stryMutAct_9fa48("33878") ? input.alreadySeenHash : (stryCov_9fa48("33878"), !input.alreadySeenHash);
      }
    }
    return stryMutAct_9fa48("33879") ? true : (stryCov_9fa48("33879"), false);
  }
}

/**
 * Transport-packet accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptTransportPacket`
 * reads beside the step).
 */
type AcceptTransportPacketGateEvent = Extract<AcceptTransportPacketEvent, {
  readonly kind: "transport/accept-packet-gate";
}>;
const acceptTransportPacketGate = defineBooleanGate<AcceptTransportPacketGateEvent, "accept", "skip">(stryMutAct_9fa48("33880") ? {} : (stryCov_9fa48("33880"), {
  event: stryMutAct_9fa48("33881") ? "" : (stryCov_9fa48("33881"), "transport/accept-packet-gate"),
  whenTrue: stryMutAct_9fa48("33882") ? "" : (stryCov_9fa48("33882"), "accept"),
  whenFalse: stryMutAct_9fa48("33883") ? "" : (stryCov_9fa48("33883"), "skip"),
  decide: stryMutAct_9fa48("33884") ? () => undefined : (stryCov_9fa48("33884"), event => shouldAcceptTransportPacket(event))
}));
export type AcceptTransportPacketState = GateState;
export type AcceptTransportPacketEvent = Event | {
  readonly kind: "transport/accept-packet-gate";
  readonly filterPassed: boolean;
  readonly packetType: number;
  readonly transportType: number;
  readonly hasForeignTransportId: boolean;
  readonly alreadySeenHash: boolean;
};
export type AcceptTransportPacketAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export type AcceptTransportPacketStepResult = GateStepResult<AcceptTransportPacketAction>;
export const initialAcceptTransportPacketState = initialGateState;
export const stepAcceptTransportPacketWithActions = interpretGate(acceptTransportPacketGate);
export const shouldAcceptTransportPacketNow = gateConcluded<AcceptTransportPacketAction>(stryMutAct_9fa48("33885") ? "" : (stryCov_9fa48("33885"), "accept"));
export const shouldSkipAcceptTransportPacket = gateConcluded<AcceptTransportPacketAction>(stryMutAct_9fa48("33886") ? "" : (stryCov_9fa48("33886"), "skip"));
export function shouldDeferPacketHash(input: {
  readonly packetType: number;
  readonly context: number;
  readonly destinationInLinkTable: boolean;
}): boolean {
  if (stryMutAct_9fa48("33887")) {
    {}
  } else {
    stryCov_9fa48("33887");
    if (stryMutAct_9fa48("33890") ? input.packetType === PACKET_TYPE_PROOF || input.context === PacketContextCode.LRPROOF : stryMutAct_9fa48("33889") ? false : stryMutAct_9fa48("33888") ? true : (stryCov_9fa48("33888", "33889", "33890"), (stryMutAct_9fa48("33892") ? input.packetType !== PACKET_TYPE_PROOF : stryMutAct_9fa48("33891") ? true : (stryCov_9fa48("33891", "33892"), input.packetType === PACKET_TYPE_PROOF)) && (stryMutAct_9fa48("33894") ? input.context !== PacketContextCode.LRPROOF : stryMutAct_9fa48("33893") ? true : (stryCov_9fa48("33893", "33894"), input.context === PacketContextCode.LRPROOF)))) {
      if (stryMutAct_9fa48("33895")) {
        {}
      } else {
        stryCov_9fa48("33895");
        return stryMutAct_9fa48("33896") ? false : (stryCov_9fa48("33896"), true);
      }
    }
    return input.destinationInLinkTable;
  }
}

/**
 * Packet-hash deferral is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDeferPacketHash`
 * reads beside the step).
 */
type PacketHashDeferGateEvent = Extract<PacketHashDeferEvent, {
  readonly kind: "transport/packet-hash-defer-gate";
}>;
const packetHashDeferGate = defineBooleanGate<PacketHashDeferGateEvent, "defer", "remember-now">(stryMutAct_9fa48("33897") ? {} : (stryCov_9fa48("33897"), {
  event: stryMutAct_9fa48("33898") ? "" : (stryCov_9fa48("33898"), "transport/packet-hash-defer-gate"),
  whenTrue: stryMutAct_9fa48("33899") ? "" : (stryCov_9fa48("33899"), "defer"),
  whenFalse: stryMutAct_9fa48("33900") ? "" : (stryCov_9fa48("33900"), "remember-now"),
  decide: stryMutAct_9fa48("33901") ? () => undefined : (stryCov_9fa48("33901"), event => shouldDeferPacketHash(event))
}));
export type PacketHashDeferState = GateState;
export type PacketHashDeferEvent = Event | {
  readonly kind: "transport/packet-hash-defer-gate";
  readonly packetType: number;
  readonly context: number;
  readonly destinationInLinkTable: boolean;
};
export type PacketHashDeferAction = {
  readonly kind: "defer";
} | {
  readonly kind: "remember-now";
};
export type PacketHashDeferStepResult = GateStepResult<PacketHashDeferAction>;
export const initialPacketHashDeferState = initialGateState;
export const stepPacketHashDeferWithActions = interpretGate(packetHashDeferGate);
export const shouldDeferPacketHashActions = gateConcluded<PacketHashDeferAction>(stryMutAct_9fa48("33902") ? "" : (stryCov_9fa48("33902"), "defer"));
export const shouldRememberPacketHashImmediately = gateConcluded<PacketHashDeferAction>(stryMutAct_9fa48("33903") ? "" : (stryCov_9fa48("33903"), "remember-now"));

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
  if (stryMutAct_9fa48("33904")) {
    {}
  } else {
    stryCov_9fa48("33904");
    if (stryMutAct_9fa48("33906") ? false : stryMutAct_9fa48("33905") ? true : (stryCov_9fa48("33905", "33906"), input.sameInterface)) {
      if (stryMutAct_9fa48("33907")) {
        {}
      } else {
        stryCov_9fa48("33907");
        if (stryMutAct_9fa48("33910") ? input.packetHops === input.remainingHops && input.packetHops === input.takenHops : stryMutAct_9fa48("33909") ? false : stryMutAct_9fa48("33908") ? true : (stryCov_9fa48("33908", "33909", "33910"), (stryMutAct_9fa48("33912") ? input.packetHops !== input.remainingHops : stryMutAct_9fa48("33911") ? false : (stryCov_9fa48("33911", "33912"), input.packetHops === input.remainingHops)) || (stryMutAct_9fa48("33914") ? input.packetHops !== input.takenHops : stryMutAct_9fa48("33913") ? false : (stryCov_9fa48("33913", "33914"), input.packetHops === input.takenHops)))) {
          if (stryMutAct_9fa48("33915")) {
            {}
          } else {
            stryCov_9fa48("33915");
            return stryMutAct_9fa48("33916") ? "" : (stryCov_9fa48("33916"), "outbound");
          }
        }
        return null;
      }
    }
    if (stryMutAct_9fa48("33919") ? input.ifaceIsOutbound || input.packetHops === input.remainingHops : stryMutAct_9fa48("33918") ? false : stryMutAct_9fa48("33917") ? true : (stryCov_9fa48("33917", "33918", "33919"), input.ifaceIsOutbound && (stryMutAct_9fa48("33921") ? input.packetHops !== input.remainingHops : stryMutAct_9fa48("33920") ? true : (stryCov_9fa48("33920", "33921"), input.packetHops === input.remainingHops)))) {
      if (stryMutAct_9fa48("33922")) {
        {}
      } else {
        stryCov_9fa48("33922");
        return stryMutAct_9fa48("33923") ? "" : (stryCov_9fa48("33923"), "received");
      }
    }
    if (stryMutAct_9fa48("33926") ? input.ifaceIsReceived || input.packetHops === input.takenHops : stryMutAct_9fa48("33925") ? false : stryMutAct_9fa48("33924") ? true : (stryCov_9fa48("33924", "33925", "33926"), input.ifaceIsReceived && (stryMutAct_9fa48("33928") ? input.packetHops !== input.takenHops : stryMutAct_9fa48("33927") ? true : (stryCov_9fa48("33927", "33928"), input.packetHops === input.takenHops)))) {
      if (stryMutAct_9fa48("33929")) {
        {}
      } else {
        stryCov_9fa48("33929");
        return stryMutAct_9fa48("33930") ? "" : (stryCov_9fa48("33930"), "outbound");
      }
    }
    return null;
  }
}

/**
 * Link relay target plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRelayTarget` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkRelayTargetWithActions}.
 */
type LinkRelayTargetPlanGateEvent = Extract<LinkRelayTargetPlanEvent, {
  readonly kind: "transport/link-relay-plan-gate";
}>;
const linkRelayTargetPlanGate = defineOptionGate<LinkRelayTargetPlanGateEvent, "outbound" | "received", "ignore">(stryMutAct_9fa48("33931") ? {} : (stryCov_9fa48("33931"), {
  event: stryMutAct_9fa48("33932") ? "" : (stryCov_9fa48("33932"), "transport/link-relay-plan-gate"),
  kinds: stryMutAct_9fa48("33933") ? [] : (stryCov_9fa48("33933"), [stryMutAct_9fa48("33934") ? "" : (stryCov_9fa48("33934"), "outbound"), stryMutAct_9fa48("33935") ? "" : (stryCov_9fa48("33935"), "received")]),
  none: stryMutAct_9fa48("33936") ? "" : (stryCov_9fa48("33936"), "ignore"),
  decide: stryMutAct_9fa48("33937") ? () => undefined : (stryCov_9fa48("33937"), event => planLinkRelayTarget(event))
}));
export type LinkRelayTargetPlanState = GateState;
export type LinkRelayTargetPlanEvent = Event | {
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
export const linkRelayTargetPlanFromActions = gateConclusion<LinkRelayTargetPlanAction, LinkRelayTarget>(stryMutAct_9fa48("33938") ? "" : (stryCov_9fa48("33938"), "outbound"), stryMutAct_9fa48("33939") ? "" : (stryCov_9fa48("33939"), "received"));
export const shouldRelayLinkOutboundPlan = gateConcluded<LinkRelayTargetPlanAction>(stryMutAct_9fa48("33940") ? "" : (stryCov_9fa48("33940"), "outbound"));
export const shouldRelayLinkReceivedPlan = gateConcluded<LinkRelayTargetPlanAction>(stryMutAct_9fa48("33941") ? "" : (stryCov_9fa48("33941"), "received"));
export const shouldIgnoreLinkRelayTargetPlan = gateConcluded<LinkRelayTargetPlanAction>(stryMutAct_9fa48("33942") ? "" : (stryCov_9fa48("33942"), "ignore"));

/** Whether link-relay may proceed after a link-table lookup hit. */
export function canLookupLinkRelayEntry(entryPresent: boolean): boolean {
  if (stryMutAct_9fa48("33943")) {
    {}
  } else {
    stryCov_9fa48("33943");
    return entryPresent;
  }
}

/**
 * canLookupLinkRelayEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLookupLinkRelayEntry`
 * reads beside the step).
 */
export type LookupLinkRelayEntryGateEvent = Extract<LookupLinkRelayEntryEvent, {
  readonly kind: "transport/lookup-link-relay-entry-gate";
}>;
export type LookupLinkRelayEntryEvent = Event | {
  readonly kind: "transport/lookup-link-relay-entry-gate";
  readonly entryPresent: boolean;
};

/**
 * Link relay target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkRelayTargetPlanWithActions}
 * (`outbound`|`received`|`ignore`).
 */
type LinkRelayTargetGateEvent = Extract<LinkRelayTargetEvent, {
  readonly kind: "transport/link-relay-gate";
}>;
export const linkRelayTargetGate = defineGate<LinkRelayTargetGateEvent, LinkRelayTargetAction>(stryMutAct_9fa48("33944") ? {} : (stryCov_9fa48("33944"), {
  event: stryMutAct_9fa48("33945") ? "" : (stryCov_9fa48("33945"), "transport/link-relay-gate"),
  actions: stryMutAct_9fa48("33946") ? [] : (stryCov_9fa48("33946"), [stryMutAct_9fa48("33947") ? "" : (stryCov_9fa48("33947"), "outbound"), stryMutAct_9fa48("33948") ? "" : (stryCov_9fa48("33948"), "received"), stryMutAct_9fa48("33949") ? "" : (stryCov_9fa48("33949"), "ignore")]),
  decide: event => {
    if (stryMutAct_9fa48("33950")) {
      {}
    } else {
      stryCov_9fa48("33950");
      const target = linkRelayTargetPlanFromActions(decideGate(linkRelayTargetPlanGate, stryMutAct_9fa48("33951") ? {} : (stryCov_9fa48("33951"), {
        ...event,
        kind: stryMutAct_9fa48("33952") ? "" : (stryCov_9fa48("33952"), "transport/link-relay-plan-gate")
      })));
      return stryMutAct_9fa48("33953") ? [] : (stryCov_9fa48("33953"), [stryMutAct_9fa48("33954") ? {} : (stryCov_9fa48("33954"), {
        kind: stryMutAct_9fa48("33955") ? target && "ignore" : (stryCov_9fa48("33955"), target ?? (stryMutAct_9fa48("33956") ? "" : (stryCov_9fa48("33956"), "ignore")))
      })]);
    }
  }
}));
export type LinkRelayTargetEvent = Event | {
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
export const stepLinkRelayTargetWithActions = interpretGate(linkRelayTargetGate);