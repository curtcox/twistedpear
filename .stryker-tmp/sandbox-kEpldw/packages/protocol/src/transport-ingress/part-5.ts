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
import { shouldDeferPacketHash } from "./part-1.js";
import { planLocalPlainDataDelivery } from "./part-4.js";
import type { LocalPlainDataDeliveryPlan } from "./part-4.js";
/**
 * Local plain-data delivery plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLocalPlainDataDelivery` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLocalPlainDataDeliveryWithActions}.
 */
type LocalPlainDataDeliveryPlanGateEvent = Extract<LocalPlainDataDeliveryPlanEvent, {
  readonly kind: "transport/local-plain-data-plan-gate";
}>;
const localPlainDataDeliveryPlanGate = defineGate<LocalPlainDataDeliveryPlanGateEvent, LocalPlainDataDeliveryPlanAction>(stryMutAct_9fa48("34331") ? {} : (stryCov_9fa48("34331"), {
  event: stryMutAct_9fa48("34332") ? "" : (stryCov_9fa48("34332"), "transport/local-plain-data-plan-gate"),
  actions: stryMutAct_9fa48("34333") ? [] : (stryCov_9fa48("34333"), [stryMutAct_9fa48("34334") ? "" : (stryCov_9fa48("34334"), "dispatch"), stryMutAct_9fa48("34335") ? "" : (stryCov_9fa48("34335"), "ignore")]),
  decide: stryMutAct_9fa48("34336") ? () => undefined : (stryCov_9fa48("34336"), event => stryMutAct_9fa48("34337") ? [] : (stryCov_9fa48("34337"), [stryMutAct_9fa48("34338") ? {} : (stryCov_9fa48("34338"), {
    kind: planLocalPlainDataDelivery(event)
  })]))
}));
export type LocalPlainDataDeliveryPlanState = GateState;
export type LocalPlainDataDeliveryPlanEvent = Event | {
  readonly kind: "transport/local-plain-data-plan-gate";
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
};
export type LocalPlainDataDeliveryPlanAction = {
  readonly kind: LocalPlainDataDeliveryPlan;
};
export type LocalPlainDataDeliveryPlanStepResult = GateStepResult<LocalPlainDataDeliveryPlanAction>;
export const initialLocalPlainDataDeliveryPlanState = initialGateState;
export const stepLocalPlainDataDeliveryPlanWithActions = interpretGate(localPlainDataDeliveryPlanGate);

/** Extract the local plain-data delivery plan from actions; null when empty. */
export const localPlainDataDeliveryPlanFromActions = gateConclusion<LocalPlainDataDeliveryPlanAction, LocalPlainDataDeliveryPlan>(stryMutAct_9fa48("34339") ? "" : (stryCov_9fa48("34339"), "dispatch"), stryMutAct_9fa48("34340") ? "" : (stryCov_9fa48("34340"), "ignore"));
export const shouldDispatchLocalPlainDataDeliveryPlan = gateConcluded<LocalPlainDataDeliveryPlanAction>(stryMutAct_9fa48("34341") ? "" : (stryCov_9fa48("34341"), "dispatch"));
export const shouldIgnoreLocalPlainDataDeliveryPlan = gateConcluded<LocalPlainDataDeliveryPlanAction>(stryMutAct_9fa48("34342") ? "" : (stryCov_9fa48("34342"), "ignore"));

/**
 * Whether local plain DATA may dispatch after {@link planLocalPlainDataDelivery}
 * and destination/plaintext references remain present for narrowing.
 */
export function shouldDispatchLocalPlainDataDelivery(input: {
  readonly planDispatch: boolean;
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("34343")) {
    {}
  } else {
    stryCov_9fa48("34343");
    return stryMutAct_9fa48("34346") ? input.planDispatch && input.destinationPresent || input.plaintextPresent : stryMutAct_9fa48("34345") ? false : stryMutAct_9fa48("34344") ? true : (stryCov_9fa48("34344", "34345", "34346"), (stryMutAct_9fa48("34348") ? input.planDispatch || input.destinationPresent : stryMutAct_9fa48("34347") ? true : (stryCov_9fa48("34347", "34348"), input.planDispatch && input.destinationPresent)) && input.plaintextPresent);
  }
}

/**
 * Local plain-data dispatch-after-plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchLocalPlainDataDelivery` reads beside the step).
 */
type DispatchLocalPlainDataDeliveryGateEvent = Extract<DispatchLocalPlainDataDeliveryEvent, {
  readonly kind: "transport/dispatch-local-plain-data-gate";
}>;
const dispatchLocalPlainDataDeliveryGate = defineBooleanGate<DispatchLocalPlainDataDeliveryGateEvent, "dispatch", "skip">(stryMutAct_9fa48("34349") ? {} : (stryCov_9fa48("34349"), {
  event: stryMutAct_9fa48("34350") ? "" : (stryCov_9fa48("34350"), "transport/dispatch-local-plain-data-gate"),
  whenTrue: stryMutAct_9fa48("34351") ? "" : (stryCov_9fa48("34351"), "dispatch"),
  whenFalse: stryMutAct_9fa48("34352") ? "" : (stryCov_9fa48("34352"), "skip"),
  decide: stryMutAct_9fa48("34353") ? () => undefined : (stryCov_9fa48("34353"), event => shouldDispatchLocalPlainDataDelivery(event))
}));
export type DispatchLocalPlainDataDeliveryState = GateState;
export type DispatchLocalPlainDataDeliveryEvent = Event | {
  readonly kind: "transport/dispatch-local-plain-data-gate";
  readonly planDispatch: boolean;
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
};
export type DispatchLocalPlainDataDeliveryAction = {
  readonly kind: "dispatch";
} | {
  readonly kind: "skip";
};
export type DispatchLocalPlainDataDeliveryStepResult = GateStepResult<DispatchLocalPlainDataDeliveryAction>;
export const initialDispatchLocalPlainDataDeliveryState = initialGateState;
export const stepDispatchLocalPlainDataDeliveryWithActions = interpretGate(dispatchLocalPlainDataDeliveryGate);
export const shouldDispatchLocalPlainDataDeliveryNow = gateConcluded<DispatchLocalPlainDataDeliveryAction>(stryMutAct_9fa48("34354") ? "" : (stryCov_9fa48("34354"), "dispatch"));
export const shouldSkipDispatchLocalPlainDataDelivery = gateConcluded<DispatchLocalPlainDataDeliveryAction>(stryMutAct_9fa48("34355") ? "" : (stryCov_9fa48("34355"), "skip"));
export type PacketHashRememberPlan = "now" | "after-relay";

/**
 * When to record a packet hash: immediately, or after deferred relay attempts.
 * Complements {@link shouldDeferPacketHash}.
 */
export function planPacketHashRemember(deferred: boolean): PacketHashRememberPlan {
  if (stryMutAct_9fa48("34356")) {
    {}
  } else {
    stryCov_9fa48("34356");
    return deferred ? stryMutAct_9fa48("34357") ? "" : (stryCov_9fa48("34357"), "after-relay") : stryMutAct_9fa48("34358") ? "" : (stryCov_9fa48("34358"), "now");
  }
}

/**
 * Packet-hash remember plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketHashRemember` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketHashRememberWithActions}.
 */
type PacketHashRememberPlanGateEvent = Extract<PacketHashRememberPlanEvent, {
  readonly kind: "transport/packet-hash-remember-plan-gate";
}>;
const packetHashRememberPlanGate = defineGate<PacketHashRememberPlanGateEvent, PacketHashRememberPlanAction>(stryMutAct_9fa48("34359") ? {} : (stryCov_9fa48("34359"), {
  event: stryMutAct_9fa48("34360") ? "" : (stryCov_9fa48("34360"), "transport/packet-hash-remember-plan-gate"),
  actions: stryMutAct_9fa48("34361") ? [] : (stryCov_9fa48("34361"), [stryMutAct_9fa48("34362") ? "" : (stryCov_9fa48("34362"), "now"), stryMutAct_9fa48("34363") ? "" : (stryCov_9fa48("34363"), "after-relay")]),
  decide: stryMutAct_9fa48("34364") ? () => undefined : (stryCov_9fa48("34364"), event => stryMutAct_9fa48("34365") ? [] : (stryCov_9fa48("34365"), [stryMutAct_9fa48("34366") ? {} : (stryCov_9fa48("34366"), {
    kind: planPacketHashRemember(event.deferred)
  })]))
}));
export type PacketHashRememberPlanState = GateState;
export type PacketHashRememberPlanEvent = Event | {
  readonly kind: "transport/packet-hash-remember-plan-gate";
  readonly deferred: boolean;
};
export type PacketHashRememberPlanAction = {
  readonly kind: PacketHashRememberPlan;
};
export type PacketHashRememberPlanStepResult = GateStepResult<PacketHashRememberPlanAction>;
export const initialPacketHashRememberPlanState = initialGateState;
export const stepPacketHashRememberPlanWithActions = interpretGate(packetHashRememberPlanGate);

/** Extract the packet-hash remember plan from actions; null when empty. */
export const packetHashRememberPlanFromActions = gateConclusion<PacketHashRememberPlanAction, PacketHashRememberPlan>(stryMutAct_9fa48("34367") ? "" : (stryCov_9fa48("34367"), "now"), stryMutAct_9fa48("34368") ? "" : (stryCov_9fa48("34368"), "after-relay"));
export const shouldRememberPacketHashNowPlan = gateConcluded<PacketHashRememberPlanAction>(stryMutAct_9fa48("34369") ? "" : (stryCov_9fa48("34369"), "now"));
export const shouldRememberPacketHashAfterRelayPlan = gateConcluded<PacketHashRememberPlanAction>(stryMutAct_9fa48("34370") ? "" : (stryCov_9fa48("34370"), "after-relay"));

/** Whether inbound should record the packet hash immediately (non-deferred). */
export function shouldRememberPacketHashNow(rememberNow: boolean): boolean {
  if (stryMutAct_9fa48("34371")) {
    {}
  } else {
    stryCov_9fa48("34371");
    return rememberNow;
  }
}

/** Whether inbound should record the packet hash after deferred relay attempts. */
export function shouldRememberPacketHashAfterRelay(rememberAfterRelay: boolean): boolean {
  if (stryMutAct_9fa48("34372")) {
    {}
  } else {
    stryCov_9fa48("34372");
    return rememberAfterRelay;
  }
}

/** Whether RESOURCE_PRF ingress should dispatch to a matched active link. */
export function shouldDispatchResourceProofToLink(activeIndexPresent: boolean): boolean {
  if (stryMutAct_9fa48("34373")) {
    {}
  } else {
    stryCov_9fa48("34373");
    return activeIndexPresent;
  }
}

/**
 * shouldDispatchResourceProofToLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchResourceProofToLink` reads beside the step).
 */
type DispatchResourceProofToLinkGateEvent = Extract<DispatchResourceProofToLinkEvent, {
  readonly kind: "transport/dispatch-resource-proof-to-link-gate";
}>;
const dispatchResourceProofToLinkGate = defineBooleanGate<DispatchResourceProofToLinkGateEvent, "dispatch", "skip">(stryMutAct_9fa48("34374") ? {} : (stryCov_9fa48("34374"), {
  event: stryMutAct_9fa48("34375") ? "" : (stryCov_9fa48("34375"), "transport/dispatch-resource-proof-to-link-gate"),
  whenTrue: stryMutAct_9fa48("34376") ? "" : (stryCov_9fa48("34376"), "dispatch"),
  whenFalse: stryMutAct_9fa48("34377") ? "" : (stryCov_9fa48("34377"), "skip"),
  decide: stryMutAct_9fa48("34378") ? () => undefined : (stryCov_9fa48("34378"), event => shouldDispatchResourceProofToLink(event.activeIndexPresent))
}));
export type DispatchResourceProofToLinkState = GateState;
export type DispatchResourceProofToLinkEvent = Event | {
  readonly kind: "transport/dispatch-resource-proof-to-link-gate";
  readonly activeIndexPresent: boolean;
};
export type DispatchResourceProofToLinkAction = {
  readonly kind: "dispatch";
} | {
  readonly kind: "skip";
};
export type DispatchResourceProofToLinkStepResult = GateStepResult<DispatchResourceProofToLinkAction>;
export const initialDispatchResourceProofToLinkState = initialGateState;
export const stepDispatchResourceProofToLinkWithActions = interpretGate(dispatchResourceProofToLinkGate);
export const shouldDispatchResourceProofToLinkNow = gateConcluded<DispatchResourceProofToLinkAction>(stryMutAct_9fa48("34379") ? "" : (stryCov_9fa48("34379"), "dispatch"));
export const shouldSkipDispatchResourceProofToLink = gateConcluded<DispatchResourceProofToLinkAction>(stryMutAct_9fa48("34380") ? "" : (stryCov_9fa48("34380"), "skip"));

/** Index of a link-id in a list (link-data / resource-prf ingress). */
export function indexOfMatchingLinkId(input: {
  readonly linkIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  if (stryMutAct_9fa48("34381")) {
    {}
  } else {
    stryCov_9fa48("34381");
    for (let index = 0; stryMutAct_9fa48("34384") ? index >= input.linkIds.length : stryMutAct_9fa48("34383") ? index <= input.linkIds.length : stryMutAct_9fa48("34382") ? false : (stryCov_9fa48("34382", "34383", "34384"), index < input.linkIds.length); stryMutAct_9fa48("34385") ? index -= 1 : (stryCov_9fa48("34385"), index += 1)) {
      if (stryMutAct_9fa48("34386")) {
        {}
      } else {
        stryCov_9fa48("34386");
        const linkId = input.linkIds[index];
        if (stryMutAct_9fa48("34389") ? linkId != null || equalByteArrays(linkId, input.target) : stryMutAct_9fa48("34388") ? false : stryMutAct_9fa48("34387") ? true : (stryCov_9fa48("34387", "34388", "34389"), (stryMutAct_9fa48("34391") ? linkId == null : stryMutAct_9fa48("34390") ? true : (stryCov_9fa48("34390", "34391"), linkId != null)) && equalByteArrays(linkId, input.target))) {
          if (stryMutAct_9fa48("34392")) {
            {}
          } else {
            stryCov_9fa48("34392");
            return index;
          }
        }
      }
    }
    return null;
  }
}

/**
 * Matching link-id index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfMatchingLinkId`
 * reads beside the step).
 */
type IndexOfMatchingLinkIdGateEvent = Extract<IndexOfMatchingLinkIdEvent, {
  readonly kind: "transport/matching-link-id-index-gate";
}>;
const indexOfMatchingLinkIdGate = defineGate<IndexOfMatchingLinkIdGateEvent, IndexOfMatchingLinkIdAction>(stryMutAct_9fa48("34393") ? {} : (stryCov_9fa48("34393"), {
  event: stryMutAct_9fa48("34394") ? "" : (stryCov_9fa48("34394"), "transport/matching-link-id-index-gate"),
  actions: stryMutAct_9fa48("34395") ? [] : (stryCov_9fa48("34395"), [stryMutAct_9fa48("34396") ? "" : (stryCov_9fa48("34396"), "use-index"), stryMutAct_9fa48("34397") ? "" : (stryCov_9fa48("34397"), "miss")]),
  decide: event => {
    if (stryMutAct_9fa48("34398")) {
      {}
    } else {
      stryCov_9fa48("34398");
      const index = indexOfMatchingLinkId(event);
      return (stryMutAct_9fa48("34401") ? index !== null : stryMutAct_9fa48("34400") ? false : stryMutAct_9fa48("34399") ? true : (stryCov_9fa48("34399", "34400", "34401"), index === null)) ? stryMutAct_9fa48("34402") ? [] : (stryCov_9fa48("34402"), [stryMutAct_9fa48("34403") ? {} : (stryCov_9fa48("34403"), {
        kind: stryMutAct_9fa48("34404") ? "" : (stryCov_9fa48("34404"), "miss")
      })]) : stryMutAct_9fa48("34405") ? [] : (stryCov_9fa48("34405"), [stryMutAct_9fa48("34406") ? {} : (stryCov_9fa48("34406"), {
        kind: stryMutAct_9fa48("34407") ? "" : (stryCov_9fa48("34407"), "use-index"),
        index
      })]);
    }
  }
}));
export type IndexOfMatchingLinkIdState = GateState;
export type IndexOfMatchingLinkIdEvent = Event | {
  readonly kind: "transport/matching-link-id-index-gate";
  readonly linkIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
};
export type IndexOfMatchingLinkIdAction = {
  readonly kind: "use-index";
  readonly index: number;
} | {
  readonly kind: "miss";
};
export type IndexOfMatchingLinkIdStepResult = GateStepResult<IndexOfMatchingLinkIdAction>;
export const initialIndexOfMatchingLinkIdState = initialGateState;
export const stepIndexOfMatchingLinkIdWithActions = interpretGate(indexOfMatchingLinkIdGate);
export const shouldUseMatchingLinkIdIndex = gateConcluded<IndexOfMatchingLinkIdAction>(stryMutAct_9fa48("34408") ? "" : (stryCov_9fa48("34408"), "use-index"));
export const shouldMissMatchingLinkIdIndex = gateConcluded<IndexOfMatchingLinkIdAction>(stryMutAct_9fa48("34409") ? "" : (stryCov_9fa48("34409"), "miss"));

/** Extract matching link-id index from step actions; null when no `use-index`. */
export const matchingLinkIdIndexFromActions = gatePayload<IndexOfMatchingLinkIdAction, "use-index", "index">(stryMutAct_9fa48("34410") ? "" : (stryCov_9fa48("34410"), "use-index"), stryMutAct_9fa48("34411") ? "" : (stryCov_9fa48("34411"), "index"));
export type LinkDataIngressTarget = "active" | "pending" | "none";

/**
 * Prefer active then pending link-id match for DATA / resource-proof ingress.
 */
export function planLinkDataIngressTarget(input: {
  readonly activeIndex: number | null;
  readonly pendingIndex: number | null;
}): LinkDataIngressTarget {
  if (stryMutAct_9fa48("34412")) {
    {}
  } else {
    stryCov_9fa48("34412");
    if (stryMutAct_9fa48("34415") ? input.activeIndex === null : stryMutAct_9fa48("34414") ? false : stryMutAct_9fa48("34413") ? true : (stryCov_9fa48("34413", "34414", "34415"), input.activeIndex !== null)) {
      if (stryMutAct_9fa48("34416")) {
        {}
      } else {
        stryCov_9fa48("34416");
        return stryMutAct_9fa48("34417") ? "" : (stryCov_9fa48("34417"), "active");
      }
    }
    if (stryMutAct_9fa48("34420") ? input.pendingIndex === null : stryMutAct_9fa48("34419") ? false : stryMutAct_9fa48("34418") ? true : (stryCov_9fa48("34418", "34419", "34420"), input.pendingIndex !== null)) {
      if (stryMutAct_9fa48("34421")) {
        {}
      } else {
        stryCov_9fa48("34421");
        return stryMutAct_9fa48("34422") ? "" : (stryCov_9fa48("34422"), "pending");
      }
    }
    return stryMutAct_9fa48("34423") ? "" : (stryCov_9fa48("34423"), "none");
  }
}

/**
 * Packet-hash remember timing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketHashRememberPlanWithActions} (`now`|`after-relay`).
 */
type PacketHashRememberGateEvent = Extract<PacketHashRememberEvent, {
  readonly kind: "transport/packet-hash-remember-gate";
}>;
export const packetHashRememberGate = defineGate<PacketHashRememberGateEvent, PacketHashRememberAction>(stryMutAct_9fa48("34424") ? {} : (stryCov_9fa48("34424"), {
  event: stryMutAct_9fa48("34425") ? "" : (stryCov_9fa48("34425"), "transport/packet-hash-remember-gate"),
  actions: stryMutAct_9fa48("34426") ? [] : (stryCov_9fa48("34426"), [stryMutAct_9fa48("34427") ? "" : (stryCov_9fa48("34427"), "now"), stryMutAct_9fa48("34428") ? "" : (stryCov_9fa48("34428"), "after-relay")]),
  decide: event => {
    if (stryMutAct_9fa48("34429")) {
      {}
    } else {
      stryCov_9fa48("34429");
      const plan = packetHashRememberPlanFromActions(decideGate(packetHashRememberPlanGate, stryMutAct_9fa48("34430") ? {} : (stryCov_9fa48("34430"), {
        ...event,
        kind: stryMutAct_9fa48("34431") ? "" : (stryCov_9fa48("34431"), "transport/packet-hash-remember-plan-gate")
      })));
      return (stryMutAct_9fa48("34434") ? plan !== null : stryMutAct_9fa48("34433") ? false : stryMutAct_9fa48("34432") ? true : (stryCov_9fa48("34432", "34433", "34434"), plan === null)) ? stryMutAct_9fa48("34435") ? ["Stryker was here"] : (stryCov_9fa48("34435"), []) : stryMutAct_9fa48("34436") ? [] : (stryCov_9fa48("34436"), [stryMutAct_9fa48("34437") ? {} : (stryCov_9fa48("34437"), {
        kind: plan
      })]);
    }
  }
}));
export type PacketHashRememberEvent = Event | {
  readonly kind: "transport/packet-hash-remember-gate";
  readonly deferred: boolean;
};
export type PacketHashRememberAction = {
  readonly kind: PacketHashRememberPlan;
};
export const stepPacketHashRememberWithActions = interpretGate(packetHashRememberGate);

/**
 * Local plain-data delivery is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLocalPlainDataDeliveryPlanWithActions}
 * (`dispatch`|`ignore`).
 */
type LocalPlainDataDeliveryGateEvent = Extract<LocalPlainDataDeliveryEvent, {
  readonly kind: "transport/local-plain-data-gate";
}>;
export const localPlainDataDeliveryGate = defineGate<LocalPlainDataDeliveryGateEvent, LocalPlainDataDeliveryAction>(stryMutAct_9fa48("34438") ? {} : (stryCov_9fa48("34438"), {
  event: stryMutAct_9fa48("34439") ? "" : (stryCov_9fa48("34439"), "transport/local-plain-data-gate"),
  actions: stryMutAct_9fa48("34440") ? [] : (stryCov_9fa48("34440"), [stryMutAct_9fa48("34441") ? "" : (stryCov_9fa48("34441"), "dispatch"), stryMutAct_9fa48("34442") ? "" : (stryCov_9fa48("34442"), "ignore")]),
  decide: event => {
    if (stryMutAct_9fa48("34443")) {
      {}
    } else {
      stryCov_9fa48("34443");
      const plan = localPlainDataDeliveryPlanFromActions(decideGate(localPlainDataDeliveryPlanGate, stryMutAct_9fa48("34444") ? {} : (stryCov_9fa48("34444"), {
        ...event,
        kind: stryMutAct_9fa48("34445") ? "" : (stryCov_9fa48("34445"), "transport/local-plain-data-plan-gate")
      })));
      return (stryMutAct_9fa48("34448") ? plan !== null : stryMutAct_9fa48("34447") ? false : stryMutAct_9fa48("34446") ? true : (stryCov_9fa48("34446", "34447", "34448"), plan === null)) ? stryMutAct_9fa48("34449") ? ["Stryker was here"] : (stryCov_9fa48("34449"), []) : stryMutAct_9fa48("34450") ? [] : (stryCov_9fa48("34450"), [stryMutAct_9fa48("34451") ? {} : (stryCov_9fa48("34451"), {
        kind: plan
      })]);
    }
  }
}));
export type LocalPlainDataDeliveryEvent = Event | {
  readonly kind: "transport/local-plain-data-gate";
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
};
export type LocalPlainDataDeliveryAction = {
  readonly kind: LocalPlainDataDeliveryPlan;
};
export const stepLocalPlainDataDeliveryWithActions = interpretGate(localPlainDataDeliveryGate);