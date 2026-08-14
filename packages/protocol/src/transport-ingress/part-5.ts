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
  gateConcluded,
  gateConclusion,
  gatePayload,
  initialGateState,
  interpretGate,
  type GateState,
  type GateStepResult,
} from "@twistedpear/effects";
import type { Event } from "@twistedpear/effects";
import { equalByteArrays } from "../path-table.js";
import { planLocalPlainDataDelivery } from "./part-4.js";
import type { LocalPlainDataDeliveryPlan } from "./part-4.js";
/**
 * Local plain-data delivery plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLocalPlainDataDelivery` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLocalPlainDataDeliveryWithActions}.
 */
type LocalPlainDataDeliveryPlanGateEvent = Extract<
  LocalPlainDataDeliveryPlanEvent,
  { readonly kind: "transport/local-plain-data-plan-gate" }
>;

const localPlainDataDeliveryPlanGate = defineGate<
  LocalPlainDataDeliveryPlanGateEvent,
  LocalPlainDataDeliveryPlanAction
>({
  event: "transport/local-plain-data-plan-gate",
  actions: ["dispatch", "ignore"],
  decide: (event) => [{ kind: planLocalPlainDataDelivery(event) }],
});

export type LocalPlainDataDeliveryPlanState = GateState;

export type LocalPlainDataDeliveryPlanEvent =
  | Event
  | {
      readonly kind: "transport/local-plain-data-plan-gate";
      readonly destinationPresent: boolean;
      readonly plaintextPresent: boolean;
    };

export type LocalPlainDataDeliveryPlanAction = {
  readonly kind: LocalPlainDataDeliveryPlan;
};

export type LocalPlainDataDeliveryPlanStepResult =
  GateStepResult<LocalPlainDataDeliveryPlanAction>;

export const initialLocalPlainDataDeliveryPlanState = initialGateState;

export const stepLocalPlainDataDeliveryPlanWithActions = interpretGate(
  localPlainDataDeliveryPlanGate,
);

/** Extract the local plain-data delivery plan from actions; null when empty. */
export const localPlainDataDeliveryPlanFromActions = gateConclusion<
  LocalPlainDataDeliveryPlanAction,
  LocalPlainDataDeliveryPlan
>("dispatch", "ignore");

export const shouldDispatchLocalPlainDataDeliveryPlan =
  gateConcluded<LocalPlainDataDeliveryPlanAction>("dispatch");

export const shouldIgnoreLocalPlainDataDeliveryPlan =
  gateConcluded<LocalPlainDataDeliveryPlanAction>("ignore");

/**
 * Whether local plain DATA may dispatch after {@link planLocalPlainDataDelivery}
 * and destination/plaintext references remain present for narrowing.
 */
export function shouldDispatchLocalPlainDataDelivery(input: {
  readonly planDispatch: boolean;
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
}): boolean {
  return (
    input.planDispatch && input.destinationPresent && input.plaintextPresent
  );
}

/**
 * Local plain-data dispatch-after-plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchLocalPlainDataDelivery` reads beside the step).
 */
type DispatchLocalPlainDataDeliveryGateEvent = Extract<
  DispatchLocalPlainDataDeliveryEvent,
  { readonly kind: "transport/dispatch-local-plain-data-gate" }
>;

const dispatchLocalPlainDataDeliveryGate = defineBooleanGate<
  DispatchLocalPlainDataDeliveryGateEvent,
  "dispatch",
  "skip"
>({
  event: "transport/dispatch-local-plain-data-gate",
  whenTrue: "dispatch",
  whenFalse: "skip",
  decide: (event) => shouldDispatchLocalPlainDataDelivery(event),
});

export type DispatchLocalPlainDataDeliveryState = GateState;

export type DispatchLocalPlainDataDeliveryEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-local-plain-data-gate";
      readonly planDispatch: boolean;
      readonly destinationPresent: boolean;
      readonly plaintextPresent: boolean;
    };

export type DispatchLocalPlainDataDeliveryAction =
  { readonly kind: "dispatch" } | { readonly kind: "skip" };

export type DispatchLocalPlainDataDeliveryStepResult =
  GateStepResult<DispatchLocalPlainDataDeliveryAction>;

export const initialDispatchLocalPlainDataDeliveryState = initialGateState;

export const stepDispatchLocalPlainDataDeliveryWithActions = interpretGate(
  dispatchLocalPlainDataDeliveryGate,
);

export const shouldDispatchLocalPlainDataDeliveryNow =
  gateConcluded<DispatchLocalPlainDataDeliveryAction>("dispatch");

export const shouldSkipDispatchLocalPlainDataDelivery =
  gateConcluded<DispatchLocalPlainDataDeliveryAction>("skip");

export type PacketHashRememberPlan = "now" | "after-relay";

/**
 * When to record a packet hash: immediately, or after deferred relay attempts.
 * Complements {@link shouldDeferPacketHash}.
 */
export function planPacketHashRemember(
  deferred: boolean,
): PacketHashRememberPlan {
  return deferred ? "after-relay" : "now";
}

/**
 * Packet-hash remember plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketHashRemember` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketHashRememberWithActions}.
 */
type PacketHashRememberPlanGateEvent = Extract<
  PacketHashRememberPlanEvent,
  { readonly kind: "transport/packet-hash-remember-plan-gate" }
>;

const packetHashRememberPlanGate = defineGate<
  PacketHashRememberPlanGateEvent,
  PacketHashRememberPlanAction
>({
  event: "transport/packet-hash-remember-plan-gate",
  actions: ["now", "after-relay"],
  decide: (event) => [{ kind: planPacketHashRemember(event.deferred) }],
});

export type PacketHashRememberPlanState = GateState;

export type PacketHashRememberPlanEvent =
  | Event
  | {
      readonly kind: "transport/packet-hash-remember-plan-gate";
      readonly deferred: boolean;
    };

export type PacketHashRememberPlanAction = {
  readonly kind: PacketHashRememberPlan;
};

export type PacketHashRememberPlanStepResult =
  GateStepResult<PacketHashRememberPlanAction>;

export const initialPacketHashRememberPlanState = initialGateState;

export const stepPacketHashRememberPlanWithActions = interpretGate(
  packetHashRememberPlanGate,
);

/** Extract the packet-hash remember plan from actions; null when empty. */
export const packetHashRememberPlanFromActions = gateConclusion<
  PacketHashRememberPlanAction,
  PacketHashRememberPlan
>("now", "after-relay");

export const shouldRememberPacketHashNowPlan =
  gateConcluded<PacketHashRememberPlanAction>("now");

export const shouldRememberPacketHashAfterRelayPlan =
  gateConcluded<PacketHashRememberPlanAction>("after-relay");

/** Whether inbound should record the packet hash immediately (non-deferred). */
export function shouldRememberPacketHashNow(rememberNow: boolean): boolean {
  return rememberNow;
}

/** Whether inbound should record the packet hash after deferred relay attempts. */
export function shouldRememberPacketHashAfterRelay(
  rememberAfterRelay: boolean,
): boolean {
  return rememberAfterRelay;
}

/** Whether RESOURCE_PRF ingress should dispatch to a matched active link. */
export function shouldDispatchResourceProofToLink(
  activeIndexPresent: boolean,
): boolean {
  return activeIndexPresent;
}

/**
 * shouldDispatchResourceProofToLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchResourceProofToLink` reads beside the step).
 */
type DispatchResourceProofToLinkGateEvent = Extract<
  DispatchResourceProofToLinkEvent,
  { readonly kind: "transport/dispatch-resource-proof-to-link-gate" }
>;

const dispatchResourceProofToLinkGate = defineBooleanGate<
  DispatchResourceProofToLinkGateEvent,
  "dispatch",
  "skip"
>({
  event: "transport/dispatch-resource-proof-to-link-gate",
  whenTrue: "dispatch",
  whenFalse: "skip",
  decide: (event) =>
    shouldDispatchResourceProofToLink(event.activeIndexPresent),
});

export type DispatchResourceProofToLinkState = GateState;

export type DispatchResourceProofToLinkEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-resource-proof-to-link-gate";
      readonly activeIndexPresent: boolean;
    };

export type DispatchResourceProofToLinkAction =
  { readonly kind: "dispatch" } | { readonly kind: "skip" };

export type DispatchResourceProofToLinkStepResult =
  GateStepResult<DispatchResourceProofToLinkAction>;

export const initialDispatchResourceProofToLinkState = initialGateState;

export const stepDispatchResourceProofToLinkWithActions = interpretGate(
  dispatchResourceProofToLinkGate,
);

export const shouldDispatchResourceProofToLinkNow =
  gateConcluded<DispatchResourceProofToLinkAction>("dispatch");

export const shouldSkipDispatchResourceProofToLink =
  gateConcluded<DispatchResourceProofToLinkAction>("skip");

/** Index of a link-id in a list (link-data / resource-prf ingress). */
export function indexOfMatchingLinkId(input: {
  readonly linkIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  for (let index = 0; index < input.linkIds.length; index += 1) {
    const linkId = input.linkIds[index];
    if (linkId != null && equalByteArrays(linkId, input.target)) {
      return index;
    }
  }
  return null;
}

/**
 * Matching link-id index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfMatchingLinkId`
 * reads beside the step).
 */
type IndexOfMatchingLinkIdGateEvent = Extract<
  IndexOfMatchingLinkIdEvent,
  { readonly kind: "transport/matching-link-id-index-gate" }
>;

const indexOfMatchingLinkIdGate = defineGate<
  IndexOfMatchingLinkIdGateEvent,
  IndexOfMatchingLinkIdAction
>({
  event: "transport/matching-link-id-index-gate",
  actions: ["use-index", "miss"],
  decide: (event) => {
    const index = indexOfMatchingLinkId(event);
    return index === null ? [{ kind: "miss" }] : [{ kind: "use-index", index }];
  },
});

export type IndexOfMatchingLinkIdState = GateState;

export type IndexOfMatchingLinkIdEvent =
  | Event
  | {
      readonly kind: "transport/matching-link-id-index-gate";
      readonly linkIds: ReadonlyArray<Uint8Array>;
      readonly target: Uint8Array;
    };

export type IndexOfMatchingLinkIdAction =
  | { readonly kind: "use-index"; readonly index: number }
  | { readonly kind: "miss" };

export type IndexOfMatchingLinkIdStepResult =
  GateStepResult<IndexOfMatchingLinkIdAction>;

export const initialIndexOfMatchingLinkIdState = initialGateState;

export const stepIndexOfMatchingLinkIdWithActions = interpretGate(
  indexOfMatchingLinkIdGate,
);

export const shouldUseMatchingLinkIdIndex =
  gateConcluded<IndexOfMatchingLinkIdAction>("use-index");

export const shouldMissMatchingLinkIdIndex =
  gateConcluded<IndexOfMatchingLinkIdAction>("miss");

/** Extract matching link-id index from step actions; null when no `use-index`. */
export const matchingLinkIdIndexFromActions = gatePayload<
  IndexOfMatchingLinkIdAction,
  "use-index",
  "index"
>("use-index", "index");

export type LinkDataIngressTarget = "active" | "pending" | "none";

/**
 * Prefer active then pending link-id match for DATA / resource-proof ingress.
 */
export function planLinkDataIngressTarget(input: {
  readonly activeIndex: number | null;
  readonly pendingIndex: number | null;
}): LinkDataIngressTarget {
  if (input.activeIndex !== null) {
    return "active";
  }
  if (input.pendingIndex !== null) {
    return "pending";
  }
  return "none";
}

/**
 * Packet-hash remember timing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketHashRememberPlanWithActions} (`now`|`after-relay`).
 */
type PacketHashRememberGateEvent = Extract<
  PacketHashRememberEvent,
  { readonly kind: "transport/packet-hash-remember-gate" }
>;

export const packetHashRememberGate = defineGate<
  PacketHashRememberGateEvent,
  PacketHashRememberAction
>({
  event: "transport/packet-hash-remember-gate",
  actions: ["now", "after-relay"],
  decide: (event) => {
    const plan = packetHashRememberPlanFromActions(
      decideGate(packetHashRememberPlanGate, {
        ...event,
        kind: "transport/packet-hash-remember-plan-gate",
      }),
    );
    return plan === null ? [] : [{ kind: plan }];
  },
});

export type PacketHashRememberEvent =
  | Event
  | {
      readonly kind: "transport/packet-hash-remember-gate";
      readonly deferred: boolean;
    };

export type PacketHashRememberAction = {
  readonly kind: PacketHashRememberPlan;
};

export const stepPacketHashRememberWithActions = interpretGate(
  packetHashRememberGate,
);

/**
 * Local plain-data delivery is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLocalPlainDataDeliveryPlanWithActions}
 * (`dispatch`|`ignore`).
 */
type LocalPlainDataDeliveryGateEvent = Extract<
  LocalPlainDataDeliveryEvent,
  { readonly kind: "transport/local-plain-data-gate" }
>;

export const localPlainDataDeliveryGate = defineGate<
  LocalPlainDataDeliveryGateEvent,
  LocalPlainDataDeliveryAction
>({
  event: "transport/local-plain-data-gate",
  actions: ["dispatch", "ignore"],
  decide: (event) => {
    const plan = localPlainDataDeliveryPlanFromActions(
      decideGate(localPlainDataDeliveryPlanGate, {
        ...event,
        kind: "transport/local-plain-data-plan-gate",
      }),
    );
    return plan === null ? [] : [{ kind: plan }];
  },
});

export type LocalPlainDataDeliveryEvent =
  | Event
  | {
      readonly kind: "transport/local-plain-data-gate";
      readonly destinationPresent: boolean;
      readonly plaintextPresent: boolean;
    };

export type LocalPlainDataDeliveryAction = {
  readonly kind: LocalPlainDataDeliveryPlan;
};

export const stepLocalPlainDataDeliveryWithActions = interpretGate(
  localPlainDataDeliveryGate,
);
