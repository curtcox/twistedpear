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
  type GateStepResult,
} from "@twistedpear/effects";
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  PACKET_DEST_TYPE_LINK,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF,
} from "../packet-header.js";
import { PacketContextCode } from "../packet-context.js";
import { equalByteArrays } from "../path-table.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { proofIngressGate } from "./part-4.js";
import {
  localPlainDataDeliveryGate,
  packetHashRememberGate,
} from "./part-5.js";
import {
  linkDataIngressTargetGate,
  reverseRelayOutcomeGate,
} from "./part-6.js";
import type { ReverseRelayOutcome } from "./part-2.js";
import type {
  ProofIngressKind,
  TransportIngressDispatchAction,
} from "./part-3.js";
import type {
  LocalPlainDataDeliveryPlan,
  ProofIngressAction,
} from "./part-4.js";
import type {
  LinkDataIngressTarget,
  LocalPlainDataDeliveryAction,
  PacketHashRememberAction,
  PacketHashRememberPlan,
} from "./part-5.js";
import type {
  LinkDataIngressTargetAction,
  ReverseRelayOutcomeAction,
} from "./part-6.js";
export const shouldDispatchTransportProof =
  gateConcluded<TransportIngressDispatchAction>("proof");

export const shouldIgnoreTransportIngressDispatch =
  gateConcluded<TransportIngressDispatchAction>("ignore");

export type LinkDataIngressTargetState = GateState;

export type LinkDataIngressTargetStepResult =
  GateStepResult<LinkDataIngressTargetAction>;

export const initialLinkDataIngressTargetState = initialGateState;

export const stepLinkDataIngressTarget: StepFn<LinkDataIngressTargetState> =
  gateStepFn(linkDataIngressTargetGate);

export const linkDataIngressTargetFromActions = gateConclusion<
  LinkDataIngressTargetAction,
  LinkDataIngressTarget
>("active", "pending", "none");

export const shouldIngressLinkDataActive =
  gateConcluded<LinkDataIngressTargetAction>("active");

export const shouldIngressLinkDataPending =
  gateConcluded<LinkDataIngressTargetAction>("pending");

export const shouldIngressLinkDataNone =
  gateConcluded<LinkDataIngressTargetAction>("none");

export type ReverseRelayOutcomeState = GateState;

export type ReverseRelayOutcomeStepResult =
  GateStepResult<ReverseRelayOutcomeAction>;

export const initialReverseRelayOutcomeState = initialGateState;

export const stepReverseRelayOutcome: StepFn<ReverseRelayOutcomeState> =
  gateStepFn(reverseRelayOutcomeGate);

export const reverseRelayOutcomeFromActions = gateConclusion<
  ReverseRelayOutcomeAction,
  ReverseRelayOutcome
>("relay", "delete-expired", "ignore");

export const shouldRelayReversePacketActions =
  gateConcluded<ReverseRelayOutcomeAction>("relay");

export const shouldDeleteExpiredReverseEntryActions =
  gateConcluded<ReverseRelayOutcomeAction>("delete-expired");

export const shouldIgnoreReverseRelayOutcome =
  gateConcluded<ReverseRelayOutcomeAction>("ignore");

export type PacketHashRememberState = GateState;

export type PacketHashRememberStepResult =
  GateStepResult<PacketHashRememberAction>;

export const initialPacketHashRememberState = initialGateState;

export const stepPacketHashRemember: StepFn<PacketHashRememberState> =
  gateStepFn(packetHashRememberGate);

export const packetHashRememberFromActions = gateConclusion<
  PacketHashRememberAction,
  PacketHashRememberPlan
>("now", "after-relay");

export const shouldRememberPacketHashNowActions =
  gateConcluded<PacketHashRememberAction>("now");

export const shouldRememberPacketHashAfterRelayActions =
  gateConcluded<PacketHashRememberAction>("after-relay");

export type LocalPlainDataDeliveryState = GateState;

export type LocalPlainDataDeliveryStepResult =
  GateStepResult<LocalPlainDataDeliveryAction>;

export const initialLocalPlainDataDeliveryState = initialGateState;

export const stepLocalPlainDataDelivery: StepFn<LocalPlainDataDeliveryState> =
  gateStepFn(localPlainDataDeliveryGate);

export const localPlainDataDeliveryFromActions = gateConclusion<
  LocalPlainDataDeliveryAction,
  LocalPlainDataDeliveryPlan
>("dispatch", "ignore");

export const shouldDispatchLocalPlainDataDeliveryActions =
  gateConcluded<LocalPlainDataDeliveryAction>("dispatch");

export const shouldIgnoreLocalPlainDataDelivery =
  gateConcluded<LocalPlainDataDeliveryAction>("ignore");

export type ProofIngressState = GateState;

export type ProofIngressStepResult = GateStepResult<ProofIngressAction>;

export const initialProofIngressState = initialGateState;

export const stepProofIngress: StepFn<ProofIngressState> =
  gateStepFn(proofIngressGate);

export const proofIngressKindFromActions = gateConclusion<
  ProofIngressAction,
  ProofIngressKind
>("lrproof", "resource-prf", "receipt");

export const shouldHandleProofLrproof =
  gateConcluded<ProofIngressAction>("lrproof");

export const shouldHandleProofResourcePrf =
  gateConcluded<ProofIngressAction>("resource-prf");

export const shouldHandleProofReceipt =
  gateConcluded<ProofIngressAction>("receipt");
