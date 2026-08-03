// @ts-nocheck
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
import { DestinationProofStrategy, TRUNCATED_HASH_BYTES, announceEmittedFromRandomBlob, buildPathResponseAnnounce, buildTransportAnnounce, cloneWithHops, hashKey, packetHeaderFields, relayTransportPacket, rewritePacketHops, stripTransportHeaders, timebaseFromRandomBlobs, wrapTransportPacket } from "./shared.js";
import type { AnnounceHandler, DestinationProofStrategyValue, LeafTransportOptions, LocalDestination, PathEntry, ReceivedAnnounceInfo } from "./shared.js";
import { LeafTransport } from "../node.js";
export class LeafTransportLayer1 {
protected readonly pathTable = new Map<string, PathEntry>();
  protected readonly packetHashes = new Set<string>();
  protected readonly receipts: PacketReceipt[] = [];
  protected readonly destinations: LocalDestination[] = [];
  protected readonly announceHandlers: AnnounceHandler[] = [];
  protected readonly interfaces: PacketInterface[] = [];
  protected readonly interfaceTasks = new Map<PacketInterface, Promise<void>>();
  protected readonly pendingLinks: Link[] = [];
  protected readonly activeLinks: Link[] = [];
  protected readonly useImplicitProof: boolean;
  protected readonly transportEnabled: boolean;
  protected readonly pathRequestHash: Uint8Array;
  protected readonly pathRequests = new Map<string, number>();
  protected readonly discoveryPrTags = new Set<string>();
  protected bytesIn = 0;
  protected bytesOut = 0;
  protected readonly inboundBandwidth: ByteRateLimiter | null;
  protected readonly outboundBandwidth: ByteRateLimiter | null;

  constructor(protected readonly options: LeafTransportOptions) {
    this.useImplicitProof = options.useImplicitProof ?? true;
    this.transportEnabled = options.transportEnabled ?? false;
    this.pathRequestHash = pathRequestDestinationHash(options.provider);
    this.inboundBandwidth = options.inboundBandwidthLimiter ?? (
      options.bandwidthBytesPerSecond === undefined
        ? null
        : new BandwidthLimiter(options.clock, options.bandwidthBytesPerSecond)
    );
    this.outboundBandwidth = options.outboundBandwidthLimiter ?? (
      options.bandwidthBytesPerSecond === undefined
        ? null
        : new BandwidthLimiter(options.clock, options.bandwidthBytesPerSecond)
    );
  }

  get clock(): Clock {
    return this.options.clock;
  }

  get entropy(): Entropy {
    return this.options.entropy;
  }

  get transportIdentity(): Identity {
    return this.options.transportIdentity;
  }

  get provider(): CryptoProvider {
    return this.options.provider;
  }

  getPathEntry(destinationHash: Uint8Array): PathEntry | undefined {
    const key = hashKey(destinationHash);
    const entry = this.pathTable.get(key);
    const stepped = stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
      kind: "path/entry-lookup-gate",
      entryPresent: entry !== undefined,
      expired:
        entry !== undefined &&
        shouldTreatPathEntryExpired(
          stepPathEntryExpiredWithActions(initialPathEntryExpiredState(), {
            kind: "path/entry-expired-gate",
            expires: entry.expires,
            nowSeconds: this.clock.now() / 1000
          }).actions
        )
    });
    if (shouldMissPathEntryLookup(stepped.actions)) {
      return undefined;
    }
    if (shouldExpirePathEntryLookup(stepped.actions)) {
      this.pathTable.delete(key);
      return undefined;
    }
    if (!shouldHitPathEntryLookup(stepped.actions)) {
      return undefined;
    }
    return entry;
  }

  async transmit(iface: PacketInterface, raw: Uint8Array): Promise<void> {
    const packet = Packet.decode(this.options.provider, raw);
    if (packet === null) {
      throw new Error("Cannot transmit invalid packet bytes");
    }

    await this.outboundBandwidth?.consume(raw.length);
    this.bytesOut += raw.length;
    await iface.send(packet);
  }

  protected async inbound(packet: Packet, iface: PacketInterface): Promise<void> {
    const workingPacket = cloneWithHops(this.options.provider, packet, packet.hops + 1);

    if (!this.packetFilter(workingPacket)) {
      return;
    }

    this.packetHashes.add(hashKey(workingPacket.hash()));

    const dispatchStepped = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: workingPacket.packetType,
        destinationType: workingPacket.destinationType
      }
    );
    if (shouldDispatchTransportAnnounce(dispatchStepped.actions)) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkRequest(dispatchStepped.actions)) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkData(dispatchStepped.actions)) {
      await this.handleLinkData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportPlainData(dispatchStepped.actions)) {
      await this.handleData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportProof(dispatchStepped.actions)) {
      await this.handleProof(workingPacket, iface);
      return;
    }
    if (shouldIgnoreTransportIngressDispatch(dispatchStepped.actions)) {
      return;
    }
  }

  protected async handleLinkRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    for (const destination of this.destinations) {
      const stepped = stepDispatchLocalLinkRequestWithActions(
        initialDispatchLocalLinkRequestState(),
        {
          kind: "transport/dispatch-local-link-request-gate",
          hashMatches: equalBytes(destination.hash, packet.destinationHash),
          typeMatches: destination.type === packet.destinationType,
          handlerPresent: destination.handleLinkRequest !== undefined
        }
      );
      if (shouldDispatchLocalLinkRequestNow(stepped.actions)) {
        destination.handleLinkRequest!(packet, iface);
        return;
      }
    }
  }

  protected async handleLinkData(packet: Packet, iface: PacketInterface): Promise<void> {
    /** Adapt matching-link-id indexes via protocol actions (no ad-hoc
     * `indexOfMatchingLinkId` reads). */
    const activeIndex = this.indexOfMatchingLink(this.activeLinks, packet.destinationHash);
    const pendingIndex = this.indexOfMatchingLink(this.pendingLinks, packet.destinationHash);
    const stepped = stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
      kind: "transport/link-data-ingress-gate",
      activeIndex,
      pendingIndex
    });
    if (shouldIngressLinkDataActive(stepped.actions)) {
      await this.activeLinks[activeIndex!]!.receive(packet, iface);
      return;
    }
    if (shouldIngressLinkDataPending(stepped.actions)) {
      await this.pendingLinks[pendingIndex!]!.receive(packet, iface);
      return;
    }
  }

  protected async handleAnnounce(packet: Packet, iface: PacketInterface): Promise<void> {
    if (!Announce.validate(this.options.provider, packet)) {
      return;
    }

    const parsed = Announce.parse(packet);
    /** Adapt parsed-announce accept via protocol actions (no ad-hoc
     * `shouldAcceptParsedAnnounce` reads). */
    const acceptStepped = stepAcceptParsedAnnounceWithActions(
      initialAcceptParsedAnnounceState(),
      {
        kind: "announce/accept-parsed-gate",
        parsedPresent: parsed !== null
      }
    );
    if (!shouldAcceptParsedAnnounceNow(acceptStepped.actions)) {
      return;
    }
    const announce = parsed!;

    const localDestination = this.destinations.find((entry) =>
      shouldMatchLocalInboundDestinationNow(
        stepMatchLocalInboundDestinationWithActions(
          initialMatchLocalInboundDestinationState(),
          {
            kind: "transport/match-local-inbound-destination-gate",
            hashMatches: equalBytes(entry.hash, packet.destinationHash),
            directionIn: entry.direction === DestinationDirection.IN
          }
        ).actions
      )
    );
    if (
      shouldIgnoreLocalAnnounceNow(
        stepIgnoreLocalAnnounceWithActions(initialIgnoreLocalAnnounceState(), {
          kind: "announce/ignore-local-gate",
          hasLocalInboundDestination: localDestination !== undefined
        }).actions
      )
    ) {
      return;
    }

    const receivedFrom = packet.transportId ?? packet.destinationHash;
    const randomBlob = announce.randomHash;
    const existing = this.pathTable.get(hashKey(packet.destinationHash));
    const now = this.clock.now() / 1000;
    const shouldAdd = shouldAddPathEntryNow(
      stepAddPathEntryWithActions(initialAddPathEntryState(), {
        kind: "path/add-entry-gate",
        hops: packet.hops,
        randomBlob,
        nowSeconds: now,
        existing:
          existing === undefined
            ? null
            : {
                hops: existing.hops,
                expires: existing.expires,
                randomBlobs: existing.randomBlobs
              }
      }).actions
    );

    if (!shouldAdd) {
      return;
    }

    const blobStepped = stepAppendPathRandomBlobWithActions(
      initialAppendPathRandomBlobState(),
      {
        kind: "path/append-random-blob-gate",
        randomBlobs: existing?.randomBlobs ?? [],
        randomBlob
      }
    );
    const randomBlobs = shouldUseAppendPathRandomBlob(blobStepped.actions)
      ? appendPathRandomBlobFieldsFromActions(blobStepped.actions)
      : null;
    if (randomBlobs === null) {
      return;
    }

    const expiryStepped = stepComputePathExpiryWithActions(initialComputePathExpiryState(), {
      kind: "path/expiry-gate",
      nowSeconds: now
    });
    const expires = shouldUsePathExpiry(expiryStepped.actions)
      ? pathExpiryFromActions(expiryStepped.actions)
      : null;
    if (expires === null) {
      return;
    }

    const entry: PathEntry = {
      timestamp: now,
      nextHop: Uint8Array.from(receivedFrom),
      hops: packet.hops,
      expires,
      randomBlobs,
      receivedInterface: iface,
      packetHash: packet.hash(),
      announceRaw: Uint8Array.from(packet.raw)
    };
    this.pathTable.set(hashKey(packet.destinationHash), entry);

    Identity.rememberDestination(
      packet.destinationHash,
      receivedFrom,
      announce.publicKey,
      announce.appData,
      now
    );

    const announcedIdentity = Identity.recall(this.options.provider, packet.destinationHash);
    if (
      !shouldDispatchAnnounceHandlersNow(
        stepDispatchAnnounceHandlersWithActions(initialDispatchAnnounceHandlersState(), {
          kind: "announce/dispatch-handlers-gate",
          identityPresent: announcedIdentity !== null
        }).actions
      )
    ) {
      return;
    }
    const identity = announcedIdentity!;

    for (const handler of this.announceHandlers) {
      if (
        !shouldReceiveAnnouncePathResponseNow(
          stepReceiveAnnouncePathResponseWithActions(initialReceiveAnnouncePathResponseState(), {
            kind: "announce/receive-path-response-gate",
            context: packet.context,
            ...(handler.receivePathResponses !== undefined
              ? { receivePathResponses: handler.receivePathResponses }
              : {})
          }).actions
        )
      ) {
        continue;
      }

      if (handler.aspectFilter != null) {
        const filterStepped = stepParseAspectFilterWithActions(initialParseAspectFilterState(), {
          kind: "destination/aspect-filter-gate",
          filter: handler.aspectFilter
        });
        const parsedFilter = shouldUseParseAspectFilter(filterStepped.actions)
          ? aspectFilterFromActions(filterStepped.actions)
          : null;
        const filterParsed =
          !shouldRejectParseAspectFilter(filterStepped.actions) && parsedFilter !== null;
        const expected =
          parsedFilter === null
            ? null
            : Destination.hash(
                this.options.provider,
                identity,
                parsedFilter.appName,
                ...parsedFilter.aspects
              );
        if (
          !shouldMatchAnnounceAspectNow(
            stepMatchAnnounceAspectWithActions(initialMatchAnnounceAspectState(), {
              kind: "announce/match-aspect-gate",
              hasFilter: true,
              filterParsed,
              hashMatches: expected !== null && equalBytes(packet.destinationHash, expected)
            }).actions
          )
        ) {
          continue;
        }
      }

      handler.receivedAnnounce({
        destinationHash: packet.destinationHash,
        announcedIdentity: identity,
        appData: announce.appData,
        announce,
        packet
      });
    }
  }

  protected async handleData(packet: Packet, iface: PacketInterface): Promise<void> {
    const pathRequestStepped = stepLocalPathRequestPacketWithActions(
      initialLocalPathRequestPacketState(),
      {
        kind: "transport/local-path-request-packet-gate",
        destinationTypePlain: packet.destinationType === DestinationType.PLAIN,
        destinationHashMatches: equalBytes(packet.destinationHash, this.pathRequestHash)
      }
    );
    /* Handle path-request DATA only from `path-request` (no ad-hoc `isLocalPathRequestPacket` reads). */
    if (shouldTreatLocalPathRequestPacket(pathRequestStepped.actions)) {
      await this.handlePathRequest(packet, iface);
      return;
    }

    const destination = this.destinations.find((entry) =>
      shouldMatchLocalTypedDestinationNow(
        stepMatchLocalTypedDestinationWithActions(initialMatchLocalTypedDestinationState(), {
          kind: "transport/match-local-typed-destination-gate",
          hashMatches: equalBytes(entry.hash, packet.destinationHash),
          typeMatches: entry.type === packet.destinationType
        }).actions
      )
    );
    const plaintext = destination === undefined ? null : destination.decrypt(packet.data);
    const deliveryStepped = stepLocalPlainDataDeliveryWithActions(
      initialLocalPlainDataDeliveryState(),
      {
        kind: "transport/local-plain-data-gate",
        destinationPresent: destination !== undefined,
        plaintextPresent: plaintext !== null
      }
    );
    const dispatchStepped = stepDispatchLocalPlainDataDeliveryWithActions(
      initialDispatchLocalPlainDataDeliveryState(),
      {
        kind: "transport/dispatch-local-plain-data-gate",
        planDispatch: shouldDispatchLocalPlainDataDeliveryActions(deliveryStepped.actions),
        destinationPresent: destination !== undefined,
        plaintextPresent: plaintext !== null
      }
    );
    if (!shouldDispatchLocalPlainDataDeliveryNow(dispatchStepped.actions)) {
      return;
    }

    destination!.dispatchPacket(plaintext!, packet);

    const proofStepped = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: destination!.proofStrategy,
      appWantsProof: destination!.shouldProve(packet)
    });
    if (shouldProveDestination(proofStepped.actions)) {
      await this.sendProof(destination!, packet, iface);
    }
  }

  protected async handleProof(packet: Packet, iface: PacketInterface): Promise<void> {
    const proofStepped = stepProofIngressWithActions(initialProofIngressState(), {
      kind: "transport/proof-ingress-gate",
      context: packet.context
    });
    if (shouldHandleProofLrproof(proofStepped.actions)) {
      for (const link of this.pendingLinks) {
        if (
          shouldAcceptLinkLrProofCandidateNow(
            stepAcceptLinkLrProofCandidateWithActions(initialAcceptLinkLrProofCandidateState(), {
              kind: "transport/accept-link-lr-proof-candidate-gate",
              linkIdMatches: equalBytes(link.linkId, packet.destinationHash),
              hopsMatch: link.hopsMatch(packet)
            }).actions
          )
        ) {
          await link.validateProof(packet, iface);
          return;
        }
      }
      return;
    }

    if (shouldHandleProofResourcePrf(proofStepped.actions)) {
      const activeIndex = this.indexOfMatchingLink(this.activeLinks, packet.destinationHash);
      if (
        shouldDispatchResourceProofToLinkNow(
          stepDispatchResourceProofToLinkWithActions(initialDispatchResourceProofToLinkState(), {
            kind: "transport/dispatch-resource-proof-to-link-gate",
            activeIndexPresent: activeIndex !== null
          }).actions
        )
      ) {
        await this.activeLinks[activeIndex!]!.handleResourceProof(packet);
      }
      return;
    }

    if (!shouldHandleProofReceipt(proofStepped.actions)) {
      return;
    }

    for (const receipt of [...this.receipts]) {
      const identity = equalBytes(packet.destinationHash, receipt.truncatedHash)
        ? Identity.recall(this.options.provider, receipt.targetDestinationHash)
        : null;
      const proofAccepted =
        identity !== null && receipt.validateProofPacket(packet, identity);
      const proofIngressStepped = stepPacketReceiptProofIngressWithActions(
        initialPacketReceiptProofIngressState(),
        {
          kind: "receipt/proof-ingress-gate",
          truncatedHashMatches: equalBytes(packet.destinationHash, receipt.truncatedHash),
          identityPresent: identity !== null,
          proofAccepted
        }
      );
      if (shouldRemovePacketReceiptProofIngress(proofIngressStepped.actions)) {
        const receiptStepped = stepPacketReceiptUnregisterWithActions(
          initialPacketReceiptUnregisterState(),
          {
            kind: "receipt/unregister-gate",
            index: this.receipts.indexOf(receipt)
          }
        );
        const index = packetReceiptUnregisterIndex(receiptStepped.actions);
        if (shouldRemovePacketReceipt(receiptStepped.actions) && index !== null) {
          this.receipts.splice(index, 1);
        }
      }
    }
  }

  protected async sendProof(destination: LocalDestination, packet: Packet, iface: PacketInterface): Promise<void> {
    const emit = stepEmitDestinationProofWithActions(initialEmitDestinationProofState(), {
      kind: "destination/emit-proof-gate",
      identityPresent: destination.identity !== null
    });
    if (!shouldEmitDestinationProofNow(emit.actions)) {
      return;
    }

    const packetHash = packet.hash();
    await destination.identity!.prove(
      packetHash,
      packet.proofDestinationHash(),
      async (proofDestinationHash: Uint8Array, proofData: Uint8Array) => {
        const proofPacket = Packet.fromFields(this.options.provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.SINGLE,
          packetType: PacketType.PROOF,
          destinationHash: proofDestinationHash,
          data: proofData
        });
        await this.outbound(proofPacket, iface);
      },
      this.useImplicitProof
    );
  }

  protected async outbound(packet: Packet, attachedInterface: PacketInterface | null): Promise<boolean> {
    const path = this.getPathEntry(packet.destinationHash);
    const stepped = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: packet.packetType,
      destinationType: packet.destinationType,
      headerType: packet.headerType,
      hasPath: path !== undefined,
      pathHops: path?.hops ?? 0
    });

    if (
      shouldWrapPathOutbound(stepped.actions) &&
      shouldUsePathForOutboundNow(
        stepUsePathForOutboundWithActions(initialUsePathForOutboundState(), {
          kind: "path/use-for-outbound-gate",
          pathPresent: path !== undefined
        }).actions
      )
    ) {
      const wrapped = wrapTransportPacket(packet, path!.nextHop);
      await this.transmit(path!.receivedInterface, wrapped);
      return true;
    }

    if (
      shouldDirectPathOutbound(stepped.actions) &&
      shouldUsePathForOutboundNow(
        stepUsePathForOutboundWithActions(initialUsePathForOutboundState(), {
          kind: "path/use-for-outbound-gate",
          pathPresent: path !== undefined
        }).actions
      )
    ) {
      await this.transmit(path!.receivedInterface, packet.raw);
      return true;
    }

    let sent = false;
    for (const iface of this.interfaces) {
      if (
        !shouldTransmitOnInterfaceNow(
          stepTransmitOnInterfaceWithActions(initialTransmitOnInterfaceState(), {
            kind: "transport/transmit-on-interface-gate",
            outgoing: iface.outgoing,
            requireAttached: attachedInterface !== null,
            isAttached: attachedInterface !== null && iface === attachedInterface
          }).actions
        )
      ) {
        continue;
      }

      this.packetHashes.add(hashKey(packet.hash()));
      await this.transmit(iface, packet.raw);
      sent = true;
    }

    return sent;
  }

  protected async handlePathRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    const parsed = parsePathRequestData(packet.data);
    const path = parsed === null ? undefined : this.getPathEntry(parsed.destinationHash);
    const localDestination =
      parsed === null
        ? undefined
        : this.destinations.find((entry) =>
            shouldMatchLocalInboundDestinationNow(
              stepMatchLocalInboundDestinationWithActions(
                initialMatchLocalInboundDestinationState(),
                {
                  kind: "transport/match-local-inbound-destination-gate",
                  hashMatches: equalBytes(entry.hash, parsed.destinationHash),
                  directionIn: entry.direction === DestinationDirection.IN
                }
              ).actions
            )
          );
    const tagKey =
      parsed !== null && parsed.tag !== null
        ? pathRequestTagKey(parsed.destinationHash, parsed.tag)
        : null;
    const stepped = stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: parsed !== null,
      hasTag: parsed?.tag !== null && parsed?.tag !== undefined,
      tagAlreadySeen: tagKey !== null && this.discoveryPrTags.has(tagKey),
      hasLocalAnswerer: localDestination?.answerPathRequest !== undefined,
      transportEnabled: this.transportEnabled,
      hasPath: path !== undefined,
      shouldAnswerPath:
        path !== undefined &&
        shouldAnswerPathRequestNow(
          stepAnswerPathRequestWithActions(initialAnswerPathRequestState(), {
            kind: "path-request/answer-path-gate",
            nextHop: path.nextHop,
            requestorTransportId: parsed?.requestorTransportId ?? null
          }).actions
        ),
      discoveryPresent: false,
      discoveryExpired: false,
      allowDiscovery: false
    });

    if (
      shouldIgnorePathRequestUnparsed(stepped.actions) ||
      shouldIgnorePathRequestSeenTag(stepped.actions)
    ) {
      return;
    }

    if (
      shouldRememberPathRequestTagNow(
        stepRememberPathRequestTagWithActions(initialRememberPathRequestTagState(), {
          kind: "path-request/remember-tag-gate",
          tagKeyPresent: tagKey !== null
        }).actions
      )
    ) {
      this.discoveryPrTags.add(tagKey!);
    }

    if (shouldAnswerPathRequestLocal(stepped.actions)) {
      if (
        !shouldAnswerLocalPathRequestNow(
          stepAnswerLocalPathRequestWithActions(initialAnswerLocalPathRequestState(), {
            kind: "path-request/answer-local-handler-gate",
            handlerPresent: localDestination?.answerPathRequest !== undefined
          }).actions
        )
      ) {
        return;
      }
      await localDestination!.answerPathRequest!(iface);
      return;
    }

    if (
      shouldAnswerPathRequestPath(stepped.actions) &&
      shouldAnswerPathWithEntryNow(
        stepAnswerPathWithEntryWithActions(initialAnswerPathWithEntryState(), {
          kind: "path-request/answer-path-entry-gate",
          pathPresent: path !== undefined
        }).actions
      )
    ) {
      await this.sendPathResponse(path!, iface);
    }
  }

  protected async sendPathResponse(path: PathEntry, iface: PacketInterface): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const armed = stepPathResponseGraceWithActions(initialPathResponseGraceState(), {
        kind: "path-response-grace/arm"
      });
      let state = armed.state;
      let concluded = false;

      const finish = (): void => {
        if (concluded) {
          return;
        }
        concluded = true;
        resolve();
      };

      const applyIntents = (
        intents: ReturnType<typeof stepPathResponseGraceWithActions>["intents"]
      ): void => {
        for (const intent of intents) {
          if (intent.kind === "timer/set" && intent.timer.id === PATH_RESPONSE_GRACE_TIMER_ID) {
            this.clock.setTimeout(() => {
              const tick = stepPathResponseGraceWithActions(state, {
                kind: "timer/fired",
                id: PATH_RESPONSE_GRACE_TIMER_ID,
                at: this.clock.now()
              });
              state = tick.state;
              applyIntents(tick.intents);
              void applyActions(tick.actions).catch(reject);
            }, intent.timer.delayMs);
          }
        }
      };

      const applyActions = async (
        actions: ReturnType<typeof stepPathResponseGraceWithActions>["actions"]
      ): Promise<void> => {
        for (const action of actions) {
          if (action.kind === "transmit") {
            const cached = Packet.decode(this.provider, path.announceRaw);
            if (
              !shouldAcceptCachedPathResponsePacketNow(
                stepAcceptCachedPathResponsePacketWithActions(
                  initialAcceptCachedPathResponsePacketState(),
                  {
                    kind: "path-response/accept-cached-packet-gate",
                    decodedOk: cached !== null
                  }
                ).actions
              )
            ) {
              return;
            }
            const response = buildPathResponseAnnounce(
              this.provider,
              cached!,
              this.transportIdentity,
              path.hops
            );
            await this.outbound(response, iface);
          }
          if (action.kind === "resolve") {
            finish();
          }
        }
      };

      applyIntents(armed.intents);
      void applyActions(armed.actions).catch(reject);
    });
  }

  /** Adapt matching-link-id index via protocol actions (no ad-hoc
   * `indexOfMatchingLinkId` reads). */
  protected indexOfMatchingLink(links: readonly Link[], target: Uint8Array): number | null {
    const stepped = stepIndexOfMatchingLinkIdWithActions(initialIndexOfMatchingLinkIdState(), {
      kind: "transport/matching-link-id-index-gate",
      linkIds: links.map((link) => link.linkId),
      target
    });
    return shouldUseMatchingLinkIdIndex(stepped.actions)
      ? matchingLinkIdIndexFromActions(stepped.actions)
      : null;
  }

  protected packetFilter(packet: Packet): boolean {
    const stepped = stepPacketFilterWithActions(initialPacketFilterState(), {
      kind: "transport/packet-filter-gate",
      transportId: packet.transportId,
      localTransportHash: this.options.transportIdentity.hash,
      packetType: packet.packetType,
      destinationType: packet.destinationType,
      alreadySeenHash: this.packetHashes.has(hashKey(packet.hash()))
    });
    return shouldAcceptPacketFilter(stepped.actions);
  }
}
