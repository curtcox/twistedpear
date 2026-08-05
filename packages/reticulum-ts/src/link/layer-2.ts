import {
  LINK_ENABLED_MODES,
  LINK_ESTABLISHMENT_TIMEOUT_PER_HOP,
  LINK_INITIATOR_ENTROPY_SIZE,
  LINK_KEEPALIVE,
  LINK_KEEPALIVE_MAX_RTT,
  LINK_KEEPALIVE_MIN,
  LINK_KEEPALIVE_TIMEOUT_FACTOR,
  LINK_MODE_BYTEMASK,
  LINK_MODE_DEFAULT,
  LINK_MTU_BYTEMASK,
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_MTU_SIZE,
  LINK_PROOF_SIGNATURE_SIZE,
  LINK_REQUEST_ECPUB_SIZE,
  LINK_RESPONSE_MAX_GRACE_TIME,
  LINK_RESPONDER_ENTROPY_SIZE,
  LINK_STALE_FACTOR,
  LINK_STALE_GRACE,
  LINK_TRAFFIC_TIMEOUT_FACTOR,
  LINK_WATCHDOG_MAX_SLEEP_MS,
  LINK_X25519_KEY_SIZE,
  LinkMode,
  LinkResourceStrategy,
  LinkStatus,
  LinkTeardownReason,
  shouldAcceptLinkIdentifyNow,
  initialAcceptLinkIdentifyState,
  stepAcceptLinkIdentifyWithActions,
  shouldAcceptLinkOwnerPublicKeyNow,
  initialAcceptLinkOwnerPublicKeyState,
  stepAcceptLinkOwnerPublicKeyWithActions,
  shouldAcceptLinkRttNow,
  initialAcceptLinkRttState,
  stepAcceptLinkRttWithActions,
  shouldAllowIdentifyOnLink,
  initialIdentifyOnLinkAllowState,
  stepIdentifyOnLinkAllowWithActions,
  shouldAllowLinkRequest,
  initialLinkRequestAllowState,
  stepLinkRequestAllowWithActions,
  shouldAllowLinkSend,
  initialLinkSendAllowState,
  stepLinkSendAllowWithActions,
  shouldAllowPerformLinkHandshake,
  initialPerformLinkHandshakeAllowState,
  stepPerformLinkHandshakeAllowWithActions,
  shouldAllowProveLink,
  initialProveLinkAllowState,
  stepProveLinkAllowWithActions,
  shouldAllowResendLinkPacket,
  initialResendLinkPacketAllowState,
  stepResendLinkPacketAllowWithActions,
  shouldAllowUpdateLinkKeepalive,
  initialUpdateLinkKeepaliveAllowState,
  stepUpdateLinkKeepaliveAllowWithActions,
  shouldAllowValidateLinkProof,
  initialValidateLinkProofAllowState,
  stepValidateLinkProofAllowWithActions,
  deriveRnsLinkKeyRawFromActions,
  encodeLinkMtuBytesRawFromActions,
  encodeLinkSignallingBytesRawFromActions,
  initialComputeKeepaliveState,
  initialIndexOfPendingLinkAppRequestState,
  initialDeliverPendingLinkAppResponseState,
  initialComputeLinkEstablishmentTimeoutState,
  initialComputeLinkMduState,
  initialComputeLinkRequestTimeoutState,
  initialComputeLinkRttSecondsState,
  initialContainsResourceHashState,
  initialLinkAppRequestInboundState,
  initialInvokeLinkAppRequestHandlerState,
  initialLinkEstablishState,
  initialLinkIdentifyState,
  initialCommitLinkRemoteIdentityState,
  initialLinkProofValidateState,
  initialLinkResourceAdvertisementState,
  initialLinkTeardownState,
  initialLinkTokenAccessState,
  initialLinkValidateRequestState,
  initialMergeLinkRttState,
  initialPendingLinkRequestRegisterState,
  initialRequestLinkDestinationState,
  initialSendLinkAppRequestResponseState,
  shouldTreatLinkClosed,
  initialLinkClosedState,
  stepLinkClosedWithActions,
  shouldMatchExpectedLinkMode,
  initialExpectedLinkModeState,
  stepExpectedLinkModeWithActions,
  shouldTreatLinkModeEnabled,
  initialLinkModeEnabledState,
  stepLinkModeEnabledWithActions,
  linkEstablishActivatedAction,
  linkEstablishmentTimeoutFromActions,
  linkIdentifySignedMaterialRawFromActions,
  linkKeepaliveFromActions,
  linkMduFromActions,
  linkProofSignedMaterialRawFromActions,
  shouldLinkReadyForNewResource,
  initialLinkReadyForNewResourceState,
  stepLinkReadyForNewResourceWithActions,
  linkRequestHashablePartRawFromActions,
  linkRequestTimeoutFromActions,
  linkRttSecondsFromActions,
  linkTeardownRemoteCloseAction,
  linkTeardownSendThenCloseAction,
  mergeLinkRttFromActions,
  modeFromLinkProofDataFromActions,
  modeFromLinkRequestDataFromActions,
  msgpackFloatFromActions,
  mtuFromLinkProofDataFromActions,
  mtuFromLinkRequestDataFromActions,
  packLinkKeepaliveProbeRawFromActions,
  packLinkKeepaliveReplyRawFromActions,
  packLinkIdentifyPayloadRawFromActions,
  packLinkProofDataRawFromActions,
  packLinkRequestDataRawFromActions,
  packMsgpackFloat64RawFromActions,
  initialClassifyLinkKeepaliveState,
  initialClassifyLinkProofPayloadState,
  initialEncodeLinkMtuBytesState,
  initialEncodeLinkSignallingBytesState,
  initialLinkProofSignedMaterialState,
  initialLinkRequestHashablePartState,
  initialModeFromLinkProofDataState,
  initialModeFromLinkRequestDataState,
  initialMtuFromLinkProofDataState,
  initialMtuFromLinkRequestDataState,
  initialLinkAppRequestState,
  initialLinkAppRequestTransmitState,
  initialLinkDataContextState,
  initialLinkHopsMatchState,
  initialLinkInitiatorMtuState,
  initialLinkRequestResponderMtuState,
  initialLinkResourceConcludeState,
  initialLinkIdentifySignedMaterialState,
  initialPackLinkIdentifyPayloadState,
  initialPackLinkKeepaliveProbeState,
  initialPackLinkKeepaliveReplyState,
  initialPackLinkProofDataState,
  initialPackLinkRequestDataState,
  initialPackLinkRequestState,
  initialPackLinkResponseState,
  initialPackMsgpackFloat64State,
  initialSplitLinkIdentifyPayloadState,
  initialSplitLinkProofBodyState,
  initialSplitLinkRequestDataState,
  initialUnpackLinkRequestState,
  initialUnpackLinkResponseState,
  initialUnpackMsgpackFloatState,
  linkIdentifyPayloadFieldsFromActions,
  linkInitiatorMtuFromActions,
  linkProofBodyFieldsFromActions,
  linkRequestFieldsFromActions,
  linkRequestKeyFieldsFromActions,
  linkRequestResponderMtuFromActions,
  linkResponseFieldsFromActions,
  packLinkRequestRawFromActions,
  packLinkResponseRawFromActions,
  shouldClassifyLinkKeepaliveProbe,
  shouldClassifyLinkProofPayloadBodyOnly,
  shouldClassifyLinkProofPayloadBodyWithMtu,
  shouldRejectMtuFromLinkProofData,
  shouldRejectMtuFromLinkRequestData,
  shouldRejectPackLinkIdentifyPayload,
  shouldRejectSplitLinkIdentifyPayload,
  shouldRejectSplitLinkProofBody,
  shouldRejectSplitLinkRequestData,
  shouldRejectUnpackLinkRequest,
  shouldRejectUnpackLinkResponse,
  shouldRejectUnpackMsgpackFloat,
  shouldUseEncodeLinkMtuBytes,
  shouldUseEncodeLinkSignallingBytes,
  shouldMatchLinkHops,
  shouldUseLinkEstablishmentTimeout,
  shouldUseLinkInitiatorMtu,
  shouldUseLinkKeepalive,
  shouldUseLinkMdu,
  shouldUseLinkProofSignedMaterial,
  shouldUseLinkRequestHashablePart,
  shouldUseLinkRequestResponderMtu,
  shouldUseLinkRequestTimeout,
  shouldUseLinkRttSeconds,
  shouldUseMergeLinkRtt,
  shouldUseModeFromLinkProofData,
  shouldUseModeFromLinkRequestData,
  shouldUseMtuFromLinkProofData,
  shouldUseMtuFromLinkRequestData,
  shouldUseLinkIdentifySignedMaterial,
  shouldUsePackLinkIdentifyPayload,
  shouldUsePackLinkKeepaliveProbe,
  shouldUsePackLinkKeepaliveReply,
  shouldUsePackLinkProofData,
  shouldUsePackLinkRequest,
  shouldUsePackLinkRequestData,
  shouldUsePackLinkResponse,
  shouldUsePackMsgpackFloat64,
  shouldUseSplitLinkIdentifyPayload,
  shouldUseSplitLinkProofBody,
  shouldUseSplitLinkRequestData,
  shouldUseUnpackLinkRequest,
  shouldUseUnpackLinkResponse,
  shouldUseUnpackMsgpackFloat,
  stepClassifyLinkKeepaliveWithActions,
  stepClassifyLinkProofPayloadWithActions,
  stepComputeKeepaliveWithActions,
  stepComputeLinkEstablishmentTimeoutWithActions,
  stepComputeLinkMduWithActions,
  stepComputeLinkRequestTimeoutWithActions,
  stepComputeLinkRttSecondsWithActions,
  stepEncodeLinkMtuBytesWithActions,
  stepEncodeLinkSignallingBytesWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkRequestHashablePartWithActions,
  stepMergeLinkRttWithActions,
  stepModeFromLinkProofDataWithActions,
  stepModeFromLinkRequestDataWithActions,
  stepMtuFromLinkProofDataWithActions,
  stepMtuFromLinkRequestDataWithActions,
  stepLinkHopsMatchWithActions,
  stepLinkInitiatorMtuWithActions,
  stepLinkRequestResponderMtuWithActions,
  stepLinkIdentifySignedMaterialWithActions,
  stepPackLinkIdentifyPayloadWithActions,
  stepPackLinkKeepaliveProbeWithActions,
  stepPackLinkKeepaliveReplyWithActions,
  stepPackLinkProofDataWithActions,
  stepPackLinkRequestDataWithActions,
  stepPackLinkRequestWithActions,
  stepPackLinkResponseWithActions,
  stepPackMsgpackFloat64WithActions,
  stepSplitLinkIdentifyPayloadWithActions,
  stepSplitLinkProofBodyWithActions,
  stepSplitLinkRequestDataWithActions,
  stepUnpackLinkRequestWithActions,
  stepIndexOfPendingLinkAppRequestWithActions,
  stepDeliverPendingLinkAppResponseWithActions,
  stepUnpackLinkResponseWithActions,
  stepUnpackMsgpackFloatWithActions,
  initialPendingLinkRequestUnregisterState,
  pendingLinkRequestUnregisterIndex,
  shouldAcceptLinkEstablishRtt,
  shouldAcceptLinkPacketInterfaceNow,
  initialAcceptLinkPacketInterfaceState,
  stepAcceptLinkPacketInterfaceWithActions,
  shouldAcceptLinkResourceAdvertisement,
  shouldAcceptRemoteLinkTeardown,
  shouldAcceptResourceHashmapUpdateFrameNow,
  shouldAcceptResourceProofPayloadNow,
  initialAcceptResourceProofPayloadState,
  stepAcceptResourceProofPayloadWithActions,
  shouldAcceptResourceProofSplitNow,
  initialAcceptResourceProofSplitState,
  stepAcceptResourceProofSplitWithActions,
  shouldActivateLinkEstablish,
  shouldAllowRequestLinkDestination,
  shouldAskAppLinkResourceAdvertisement,
  shouldAttemptLinkProofCryptoNow,
  initialAttemptLinkProofCryptoState,
  stepAttemptLinkProofCryptoWithActions,
  shouldCloseOnlyLinkTeardown,
  shouldCommitLinkIdentify,
  shouldCommitLinkRemoteIdentityNow,
  shouldContinueLinkValidateRequestNow,
  initialContinueLinkValidateRequestState,
  stepContinueLinkValidateRequestWithActions,
  shouldProceedLinkValidateRequest,
  shouldCreateLinkChannelNow,
  initialCreateLinkChannelState,
  stepCreateLinkChannelWithActions,
  shouldCreateLinkToken,
  shouldDispatchLinkPlaintextNow,
  initialDispatchLinkPlaintextState,
  stepDispatchLinkPlaintextWithActions,
  shouldUsePendingLinkAppRequestIndex,
  pendingLinkAppRequestIndexFromActions,
  shouldDeliverPendingLinkAppResponseNow,
  shouldEncryptLinkPayloadNow,
  initialEncryptLinkPayloadState,
  stepEncryptLinkPayloadWithActions,
  shouldEnterLinkHandshake,
  shouldFailLinkEstablish,
  shouldForbidLinkAppRequestInbound,
  shouldHandleIncomingResourceByHashNow,
  initialHandleIncomingResourceByHashState,
  stepHandleIncomingResourceByHashWithActions,
  shouldHandleOutgoingResourceRequestNow,
  initialHandleOutgoingResourceRequestState,
  stepHandleOutgoingResourceRequestWithActions,
  shouldIgnoreInitiatorKeepaliveProbeNow,
  initialIgnoreInitiatorKeepaliveProbeState,
  stepIgnoreInitiatorKeepaliveProbeWithActions,
  shouldIgnoreLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestInboundResponse,
  shouldIgnoreLinkEstablishRtt,
  shouldHandleLinkDataChannel,
  shouldHandleLinkDataClose,
  shouldHandleLinkDataIdentify,
  shouldHandleLinkDataKeepalive,
  shouldHandleLinkDataPlaintext,
  shouldHandleLinkDataRequest,
  shouldHandleLinkDataResource,
  shouldHandleLinkDataResourceAdv,
  shouldHandleLinkDataResourceHmu,
  shouldHandleLinkDataResourceIcl,
  shouldHandleLinkDataResourceRcl,
  shouldHandleLinkDataResourceReq,
  shouldHandleLinkDataResponse,
  shouldHandleLinkDataRtt,
  shouldIgnoreLinkDataContext,
  shouldIgnoreLinkResourceAdvertisement,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldInvokeLinkAppRequestInbound,
  shouldKeepPendingLinkAppRequestTransmit,
  shouldPresentResourceHash,
  shouldRegisterLinkResourceNow,
  initialRegisterLinkResourceState,
  stepRegisterLinkResourceWithActions,
  shouldRegisterPendingLinkRequestNow,
  shouldRejectLinkAppRequest,
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkIdentify,
  shouldRejectLinkProofValidate,
  shouldRejectLinkResourceAdvertisement,
  shouldRejectLinkTokenNoKey,
  shouldRemoveIncomingLinkResourceConclude,
  shouldRemoveOutgoingLinkResourceConclude,
  incomingLinkResourceConcludeIndex,
  outgoingLinkResourceConcludeIndex,
  shouldReplyKeepaliveProbeNow,
  initialReplyKeepaliveProbeState,
  stepReplyKeepaliveProbeWithActions,
  shouldReuseLinkToken,
  shouldSendLinkAppRequest,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldSendLinkTeardownThenClose,
  shouldTeardownLinkEstablish,
  shouldUnregisterLinkAppRequestTransmit,
  shouldRemovePendingLinkRequest,
  shouldUpdateLinkLastDataNow,
  initialUpdateLinkLastDataState,
  stepUpdateLinkLastDataWithActions,
  shouldDispatchLinkInboundData,
  initialLinkInboundDataPacketState,
  stepLinkInboundDataPacketWithActions,
  identityPublicKeyFieldsFromActions,
  initialLinkKeepaliveContextState,
  initialSplitIdentityPublicKeyState,
  initialDeriveRnsLinkKeyState,
  initialSplitInitiatorLinkEntropyState,
  initialSplitResponderLinkEntropyState,
  initiatorLinkEntropyFieldsFromActions,
  responderLinkEntropyFieldsFromActions,
  shouldRejectDeriveRnsLinkKey,
  shouldRejectSplitInitiatorLinkEntropy,
  shouldUseDeriveRnsLinkKey,
  shouldRejectSplitResponderLinkEntropy,
  shouldTreatLinkKeepaliveContext,
  shouldTreatLinkKeepaliveOther,
  shouldUseSplitIdentityPublicKey,
  shouldUseSplitInitiatorLinkEntropy,
  shouldUseSplitResponderLinkEntropy,
  stepLinkKeepaliveContextWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepDeriveRnsLinkKeyWithActions,
  stepSplitInitiatorLinkEntropyWithActions,
  stepSplitResponderLinkEntropyWithActions,
  initialSplitResourceHashmapUpdatePacketState,
  initialAcceptResourceHashmapUpdateFrameState,
  initialSplitResourceProofState,
  resourceHashmapUpdatePacketFieldsFromActions,
  resourceProofFieldsFromActions,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectSplitResourceProof,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseSplitResourceProof,
  stepLinkAppRequestInboundWithActions,
  stepLinkAppRequestTransmitWithActions,
  stepLinkAppRequestWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepLinkDataContextWithActions,
  stepLinkEstablishWithActions,
  stepLinkIdentifyWithActions,
  stepCommitLinkRemoteIdentityWithActions,
  stepLinkProofValidateWithActions,
  stepLinkResourceAdvertisementWithActions,
  stepContainsResourceHashWithActions,
  stepLinkResourceConcludeWithActions,
  stepPendingLinkRequestRegisterWithActions,
  stepPendingLinkRequestUnregisterWithActions,
  stepRequestLinkDestinationWithActions,
  stepLinkTeardownWithActions,
  stepLinkTokenAccessWithActions,
  stepLinkValidateRequestWithActions,
  stepLinkWatchdogWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepAcceptResourceHashmapUpdateFrameWithActions,
  stepSplitResourceProofWithActions,
  stepUtf8EncodeWithActions,
  initialUtf8EncodeState,
  shouldUseUtf8Encode,
  utf8EncodeRawFromActions,
  type LinkAppRequestInboundAction,
  type LinkAppRequestInboundState,
  type LinkEstablishAction,
  type LinkIdentifyAction,
  type LinkModeValue,
  type LinkRequestFields,
  type LinkResourceAdvertisementAction,
  type LinkResourceAdvertisementState,
  type LinkResourceStrategyValue,
  type LinkStatusValue,
  type LinkTeardownAction,
  type LinkTeardownReasonValue,
  type LinkWatchdogState,
  type LinkWatchdogStepResult,
} from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import { Token } from "../crypto/token.js";
import { Channel, LinkChannelOutlet } from "../channel.js";
import { equalBytes } from "../crypto/bytes.js";
import { DestinationDirection, DestinationType } from "../destination.js";
import { Identity } from "../identity.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { LinkRequestReceipt } from "../link-request-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import type {
  RegisteredDestination,
  RequestHandler,
} from "../registered-destination.js";
import { RETICULUM_MTU } from "../reticulum.js";
import type { Clock } from "../runtime/runtime.js";
import type { LeafTransport } from "../transport/node.js";
import { PATHFINDER_MAX_HOPS } from "../transport/node.js";
import { Resource, ResourceAdvertisement } from "../resource.js";
import {
  LINK_ECPUB_SIZE,
  LINK_KEY_SIZE,
  LINK_MTU_SIZE,
  LINK_SIGNATURE_SIZE,
  linkEstablishmentTimeoutForHops,
  linkMduForMtu,
  linkRequestTimeoutForRtt,
  linkRttSecondsForRequest,
  mergedLinkRtt,
} from "./shared.js";
import type {
  InitiatorLinkOptions,
  LinkCallbacks,
  LinkRequestOptions,
  LinkSendContextResult,
} from "./shared.js";
import { Link } from "../link.js";
import { LinkLayer1 } from "./layer-1.js";
export class LinkLayer2 extends LinkLayer1 {
  static request(options: InitiatorLinkOptions): Link {
    const destination = options.destination;
    const requestLink = stepRequestLinkDestinationWithActions(
      initialRequestLinkDestinationState(),
      {
        kind: "destination/request-link-gate",
        typeSingle: destination.type === DestinationType.SINGLE,
        directionOut: destination.direction === DestinationDirection.OUT,
      },
    );
    if (!shouldAllowRequestLinkDestination(requestLink.actions)) {
      throw new Error(
        "Links can only be established to OUT SINGLE destinations",
      );
    }

    const provider = destination.cryptoProvider;
    const link = new Link(
      provider,
      options.transport,
      options.transport.clock,
      {
        initiator: true,
        owner: null,
        destination,
        ...(options.callbacks === undefined
          ? {}
          : { callbacks: options.callbacks }),
      },
    );

    const initiatorStepped = stepSplitInitiatorLinkEntropyWithActions(
      initialSplitInitiatorLinkEntropyState(),
      {
        kind: "link-keygen/split-initiator-gate",
        entropy:
          options.entropy ??
          options.transport.entropy.randomBytes(LINK_INITIATOR_ENTROPY_SIZE),
      },
    );
    const initiatorKeys = initiatorLinkEntropyFieldsFromActions(
      initiatorStepped.actions,
    );
    if (
      shouldRejectSplitInitiatorLinkEntropy(initiatorStepped.actions) ||
      !shouldUseSplitInitiatorLinkEntropy(initiatorStepped.actions) ||
      initiatorKeys === null
    ) {
      throw new Error(
        `Initiator link entropy must be at least ${LINK_INITIATOR_ENTROPY_SIZE} bytes`,
      );
    }
    link.privateKey = initiatorKeys.privateKey;
    link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
    const signaturePublicKeyBytes = provider.ed25519PublicFromPrivate(
      initiatorKeys.signaturePrivateKey,
    );
    link.expectedHops = options.transport.hopsTo(destination.hash);
    link.requestTime = options.transport.clock.now() / 1000;
    link.establishmentTimeout = linkEstablishmentTimeoutForHops(
      link.expectedHops ?? 1,
      LINK_KEEPALIVE,
    );

    const discoveryEnabled = options.linkMtuDiscovery !== false;
    const mtuStepped = stepLinkInitiatorMtuWithActions(
      initialLinkInitiatorMtuState(),
      {
        kind: "link/initiator-mtu-gate",
        discoveryEnabled,
        nextHopMtu: discoveryEnabled
          ? options.transport.nextHopInterfaceMtu(destination.hash)
          : null,
        defaultMtu: RETICULUM_MTU,
      },
    );
    const mtu = shouldUseLinkInitiatorMtu(mtuStepped.actions)
      ? (linkInitiatorMtuFromActions(mtuStepped.actions) ?? RETICULUM_MTU)
      : RETICULUM_MTU;

    link.mtu = mtu;
    link.mode = LINK_MODE_DEFAULT;
    link.updateMdu();
    const packStepped = stepPackLinkRequestDataWithActions(
      initialPackLinkRequestDataState(),
      {
        kind: "link-request/pack-gate",
        publicKey: link.publicKeyBytes,
        signaturePublicKey: signaturePublicKeyBytes,
        signallingBytes: Link.signallingBytes(mtu, link.mode),
      },
    );
    const requestData = shouldUsePackLinkRequestData(packStepped.actions)
      ? packLinkRequestDataRawFromActions(packStepped.actions)
      : null;
    if (requestData === null) {
      throw new Error("Link.request: missing use-raw action");
    }
    const packet = Packet.fromFields(provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.SINGLE,
      packetType: PacketType.LINKREQUEST,
      destinationHash: destination.hash,
      context: PacketContext.NONE,
      data: requestData,
    });

    link.setLinkId(packet);
    link.establishmentCost += packet.raw.length;
    options.transport.registerLink(link);
    link.startWatchdog();
    void options.transport.sendPacket(packet).then(() => {
      link.hadOutbound(false);
    });

    return link;
  }

  static validateRequest(
    owner: RegisteredDestination,
    transport: LeafTransport,
    packet: Packet,
    iface: PacketInterface,
    options?: { readonly entropy?: Uint8Array },
  ): Link | null {
    const splitStepped = stepSplitLinkRequestDataWithActions(
      initialSplitLinkRequestDataState(),
      {
        kind: "link-request/split-gate",
        data: packet.data,
      },
    );
    const request =
      shouldRejectSplitLinkRequestData(splitStepped.actions) ||
      !shouldUseSplitLinkRequestData(splitStepped.actions)
        ? null
        : linkRequestKeyFieldsFromActions(splitStepped.actions);
    const early = stepLinkValidateRequestWithActions(
      initialLinkValidateRequestState(),
      {
        kind: "validate-request/gate",
        requestPresent: request !== null,
        ownerIdentityPresent: owner.identity !== null,
        modeEnabled: true,
      },
    );
    if (
      !shouldContinueLinkValidateRequestNow(
        stepContinueLinkValidateRequestWithActions(
          initialContinueLinkValidateRequestState(),
          {
            kind: "validate-request/continue-gate",
            planProceed: shouldProceedLinkValidateRequest(early.actions),
            requestPresent: request !== null,
          },
        ).actions,
      ) ||
      request === null
    ) {
      return null;
    }

    try {
      const provider = owner.cryptoProvider;
      const link = new Link(provider, transport, transport.clock, {
        initiator: false,
        owner,
        destination: null,
      });

      const responderStepped = stepSplitResponderLinkEntropyWithActions(
        initialSplitResponderLinkEntropyState(),
        {
          kind: "link-keygen/split-responder-gate",
          entropy:
            options?.entropy ??
            transport.entropy.randomBytes(LINK_RESPONDER_ENTROPY_SIZE),
        },
      );
      const responderKeys = responderLinkEntropyFieldsFromActions(
        responderStepped.actions,
      );
      if (
        shouldRejectSplitResponderLinkEntropy(responderStepped.actions) ||
        !shouldUseSplitResponderLinkEntropy(responderStepped.actions) ||
        responderKeys === null
      ) {
        throw new Error(
          `Responder link entropy must be at least ${LINK_RESPONDER_ENTROPY_SIZE} bytes`,
        );
      }
      link.privateKey = responderKeys.privateKey;
      link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
      link.loadPeer(request.publicKey, request.signaturePublicKey);
      link.setLinkId(packet);

      const responderMtuStepped = stepLinkRequestResponderMtuWithActions(
        initialLinkRequestResponderMtuState(),
        {
          kind: "link/request-responder-mtu-gate",
          signallingPresent: request.signallingBytes.length > 0,
          signallingMtu: Link.mtuFromLrPacket(packet),
          currentMtu: link.mtu,
          defaultMtu: RETICULUM_MTU,
        },
      );
      if (shouldUseLinkRequestResponderMtu(responderMtuStepped.actions)) {
        const selected = linkRequestResponderMtuFromActions(
          responderMtuStepped.actions,
        );
        if (selected !== null) {
          link.mtu = selected;
        }
      }

      link.mode = Link.modeFromLrPacket(packet);
      const modeGate = stepLinkValidateRequestWithActions(
        initialLinkValidateRequestState(),
        {
          kind: "validate-request/gate",
          requestPresent: true,
          ownerIdentityPresent: true,
          modeEnabled: shouldTreatLinkModeEnabled(
            stepLinkModeEnabledWithActions(initialLinkModeEnabledState(), {
              kind: "link/mode-enabled-gate",
              mode: link.mode,
            }).actions,
          ),
        },
      );
      if (!shouldProceedLinkValidateRequest(modeGate.actions)) {
        return null;
      }

      link.updateMdu();
      link.attachedInterface = iface;
      link.establishmentCost += packet.raw.length;
      link.handshake();
      link.requestTime = transport.clock.now() / 1000;
      link.lastInbound = link.requestTime;
      link.establishmentTimeout = linkEstablishmentTimeoutForHops(
        packet.hops,
        LINK_KEEPALIVE,
      );
      transport.registerLink(link);
      link.startWatchdog();
      void link.prove();
      return link;
    } catch {
      return null;
    }
  }

  static modeFromLrPacket(packet: Packet): LinkModeValue {
    const stepped = stepModeFromLinkRequestDataWithActions(
      initialModeFromLinkRequestDataState(),
      {
        kind: "link-proof/mode-from-request-gate",
        data: packet.data,
        defaultMode: LINK_MODE_DEFAULT,
      },
    );
    const mode = modeFromLinkRequestDataFromActions(stepped.actions);
    if (!shouldUseModeFromLinkRequestData(stepped.actions) || mode === null) {
      throw new Error("Could not decode link-request mode");
    }
    return mode as LinkModeValue;
  }

  static modeFromLpPacket(packet: Packet): LinkModeValue {
    const stepped = stepModeFromLinkProofDataWithActions(
      initialModeFromLinkProofDataState(),
      {
        kind: "link-proof/mode-from-proof-gate",
        data: packet.data,
        defaultMode: LINK_MODE_DEFAULT,
      },
    );
    const mode = modeFromLinkProofDataFromActions(stepped.actions);
    if (!shouldUseModeFromLinkProofData(stepped.actions) || mode === null) {
      throw new Error("Could not decode link-proof mode");
    }
    return mode as LinkModeValue;
  }

  static mtuBytes(mtu: number): Uint8Array {
    const stepped = stepEncodeLinkMtuBytesWithActions(
      initialEncodeLinkMtuBytesState(),
      {
        kind: "link-proof/encode-mtu-gate",
        mtu,
      },
    );
    const raw = encodeLinkMtuBytesRawFromActions(stepped.actions);
    if (!shouldUseEncodeLinkMtuBytes(stepped.actions) || raw === null) {
      throw new Error("Could not encode link MTU bytes");
    }
    return raw;
  }

  static mtuFromLrPacket(packet: Packet): number | null {
    const stepped = stepMtuFromLinkRequestDataWithActions(
      initialMtuFromLinkRequestDataState(),
      {
        kind: "link-proof/mtu-from-request-gate",
        data: packet.data,
      },
    );
    if (
      shouldRejectMtuFromLinkRequestData(stepped.actions) ||
      !shouldUseMtuFromLinkRequestData(stepped.actions)
    ) {
      return null;
    }
    return mtuFromLinkRequestDataFromActions(stepped.actions);
  }

  static mtuFromLpPacket(packet: Packet): number | null {
    const stepped = stepMtuFromLinkProofDataWithActions(
      initialMtuFromLinkProofDataState(),
      {
        kind: "link-proof/mtu-from-proof-gate",
        data: packet.data,
      },
    );
    if (
      shouldRejectMtuFromLinkProofData(stepped.actions) ||
      !shouldUseMtuFromLinkProofData(stepped.actions)
    ) {
      return null;
    }
    return mtuFromLinkProofDataFromActions(stepped.actions);
  }

  loadPeer(
    peerPublicKey: Uint8Array,
    peerSignaturePublicKey: Uint8Array,
  ): void {
    this.peerPublicKeyBytes = Uint8Array.from(peerPublicKey);
    this.peerSignaturePublicKeyBytes = Uint8Array.from(peerSignaturePublicKey);
  }

  handshake(): void {
    const privateKey = this.privateKey;
    const peerPublicKeyBytes = this.peerPublicKeyBytes;
    const handshakeAllow = stepPerformLinkHandshakeAllowWithActions(
      initialPerformLinkHandshakeAllowState(),
      {
        kind: "link/perform-handshake-allow-gate",
        status: this.status,
        privateKeyPresent: privateKey !== null,
        peerPublicKeyPresent: peerPublicKeyBytes !== null,
      },
    );
    if (
      !shouldAllowPerformLinkHandshake(handshakeAllow.actions) ||
      privateKey === null ||
      peerPublicKeyBytes === null
    ) {
      throw new Error("Invalid link state for handshake");
    }

    void this.applyLinkEstablishActions(
      stepLinkEstablishWithActions(
        initialLinkEstablishState({
          initiator: this.initiator,
          status: this.status,
        }),
        { kind: "establish/handshake" },
      ).actions,
    );
    const sharedKey = this.provider.x25519SharedSecret(
      privateKey,
      peerPublicKeyBytes,
    );
    // ECDH at the crypto adapter edge; RNS HKDF length/salt selection is pure protocol.
    const deriveStepped = stepDeriveRnsLinkKeyWithActions(
      initialDeriveRnsLinkKeyState(),
      {
        kind: "link-key/derive-gate",
        sharedSecret: sharedKey,
        linkId: this.linkId,
        mode: this.mode,
      },
    );
    const derivedKey = deriveRnsLinkKeyRawFromActions(deriveStepped.actions);
    if (
      shouldRejectDeriveRnsLinkKey(deriveStepped.actions) ||
      !shouldUseDeriveRnsLinkKey(deriveStepped.actions) ||
      derivedKey === null
    ) {
      throw new Error("Cannot derive key from empty input material");
    }
    this.derivedKey = derivedKey;
  }

  async prove(): Promise<void> {
    const owner = this.owner;
    const publicKeyBytes = this.publicKeyBytes;
    const ownerIdentity = owner?.identity ?? null;
    const proveAllow = stepProveLinkAllowWithActions(
      initialProveLinkAllowState(),
      {
        kind: "link/prove-allow-gate",
        ownerPresent: owner !== null,
        publicKeyPresent: publicKeyBytes !== null,
        ownerIdentityPresent: ownerIdentity !== null,
      },
    );
    if (
      !shouldAllowProveLink(proveAllow.actions) ||
      owner === null ||
      publicKeyBytes === null ||
      ownerIdentity === null
    ) {
      throw new Error("Responder link is missing owner or key material");
    }

    const signallingBytes = Link.signallingBytes(this.mtu, this.mode);
    const ownerSplit = stepSplitIdentityPublicKeyWithActions(
      initialSplitIdentityPublicKeyState(),
      {
        kind: "identity-key/split-public-gate",
        publicKeyBytes: ownerIdentity.getPublicKey(),
      },
    );
    const ownerPublic = shouldUseSplitIdentityPublicKey(ownerSplit.actions)
      ? identityPublicKeyFieldsFromActions(ownerSplit.actions)
      : null;
    const ownerKeyAllow = stepAcceptLinkOwnerPublicKeyWithActions(
      initialAcceptLinkOwnerPublicKeyState(),
      {
        kind: "link/accept-owner-public-key-gate",
        splitOk: ownerPublic !== null,
      },
    );
    if (!shouldAcceptLinkOwnerPublicKeyNow(ownerKeyAllow.actions)) {
      throw new Error("Responder link owner public key is invalid");
    }
    const ownerSigPublicKey = ownerPublic!.signaturePublicKey;
    const signedStepped = stepLinkProofSignedMaterialWithActions(
      initialLinkProofSignedMaterialState(),
      {
        kind: "link-proof/signed-material-gate",
        linkId: this.linkId,
        publicKey: publicKeyBytes,
        ownerSigPublicKey,
        signallingBytes,
      },
    );
    const signedData = shouldUseLinkProofSignedMaterial(signedStepped.actions)
      ? linkProofSignedMaterialRawFromActions(signedStepped.actions)
      : null;
    if (signedData === null) {
      throw new Error("Link.prove: missing signed-material use-raw action");
    }
    const signature = ownerIdentity.sign(signedData);
    const packStepped = stepPackLinkProofDataWithActions(
      initialPackLinkProofDataState(),
      {
        kind: "link-proof/pack-gate",
        signature,
        publicKey: publicKeyBytes,
        signallingBytes,
      },
    );
    const proofData = shouldUsePackLinkProofData(packStepped.actions)
      ? packLinkProofDataRawFromActions(packStepped.actions)
      : null;
    if (proofData === null) {
      throw new Error("Link.prove: missing use-raw action");
    }
    const proofPacket = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.PROOF,
      destinationHash: this.linkId,
      context: PacketContext.LRPROOF,
      data: proofData,
    });

    this.establishmentCost += proofPacket.raw.length;
    await this.transport.sendPacket(proofPacket, {
      attachedInterface: this.attachedInterface,
    });
    this.hadOutbound(false);
  }

  protected async applyLinkEstablishActions(
    actions: readonly LinkEstablishAction[],
    context?: {
      readonly prepareInitiatorActivate?: () => void;
      readonly rttPlaintext?: Uint8Array | null;
    },
  ): Promise<void> {
    if (shouldIgnoreLinkEstablishRtt(actions)) {
      return;
    }

    if (shouldTeardownLinkEstablish(actions)) {
      await this.teardown();
      return;
    }

    if (shouldAcceptLinkEstablishRtt(actions)) {
      try {
        const measuredRtt = linkRttSecondsForRequest(
          this.clock.now() / 1000,
          this.requestTime,
        );
        const unpackRtt = stepUnpackMsgpackFloatWithActions(
          initialUnpackMsgpackFloatState(),
          {
            kind: "msgpack-float/unpack-gate",
            bytes: context?.rttPlaintext!,
          },
        );
        if (
          shouldRejectUnpackMsgpackFloat(unpackRtt.actions) ||
          !shouldUseUnpackMsgpackFloat(unpackRtt.actions)
        ) {
          throw new Error("Link.handleRtt: missing use-fields action");
        }
        const remoteRtt = msgpackFloatFromActions(unpackRtt.actions);
        if (remoteRtt === null) {
          throw new Error("Link.handleRtt: missing use-fields action");
        }
        const nowSeconds = this.clock.now() / 1000;
        await this.applyLinkEstablishActions(
          stepLinkEstablishWithActions(
            initialLinkEstablishState({
              initiator: this.initiator,
              status: this.status,
            }),
            {
              kind: "establish/activated",
              atSeconds: nowSeconds,
              rtt: mergedLinkRtt(measuredRtt, remoteRtt),
            },
          ).actions,
        );
      } catch {
        await this.applyLinkEstablishActions(
          stepLinkEstablishWithActions(
            initialLinkEstablishState({
              initiator: this.initiator,
              status: this.status,
            }),
            { kind: "establish/rtt-failed" },
          ).actions,
        );
      }
      return;
    }

    if (shouldEnterLinkHandshake(actions)) {
      this.status = LinkStatus.HANDSHAKE;
    }

    if (shouldFailLinkEstablish(actions)) {
      this.status = LinkStatus.CLOSED;
      return;
    }

    if (!shouldActivateLinkEstablish(actions)) {
      return;
    }

    const activated = linkEstablishActivatedAction(actions);
    if (activated === null) {
      return;
    }

    this.status = LinkStatus.ACTIVE;
    this.rtt = activated.rtt;
    this.activatedAt = activated.activatedAt;
    if (activated.activateMembership || activated.sendRtt) {
      context?.prepareInitiatorActivate?.();
    }
    this.updateKeepalive();
    if (activated.activateMembership) {
      this.transport.activateLink(this as unknown as Link);
    }
    if (activated.sendRtt) {
      const packRtt = stepPackMsgpackFloat64WithActions(
        initialPackMsgpackFloat64State(),
        {
          kind: "msgpack-float/pack-gate",
          value: this.rtt!,
        },
      );
      if (!shouldUsePackMsgpackFloat64(packRtt.actions)) {
        throw new Error("Link.sendRtt: missing use-raw action");
      }
      const rttRaw = packMsgpackFloat64RawFromActions(packRtt.actions);
      if (rttRaw === null) {
        throw new Error("Link.sendRtt: missing use-raw action");
      }
      const rttPacket = Packet.fromFields(this.provider, {
        headerType: PacketHeaderType.HEADER_1,
        transportType: TransportType.BROADCAST,
        destinationType: DestinationType.LINK,
        packetType: PacketType.DATA,
        destinationHash: this.linkId,
        context: PacketContext.LRRTT,
        data: this.encrypt(rttRaw),
      });
      await this.transport.sendPacket(rttPacket, {
        attachedInterface: this.attachedInterface,
      });
      this.hadOutbound(false);
    }
    this.callbacks.linkEstablished?.(this as unknown as Link);
  }

  protected updateKeepalive(): void {
    const keepaliveAllow = stepUpdateLinkKeepaliveAllowWithActions(
      initialUpdateLinkKeepaliveAllowState(),
      {
        kind: "link/update-keepalive-allow-gate",
        rttPresent: this.rtt !== null,
      },
    );
    if (!shouldAllowUpdateLinkKeepalive(keepaliveAllow.actions)) {
      return;
    }

    /** Adapt keepalive via protocol actions (no ad-hoc `computeKeepalive` reads). */
    const keepaliveStepped = stepComputeKeepaliveWithActions(
      initialComputeKeepaliveState(),
      {
        kind: "link/keepalive-gate",
        rtt: this.rtt!,
      },
    );
    const keepalive = shouldUseLinkKeepalive(keepaliveStepped.actions)
      ? linkKeepaliveFromActions(keepaliveStepped.actions)
      : null;
    if (keepalive === null) {
      throw new Error("Link.updateKeepalive: missing use-keepalive action");
    }
    this.keepalive = keepalive;
    this.staleTime = keepalive * LINK_STALE_FACTOR;

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/rtt-measured",
        rtt: this.rtt!,
      }),
    );
  }
}
