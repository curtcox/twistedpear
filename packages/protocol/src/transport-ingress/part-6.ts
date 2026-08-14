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
  gateStepFn,
  initialGateState,
  interpretGate,
  type GateState,
  type GateStepResult,
} from "@twistedpear/effects";
import type { Event, StepFn } from "@twistedpear/effects";
import { planReverseRelayOutcome } from "./part-2.js";
import { transportIngressDispatchGate } from "./part-3.js";
import { planLinkDataIngressTarget } from "./part-5.js";
import type { ReverseRelayOutcome } from "./part-2.js";
import type {
  TransportIngressDispatch,
  TransportIngressDispatchAction,
} from "./part-3.js";
import type { LinkDataIngressTarget } from "./part-5.js";
/**
 * Link-data ingress target plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkDataIngressTarget` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkDataIngressTargetWithActions}.
 */
type LinkDataIngressTargetPlanGateEvent = Extract<
  LinkDataIngressTargetPlanEvent,
  { readonly kind: "transport/link-data-ingress-plan-gate" }
>;

const linkDataIngressTargetPlanGate = defineGate<
  LinkDataIngressTargetPlanGateEvent,
  LinkDataIngressTargetPlanAction
>({
  event: "transport/link-data-ingress-plan-gate",
  actions: ["active", "pending", "none"],
  decide: (event) => [{ kind: planLinkDataIngressTarget(event) }],
});

export type LinkDataIngressTargetPlanState = GateState;

export type LinkDataIngressTargetPlanEvent =
  | Event
  | {
      readonly kind: "transport/link-data-ingress-plan-gate";
      readonly activeIndex: number | null;
      readonly pendingIndex: number | null;
    };

export type LinkDataIngressTargetPlanAction = {
  readonly kind: LinkDataIngressTarget;
};

export type LinkDataIngressTargetPlanStepResult =
  GateStepResult<LinkDataIngressTargetPlanAction>;

export const initialLinkDataIngressTargetPlanState = initialGateState;

export const stepLinkDataIngressTargetPlanWithActions = interpretGate(
  linkDataIngressTargetPlanGate,
);

/** Extract the link-data ingress target plan from actions; null when empty. */
export const linkDataIngressTargetPlanFromActions = gateConclusion<
  LinkDataIngressTargetPlanAction,
  LinkDataIngressTarget
>("active", "pending", "none");

export const shouldIngressLinkDataActivePlan =
  gateConcluded<LinkDataIngressTargetPlanAction>("active");

export const shouldIngressLinkDataPendingPlan =
  gateConcluded<LinkDataIngressTargetPlanAction>("pending");

export const shouldIngressLinkDataNonePlan =
  gateConcluded<LinkDataIngressTargetPlanAction>("none");

/**
 * Reverse-relay outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planReverseRelayOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepReverseRelayOutcomeWithActions}.
 */
type ReverseRelayOutcomePlanGateEvent = Extract<
  ReverseRelayOutcomePlanEvent,
  { readonly kind: "transport/reverse-relay-plan-gate" }
>;

const reverseRelayOutcomePlanGate = defineGate<
  ReverseRelayOutcomePlanGateEvent,
  ReverseRelayOutcomePlanAction
>({
  event: "transport/reverse-relay-plan-gate",
  actions: ["relay", "delete-expired", "ignore"],
  decide: (event) => [{ kind: planReverseRelayOutcome(event) }],
});

export type ReverseRelayOutcomePlanState = GateState;

export type ReverseRelayOutcomePlanEvent =
  | Event
  | {
      readonly kind: "transport/reverse-relay-plan-gate";
      readonly canRelay: boolean;
      readonly entryExpired: boolean;
      readonly ifaceIsOutbound: boolean;
    };

export type ReverseRelayOutcomePlanAction = {
  readonly kind: ReverseRelayOutcome;
};

export type ReverseRelayOutcomePlanStepResult =
  GateStepResult<ReverseRelayOutcomePlanAction>;

export const initialReverseRelayOutcomePlanState = initialGateState;

export const stepReverseRelayOutcomePlanWithActions = interpretGate(
  reverseRelayOutcomePlanGate,
);

/** Extract the reverse-relay outcome plan from actions; null when empty. */
export const reverseRelayOutcomePlanFromActions = gateConclusion<
  ReverseRelayOutcomePlanAction,
  ReverseRelayOutcome
>("relay", "delete-expired", "ignore");

export const shouldRelayReversePacketPlan =
  gateConcluded<ReverseRelayOutcomePlanAction>("relay");

export const shouldDeleteExpiredReverseEntryPlan =
  gateConcluded<ReverseRelayOutcomePlanAction>("delete-expired");

export const shouldIgnoreReverseRelayOutcomePlan =
  gateConcluded<ReverseRelayOutcomePlanAction>("ignore");

/** Whether a transport list should receive a new member (not already present). */
export function shouldRegisterTransportMember(
  alreadyPresent: boolean,
): boolean {
  return !alreadyPresent;
}

/**
 * shouldRegisterTransportMember gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterTransportMember` reads beside the step).
 */
type RegisterTransportMemberGateEvent = Extract<
  RegisterTransportMemberEvent,
  { readonly kind: "transport/member-register-gate" }
>;

const registerTransportMemberGate = defineBooleanGate<
  RegisterTransportMemberGateEvent,
  "register",
  "skip"
>({
  event: "transport/member-register-gate",
  whenTrue: "register",
  whenFalse: "skip",
  decide: (event) => shouldRegisterTransportMember(event.alreadyPresent),
});

export type RegisterTransportMemberState = GateState;

export type RegisterTransportMemberEvent =
  | Event
  | {
      readonly kind: "transport/member-register-gate";
      readonly alreadyPresent: boolean;
    };

export type RegisterTransportMemberAction =
  { readonly kind: "register" } | { readonly kind: "skip" };

export type RegisterTransportMemberStepResult =
  GateStepResult<RegisterTransportMemberAction>;

export const initialRegisterTransportMemberState = initialGateState;

export const stepRegisterTransportMemberWithActions = interpretGate(
  registerTransportMemberGate,
);

export const shouldRegisterTransportMemberNow =
  gateConcluded<RegisterTransportMemberAction>("register");

export const shouldSkipRegisterTransportMember =
  gateConcluded<RegisterTransportMemberAction>("skip");

/**
 * Unregister from a transport list: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterTransportMember(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterTransportMember}. */
export function shouldUnregisterTransportMember(
  indexPresent: boolean,
): boolean {
  return indexPresent;
}

/**
 * Transport-member unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step). Nested under
 * {@link stepTransportMemberUnregisterWithActions}.
 */
type TransportMemberUnregisterPlanGateEvent = Extract<
  TransportMemberUnregisterPlanEvent,
  { readonly kind: "transport/member-unregister-plan-gate" }
>;

const transportMemberUnregisterPlanGate = defineGate<
  TransportMemberUnregisterPlanGateEvent,
  TransportMemberUnregisterPlanAction
>({
  event: "transport/member-unregister-plan-gate",
  actions: ["remove"],
  decide: (event) => {
    const index = planUnregisterTransportMember(event.index);
    return index === null ? [] : [{ kind: "remove", index }];
  },
});

export type TransportMemberUnregisterPlanState = GateState;

export type TransportMemberUnregisterPlanEvent =
  | Event
  | {
      readonly kind: "transport/member-unregister-plan-gate";
      readonly index: number;
    };

export type TransportMemberUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};

export type TransportMemberUnregisterPlanStepResult =
  GateStepResult<TransportMemberUnregisterPlanAction>;

export const initialTransportMemberUnregisterPlanState = initialGateState;

export const stepTransportMemberUnregisterPlanWithActions = interpretGate(
  transportMemberUnregisterPlanGate,
);

export const transportMemberUnregisterPlanIndex = gatePayload<
  TransportMemberUnregisterPlanAction,
  "remove",
  "index"
>("remove", "index");

export const shouldRemoveTransportMemberUnregisterPlan =
  gateConcluded<TransportMemberUnregisterPlanAction>("remove");

/**
 * Transport-member unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterTransportMember` reads beside the step).
 * Plan nested via {@link stepTransportMemberUnregisterPlanWithActions}
 * (`remove`).
 */
type TransportMemberUnregisterGateEvent = Extract<
  TransportMemberUnregisterEvent,
  { readonly kind: "transport/member-unregister-gate" }
>;

const transportMemberUnregisterGate = defineGate<
  TransportMemberUnregisterGateEvent,
  TransportMemberUnregisterAction
>({
  event: "transport/member-unregister-gate",
  actions: ["remove"],
  decide: (event) => {
    const index = transportMemberUnregisterPlanIndex(
      decideGate(transportMemberUnregisterPlanGate, {
        kind: "transport/member-unregister-plan-gate",
        index: event.index,
      }),
    );
    return index === null ? [] : [{ kind: "remove", index }];
  },
});

export type TransportMemberUnregisterState = GateState;

export type TransportMemberUnregisterEvent =
  | Event
  | {
      readonly kind: "transport/member-unregister-gate";
      readonly index: number;
    };

export type TransportMemberUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export type TransportMemberUnregisterStepResult =
  GateStepResult<TransportMemberUnregisterAction>;

export const initialTransportMemberUnregisterState = initialGateState;

export const stepTransportMemberUnregisterWithActions = interpretGate(
  transportMemberUnregisterGate,
);

export const transportMemberUnregisterIndex = gatePayload<
  TransportMemberUnregisterAction,
  "remove",
  "index"
>("remove", "index");

export const shouldRemoveTransportMember =
  gateConcluded<TransportMemberUnregisterAction>("remove");

export type TransportIngressDispatchState = GateState;

export type TransportIngressDispatchStepResult =
  GateStepResult<TransportIngressDispatchAction>;

export const initialTransportIngressDispatchState = initialGateState;

export const stepTransportIngressDispatch: StepFn<TransportIngressDispatchState> =
  gateStepFn(transportIngressDispatchGate);

export const transportIngressDispatchFromActions = gateConclusion<
  TransportIngressDispatchAction,
  TransportIngressDispatch
>("announce", "link-request", "link-data", "plain-data", "proof", "ignore");

export const shouldDispatchTransportAnnounce =
  gateConcluded<TransportIngressDispatchAction>("announce");

export const shouldDispatchTransportLinkRequest =
  gateConcluded<TransportIngressDispatchAction>("link-request");

export const shouldDispatchTransportLinkData =
  gateConcluded<TransportIngressDispatchAction>("link-data");

export const shouldDispatchTransportPlainData =
  gateConcluded<TransportIngressDispatchAction>("plain-data");

/**
 * Link-data ingress target is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkDataIngressTargetPlanWithActions}
 * (`active`|`pending`|`none`).
 */
type LinkDataIngressTargetGateEvent = Extract<
  LinkDataIngressTargetEvent,
  { readonly kind: "transport/link-data-ingress-gate" }
>;

export const linkDataIngressTargetGate = defineGate<
  LinkDataIngressTargetGateEvent,
  LinkDataIngressTargetAction
>({
  event: "transport/link-data-ingress-gate",
  actions: ["active", "pending", "none"],
  decide: (event) => {
    const plan = linkDataIngressTargetPlanFromActions(
      decideGate(linkDataIngressTargetPlanGate, {
        ...event,
        kind: "transport/link-data-ingress-plan-gate",
      }),
    );
    return plan === null ? [] : [{ kind: plan }];
  },
});

export type LinkDataIngressTargetEvent =
  | Event
  | {
      readonly kind: "transport/link-data-ingress-gate";
      readonly activeIndex: number | null;
      readonly pendingIndex: number | null;
    };

export type LinkDataIngressTargetAction = {
  readonly kind: LinkDataIngressTarget;
};

export const stepLinkDataIngressTargetWithActions = interpretGate(
  linkDataIngressTargetGate,
);

/**
 * Reverse-relay outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepReverseRelayOutcomePlanWithActions}
 * (`relay`|`delete-expired`|`ignore`).
 */
type ReverseRelayOutcomeGateEvent = Extract<
  ReverseRelayOutcomeEvent,
  { readonly kind: "transport/reverse-relay-gate" }
>;

export const reverseRelayOutcomeGate = defineGate<
  ReverseRelayOutcomeGateEvent,
  ReverseRelayOutcomeAction
>({
  event: "transport/reverse-relay-gate",
  actions: ["relay", "delete-expired", "ignore"],
  decide: (event) => {
    const plan = reverseRelayOutcomePlanFromActions(
      decideGate(reverseRelayOutcomePlanGate, {
        ...event,
        kind: "transport/reverse-relay-plan-gate",
      }),
    );
    return plan === null ? [] : [{ kind: plan }];
  },
});

export type ReverseRelayOutcomeEvent =
  | Event
  | {
      readonly kind: "transport/reverse-relay-gate";
      readonly canRelay: boolean;
      readonly entryExpired: boolean;
      readonly ifaceIsOutbound: boolean;
    };

export type ReverseRelayOutcomeAction = {
  readonly kind: ReverseRelayOutcome;
};

export const stepReverseRelayOutcomeWithActions = interpretGate(
  reverseRelayOutcomeGate,
);
