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
import { planProofIngressKind } from "./part-3.js";
import type { ProofIngressKind, ProofIngressPlanAction, ProofIngressPlanEvent } from "./part-3.js";
/**
 * Proof ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planProofIngressKind` /
 * `plan ===` reads beside the step). Nested under {@link stepProofIngressWithActions}.
 */
type ProofIngressPlanGateEvent = Extract<
  ProofIngressPlanEvent,
  { readonly kind: "transport/proof-ingress-plan-gate" }
>;

const proofIngressPlanGate = defineGate<ProofIngressPlanGateEvent, ProofIngressPlanAction>({
  event: "transport/proof-ingress-plan-gate",
  actions: ["lrproof", "resource-prf", "receipt"],
  decide: (event) => [{ kind: planProofIngressKind(event.context) }]
});

export type ProofIngressPlanState = GateState;

export type ProofIngressPlanStepResult = GateStepResult<ProofIngressPlanAction>;

export const initialProofIngressPlanState = initialGateState;

export const stepProofIngressPlanWithActions = interpretGate(proofIngressPlanGate);

/** Extract the proof ingress plan from actions; null when empty. */
export const proofIngressPlanFromActions = gateConclusion<
  ProofIngressPlanAction,
  ProofIngressKind
>("lrproof", "resource-prf", "receipt");

export const shouldHandleProofLrproofPlan = gateConcluded<ProofIngressPlanAction>("lrproof");

export const shouldHandleProofResourcePrfPlan = gateConcluded<
  ProofIngressPlanAction
>("resource-prf");

export const shouldHandleProofReceiptPlan = gateConcluded<ProofIngressPlanAction>("receipt");

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
  if (!input.outgoing) {
    return false;
  }
  if (input.isExcludedInterface === true) {
    return false;
  }
  if (input.requireAttached === true && input.isAttached !== true) {
    return false;
  }
  return true;
}

/**
 * shouldTransmitOnInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTransmitOnInterface`
 * reads beside the step).
 */
type TransmitOnInterfaceGateEvent = Extract<
  TransmitOnInterfaceEvent,
  { readonly kind: "transport/transmit-on-interface-gate" }
>;

const transmitOnInterfaceGate = defineGate<
  TransmitOnInterfaceGateEvent,
  TransmitOnInterfaceAction
>({
  event: "transport/transmit-on-interface-gate",
  actions: ["transmit", "skip"],
  decide: (event) => [
    {
      kind: shouldTransmitOnInterface({
        outgoing: event.outgoing,
        ...(event.isExcludedInterface !== undefined
          ? { isExcludedInterface: event.isExcludedInterface }
          : {}),
        ...(event.requireAttached !== undefined
          ? { requireAttached: event.requireAttached }
          : {}),
        ...(event.isAttached !== undefined ? { isAttached: event.isAttached } : {})
      })
        ? "transmit"
        : "skip"
    }
  ]
});

export type TransmitOnInterfaceState = GateState;

export type TransmitOnInterfaceEvent =
  | Event
  | {
      readonly kind: "transport/transmit-on-interface-gate";
      readonly outgoing: boolean;
      readonly isExcludedInterface?: boolean;
      readonly requireAttached?: boolean;
      readonly isAttached?: boolean;
    };

export type TransmitOnInterfaceAction =
  | { readonly kind: "transmit" }
  | { readonly kind: "skip" };

export type TransmitOnInterfaceStepResult = GateStepResult<TransmitOnInterfaceAction>;

export const initialTransmitOnInterfaceState = initialGateState;

export const stepTransmitOnInterfaceWithActions = interpretGate(transmitOnInterfaceGate);

export const shouldTransmitOnInterfaceNow = gateConcluded<
  TransmitOnInterfaceAction
>("transmit");

export const shouldSkipTransmitOnInterface = gateConcluded<TransmitOnInterfaceAction>("skip");

/** Local IN destination match (announce / path-request answerer). */
export function shouldMatchLocalInboundDestination(input: {
  readonly hashMatches: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.hashMatches && input.directionIn;
}

/**
 * shouldMatchLocalInboundDestination gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldMatchLocalInboundDestination` reads beside the step).
 */
type MatchLocalInboundDestinationGateEvent = Extract<
  MatchLocalInboundDestinationEvent,
  { readonly kind: "transport/match-local-inbound-destination-gate" }
>;

const matchLocalInboundDestinationGate = defineBooleanGate<
  MatchLocalInboundDestinationGateEvent,
  "match",
  "mismatch"
>({
  event: "transport/match-local-inbound-destination-gate",
  whenTrue: "match",
  whenFalse: "mismatch",
  decide: (event) => shouldMatchLocalInboundDestination(event)
});

export type MatchLocalInboundDestinationState = GateState;

export type MatchLocalInboundDestinationEvent =
  | Event
  | {
      readonly kind: "transport/match-local-inbound-destination-gate";
      readonly hashMatches: boolean;
      readonly directionIn: boolean;
    };

export type MatchLocalInboundDestinationAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export type MatchLocalInboundDestinationStepResult = GateStepResult<
  MatchLocalInboundDestinationAction
>;

export const initialMatchLocalInboundDestinationState = initialGateState;

export const stepMatchLocalInboundDestinationWithActions = interpretGate(
  matchLocalInboundDestinationGate
);

export const shouldMatchLocalInboundDestinationNow = gateConcluded<
  MatchLocalInboundDestinationAction
>("match");

export const shouldMismatchLocalInboundDestination = gateConcluded<
  MatchLocalInboundDestinationAction
>("mismatch");

/** Local typed destination match (plain DATA delivery). */
export function shouldMatchLocalTypedDestination(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
}): boolean {
  return input.hashMatches && input.typeMatches;
}

/**
 * shouldMatchLocalTypedDestination gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldMatchLocalTypedDestination` reads beside the step).
 */
type MatchLocalTypedDestinationGateEvent = Extract<
  MatchLocalTypedDestinationEvent,
  { readonly kind: "transport/match-local-typed-destination-gate" }
>;

const matchLocalTypedDestinationGate = defineBooleanGate<
  MatchLocalTypedDestinationGateEvent,
  "match",
  "mismatch"
>({
  event: "transport/match-local-typed-destination-gate",
  whenTrue: "match",
  whenFalse: "mismatch",
  decide: (event) => shouldMatchLocalTypedDestination(event)
});

export type MatchLocalTypedDestinationState = GateState;

export type MatchLocalTypedDestinationEvent =
  | Event
  | {
      readonly kind: "transport/match-local-typed-destination-gate";
      readonly hashMatches: boolean;
      readonly typeMatches: boolean;
    };

export type MatchLocalTypedDestinationAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export type MatchLocalTypedDestinationStepResult = GateStepResult<
  MatchLocalTypedDestinationAction
>;

export const initialMatchLocalTypedDestinationState = initialGateState;

export const stepMatchLocalTypedDestinationWithActions = interpretGate(
  matchLocalTypedDestinationGate
);

export const shouldMatchLocalTypedDestinationNow = gateConcluded<
  MatchLocalTypedDestinationAction
>("match");

export const shouldMismatchLocalTypedDestination = gateConcluded<
  MatchLocalTypedDestinationAction
>("mismatch");

/** Local LINKREQUEST dispatch (typed destination + handler present). */
export function shouldDispatchLocalLinkRequest(input: {
  readonly hashMatches: boolean;
  readonly typeMatches: boolean;
  readonly handlerPresent: boolean;
}): boolean {
  return input.hashMatches && input.typeMatches && input.handlerPresent;
}

/**
 * shouldDispatchLocalLinkRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDispatchLocalLinkRequest` reads beside the step).
 */
type DispatchLocalLinkRequestGateEvent = Extract<
  DispatchLocalLinkRequestEvent,
  { readonly kind: "transport/dispatch-local-link-request-gate" }
>;

const dispatchLocalLinkRequestGate = defineBooleanGate<
  DispatchLocalLinkRequestGateEvent,
  "dispatch",
  "skip"
>({
  event: "transport/dispatch-local-link-request-gate",
  whenTrue: "dispatch",
  whenFalse: "skip",
  decide: (event) => shouldDispatchLocalLinkRequest(event)
});

export type DispatchLocalLinkRequestState = GateState;

export type DispatchLocalLinkRequestEvent =
  | Event
  | {
      readonly kind: "transport/dispatch-local-link-request-gate";
      readonly hashMatches: boolean;
      readonly typeMatches: boolean;
      readonly handlerPresent: boolean;
    };

export type DispatchLocalLinkRequestAction =
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

export type DispatchLocalLinkRequestStepResult = GateStepResult<DispatchLocalLinkRequestAction>;

export const initialDispatchLocalLinkRequestState = initialGateState;

export const stepDispatchLocalLinkRequestWithActions = interpretGate(
  dispatchLocalLinkRequestGate
);

export const shouldDispatchLocalLinkRequestNow = gateConcluded<
  DispatchLocalLinkRequestAction
>("dispatch");

export const shouldSkipDispatchLocalLinkRequest = gateConcluded<
  DispatchLocalLinkRequestAction
>("skip");

/**
 * After `planProofIngressKind === "lrproof"`: whether this pending link may validate.
 * `linkIdMatches` and hopsMatch stay as adapter-supplied booleans.
 */
export function shouldAcceptLinkLrProofCandidate(input: {
  readonly linkIdMatches: boolean;
  readonly hopsMatch: boolean;
}): boolean {
  return input.linkIdMatches && input.hopsMatch;
}

/**
 * shouldAcceptLinkLrProofCandidate gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptLinkLrProofCandidate` reads beside the step).
 */
type AcceptLinkLrProofCandidateGateEvent = Extract<
  AcceptLinkLrProofCandidateEvent,
  { readonly kind: "transport/accept-link-lr-proof-candidate-gate" }
>;

const acceptLinkLrProofCandidateGate = defineBooleanGate<
  AcceptLinkLrProofCandidateGateEvent,
  "accept",
  "reject"
>({
  event: "transport/accept-link-lr-proof-candidate-gate",
  whenTrue: "accept",
  whenFalse: "reject",
  decide: (event) => shouldAcceptLinkLrProofCandidate(event)
});

export type AcceptLinkLrProofCandidateState = GateState;

export type AcceptLinkLrProofCandidateEvent =
  | Event
  | {
      readonly kind: "transport/accept-link-lr-proof-candidate-gate";
      readonly linkIdMatches: boolean;
      readonly hopsMatch: boolean;
    };

export type AcceptLinkLrProofCandidateAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export type AcceptLinkLrProofCandidateStepResult = GateStepResult<
  AcceptLinkLrProofCandidateAction
>;

export const initialAcceptLinkLrProofCandidateState = initialGateState;

export const stepAcceptLinkLrProofCandidateWithActions = interpretGate(
  acceptLinkLrProofCandidateGate
);

export const shouldAcceptLinkLrProofCandidateNow = gateConcluded<
  AcceptLinkLrProofCandidateAction
>("accept");

export const shouldRejectLinkLrProofCandidate = gateConcluded<
  AcceptLinkLrProofCandidateAction
>("reject");

export type LocalPlainDataDeliveryPlan = "ignore" | "dispatch";

/**
 * Local plain DATA after path-request gate: destination present + decrypt present.
 * Proof emission stays via {@link planDestinationProof} at the adapter.
 */
export function planLocalPlainDataDelivery(input: {
  readonly destinationPresent: boolean;
  readonly plaintextPresent: boolean;
}): LocalPlainDataDeliveryPlan {
  if (!input.destinationPresent || !input.plaintextPresent) {
    return "ignore";
  }
  return "dispatch";
}

/**
 * Proof ingress kind is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepProofIngressPlanWithActions}
 * (`lrproof`|`resource-prf`|`receipt`).
 */
type ProofIngressGateEvent = Extract<
  ProofIngressEvent,
  { readonly kind: "transport/proof-ingress-gate" }
>;

export const proofIngressGate = defineGate<ProofIngressGateEvent, ProofIngressAction>({
  event: "transport/proof-ingress-gate",
  actions: ["lrproof", "resource-prf", "receipt"],
  decide: (event) => {
    const plan = proofIngressPlanFromActions(
      decideGate(proofIngressPlanGate, {
        ...event,
        kind: "transport/proof-ingress-plan-gate"
      })
    );
    return plan === null ? [] : [{ kind: plan }];
  }
});

export type ProofIngressEvent =
  | Event
  | {
      readonly kind: "transport/proof-ingress-gate";
      readonly context: number;
    };

export type ProofIngressAction = {
  readonly kind: ProofIngressKind;
};

export const stepProofIngressWithActions = interpretGate(proofIngressGate);
