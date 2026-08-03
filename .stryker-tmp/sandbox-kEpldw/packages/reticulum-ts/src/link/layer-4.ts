// @ts-nocheck
import { LINK_ENABLED_MODES,LINK_ESTABLISHMENT_TIMEOUT_PER_HOP,LINK_INITIATOR_ENTROPY_SIZE,LINK_KEEPALIVE,LINK_KEEPALIVE_MAX_RTT,LINK_KEEPALIVE_MIN,LINK_KEEPALIVE_TIMEOUT_FACTOR,LINK_MODE_BYTEMASK,LINK_MODE_DEFAULT,LINK_MTU_BYTEMASK,LINK_PROOF_BODY_SIZE,LINK_PROOF_MTU_SIZE,LINK_PROOF_SIGNATURE_SIZE,LINK_REQUEST_ECPUB_SIZE,LINK_RESPONSE_MAX_GRACE_TIME,LINK_RESPONDER_ENTROPY_SIZE,LINK_STALE_FACTOR,LINK_STALE_GRACE,LINK_TRAFFIC_TIMEOUT_FACTOR,LINK_WATCHDOG_MAX_SLEEP_MS,LINK_X25519_KEY_SIZE,LinkMode,LinkResourceStrategy,LinkStatus,LinkTeardownReason,shouldAcceptLinkIdentifyNow,initialAcceptLinkIdentifyState,stepAcceptLinkIdentifyWithActions,shouldAcceptLinkOwnerPublicKeyNow,initialAcceptLinkOwnerPublicKeyState,stepAcceptLinkOwnerPublicKeyWithActions,shouldAcceptLinkRttNow,initialAcceptLinkRttState,stepAcceptLinkRttWithActions,shouldAllowIdentifyOnLink,initialIdentifyOnLinkAllowState,stepIdentifyOnLinkAllowWithActions,shouldAllowLinkRequest,initialLinkRequestAllowState,stepLinkRequestAllowWithActions,shouldAllowLinkSend,initialLinkSendAllowState,stepLinkSendAllowWithActions,shouldAllowPerformLinkHandshake,initialPerformLinkHandshakeAllowState,stepPerformLinkHandshakeAllowWithActions,shouldAllowProveLink,initialProveLinkAllowState,stepProveLinkAllowWithActions,shouldAllowResendLinkPacket,initialResendLinkPacketAllowState,stepResendLinkPacketAllowWithActions,shouldAllowUpdateLinkKeepalive,initialUpdateLinkKeepaliveAllowState,stepUpdateLinkKeepaliveAllowWithActions,shouldAllowValidateLinkProof,initialValidateLinkProofAllowState,stepValidateLinkProofAllowWithActions,
  deriveRnsLinkKeyRawFromActions,encodeLinkMtuBytesRawFromActions,encodeLinkSignallingBytesRawFromActions,initialComputeKeepaliveState,initialIndexOfPendingLinkAppRequestState,initialDeliverPendingLinkAppResponseState,initialComputeLinkEstablishmentTimeoutState,initialComputeLinkMduState,initialComputeLinkRequestTimeoutState,initialComputeLinkRttSecondsState,initialContainsResourceHashState,initialLinkAppRequestInboundState,initialInvokeLinkAppRequestHandlerState,initialLinkEstablishState,initialLinkIdentifyState,initialCommitLinkRemoteIdentityState,initialLinkProofValidateState,initialLinkResourceAdvertisementState,initialLinkTeardownState,initialLinkTokenAccessState,initialLinkValidateRequestState,initialMergeLinkRttState,initialPendingLinkRequestRegisterState,initialRequestLinkDestinationState,initialSendLinkAppRequestResponseState,shouldTreatLinkClosed,initialLinkClosedState,stepLinkClosedWithActions,shouldMatchExpectedLinkMode,initialExpectedLinkModeState,stepExpectedLinkModeWithActions,shouldTreatLinkModeEnabled,initialLinkModeEnabledState,stepLinkModeEnabledWithActions,linkEstablishActivatedAction,linkEstablishmentTimeoutFromActions,linkIdentifySignedMaterialRawFromActions,linkKeepaliveFromActions,linkMduFromActions,linkProofSignedMaterialRawFromActions,shouldLinkReadyForNewResource,initialLinkReadyForNewResourceState,stepLinkReadyForNewResourceWithActions,linkRequestHashablePartRawFromActions,linkRequestTimeoutFromActions,linkRttSecondsFromActions,linkTeardownRemoteCloseAction,linkTeardownSendThenCloseAction,mergeLinkRttFromActions,modeFromLinkProofDataFromActions,
  modeFromLinkRequestDataFromActions,msgpackFloatFromActions,mtuFromLinkProofDataFromActions,mtuFromLinkRequestDataFromActions,packLinkKeepaliveProbeRawFromActions,packLinkKeepaliveReplyRawFromActions,packLinkIdentifyPayloadRawFromActions,packLinkProofDataRawFromActions,packLinkRequestDataRawFromActions,packMsgpackFloat64RawFromActions,initialClassifyLinkKeepaliveState,initialClassifyLinkProofPayloadState,initialEncodeLinkMtuBytesState,initialEncodeLinkSignallingBytesState,initialLinkProofSignedMaterialState,initialLinkRequestHashablePartState,initialModeFromLinkProofDataState,initialModeFromLinkRequestDataState,initialMtuFromLinkProofDataState,initialMtuFromLinkRequestDataState,initialLinkAppRequestState,initialLinkAppRequestTransmitState,initialLinkDataContextState,initialLinkHopsMatchState,initialLinkInitiatorMtuState,initialLinkRequestResponderMtuState,initialLinkResourceConcludeState,initialLinkIdentifySignedMaterialState,initialPackLinkIdentifyPayloadState,initialPackLinkKeepaliveProbeState,initialPackLinkKeepaliveReplyState,initialPackLinkProofDataState,initialPackLinkRequestDataState,initialPackLinkRequestState,initialPackLinkResponseState,initialPackMsgpackFloat64State,initialSplitLinkIdentifyPayloadState,initialSplitLinkProofBodyState,initialSplitLinkRequestDataState,initialUnpackLinkRequestState,initialUnpackLinkResponseState,initialUnpackMsgpackFloatState,linkIdentifyPayloadFieldsFromActions,linkInitiatorMtuFromActions,linkProofBodyFieldsFromActions,linkRequestFieldsFromActions,linkRequestKeyFieldsFromActions,linkRequestResponderMtuFromActions,
  linkResponseFieldsFromActions,packLinkRequestRawFromActions,packLinkResponseRawFromActions,shouldClassifyLinkKeepaliveProbe,shouldClassifyLinkProofPayloadBodyOnly,shouldClassifyLinkProofPayloadBodyWithMtu,shouldRejectMtuFromLinkProofData,shouldRejectMtuFromLinkRequestData,shouldRejectPackLinkIdentifyPayload,shouldRejectSplitLinkIdentifyPayload,shouldRejectSplitLinkProofBody,shouldRejectSplitLinkRequestData,shouldRejectUnpackLinkRequest,shouldRejectUnpackLinkResponse,shouldRejectUnpackMsgpackFloat,shouldUseEncodeLinkMtuBytes,shouldUseEncodeLinkSignallingBytes,shouldMatchLinkHops,shouldUseLinkEstablishmentTimeout,shouldUseLinkInitiatorMtu,shouldUseLinkKeepalive,shouldUseLinkMdu,shouldUseLinkProofSignedMaterial,shouldUseLinkRequestHashablePart,shouldUseLinkRequestResponderMtu,shouldUseLinkRequestTimeout,shouldUseLinkRttSeconds,shouldUseMergeLinkRtt,shouldUseModeFromLinkProofData,shouldUseModeFromLinkRequestData,shouldUseMtuFromLinkProofData,shouldUseMtuFromLinkRequestData,shouldUseLinkIdentifySignedMaterial,shouldUsePackLinkIdentifyPayload,shouldUsePackLinkKeepaliveProbe,shouldUsePackLinkKeepaliveReply,shouldUsePackLinkProofData,shouldUsePackLinkRequest,shouldUsePackLinkRequestData,shouldUsePackLinkResponse,shouldUsePackMsgpackFloat64,shouldUseSplitLinkIdentifyPayload,shouldUseSplitLinkProofBody,shouldUseSplitLinkRequestData,shouldUseUnpackLinkRequest,shouldUseUnpackLinkResponse,shouldUseUnpackMsgpackFloat,stepClassifyLinkKeepaliveWithActions,stepClassifyLinkProofPayloadWithActions,stepComputeKeepaliveWithActions,stepComputeLinkEstablishmentTimeoutWithActions,
  stepComputeLinkMduWithActions,stepComputeLinkRequestTimeoutWithActions,stepComputeLinkRttSecondsWithActions,stepEncodeLinkMtuBytesWithActions,stepEncodeLinkSignallingBytesWithActions,stepLinkProofSignedMaterialWithActions,stepLinkRequestHashablePartWithActions,stepMergeLinkRttWithActions,stepModeFromLinkProofDataWithActions,stepModeFromLinkRequestDataWithActions,stepMtuFromLinkProofDataWithActions,stepMtuFromLinkRequestDataWithActions,stepLinkHopsMatchWithActions,stepLinkInitiatorMtuWithActions,stepLinkRequestResponderMtuWithActions,stepLinkIdentifySignedMaterialWithActions,stepPackLinkIdentifyPayloadWithActions,stepPackLinkKeepaliveProbeWithActions,stepPackLinkKeepaliveReplyWithActions,stepPackLinkProofDataWithActions,stepPackLinkRequestDataWithActions,stepPackLinkRequestWithActions,stepPackLinkResponseWithActions,stepPackMsgpackFloat64WithActions,stepSplitLinkIdentifyPayloadWithActions,stepSplitLinkProofBodyWithActions,stepSplitLinkRequestDataWithActions,stepUnpackLinkRequestWithActions,stepIndexOfPendingLinkAppRequestWithActions,stepDeliverPendingLinkAppResponseWithActions,stepUnpackLinkResponseWithActions,stepUnpackMsgpackFloatWithActions,initialPendingLinkRequestUnregisterState,pendingLinkRequestUnregisterIndex,shouldAcceptLinkEstablishRtt,shouldAcceptLinkPacketInterfaceNow,initialAcceptLinkPacketInterfaceState,stepAcceptLinkPacketInterfaceWithActions,shouldAcceptLinkResourceAdvertisement,shouldAcceptRemoteLinkTeardown,shouldAcceptResourceHashmapUpdateFrameNow,shouldAcceptResourceProofPayloadNow,initialAcceptResourceProofPayloadState,
  stepAcceptResourceProofPayloadWithActions,shouldAcceptResourceProofSplitNow,initialAcceptResourceProofSplitState,stepAcceptResourceProofSplitWithActions,shouldActivateLinkEstablish,shouldAllowRequestLinkDestination,shouldAskAppLinkResourceAdvertisement,shouldAttemptLinkProofCryptoNow,initialAttemptLinkProofCryptoState,stepAttemptLinkProofCryptoWithActions,shouldCloseOnlyLinkTeardown,shouldCommitLinkIdentify,shouldCommitLinkRemoteIdentityNow,shouldContinueLinkValidateRequestNow,initialContinueLinkValidateRequestState,stepContinueLinkValidateRequestWithActions,shouldProceedLinkValidateRequest,shouldCreateLinkChannelNow,initialCreateLinkChannelState,stepCreateLinkChannelWithActions,shouldCreateLinkToken,shouldDispatchLinkPlaintextNow,initialDispatchLinkPlaintextState,stepDispatchLinkPlaintextWithActions,shouldUsePendingLinkAppRequestIndex,pendingLinkAppRequestIndexFromActions,shouldDeliverPendingLinkAppResponseNow,shouldEncryptLinkPayloadNow,initialEncryptLinkPayloadState,stepEncryptLinkPayloadWithActions,shouldEnterLinkHandshake,shouldFailLinkEstablish,shouldForbidLinkAppRequestInbound,shouldHandleIncomingResourceByHashNow,initialHandleIncomingResourceByHashState,stepHandleIncomingResourceByHashWithActions,shouldHandleOutgoingResourceRequestNow,initialHandleOutgoingResourceRequestState,stepHandleOutgoingResourceRequestWithActions,shouldIgnoreInitiatorKeepaliveProbeNow,initialIgnoreInitiatorKeepaliveProbeState,stepIgnoreInitiatorKeepaliveProbeWithActions,shouldIgnoreLinkAppRequestInbound,shouldIgnoreLinkAppRequestInboundResponse,shouldIgnoreLinkEstablishRtt,
  shouldHandleLinkDataChannel,shouldHandleLinkDataClose,shouldHandleLinkDataIdentify,shouldHandleLinkDataKeepalive,shouldHandleLinkDataPlaintext,shouldHandleLinkDataRequest,shouldHandleLinkDataResource,shouldHandleLinkDataResourceAdv,shouldHandleLinkDataResourceHmu,shouldHandleLinkDataResourceIcl,shouldHandleLinkDataResourceRcl,shouldHandleLinkDataResourceReq,shouldHandleLinkDataResponse,shouldHandleLinkDataRtt,shouldIgnoreLinkDataContext,shouldIgnoreLinkResourceAdvertisement,shouldInvokeLinkAppRequestHandlerNow,shouldInvokeLinkAppRequestInbound,shouldKeepPendingLinkAppRequestTransmit,shouldPresentResourceHash,shouldRegisterLinkResourceNow,initialRegisterLinkResourceState,stepRegisterLinkResourceWithActions,shouldRegisterPendingLinkRequestNow,shouldRejectLinkAppRequest,shouldRejectLinkAppRequestInboundTooBig,shouldRejectLinkIdentify,shouldRejectLinkProofValidate,shouldRejectLinkResourceAdvertisement,shouldRejectLinkTokenNoKey,shouldRemoveIncomingLinkResourceConclude,shouldRemoveOutgoingLinkResourceConclude,incomingLinkResourceConcludeIndex,outgoingLinkResourceConcludeIndex,shouldReplyKeepaliveProbeNow,initialReplyKeepaliveProbeState,stepReplyKeepaliveProbeWithActions,shouldReuseLinkToken,shouldSendLinkAppRequest,shouldSendLinkAppRequestInboundResponse,shouldSendLinkAppRequestResponseNow,shouldSendLinkTeardownThenClose,shouldTeardownLinkEstablish,shouldUnregisterLinkAppRequestTransmit,shouldRemovePendingLinkRequest,shouldUpdateLinkLastDataNow,initialUpdateLinkLastDataState,stepUpdateLinkLastDataWithActions,shouldDispatchLinkInboundData,initialLinkInboundDataPacketState,
  stepLinkInboundDataPacketWithActions,identityPublicKeyFieldsFromActions,initialLinkKeepaliveContextState,initialSplitIdentityPublicKeyState,initialDeriveRnsLinkKeyState,initialSplitInitiatorLinkEntropyState,initialSplitResponderLinkEntropyState,initiatorLinkEntropyFieldsFromActions,responderLinkEntropyFieldsFromActions,shouldRejectDeriveRnsLinkKey,shouldRejectSplitInitiatorLinkEntropy,shouldUseDeriveRnsLinkKey,shouldRejectSplitResponderLinkEntropy,shouldTreatLinkKeepaliveContext,shouldTreatLinkKeepaliveOther,shouldUseSplitIdentityPublicKey,shouldUseSplitInitiatorLinkEntropy,shouldUseSplitResponderLinkEntropy,stepLinkKeepaliveContextWithActions,stepSplitIdentityPublicKeyWithActions,stepDeriveRnsLinkKeyWithActions,stepSplitInitiatorLinkEntropyWithActions,stepSplitResponderLinkEntropyWithActions,initialSplitResourceHashmapUpdatePacketState,initialAcceptResourceHashmapUpdateFrameState,initialSplitResourceProofState,resourceHashmapUpdatePacketFieldsFromActions,resourceProofFieldsFromActions,shouldRejectSplitResourceHashmapUpdatePacket,shouldRejectSplitResourceProof,shouldUseSplitResourceHashmapUpdatePacket,shouldUseSplitResourceProof,stepLinkAppRequestInboundWithActions,stepLinkAppRequestTransmitWithActions,stepLinkAppRequestWithActions,stepInvokeLinkAppRequestHandlerWithActions,stepSendLinkAppRequestResponseWithActions,stepLinkDataContextWithActions,stepLinkEstablishWithActions,stepLinkIdentifyWithActions,stepCommitLinkRemoteIdentityWithActions,stepLinkProofValidateWithActions,stepLinkResourceAdvertisementWithActions,stepContainsResourceHashWithActions,
  stepLinkResourceConcludeWithActions,stepPendingLinkRequestRegisterWithActions,stepPendingLinkRequestUnregisterWithActions,stepRequestLinkDestinationWithActions,stepLinkTeardownWithActions,stepLinkTokenAccessWithActions,stepLinkValidateRequestWithActions,stepLinkWatchdogWithActions,stepSplitResourceHashmapUpdatePacketWithActions,stepAcceptResourceHashmapUpdateFrameWithActions,stepSplitResourceProofWithActions,stepUtf8EncodeWithActions,initialUtf8EncodeState,shouldUseUtf8Encode,utf8EncodeRawFromActions,type LinkAppRequestInboundAction,type LinkAppRequestInboundState,type LinkEstablishAction,type LinkIdentifyAction,type LinkModeValue,type LinkRequestFields,type LinkResourceAdvertisementAction,type LinkResourceAdvertisementState,type LinkResourceStrategyValue,type LinkStatusValue,type LinkTeardownAction,type LinkTeardownReasonValue,type LinkWatchdogState,type LinkWatchdogStepResult } from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import { Token } from "../crypto/token.js";
import { Channel,LinkChannelOutlet } from "../channel.js";
import { equalBytes } from "../crypto/bytes.js";
import { DestinationDirection,DestinationType } from "../destination.js";
import { Identity } from "../identity.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { LinkRequestReceipt } from "../link-request-receipt.js";
import { Packet,PacketContext,PacketHeaderType,PacketType,TransportType } from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import type { RegisteredDestination,RequestHandler } from "../registered-destination.js";
import { RETICULUM_MTU } from "../reticulum.js";
import type { Clock } from "../runtime/runtime.js";
import type { LeafTransport } from "../transport/node.js";
import { PATHFINDER_MAX_HOPS } from "../transport/node.js";
import { Resource,ResourceAdvertisement } from "../resource.js";
import { LINK_ECPUB_SIZE, LINK_KEY_SIZE, LINK_MTU_SIZE, LINK_SIGNATURE_SIZE, linkEstablishmentTimeoutForHops, linkMduForMtu, linkRequestTimeoutForRtt, linkRttSecondsForRequest, mergedLinkRtt } from "./shared.js";
import type { InitiatorLinkOptions, LinkCallbacks, LinkRequestOptions, LinkSendContextResult } from "./shared.js";
import { Link } from "../link.js";
import { LinkLayer3 } from "./layer-3.js";
export class LinkLayer4 extends LinkLayer3 {
async receive(packet: Packet, iface: PacketInterface): Promise<void> {
    const closedStepped = stepLinkClosedWithActions(initialLinkClosedState(), {
      kind: "link/closed-gate",
      status: this.status
    });
    if (shouldTreatLinkClosed(closedStepped.actions)) {
      return;
    }

    const keepaliveClassify = stepClassifyLinkKeepaliveWithActions(
      initialClassifyLinkKeepaliveState(),
      {
        kind: "link-keepalive/classify-gate",
        data: packet.data
      }
    );
    const probePayload = shouldClassifyLinkKeepaliveProbe(keepaliveClassify.actions);

    const keepaliveContext = stepLinkKeepaliveContextWithActions(
      initialLinkKeepaliveContextState(),
      {
        kind: "link/keepalive-context-gate",
        context: packet.context
      }
    );
    const contextKeepalive = shouldTreatLinkKeepaliveContext(keepaliveContext.actions);

    const ignoreProbe = stepIgnoreInitiatorKeepaliveProbeWithActions(
      initialIgnoreInitiatorKeepaliveProbeState(),
      {
        kind: "link-keepalive/ignore-initiator-probe-gate",
        initiator: this.initiator,
        contextKeepalive,
        probePayload
      }
    );
    if (shouldIgnoreInitiatorKeepaliveProbeNow(ignoreProbe.actions)) {
      return;
    }

    const ifaceStepped = stepAcceptLinkPacketInterfaceWithActions(
      initialAcceptLinkPacketInterfaceState(),
      {
        kind: "link/accept-packet-interface-gate",
        hasAttachedInterface: this.attachedInterface !== null,
        sameInterface: iface === this.attachedInterface
      }
    );
    if (!shouldAcceptLinkPacketInterfaceNow(ifaceStepped.actions)) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/inbound",
        at: this.clock.now() / 1000
      })
    );
    const lastDataStepped = stepUpdateLinkLastDataWithActions(initialUpdateLinkLastDataState(), {
      kind: "link/update-last-data-gate",
      contextKeepalive
    });
    if (shouldUpdateLinkLastDataNow(lastDataStepped.actions)) {
      this.lastData = this.lastInbound;
    }

    const inboundData = stepLinkInboundDataPacketWithActions(initialLinkInboundDataPacketState(), {
      kind: "link/inbound-data-packet-gate",
      packetType: packet.packetType
    });
    if (!shouldDispatchLinkInboundData(inboundData.actions)) {
      return;
    }

    const contextStepped = stepLinkDataContextWithActions(initialLinkDataContextState(), {
      kind: "link/data-context-gate",
      context: packet.context
    });
    if (shouldHandleLinkDataRtt(contextStepped.actions)) {
      await this.handleRttPacket(packet);
      return;
    }
    if (shouldHandleLinkDataKeepalive(contextStepped.actions)) {
      const replyStepped = stepReplyKeepaliveProbeWithActions(initialReplyKeepaliveProbeState(), {
        kind: "link-keepalive/reply-probe-gate",
        initiator: this.initiator,
        probePayload
      });
      if (shouldReplyKeepaliveProbeNow(replyStepped.actions)) {
        await this.sendKeepaliveReply();
      }
      return;
    }
    if (shouldHandleLinkDataClose(contextStepped.actions)) {
      await this.handleTeardownPacket(packet);
      return;
    }
    if (shouldHandleLinkDataIdentify(contextStepped.actions)) {
      await this.handleIdentifyPacket(packet);
      return;
    }
    if (shouldHandleLinkDataRequest(contextStepped.actions)) {
      await this.handleRequestPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResponse(contextStepped.actions)) {
      await this.handleResponsePacket(packet);
      return;
    }
    if (shouldHandleLinkDataChannel(contextStepped.actions)) {
      await this.handleChannelPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceAdv(contextStepped.actions)) {
      await this.handleResourceAdvertisementPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceReq(contextStepped.actions)) {
      await this.handleResourceRequestPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceHmu(contextStepped.actions)) {
      await this.handleResourceHashmapUpdatePacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceIcl(contextStepped.actions)) {
      await this.handleResourceCancelPacket(packet, true);
      return;
    }
    if (shouldHandleLinkDataResourceRcl(contextStepped.actions)) {
      await this.handleResourceCancelPacket(packet, false);
      return;
    }
    if (shouldHandleLinkDataResource(contextStepped.actions)) {
      await this.handleResourcePartPacket(packet);
      return;
    }
    if (shouldHandleLinkDataPlaintext(contextStepped.actions)) {
      const plaintext = this.decrypt(packet.data);
      if (shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
          kind: "link/dispatch-plaintext-gate",
          plaintextPresent: plaintext !== null
        }).actions
      ) && plaintext !== null) {
        this.callbacks.packet?.(plaintext, packet);
      }
      return;
    }
    if (shouldIgnoreLinkDataContext(contextStepped.actions)) {
      return;
    }
  }

  identify(identity: Identity): void {
    const identifyAllow = stepIdentifyOnLinkAllowWithActions(initialIdentifyOnLinkAllowState(), {
      kind: "link/identify-allow-gate",
      status: this.status,
      initiator: this.initiator
    });
    if (!shouldAllowIdentifyOnLink(identifyAllow.actions) || identity === null) {
      return;
    }

    const publicKey = identity.getPublicKey();
    const signedStepped = stepLinkIdentifySignedMaterialWithActions(
      initialLinkIdentifySignedMaterialState(),
      {
        kind: "link-identify/signed-material-gate",
        linkId: this.linkId,
        publicKey
      }
    );
    const signedData =
      shouldUseLinkIdentifySignedMaterial(signedStepped.actions)
        ? linkIdentifySignedMaterialRawFromActions(signedStepped.actions)
        : null;
    if (signedData === null) {
      throw new Error("Link.identify: missing signed-material use-raw action");
    }
    const signature = identity.sign(signedData);
    const packStepped = stepPackLinkIdentifyPayloadWithActions(
      initialPackLinkIdentifyPayloadState(),
      {
        kind: "link-identify/pack-gate",
        publicKey,
        signature
      }
    );
    if (
      shouldRejectPackLinkIdentifyPayload(packStepped.actions) ||
      !shouldUsePackLinkIdentifyPayload(packStepped.actions)
    ) {
      throw new Error("Link.identify: missing use-raw action");
    }
    const payload = packLinkIdentifyPayloadRawFromActions(packStepped.actions);
    if (payload === null) {
      throw new Error("Link.identify: missing use-raw action");
    }
    void this.sendContext(PacketContext.LINKIDENTIFY, payload);
  }

  getRemoteIdentity(): Identity | null {
    return this.remoteIdentity;
  }

  get linkTransport(): LeafTransport {
    return this.transport;
  }

  async sendProof(context: number, data: Uint8Array): Promise<void> {
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.PROOF,
      destinationHash: this.linkId,
      context,
      data
    });
    await this.transport.sendPacket(packet, { attachedInterface: this.attachedInterface });
  }

  readyForNewResource(): boolean {
    const ready = stepLinkReadyForNewResourceWithActions(initialLinkReadyForNewResourceState(), {
      kind: "link/ready-for-new-resource-gate",
      outgoingCount: this.outgoingResourcesList.length
    });
    return shouldLinkReadyForNewResource(ready.actions);
  }

  registerOutgoingResource(resource: Resource): void {
    const registerOutgoing = stepRegisterLinkResourceWithActions(
      initialRegisterLinkResourceState(),
      {
        kind: "link/register-resource-gate",
        alreadyPresent: this.outgoingResourcesList.includes(resource)
      }
    );
    if (shouldRegisterLinkResourceNow(registerOutgoing.actions)) {
      this.outgoingResourcesList.push(resource);
    }
  }

  registerIncomingResource(resource: Resource): void {
    const registerIncoming = stepRegisterLinkResourceWithActions(
      initialRegisterLinkResourceState(),
      {
        kind: "link/register-resource-gate",
        alreadyPresent: this.incomingResourcesList.includes(resource)
      }
    );
    if (shouldRegisterLinkResourceNow(registerIncoming.actions)) {
      this.incomingResourcesList.push(resource);
    }
  }

  hasIncomingResource(resource: Resource): boolean {
    const stepped = stepContainsResourceHashWithActions(initialContainsResourceHashState(), {
      kind: "resource-hashmap/contains-hash-gate",
      hashes: this.incomingResourcesList.map((incoming) => incoming.hash),
      target: resource.hash
    });
    return shouldPresentResourceHash(stepped.actions);
  }

  setResourceStrategy(strategy: LinkResourceStrategyValue): void {
    this.resourceStrategy = strategy;
  }

  get trafficTimeoutFactor(): number {
    return LINK_TRAFFIC_TIMEOUT_FACTOR;
  }

  registerPendingRequest(receipt: LinkRequestReceipt): void {
    const register = stepPendingLinkRequestRegisterWithActions(
      initialPendingLinkRequestRegisterState(),
      {
        kind: "link/pending-request-register-gate",
        alreadyPresent: this.pendingRequests.includes(receipt)
      }
    );
    if (shouldRegisterPendingLinkRequestNow(register.actions)) {
      this.pendingRequests.push(receipt);
    }
  }

  async sendResourcePart(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.RESOURCE, data, { encrypt: false });
  }

  async resendPacket(raw: Uint8Array, options: { createReceipt?: boolean } = {}): Promise<LinkSendContextResult | null> {
    const packet = Packet.decode(this.provider, raw);
    const resendAllow = stepResendLinkPacketAllowWithActions(
      initialResendLinkPacketAllowState(),
      {
        kind: "link/resend-packet-allow-gate",
        packetDecoded: packet !== null,
        attachedInterfacePresent: this.attachedInterface !== null
      }
    );
    if (!shouldAllowResendLinkPacket(resendAllow.actions) || packet === null) {
      return null;
    }

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false
    });

    return { raw, receipt };
  }

  hopsMatch(packet: Packet): boolean {
    const stepped = stepLinkHopsMatchWithActions(initialLinkHopsMatchState(), {
      kind: "link/hops-match-gate",
      expectedHops: this.expectedHops,
      packetHops: packet.hops,
      pathfinderMaxHops: PATHFINDER_MAX_HOPS
    });
    return shouldMatchLinkHops(stepped.actions);
  }

  protected async handleChannelPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
          kind: "link/dispatch-plaintext-gate",
          plaintextPresent: plaintext !== null
        }).actions
      )) {
      return;
    }

    this.getChannel().receive(plaintext!);
  }

  protected async handleResourceCancelPacket(packet: Packet, incoming: boolean): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
          kind: "link/dispatch-plaintext-gate",
          plaintextPresent: plaintext !== null
        }).actions
      )) {
      return;
    }

    const splitStepped = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext: plaintext!
      }
    );
    const split = shouldRejectSplitResourceHashmapUpdatePacket(splitStepped.actions)
      ? null
      : shouldUseSplitResourceHashmapUpdatePacket(splitStepped.actions)
        ? resourceHashmapUpdatePacketFieldsFromActions(splitStepped.actions)
        : null;
    if (
      !shouldAcceptResourceHashmapUpdateFrameNow(
        stepAcceptResourceHashmapUpdateFrameWithActions(
          initialAcceptResourceHashmapUpdateFrameState(),
          {
            kind: "resource-hashmap/accept-update-frame-gate",
            splitOk: split !== null
          }
        ).actions
      )
    ) {
      return;
    }
    const resources = incoming ? this.incomingResourcesList : this.outgoingResourcesList;
    for (const resource of resources) {
      if (
        shouldHandleIncomingResourceByHashNow(
          stepHandleIncomingResourceByHashWithActions(
            initialHandleIncomingResourceByHashState(),
            {
              kind: "link/handle-incoming-resource-by-hash-gate",
              hashMatches: equalBytes(resource.hash, split!.resourceHash)
            }
          ).actions
        )
      ) {
        resource.cancel();
        return;
      }
    }
  }

  async handleResourceProof(packet: Packet): Promise<void> {
    if (
      !shouldAcceptResourceProofPayloadNow(
        stepAcceptResourceProofPayloadWithActions(
          initialAcceptResourceProofPayloadState(),
          {
            kind: "resource-proof/accept-payload-gate",
            dataLength: packet.data.length
          }
        ).actions
      )
    ) {
      return;
    }
    const stepped = stepSplitResourceProofWithActions(initialSplitResourceProofState(), {
      kind: "resource-proof/split-gate",
      proofData: packet.data
    });
    const split =
      shouldRejectSplitResourceProof(stepped.actions) ||
      !shouldUseSplitResourceProof(stepped.actions)
        ? null
        : resourceProofFieldsFromActions(stepped.actions);
    if (
      !shouldAcceptResourceProofSplitNow(
        stepAcceptResourceProofSplitWithActions(initialAcceptResourceProofSplitState(), {
          kind: "resource-proof/accept-split-gate",
          splitOk: split !== null
        }).actions
      )
    ) {
      return;
    }
    const proofFields = split!;
    for (const resource of this.outgoingResourcesList) {
      if (
        shouldHandleIncomingResourceByHashNow(
          stepHandleIncomingResourceByHashWithActions(
            initialHandleIncomingResourceByHashState(),
            {
              kind: "link/handle-incoming-resource-by-hash-gate",
              hashMatches: equalBytes(resource.hash, proofFields.resourceHash)
            }
          ).actions
        )
      ) {
        resource.validateProof(packet.data);
        return;
      }
    }
  }

  protected async handleResourcePartPacket(packet: Packet): Promise<void> {
    for (const resource of this.incomingResourcesList) {
      resource.receivePart(packet);
    }
  }

  protected async handleTeardownPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    await this.applyLinkTeardownActions(
      stepLinkTeardownWithActions(
        initialLinkTeardownState({ status: this.status, initiator: this.initiator }),
        {
          kind: "teardown/remote",
          plaintextPresent: plaintext !== null,
          linkIdMatches: plaintext !== null && equalBytes(plaintext, this.linkId)
        }
      ).actions
    );
  }

  protected async sendKeepaliveReply(): Promise<void> {
    const packReply = stepPackLinkKeepaliveReplyWithActions(
      initialPackLinkKeepaliveReplyState(),
      { kind: "link-keepalive/pack-reply-gate" }
    );
    if (!shouldUsePackLinkKeepaliveReply(packReply.actions)) {
      throw new Error("Link.sendKeepaliveReply: missing use-raw action");
    }
    const reply = packLinkKeepaliveReplyRawFromActions(packReply.actions);
    if (reply === null) {
      throw new Error("Link.sendKeepaliveReply: missing use-raw action");
    }
    await this.sendContext(PacketContext.KEEPALIVE, reply);
  }
}
