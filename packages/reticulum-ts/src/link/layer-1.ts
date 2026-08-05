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
export class LinkLayer1 {
  readonly type = DestinationType.LINK;
  readonly callbacks: LinkCallbacks;
  readonly initiator: boolean;
  readonly owner: RegisteredDestination | null;
  readonly destination: RegisteredDestination | null;

  linkId!: Uint8Array;
  hash!: Uint8Array;
  status: LinkStatusValue = LinkStatus.PENDING;
  rtt: number | null = null;
  mtu = RETICULUM_MTU;
  mdu = 0;
  expectedHops: number | null = null;
  attachedInterface: PacketInterface | null = null;
  establishmentCost = 0;
  requestTime = 0;
  activatedAt: number | null = null;
  lastInbound = 0;
  lastOutbound = 0;
  lastKeepalive = 0;
  lastData = 0;
  keepalive = LINK_KEEPALIVE;
  staleTime = LINK_KEEPALIVE * LINK_STALE_FACTOR;
  establishmentTimeout = linkEstablishmentTimeoutForHops(1, LINK_KEEPALIVE);
  teardownReason: LinkTeardownReasonValue | null = null;
  remoteIdentity: Identity | null = null;
  mode: LinkModeValue = LINK_MODE_DEFAULT;
  resourceStrategy: LinkResourceStrategyValue = LinkResourceStrategy.ACCEPT_ALL;

  protected readonly outgoingResourcesList: Resource[] = [];
  protected readonly incomingResourcesList: Resource[] = [];

  protected readonly provider: CryptoProvider;
  protected readonly transport: LeafTransport;
  protected readonly clock: Clock;
  protected readonly pendingRequests: LinkRequestReceipt[] = [];
  protected privateKey: Uint8Array | null = null;
  protected publicKeyBytes: Uint8Array | null = null;
  protected peerPublicKeyBytes: Uint8Array | null = null;
  protected peerSignaturePublicKeyBytes: Uint8Array | null = null;
  protected derivedKey: Uint8Array | null = null;
  protected token: Token | null = null;
  protected channel: Channel | null = null;
  protected watchdogTimer: ReturnType<Clock["setTimeout"]> | null = null;

  protected constructor(
    provider: CryptoProvider,
    transport: LeafTransport,
    clock: Clock,
    options: {
      readonly initiator: boolean;
      readonly owner: RegisteredDestination | null;
      readonly destination: RegisteredDestination | null;
      readonly callbacks?: LinkCallbacks;
    },
  ) {
    this.provider = provider;
    this.transport = transport;
    this.clock = clock;
    this.initiator = options.initiator;
    this.owner = options.owner;
    this.destination = options.destination;
    this.callbacks = options.callbacks ?? {};
  }

  static linkIdFromLrPacket(
    provider: CryptoProvider,
    packet: Packet,
  ): Uint8Array {
    const stepped = stepLinkRequestHashablePartWithActions(
      initialLinkRequestHashablePartState(),
      {
        kind: "link-proof/request-hashable-gate",
        hashablePart: packet.hashablePart(),
        requestDataLength: packet.data.length,
      },
    );
    const hashablePart = shouldUseLinkRequestHashablePart(stepped.actions)
      ? linkRequestHashablePartRawFromActions(stepped.actions)
      : null;
    if (hashablePart === null) {
      throw new Error("Link.linkIdFromLrPacket: missing use-raw action");
    }
    return Identity.truncatedHash(provider, hashablePart);
  }

  static signallingBytes(mtu: number, mode: LinkModeValue): Uint8Array {
    const modeEnabled = stepLinkModeEnabledWithActions(
      initialLinkModeEnabledState(),
      {
        kind: "link/mode-enabled-gate",
        mode,
      },
    );
    if (!shouldTreatLinkModeEnabled(modeEnabled.actions)) {
      throw new Error(`Requested link mode ${mode} is not enabled`);
    }

    const stepped = stepEncodeLinkSignallingBytesWithActions(
      initialEncodeLinkSignallingBytesState(),
      {
        kind: "link-proof/encode-signalling-gate",
        mtu,
        mode,
      },
    );
    const raw = encodeLinkSignallingBytesRawFromActions(stepped.actions);
    if (!shouldUseEncodeLinkSignallingBytes(stepped.actions) || raw === null) {
      throw new Error("Could not encode link signalling bytes");
    }
    return raw;
  }

  setLinkId(packet: Packet): void {
    this.linkId = Link.linkIdFromLrPacket(this.provider, packet);
    this.hash = this.linkId;
  }

  get cryptoProvider(): CryptoProvider {
    return this.provider;
  }

  get incomingResources(): readonly Resource[] {
    return this.incomingResourcesList;
  }

  get outgoingResources(): readonly Resource[] {
    return this.outgoingResourcesList;
  }

  async request(
    path: string,
    data: Uint8Array | null = null,
    options: LinkRequestOptions = {},
  ): Promise<LinkRequestReceipt | false> {
    const requestAllow = stepLinkRequestAllowWithActions(
      initialLinkRequestAllowState(),
      {
        kind: "link/request-allow-gate",
        status: this.status,
        rtt: this.rtt,
      },
    );
    if (!shouldAllowLinkRequest(requestAllow.actions)) {
      return false;
    }

    const pathEncode = stepUtf8EncodeWithActions(initialUtf8EncodeState(), {
      kind: "utf8/encode-gate",
      value: path,
    });
    const pathBytes = utf8EncodeRawFromActions(pathEncode.actions);
    if (!shouldUseUtf8Encode(pathEncode.actions) || pathBytes === null) {
      throw new Error("Link.request: missing utf8 use-raw action");
    }
    const pathHash = Identity.truncatedHash(this.provider, pathBytes);
    const packStepped = stepPackLinkRequestWithActions(
      initialPackLinkRequestState(),
      {
        kind: "link-request-codec/pack-gate",
        requestedAt: this.clock.now() / 1000,
        pathHash,
        data,
      },
    );
    const packedRequest = shouldUsePackLinkRequest(packStepped.actions)
      ? packLinkRequestRawFromActions(packStepped.actions)
      : null;
    if (packedRequest === null) {
      return false;
    }
    const timeout = options.timeout ?? linkRequestTimeoutForRtt(this.rtt!);

    const appRequestStepped = stepLinkAppRequestWithActions(
      initialLinkAppRequestState(),
      {
        kind: "link/app-request-gate",
        status: this.status,
        rtt: this.rtt,
        packedLength: packedRequest.length,
        mdu: this.mdu,
      },
    );
    if (shouldRejectLinkAppRequest(appRequestStepped.actions)) {
      return false;
    }
    if (!shouldSendLinkAppRequest(appRequestStepped.actions)) {
      return false;
    }

    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context: PacketContext.REQUEST,
      data: this.encrypt(packedRequest),
    });

    const pending = new LinkRequestReceipt({
      link: this as unknown as Link,
      requestId: packet.truncatedHash(),
      timeout,
      now: () => this.clock.now() / 1000,
      requestSize: packedRequest.length,
      callbacks: {
        ...(options.response === undefined
          ? {}
          : { response: options.response }),
        ...(options.failed === undefined ? {} : { failed: options.failed }),
      },
    });

    const sentReceipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: true,
    });
    this.hadOutbound(false);

    const transmitStepped = stepLinkAppRequestTransmitWithActions(
      initialLinkAppRequestTransmitState(),
      {
        kind: "link/app-request-transmit-gate",
        receiptPresent: sentReceipt !== null,
      },
    );
    if (shouldUnregisterLinkAppRequestTransmit(transmitStepped.actions)) {
      this.unregisterPendingRequest(pending);
      return false;
    }
    if (!shouldKeepPendingLinkAppRequestTransmit(transmitStepped.actions)) {
      return false;
    }

    pending.attachPacketReceipt(sentReceipt!);
    return pending;
  }

  unregisterPendingRequest(receipt: LinkRequestReceipt): void {
    const stepped = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      {
        kind: "link/pending-request-unregister-gate",
        index: this.pendingRequests.indexOf(receipt),
      },
    );
    const index = pendingLinkRequestUnregisterIndex(stepped.actions);
    if (shouldRemovePendingLinkRequest(stepped.actions) && index !== null) {
      this.pendingRequests.splice(index, 1);
    }
  }

  encrypt(plaintext: Uint8Array): Uint8Array {
    return this.tokenInstance().encrypt(plaintext, {
      entropy: this.transport.entropy,
    });
  }

  async send(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.NONE, data);
  }

  async sendContext(
    context: number,
    data: Uint8Array,
    options: { createReceipt?: boolean; encrypt?: boolean } = {},
  ): Promise<LinkSendContextResult> {
    const sendAllow = stepLinkSendAllowWithActions(
      initialLinkSendAllowState(),
      {
        kind: "link/send-allow-gate",
        status: this.status,
      },
    );
    if (!shouldAllowLinkSend(sendAllow.actions)) {
      throw new Error("Cannot send on inactive link");
    }

    const encryptStepped = stepEncryptLinkPayloadWithActions(
      initialEncryptLinkPayloadState(),
      {
        kind: "link/encrypt-payload-gate",
        encryptOption: options.encrypt,
      },
    );
    const payload = shouldEncryptLinkPayloadNow(encryptStepped.actions)
      ? this.encrypt(data)
      : data;
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context,
      data: payload,
    });

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false,
    });
    this.hadOutbound(
      shouldTreatLinkKeepaliveContext(
        stepLinkKeepaliveContextWithActions(
          initialLinkKeepaliveContextState(),
          {
            kind: "link/keepalive-context-gate",
            context,
          },
        ).actions,
      ),
    );
    return { raw: packet.raw, receipt };
  }

  async teardown(): Promise<void> {
    await this.applyLinkTeardownActions(
      stepLinkTeardownWithActions(
        initialLinkTeardownState({
          status: this.status,
          initiator: this.initiator,
        }),
        { kind: "teardown/local" },
      ).actions,
    );
  }

  close(): void {
    this.stopWatchdog();
    this.status = LinkStatus.CLOSED;
    this.privateKey = null;
    this.publicKeyBytes = null;
    this.derivedKey = null;
    this.token = null;
    this.channel?.shutdown();
    this.channel = null;
    for (const resource of [
      ...this.incomingResourcesList,
      ...this.outgoingResourcesList,
    ]) {
      resource.cancel();
    }
    this.incomingResourcesList.length = 0;
    this.outgoingResourcesList.length = 0;
    this.transport.unregisterLink(this as unknown as Link);
    this.callbacks.linkClosed?.(this as unknown as Link);
  }

  updateMdu(): void {
    this.mdu = linkMduForMtu(this.mtu);
  }

  hadOutbound(isKeepalive = false): void {
    const now = this.clock.now() / 1000;
    this.lastOutbound = now;
    this.lastInbound = now;
    if (isKeepalive) {
      this.applyWatchdogResult(
        stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
          kind: "link/keepalive-sent",
          at: now,
        }),
      );
    } else {
      this.lastData = now;
    }
  }

  protected async applyLinkTeardownActions(
    actions: readonly LinkTeardownAction[],
  ): Promise<void> {
    if (shouldCloseOnlyLinkTeardown(actions)) {
      this.close();
      return;
    }

    if (shouldSendLinkTeardownThenClose(actions)) {
      const send = linkTeardownSendThenCloseAction(actions);
      if (send === null) {
        return;
      }
      await this.sendTeardownPacket();
      this.teardownReason = send.reason;
      this.close();
      return;
    }

    if (!shouldAcceptRemoteLinkTeardown(actions)) {
      return;
    }
    const remote = linkTeardownRemoteCloseAction(actions);
    if (remote === null) {
      return;
    }
    this.teardownReason = remote.reason;
    this.close();
  }

  protected async sendTeardownPacket(): Promise<void> {
    await this.sendContext(PacketContext.LINKCLOSE, this.linkId);
  }

  protected async sendKeepalive(): Promise<void> {
    const packProbe = stepPackLinkKeepaliveProbeWithActions(
      initialPackLinkKeepaliveProbeState(),
      { kind: "link-keepalive/pack-probe-gate" },
    );
    if (!shouldUsePackLinkKeepaliveProbe(packProbe.actions)) {
      throw new Error("Link.sendKeepalive: missing use-raw action");
    }
    const probe = packLinkKeepaliveProbeRawFromActions(packProbe.actions);
    if (probe === null) {
      throw new Error("Link.sendKeepalive: missing use-raw action");
    }
    await this.sendContext(PacketContext.KEEPALIVE, probe);
  }

  protected startWatchdog(): void {
    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/watchdog-start",
      }),
    );
  }

  protected stopWatchdog(): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }

  protected scheduleWatchdog(delayMs: number): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.clock.setTimeout(() => {
      this.watchdogTick();
    }, delayMs);
  }

  protected watchdogTick(): void {
    const closedStepped = stepLinkClosedWithActions(initialLinkClosedState(), {
      kind: "link/closed-gate",
      status: this.status,
    });
    if (shouldTreatLinkClosed(closedStepped.actions)) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "timer/fired",
        id: "link-watchdog",
        at: this.clock.now(),
      }),
    );
  }

  protected snapshotWatchdogState(): LinkWatchdogState {
    return {
      status: this.status,
      initiator: this.initiator,
      requestTime: this.requestTime,
      establishmentTimeout: this.establishmentTimeout,
      activatedAt: this.activatedAt,
      lastInbound: this.lastInbound,
      lastKeepalive: this.lastKeepalive,
      keepalive: this.keepalive,
      staleTime: this.staleTime,
      rtt: this.rtt,
      teardownReason: this.teardownReason,
    };
  }

  protected applyWatchdogResult(result: LinkWatchdogStepResult): void {
    this.status = result.state.status as LinkStatusValue;
    this.keepalive = result.state.keepalive;
    this.staleTime = result.state.staleTime;
    this.rtt = result.state.rtt;
    this.activatedAt = result.state.activatedAt;
    this.lastInbound = result.state.lastInbound;
    this.lastKeepalive = result.state.lastKeepalive;
    this.teardownReason = result.state
      .teardownReason as LinkTeardownReasonValue | null;

    for (const action of result.actions) {
      if (action.kind === "send-keepalive") {
        void this.sendKeepalive().catch(() => {
          // The link can close between the watchdog step and this best-effort send.
        });
      } else if (action.kind === "send-teardown") {
        void this.sendTeardownPacket().catch(() => {
          // A concurrent close can make the teardown packet unsendable.
        });
      } else if (action.kind === "mark-stale") {
        this.status = LinkStatus.STALE;
      } else if (action.kind === "close") {
        this.teardownReason = action.reason as LinkTeardownReasonValue;
        this.close();
        return;
      }
    }

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "link-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }

  protected tokenInstance(): Token {
    const gate = stepLinkTokenAccessWithActions(initialLinkTokenAccessState(), {
      kind: "token/access-gate",
      derivedKeyPresent: this.derivedKey !== null,
      tokenPresent: this.token !== null,
    });
    if (shouldRejectLinkTokenNoKey(gate.actions)) {
      throw new Error("Link has no derived key");
    }
    if (shouldCreateLinkToken(gate.actions)) {
      this.token = new Token(this.provider, this.derivedKey!);
    }

    return this.token!;
  }
}
