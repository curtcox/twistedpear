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
import { LinkLayer2 } from "./layer-2.js";
export class LinkLayer3 extends LinkLayer2 {
async validateProof(packet: Packet, iface: PacketInterface): Promise<void> {
    const destination = this.destination;
    const validateAllow = stepValidateLinkProofAllowWithActions(
      initialValidateLinkProofAllowState(),
      {
        kind: "link/validate-proof-allow-gate",
        status: this.status,
        initiator: this.initiator,
        destinationPresent: destination !== null
      }
    );
    if (!shouldAllowValidateLinkProof(validateAllow.actions) || destination === null) {
      return;
    }

    try {
      const mode = Link.modeFromLpPacket(packet);
      const modeMatch = stepExpectedLinkModeWithActions(initialExpectedLinkModeState(), {
        kind: "link/expected-mode-gate",
        expected: this.mode,
        received: mode
      });
      const modeMatches = shouldMatchExpectedLinkMode(modeMatch.actions);

      let proofData = packet.data;
      let signallingBytes = new Uint8Array(0);
      let confirmedMtu: number | null = null;

      const layoutStepped = stepClassifyLinkProofPayloadWithActions(
        initialClassifyLinkProofPayloadState(),
        {
          kind: "link-proof/classify-payload-gate",
          dataLength: proofData.length
        }
      );
      const layoutValid =
        shouldClassifyLinkProofPayloadBodyOnly(layoutStepped.actions) ||
        shouldClassifyLinkProofPayloadBodyWithMtu(layoutStepped.actions);
      if (shouldClassifyLinkProofPayloadBodyWithMtu(layoutStepped.actions)) {
        confirmedMtu = Link.mtuFromLpPacket(packet);
        signallingBytes = Uint8Array.from(Link.signallingBytes(confirmedMtu ?? RETICULUM_MTU, mode));
        proofData = proofData.subarray(0, LINK_PROOF_BODY_SIZE);
      }

      const bodyStepped = stepSplitLinkProofBodyWithActions(initialSplitLinkProofBodyState(), {
        kind: "link-proof/split-body-gate",
        data: proofData
      });
      const body =
        shouldRejectSplitLinkProofBody(bodyStepped.actions) ||
        !shouldUseSplitLinkProofBody(bodyStepped.actions)
          ? null
          : linkProofBodyFieldsFromActions(bodyStepped.actions);
      const peerSplit =
        body !== null
          ? stepSplitIdentityPublicKeyWithActions(initialSplitIdentityPublicKeyState(), {
              kind: "identity-key/split-public-gate",
              publicKeyBytes: destination.identity!.getPublicKey()
            })
          : null;
      const peerPublic =
        peerSplit !== null && shouldUseSplitIdentityPublicKey(peerSplit.actions)
          ? identityPublicKeyFieldsFromActions(peerSplit.actions)
          : null;

      let signatureValid = false;
      const proofCrypto = stepAttemptLinkProofCryptoWithActions(
        initialAttemptLinkProofCryptoState(),
        {
          kind: "link/attempt-proof-crypto-gate",
          modeMatches,
          layoutValid,
          bodyPresent: body !== null,
          peerPublicPresent: peerPublic !== null
        }
      );
      if (
        shouldAttemptLinkProofCryptoNow(proofCrypto.actions) &&
        body !== null &&
        peerPublic !== null
      ) {
        this.loadPeer(body.peerPublicKey, peerPublic.signaturePublicKey);
        this.handshake();

        const signedStepped = stepLinkProofSignedMaterialWithActions(
          initialLinkProofSignedMaterialState(),
          {
            kind: "link-proof/signed-material-gate",
            linkId: this.linkId,
            publicKey: this.peerPublicKeyBytes!,
            ownerSigPublicKey: peerPublic.signaturePublicKey,
            signallingBytes
          }
        );
        const signedData =
          shouldUseLinkProofSignedMaterial(signedStepped.actions)
            ? linkProofSignedMaterialRawFromActions(signedStepped.actions)
            : null;
        signatureValid =
          signedData !== null &&
          destination.identity!.validate(body.signature, signedData);
      }

      const proofGate = stepLinkProofValidateWithActions(initialLinkProofValidateState(), {
        kind: "proof/validate-gate",
        canValidate: true,
        modeMatches,
        layoutValid,
        bodyPresent: body !== null,
        peerPublicPresent: peerPublic !== null,
        signatureValid
      });
      if (shouldRejectLinkProofValidate(proofGate.actions)) {
        throw new Error("Invalid link request proof");
      }

      const nowSeconds = this.clock.now() / 1000;
      await this.applyLinkEstablishActions(
        stepLinkEstablishWithActions(
          initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
          {
            kind: "establish/activated",
            atSeconds: nowSeconds,
            rtt: linkRttSecondsForRequest(nowSeconds, this.requestTime)
          }
        ).actions,
        {
          prepareInitiatorActivate: () => {
            this.attachedInterface = iface;
            this.mtu = confirmedMtu ?? RETICULUM_MTU;
            this.updateMdu();
            this.establishmentCost += packet.raw.length;
          }
        }
      );
    } catch {
      await this.applyLinkEstablishActions(
        stepLinkEstablishWithActions(
          initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
          { kind: "establish/failed" }
        ).actions
      );
    }
  }

  async handleRttPacket(packet: Packet): Promise<void> {
    const rttAccept = stepAcceptLinkRttWithActions(initialAcceptLinkRttState(), {
      kind: "link/accept-rtt-gate",
      status: this.status,
      initiator: this.initiator
    });
    const plaintext = shouldAcceptLinkRttNow(rttAccept.actions)
      ? this.decrypt(packet.data)
      : null;
    await this.applyLinkEstablishActions(
      stepLinkEstablishWithActions(
        initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
        {
          kind: "establish/rtt",
          plaintextPresent: plaintext !== null
        }
      ).actions,
      { rttPlaintext: plaintext }
    );
  }

  getChannel(): Channel {
    const createChannel = stepCreateLinkChannelWithActions(initialCreateLinkChannelState(), {
      kind: "link/create-channel-gate",
      channelPresent: this.channel !== null
    });
    if (shouldCreateLinkChannelNow(createChannel.actions)) {
      this.channel = new Channel(new LinkChannelOutlet((this as unknown as Link)));
    }

    return this.channel!;
  }

  resourceConcluded(resource: Resource): void {
    const concluded = stepLinkResourceConcludeWithActions(initialLinkResourceConcludeState(), {
      kind: "link/resource-conclude-gate",
      outgoingIndex: this.outgoingResourcesList.indexOf(resource),
      incomingIndex: this.incomingResourcesList.indexOf(resource)
    });
    const removeOutgoing = outgoingLinkResourceConcludeIndex(concluded.actions);
    if (shouldRemoveOutgoingLinkResourceConclude(concluded.actions) && removeOutgoing !== null) {
      this.outgoingResourcesList.splice(removeOutgoing, 1);
    }
    const removeIncoming = incomingLinkResourceConcludeIndex(concluded.actions);
    if (shouldRemoveIncomingLinkResourceConclude(concluded.actions) && removeIncoming !== null) {
      this.incomingResourcesList.splice(removeIncoming, 1);
    }
  }

  decrypt(ciphertext: Uint8Array): Uint8Array | null {
    try {
      return this.tokenInstance().decrypt(ciphertext);
    } catch {
      return null;
    }
  }

  protected async handleIdentifyPacket(packet: Packet): Promise<void> {
    const acceptStepped = stepAcceptLinkIdentifyWithActions(initialAcceptLinkIdentifyState(), {
      kind: "link-identify/accept-gate",
      initiator: this.initiator
    });
    const plaintext = shouldAcceptLinkIdentifyNow(acceptStepped.actions)
      ? this.decrypt(packet.data)
      : null;
    const splitStepped =
      plaintext !== null
        ? stepSplitLinkIdentifyPayloadWithActions(initialSplitLinkIdentifyPayloadState(), {
            kind: "link-identify/split-gate",
            plaintext
          })
        : null;
    const parts =
      splitStepped === null ||
      shouldRejectSplitLinkIdentifyPayload(splitStepped.actions) ||
      !shouldUseSplitLinkIdentifyPayload(splitStepped.actions)
        ? null
        : linkIdentifyPayloadFieldsFromActions(splitStepped.actions);
    const identity =
      parts !== null ? Identity.fromPublicKey(this.provider, parts.publicKey) : null;
    const signedStepped =
      parts !== null
        ? stepLinkIdentifySignedMaterialWithActions(initialLinkIdentifySignedMaterialState(), {
            kind: "link-identify/signed-material-gate",
            linkId: this.linkId,
            publicKey: parts.publicKey
          })
        : null;
    const signedData =
      signedStepped !== null && shouldUseLinkIdentifySignedMaterial(signedStepped.actions)
        ? linkIdentifySignedMaterialRawFromActions(signedStepped.actions)
        : null;
    const signatureValid =
      identity !== null &&
      parts !== null &&
      signedData !== null &&
      identity.validate(parts.signature, signedData);

    const stepped = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: this.initiator }),
      {
        kind: "identify/received",
        plaintextPresent: plaintext !== null,
        partsPresent: parts !== null,
        identityPresent: identity !== null,
        signatureValid
      }
    );
    this.applyLinkIdentifyActions(stepped.actions, identity);
  }

  protected applyLinkIdentifyActions(
    actions: readonly LinkIdentifyAction[],
    identity: Identity | null
  ): void {
    if (shouldRejectLinkIdentify(actions)) {
      return;
    }

    const commitStepped = stepCommitLinkRemoteIdentityWithActions(
      initialCommitLinkRemoteIdentityState(),
      {
        kind: "link-identify/commit-remote-identity-gate",
        planAccept: shouldCommitLinkIdentify(actions),
        identityPresent: identity !== null
      }
    );
    /* Commit remoteIdentity only from `commit` (no ad-hoc identity !== null). */
    if (!shouldCommitLinkRemoteIdentityNow(commitStepped.actions)) {
      return;
    }
    this.remoteIdentity = identity!;
    this.callbacks.remoteIdentified?.((this as unknown as Link), identity!);
  }

  protected async handleRequestPacket(packet: Packet): Promise<void> {
    const requestId = packet.truncatedHash();
    const plaintext = this.decrypt(packet.data);

    const unpackStepped =
      plaintext !== null
        ? stepUnpackLinkRequestWithActions(initialUnpackLinkRequestState(), {
            kind: "link-request-codec/unpack-gate",
            data: plaintext
          })
        : null;
    const unpacked =
      unpackStepped !== null &&
      !shouldRejectUnpackLinkRequest(unpackStepped.actions) &&
      shouldUseUnpackLinkRequest(unpackStepped.actions)
        ? linkRequestFieldsFromActions(unpackStepped.actions)
        : null;

    const handlerDestination = this.owner ?? this.destination;
    const pathHash = unpacked?.pathHash ?? null;
    const handler =
      handlerDestination !== null && pathHash !== null
        ? handlerDestination.getRequestHandler(pathHash)
        : undefined;

    const stepped = stepLinkAppRequestInboundWithActions(
      initialLinkAppRequestInboundState({ mdu: this.mdu }),
      {
        kind: "app-request/received",
        plaintextPresent: plaintext !== null,
        handlerDestinationPresent: handlerDestination !== null,
        handlerPresent: handler !== undefined,
        allow: handler?.allow ?? 0,
        allowedList: handler?.allowedList ?? [],
        remoteIdentityHash: this.remoteIdentity?.hash ?? null,
        unpackedPresent: unpacked !== null
      }
    );
    await this.applyLinkAppRequestInboundActions(stepped.state, stepped.actions, {
      unpacked,
      handler,
      requestId,
      packedResponse: null
    });
  }

  protected async applyLinkAppRequestInboundActions(
    state: LinkAppRequestInboundState,
    actions: readonly LinkAppRequestInboundAction[],
    ctx: {
      readonly unpacked: LinkRequestFields | null;
      readonly handler: RequestHandler | undefined;
      readonly requestId: Uint8Array;
      readonly packedResponse: Uint8Array | null;
    }
  ): Promise<void> {
    if (
      shouldIgnoreLinkAppRequestInbound(actions) ||
      shouldForbidLinkAppRequestInbound(actions)
    ) {
      return;
    }

    const invokeStepped = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: shouldInvokeLinkAppRequestInbound(actions),
        unpackedPresent: ctx.unpacked !== null,
        handlerPresent: ctx.handler !== undefined
      }
    );
    /* Invoke handler only from `invoke` (no ad-hoc unpacked/handler presence). */
    if (shouldInvokeLinkAppRequestHandlerNow(invokeStepped.actions)) {
      const response = await ctx.handler!.responseGenerator(
        ctx.handler!.path,
        ctx.unpacked!.data,
        ctx.requestId,
        this.linkId,
        this.remoteIdentity,
        ctx.unpacked!.requestedAt
      );

      const packStepped =
        response !== null
          ? stepPackLinkResponseWithActions(initialPackLinkResponseState(), {
              kind: "link-response-codec/pack-gate",
              requestId: ctx.requestId,
              response
            })
          : null;
      const packedResponse =
        packStepped !== null && shouldUsePackLinkResponse(packStepped.actions)
          ? packLinkResponseRawFromActions(packStepped.actions)
          : null;
      const next = stepLinkAppRequestInboundWithActions(state, {
        kind: "app-request/handler-result",
        responsePresent: packedResponse !== null,
        packedLength: packedResponse?.length ?? 0
      });
      await this.applyLinkAppRequestInboundActions(next.state, next.actions, {
        ...ctx,
        packedResponse
      });
      return;
    }

    if (
      shouldIgnoreLinkAppRequestInboundResponse(actions) ||
      shouldRejectLinkAppRequestInboundTooBig(actions)
    ) {
      return;
    }

    const sendStepped = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: shouldSendLinkAppRequestInboundResponse(actions),
        packedPresent: ctx.packedResponse !== null
      }
    );
    /* Transmit packed response only from `send` (no ad-hoc packedResponse reads). */
    if (shouldSendLinkAppRequestResponseNow(sendStepped.actions)) {
      await this.sendContext(PacketContext.RESPONSE, ctx.packedResponse!);
    }
  }

  protected async handleResponsePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
          kind: "link/dispatch-plaintext-gate",
          plaintextPresent: plaintext !== null
        }).actions
      )) {
      return;
    }

    const unpackStepped = stepUnpackLinkResponseWithActions(
      initialUnpackLinkResponseState(),
      {
        kind: "link-response-codec/unpack-gate",
        data: plaintext!
      }
    );
    if (
      shouldRejectUnpackLinkResponse(unpackStepped.actions) ||
      !shouldUseUnpackLinkResponse(unpackStepped.actions)
    ) {
      return;
    }
    const fields = linkResponseFieldsFromActions(unpackStepped.actions);
    if (fields === null) {
      return;
    }
    const pending = [...this.pendingRequests];
    /** Adapt pending app-request index via protocol actions (no ad-hoc
     * `indexOfPendingLinkAppRequest` reads). */
    const indexStepped = stepIndexOfPendingLinkAppRequestWithActions(
      initialIndexOfPendingLinkAppRequestState(),
      {
        kind: "link/pending-app-request-index-gate",
        requestIds: pending.map((entry) => entry.requestId),
        target: fields.requestId
      }
    );
    /** Adapt RESPONSE deliver via protocol actions (no ad-hoc
     * `shouldDeliverPendingLinkAppResponse` reads). */
    const deliverStepped = stepDeliverPendingLinkAppResponseWithActions(
      initialDeliverPendingLinkAppResponseState(),
      {
        kind: "link/pending-app-response-deliver-gate",
        indexPresent: shouldUsePendingLinkAppRequestIndex(indexStepped.actions)
      }
    );
    if (shouldDeliverPendingLinkAppResponseNow(deliverStepped.actions)) {
      const index = pendingLinkAppRequestIndexFromActions(indexStepped.actions)!;
      pending[index]!.responseReceived(fields.response);
    }
  }

  protected async handleResourceAdvertisementPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
          kind: "link/dispatch-plaintext-gate",
          plaintextPresent: plaintext !== null
        }).actions
      )) {
      return;
    }

    const stepped = stepLinkResourceAdvertisementWithActions(
      initialLinkResourceAdvertisementState({ strategy: this.resourceStrategy }),
      {
        kind: "resource-adv/received",
        isRequest: ResourceAdvertisement.isRequest(plaintext!)
      }
    );
    await this.applyLinkResourceAdvertisementActions(
      stepped.state,
      stepped.actions,
      plaintext!,
      packet
    );
  }

  protected async applyLinkResourceAdvertisementActions(
    state: LinkResourceAdvertisementState,
    actions: readonly LinkResourceAdvertisementAction[],
    plaintext: Uint8Array,
    packet: Packet
  ): Promise<void> {
    if (shouldIgnoreLinkResourceAdvertisement(actions)) {
      return;
    }

    if (shouldAskAppLinkResourceAdvertisement(actions)) {
      try {
        const advertisement = ResourceAdvertisement.unpack(plaintext);
        const next = stepLinkResourceAdvertisementWithActions(state, {
          kind: "resource-adv/app-result",
          accepted: this.callbacks.resource?.(advertisement) === true
        });
        await this.applyLinkResourceAdvertisementActions(
          next.state,
          next.actions,
          plaintext,
          packet
        );
      } catch {
        return;
      }
      return;
    }

    if (shouldRejectLinkResourceAdvertisement(actions)) {
      Resource.reject((this as unknown as Link), plaintext);
      return;
    }

    if (!shouldAcceptLinkResourceAdvertisement(actions)) {
      return;
    }
    Resource.accept((this as unknown as Link), plaintext, packet, {
      callback: (resource) => this.callbacks.resourceConcluded?.(resource)
    });
  }

  protected async handleResourceRequestPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
          kind: "link/dispatch-plaintext-gate",
          plaintextPresent: plaintext !== null
        }).actions
      )) {
      return;
    }

    const resourceHash = Resource.readRequestHash(plaintext!);
    for (const resource of this.outgoingResourcesList) {
      if (
        shouldHandleOutgoingResourceRequestNow(
          stepHandleOutgoingResourceRequestWithActions(
            initialHandleOutgoingResourceRequestState(),
            {
              kind: "link/handle-outgoing-resource-request-gate",
              hashMatches: equalBytes(resource.hash, resourceHash),
              alreadySeen: resource.hasSeenRequest(packet)
            }
          ).actions
        )
      ) {
        resource.trackRequest(packet);
        await resource.handleRequest(plaintext!);
        return;
      }
    }
  }

  protected async handleResourceHashmapUpdatePacket(packet: Packet): Promise<void> {
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
    for (const resource of this.incomingResourcesList) {
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
        resource.hashmapUpdatePacket(plaintext!);
        return;
      }
    }
  }
}
