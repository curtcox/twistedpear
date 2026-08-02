import { DestinationProofStrategyCode,PATHFINDER_EXPIRY_SECONDS,PATHFINDER_MAX_HOPS,PATH_AWAIT_TIMER_ID,PATH_REQUEST_TIMEOUT_SECONDS,PATH_RESPONSE_GRACE_TIMER_ID,initialPathAwaitState,initialPathResponseGraceState,stepPathAwaitWithActions,stepPathResponseGraceWithActions,announceEmittedFromRandomBlob as protocolAnnounceEmittedFromRandomBlob,appendPathRandomBlobFieldsFromActions,aspectFilterFromActions,initialEmitDestinationProofState,initialParseAspectFilterState,shouldEmitDestinationProofNow,shouldRejectParseAspectFilter,shouldUseAppendPathRandomBlob,shouldUseParseAspectFilter,shouldUsePathExpiry,stepAppendPathRandomBlobWithActions,stepComputePathExpiryWithActions,stepParseAspectFilterWithActions,clonePacketWithHopsFieldsFromActions,initialClonePacketWithHopsState,initialComputePathExpiryState,initialPathResponseAnnounceFieldsState,initialTransportAnnounceFieldsState,pathExpiryFromActions,pathResponseAnnounceFieldsFromActions,shouldUseClonePacketWithHops,shouldUsePathResponseAnnounceFields,shouldUseTransportAnnounceFields,stepClonePacketWithHopsWithActions,stepPathResponseAnnounceFieldsWithActions,stepTransportAnnounceFieldsWithActions,transportAnnounceFieldsFromActions,initialAcceptCachedPathResponsePacketState,initialAnswerLocalPathRequestState,initialAnswerPathRequestState,initialAnswerPathWithEntryState,initialRememberPathRequestTagState,initialUsePathForOutboundState,shouldAcceptCachedPathResponsePacketNow,shouldAnswerLocalPathRequestNow,shouldAnswerPathRequestNow,shouldAnswerPathWithEntryNow,shouldRememberPathRequestTagNow,shouldUsePathForOutboundNow,
  stepAcceptCachedPathResponsePacketWithActions,stepAnswerLocalPathRequestWithActions,stepAnswerPathRequestWithActions,stepAnswerPathWithEntryWithActions,stepRememberPathRequestTagWithActions,stepUsePathForOutboundWithActions,activeLinkUnregisterRemoveIndex,initialAcceptParsedAnnounceState,initialAppendPathRandomBlobState,initialDestinationProofState,initialDispatchAnnounceHandlersState,initialIgnoreLocalAnnounceState,initialLinkActivateMembershipState,initialLinkDataIngressTargetState,initialLinkRegisterListState,initialLinkUnregisterMembershipState,initialLocalPlainDataDeliveryState,initialDispatchLocalPlainDataDeliveryState,initialMatchAnnounceAspectState,initialOutboundReceiptState,initialPacketFilterState,initialPacketReceiptProofIngressState,initialPacketReceiptUnregisterState,initialPathEntryLookupState,initialPathOutboundState,initialPathRequestIngressState,initialProofIngressState,initialReceiveAnnouncePathResponseState,initialTransportIngressDispatchState,initialTransportMemberUnregisterState,packetReceiptUnregisterIndex,pendingLinkMembershipRemoveIndex,pendingLinkUnregisterRemoveIndex,shouldAcceptLinkLrProofCandidateNow,shouldAcceptParsedAnnounceNow,shouldAnswerPathRequestLocal,shouldAnswerPathRequestPath,shouldAppendActiveLinkMembershipActions,shouldDirectPathOutbound,shouldDispatchLocalLinkRequestNow,shouldDispatchLocalPlainDataDeliveryActions,shouldDispatchLocalPlainDataDeliveryNow,shouldDispatchResourceProofToLinkNow,shouldDispatchTransportAnnounce,shouldDispatchTransportLinkData,shouldDispatchTransportLinkRequest,shouldDispatchTransportPlainData,
  shouldDispatchTransportProof,shouldHandleProofLrproof,shouldHandleProofReceipt,shouldHandleProofResourcePrf,shouldIgnoreTransportIngressDispatch,shouldIngressLinkDataActive,shouldIngressLinkDataPending,shouldExpirePathEntryLookup,shouldFailAndDropOutboundReceiptNow,shouldHitPathEntryLookup,shouldIgnoreLocalAnnounceNow,shouldIgnorePathRequestSeenTag,shouldIgnorePathRequestUnparsed,shouldKeepOutboundReceiptNow,shouldDispatchAnnounceHandlersNow,shouldMatchAnnounceAspectNow,shouldMissPathEntryLookup,shouldWrapPathOutbound,shouldMatchLocalInboundDestinationNow,shouldMatchLocalTypedDestinationNow,shouldOutboundFailAndDropReceipt,shouldOutboundKeepReceipt,shouldReceiveAnnouncePathResponseNow,shouldRegisterLinkActive,shouldRegisterLinkMemberNow,shouldRegisterLinkPending,shouldRegisterPacketReceiptNow,shouldRegisterTransportMemberNow,shouldRemoveActiveLinkUnregisterActions,shouldRemovePacketReceiptProofIngress,shouldRemovePendingLinkMembershipActions,shouldRemovePendingLinkUnregisterActions,shouldTransmitOnInterfaceNow,shouldRemovePacketReceipt,shouldRemoveTransportMember,shouldProveDestination,shouldAcceptPacketFilter,shouldUseMatchingLinkIdIndex,matchingLinkIdIndexFromActions,initialAcceptLinkLrProofCandidateState,initialAddPathEntryState,initialDispatchLocalLinkRequestState,initialDispatchResourceProofToLinkState,initialEmitPathRequestState,initialFailAndDropOutboundReceiptState,initialIndexOfMatchingLinkIdState,initialKeepOutboundReceiptState,initialLocalPathRequestPacketState,initialMatchLocalInboundDestinationState,initialMatchLocalTypedDestinationState,
  initialPathEntryExpiredState,initialRegisterLinkMemberState,initialRegisterPacketReceiptState,initialRegisterTransportMemberState,initialRelayTransportPacketState,initialRewritePacketHopsState,initialStripTransportHeadersState,initialTransmitOnInterfaceState,initialWrapTransportPacketState,shouldAddPathEntryNow,shouldEmitPathRequestNow,shouldTreatLocalPathRequestPacket,shouldTreatPathEntryExpired,isReverseEntryExpired,stepDestinationProofWithActions,stepEmitDestinationProofWithActions,stepAcceptLinkLrProofCandidateWithActions,stepAcceptParsedAnnounceWithActions,stepAddPathEntryWithActions,stepDispatchAnnounceHandlersWithActions,stepDispatchLocalLinkRequestWithActions,stepDispatchLocalPlainDataDeliveryWithActions,stepDispatchResourceProofToLinkWithActions,stepEmitPathRequestWithActions,stepIgnoreLocalAnnounceWithActions,stepIndexOfMatchingLinkIdWithActions,stepLinkActivateMembershipWithActions,stepLinkDataIngressTargetWithActions,stepLinkRegisterListWithActions,stepLinkUnregisterMembershipWithActions,stepLocalPathRequestPacketWithActions,stepLocalPlainDataDeliveryWithActions,stepMatchAnnounceAspectWithActions,stepMatchLocalInboundDestinationWithActions,stepMatchLocalTypedDestinationWithActions,stepFailAndDropOutboundReceiptWithActions,stepKeepOutboundReceiptWithActions,stepOutboundReceiptWithActions,stepPacketFilterWithActions,stepPacketReceiptProofIngressWithActions,stepPacketReceiptUnregisterWithActions,stepPathEntryExpiredWithActions,stepPathEntryLookupWithActions,stepPathOutboundWithActions,stepPathRequestIngressWithActions,stepProofIngressWithActions,
  stepReceiveAnnouncePathResponseWithActions,stepRegisterLinkMemberWithActions,stepRegisterPacketReceiptWithActions,stepRegisterTransportMemberWithActions,stepRelayTransportPacketWithActions,stepRewritePacketHopsWithActions,stepStripTransportHeadersWithActions,stepTransmitOnInterfaceWithActions,stepTransportIngressDispatchWithActions,stepTransportMemberUnregisterWithActions,stepWrapTransportPacketWithActions,transportMemberUnregisterIndex,relayTransportPacketRawFromActions,rewritePacketHopsRawFromActions,shouldUseRelayTransportPacket,shouldUseRewritePacketHops,shouldUseStripTransportHeaders,shouldUseWrapTransportPacket,stripTransportHeadersRawFromActions,timebaseFromRandomBlobs as protocolTimebaseFromRandomBlobs,wrapTransportPacketRawFromActions,type PacketHeaderFields } from "@twistedpear/protocol";
import type { CryptoProvider } from "../../crypto/provider.js";
import { Announce,type ParsedAnnounce } from "../../announce.js";
import { bytesToHex,equalBytes } from "../../crypto/bytes.js";
import { Destination,DestinationDirection,DestinationType,type DestinationTypeValue,type DestinationDirectionValue } from "../../destination.js";
import { Identity,TRUNCATED_HASH_LENGTH } from "../../identity.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import type { Link } from "../../link.js";
import { PacketReceipt } from "../../packet-receipt.js";
import { Packet,PacketContext,PacketHeaderType,PacketType,TransportType,type PacketFields } from "../../packet.js";
import type { Clock,Entropy,Timer } from "../../runtime/runtime.js";
import { BandwidthLimiter,type ByteRateLimiter } from "../bandwidth.js";
import { buildPathRequestData,parsePathRequestData,pathRequestDestinationHash,pathRequestTagKey } from "../path.js";
import type { LeafTransport } from "../node.js";
export { PATHFINDER_EXPIRY_SECONDS, PATHFINDER_MAX_HOPS };
export const TRUNCATED_HASH_BYTES = TRUNCATED_HASH_LENGTH / 8;

export interface PathEntry {
  readonly timestamp: number;
  readonly nextHop: Uint8Array;
  readonly hops: number;
  readonly expires: number;
  readonly randomBlobs: ReadonlyArray<Uint8Array>;
  readonly receivedInterface: PacketInterface;
  readonly packetHash: Uint8Array;
  readonly announceRaw: Uint8Array;
}

export interface ReceivedAnnounceInfo {
  readonly destinationHash: Uint8Array;
  readonly announcedIdentity: Identity;
  readonly appData: Uint8Array | null;
  readonly announce: ParsedAnnounce;
  readonly packet: Packet;
}

export interface AnnounceHandler {
  readonly aspectFilter?: string | null;
  readonly receivePathResponses?: boolean;
  receivedAnnounce(info: ReceivedAnnounceInfo): void;
}

export const DestinationProofStrategy = DestinationProofStrategyCode;

export type DestinationProofStrategyValue =
  (typeof DestinationProofStrategy)[keyof typeof DestinationProofStrategy];

export interface LocalDestination {
  readonly hash: Uint8Array;
  readonly type: DestinationTypeValue;
  readonly direction: DestinationDirectionValue;
  readonly identity: Identity | null;
  readonly proofStrategy: DestinationProofStrategyValue;
  decrypt(ciphertext: Uint8Array): Uint8Array | null;
  dispatchPacket(data: Uint8Array, packet: Packet): void;
  shouldProve(packet: Packet): boolean;
  handleLinkRequest?(packet: Packet, iface: PacketInterface): void;
  answerPathRequest?(iface: PacketInterface): Promise<void>;
}

export interface LeafTransportOptions {
  readonly provider: CryptoProvider;
  readonly transportIdentity: Identity;
  readonly clock: Clock;
  readonly entropy: Entropy;
  readonly useImplicitProof?: boolean;
  readonly transportEnabled?: boolean;
  /** Hard aggregate byte rate applied independently to ingress and egress. */
  readonly bandwidthBytesPerSecond?: number;
  readonly inboundBandwidthLimiter?: ByteRateLimiter;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
}

export function hashKey(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

export function cloneWithHops(provider: CryptoProvider, packet: Packet, hops: number): Packet {
  const stepped = stepClonePacketWithHopsWithActions(initialClonePacketWithHopsState(), {
    kind: "transport/clone-packet-with-hops-gate",
    source: packetHeaderFields(packet),
    hops
  });
  const fields =
    shouldUseClonePacketWithHops(stepped.actions)
      ? clonePacketWithHopsFieldsFromActions(stepped.actions)
      : null;
  if (fields === null) {
    throw new Error("cloneWithHops: missing use-fields action");
  }
  return Packet.fromFields(provider, fields as PacketFields);
}

export function announceEmittedFromRandomBlob(randomBlob: Uint8Array): number {
  return protocolAnnounceEmittedFromRandomBlob(randomBlob);
}

export function timebaseFromRandomBlobs(randomBlobs: ReadonlyArray<Uint8Array>): number {
  return protocolTimebaseFromRandomBlobs(randomBlobs);
}

export function wrapTransportPacket(packet: Packet, nextHop: Uint8Array): Uint8Array {
  const stepped = stepWrapTransportPacketWithActions(initialWrapTransportPacketState(), {
    kind: "transport/wrap-packet-gate",
    packedFlags: packet.packedFlags(),
    hops: packet.hops,
    raw: packet.raw,
    nextHop
  });
  const raw =
    shouldUseWrapTransportPacket(stepped.actions)
      ? wrapTransportPacketRawFromActions(stepped.actions)
      : null;
  if (raw === null) {
    throw new Error("wrapTransportPacket: missing use-raw action");
  }
  return raw;
}

export function stripTransportHeaders(raw: Uint8Array): Uint8Array {
  const stepped = stepStripTransportHeadersWithActions(initialStripTransportHeadersState(), {
    kind: "transport/strip-headers-gate",
    raw
  });
  const stripped =
    shouldUseStripTransportHeaders(stepped.actions)
      ? stripTransportHeadersRawFromActions(stepped.actions)
      : null;
  if (stripped === null) {
    throw new Error("stripTransportHeaders: missing use-raw action");
  }
  return stripped;
}

export function relayTransportPacket(
  packet: Packet,
  remainingHops: number,
  nextHop: Uint8Array
): Uint8Array {
  const stepped = stepRelayTransportPacketWithActions(initialRelayTransportPacketState(), {
    kind: "transport/relay-packet-bytes-gate",
    raw: packet.raw,
    hops: packet.hops,
    remainingHops,
    nextHop
  });
  const raw =
    shouldUseRelayTransportPacket(stepped.actions)
      ? relayTransportPacketRawFromActions(stepped.actions)
      : null;
  if (raw === null) {
    throw new Error("relayTransportPacket: missing use-raw action");
  }
  return raw;
}

export function rewritePacketHops(raw: Uint8Array, hops: number): Uint8Array {
  const stepped = stepRewritePacketHopsWithActions(initialRewritePacketHopsState(), {
    kind: "transport/rewrite-packet-hops-gate",
    raw,
    hops
  });
  const rewritten =
    shouldUseRewritePacketHops(stepped.actions)
      ? rewritePacketHopsRawFromActions(stepped.actions)
      : null;
  if (rewritten === null) {
    throw new Error("rewritePacketHops: missing use-raw action");
  }
  return rewritten;
}

export function buildTransportAnnounce(
  provider: CryptoProvider,
  source: Packet,
  transportIdentity: Identity,
  hops: number
): Packet {
  const announceSource = {
    contextFlag: source.contextFlag,
    destinationType: source.destinationType,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data
  };
  const stepped = stepTransportAnnounceFieldsWithActions(initialTransportAnnounceFieldsState(), {
    kind: "transport/announce-fields-gate",
    source: announceSource,
    transportId: transportIdentity.hash,
    hops
  });
  const fields =
    shouldUseTransportAnnounceFields(stepped.actions)
      ? transportAnnounceFieldsFromActions(stepped.actions)
      : null;
  if (fields === null) {
    throw new Error("buildTransportAnnounce: missing use-fields action");
  }
  return Packet.fromFields(provider, fields as PacketFields);
}

export function buildPathResponseAnnounce(
  provider: CryptoProvider,
  source: Packet,
  transportIdentity: Identity,
  hops: number
): Packet {
  const announceSource = {
    contextFlag: source.contextFlag,
    destinationType: source.destinationType,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data
  };
  const stepped = stepPathResponseAnnounceFieldsWithActions(
    initialPathResponseAnnounceFieldsState(),
    {
      kind: "transport/path-response-announce-fields-gate",
      source: announceSource,
      transportId: transportIdentity.hash,
      hops
    }
  );
  const fields =
    shouldUsePathResponseAnnounceFields(stepped.actions)
      ? pathResponseAnnounceFieldsFromActions(stepped.actions)
      : null;
  if (fields === null) {
    throw new Error("buildPathResponseAnnounce: missing use-fields action");
  }
  return Packet.fromFields(provider, fields as PacketFields);
}

export function packetHeaderFields(packet: Packet): PacketHeaderFields {
  return {
    headerType: packet.headerType,
    contextFlag: packet.contextFlag,
    transportType: packet.transportType,
    destinationType: packet.destinationType,
    packetType: packet.packetType,
    hops: packet.hops,
    transportId: packet.transportId,
    destinationHash: packet.destinationHash,
    context: packet.context,
    data: packet.data
  };
}
