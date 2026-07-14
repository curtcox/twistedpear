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
  canAcceptLinkIdentify,
  canAcceptLinkOwnerPublicKey,
  canAcceptLinkRtt,
  canIdentifyOnLink,
  canLinkRequest,
  canLinkSend,
  canPerformLinkHandshake,
  canProveLink,
  canRequestLinkDestination,
  canResendLinkPacket,
  canUpdateLinkKeepalive,
  canValidateLinkProof,
  classifyLinkProofPayload,
  computeLinkEstablishmentTimeout,
  computeLinkMdu,
  computeLinkRequestTimeout,
  computeLinkRttSeconds,
  containsResourceHash,
  deriveRnsLinkKeyRawFromActions,
  encodeLinkMtuBytesRawFromActions,
  encodeLinkSignallingBytesRawFromActions,
  indexOfPendingLinkAppRequest,
  initialLinkAppRequestInboundState,
  initialLinkEstablishState,
  initialLinkIdentifyState,
  initialLinkProofValidateState,
  initialLinkResourceAdvertisementState,
  initialLinkTeardownState,
  initialLinkTokenAccessState,
  initialLinkValidateRequestState,
  isLinkClosed,
  isExpectedLinkMode,
  isLinkModeEnabled,
  linkEstablishActivatedAction,
  linkHopsMatch,
  linkIdentifySignedMaterial,
  linkProofSignedMaterial,
  linkReadyForNewResource,
  linkRequestHashablePart,
  linkTeardownRemoteCloseAction,
  linkTeardownSendThenCloseAction,
  mergeLinkRtt,
  modeFromLinkProofData,
  modeFromLinkRequestData,
  msgpackFloatFromActions,
  mtuFromLinkProofData,
  mtuFromLinkRequestData,
  packLinkKeepaliveProbeRawFromActions,
  packLinkKeepaliveReplyRawFromActions,
  packLinkIdentifyPayloadRawFromActions,
  packLinkProofDataRawFromActions,
  packLinkRequestDataRawFromActions,
  packMsgpackFloat64RawFromActions,
  initialClassifyLinkKeepaliveState,
  initialEncodeLinkMtuBytesState,
  initialEncodeLinkSignallingBytesState,
  initialLinkAppRequestState,
  initialLinkAppRequestTransmitState,
  initialLinkDataContextState,
  initialLinkInitiatorMtuState,
  initialLinkRequestResponderMtuState,
  initialLinkResourceConcludeState,
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
  shouldRejectPackLinkIdentifyPayload,
  shouldRejectSplitLinkIdentifyPayload,
  shouldRejectSplitLinkProofBody,
  shouldRejectSplitLinkRequestData,
  shouldRejectUnpackLinkRequest,
  shouldRejectUnpackLinkResponse,
  shouldRejectUnpackMsgpackFloat,
  shouldUseEncodeLinkMtuBytes,
  shouldUseEncodeLinkSignallingBytes,
  shouldUseLinkInitiatorMtu,
  shouldUseLinkRequestResponderMtu,
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
  stepEncodeLinkMtuBytesWithActions,
  stepEncodeLinkSignallingBytesWithActions,
  stepLinkInitiatorMtuWithActions,
  stepLinkRequestResponderMtuWithActions,
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
  stepUnpackLinkResponseWithActions,
  stepUnpackMsgpackFloatWithActions,
  initialPendingLinkRequestUnregisterState,
  pendingLinkRequestUnregisterIndex,
  shouldAcceptLinkEstablishRtt,
  shouldAcceptLinkPacketInterface,
  shouldAcceptLinkResourceAdvertisement,
  shouldAcceptRemoteLinkTeardown,
  shouldAcceptResourceHashmapUpdateFrame,
  shouldAcceptResourceProofPayload,
  shouldActivateLinkEstablish,
  shouldAskAppLinkResourceAdvertisement,
  shouldAttemptLinkProofCrypto,
  shouldCloseOnlyLinkTeardown,
  shouldCommitLinkIdentify,
  shouldContinueLinkValidateRequest,
  shouldProceedLinkValidateRequest,
  shouldCreateLinkChannel,
  shouldCreateLinkToken,
  shouldDeliverPendingLinkAppResponse,
  shouldDispatchLinkPlaintext,
  shouldEncryptLinkPayload,
  shouldEnterLinkHandshake,
  shouldFailLinkEstablish,
  shouldForbidLinkAppRequestInbound,
  shouldHandleIncomingResourceByHash,
  shouldHandleOutgoingResourceRequest,
  shouldIgnoreInitiatorKeepaliveProbe,
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
  shouldInvokeLinkAppRequestInbound,
  shouldKeepPendingLinkAppRequestTransmit,
  shouldRegisterLinkResource,
  shouldRegisterPendingLinkRequest,
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
  shouldReplyKeepaliveProbe,
  shouldReuseLinkToken,
  shouldSendLinkAppRequest,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkTeardownThenClose,
  shouldTeardownLinkEstablish,
  shouldUnregisterLinkAppRequestTransmit,
  shouldRemovePendingLinkRequest,
  shouldUpdateLinkLastData,
  isLinkInboundDataPacket,
  isLinkKeepaliveContext,
  identityPublicKeyFieldsFromActions,
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
  shouldUseSplitIdentityPublicKey,
  shouldUseSplitInitiatorLinkEntropy,
  shouldUseSplitResponderLinkEntropy,
  stepSplitIdentityPublicKeyWithActions,
  stepDeriveRnsLinkKeyWithActions,
  stepSplitInitiatorLinkEntropyWithActions,
  stepSplitResponderLinkEntropyWithActions,
  initialSplitResourceHashmapUpdatePacketState,
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
  stepLinkDataContextWithActions,
  stepLinkEstablishWithActions,
  stepLinkIdentifyWithActions,
  stepLinkProofValidateWithActions,
  stepLinkResourceAdvertisementWithActions,
  stepLinkResourceConcludeWithActions,
  stepPendingLinkRequestUnregisterWithActions,
  stepLinkTeardownWithActions,
  stepLinkTokenAccessWithActions,
  stepLinkValidateRequestWithActions,
  stepLinkWatchdogWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
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
  type LinkWatchdogStepResult
} from "@twistedpear/protocol";

import type { CryptoProvider } from "./crypto/provider.js";
import { Token } from "./crypto/token.js";
import { Channel, LinkChannelOutlet } from "./channel.js";
import { equalBytes } from "./crypto/bytes.js";
import { DestinationDirection, DestinationType } from "./destination.js";
import { Identity } from "./identity.js";
import type { PacketInterface } from "./interfaces/interface.js";
import { LinkRequestReceipt } from "./link-request-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import type { PacketReceipt } from "./packet-receipt.js";
import type { RegisteredDestination, RequestHandler } from "./registered-destination.js";
import { RETICULUM_MTU } from "./reticulum.js";
import type { Clock } from "./runtime/runtime.js";
import type { LeafTransport } from "./transport/node.js";
import { PATHFINDER_MAX_HOPS } from "./transport/node.js";
import { Resource, ResourceAdvertisement } from "./resource.js";

/** Mirrors RNS/Link.py link mode constants (RNS 0.9.4). */
export {
  LinkMode,
  LINK_MODE_DEFAULT,
  LINK_ENABLED_MODES,
  LINK_MTU_BYTEMASK,
  LINK_MODE_BYTEMASK,
  type LinkModeValue
};

/** Mirrors RNS/Link.py constants (RNS 0.9.4). */
export const LINK_ECPUB_SIZE = LINK_REQUEST_ECPUB_SIZE;
export const LINK_KEY_SIZE = LINK_X25519_KEY_SIZE;
export const LINK_MTU_SIZE = LINK_PROOF_MTU_SIZE;
export const LINK_SIGNATURE_SIZE = LINK_PROOF_SIGNATURE_SIZE;
export {
  LINK_KEEPALIVE,
  LINK_KEEPALIVE_MIN,
  LINK_KEEPALIVE_MAX_RTT,
  LINK_STALE_FACTOR,
  LINK_STALE_GRACE,
  LINK_TRAFFIC_TIMEOUT_FACTOR,
  LINK_KEEPALIVE_TIMEOUT_FACTOR,
  LINK_WATCHDOG_MAX_SLEEP_MS,
  LINK_ESTABLISHMENT_TIMEOUT_PER_HOP,
  LINK_RESPONSE_MAX_GRACE_TIME,
  LinkStatus,
  LinkTeardownReason,
  LinkResourceStrategy,
  type LinkStatusValue,
  type LinkTeardownReasonValue,
  type LinkResourceStrategyValue
};

export interface LinkCallbacks {
  linkEstablished?: (link: Link) => void;
  linkClosed?: (link: Link) => void;
  packet?: (data: Uint8Array, packet: Packet) => void;
  remoteIdentified?: (link: Link, identity: Identity) => void;
  resource?: (advertisement: ResourceAdvertisement) => boolean;
  resourceConcluded?: (resource: Resource) => void;
}

export interface InitiatorLinkOptions {
  readonly destination: RegisteredDestination;
  readonly transport: LeafTransport;
  readonly linkMtuDiscovery?: boolean;
  readonly callbacks?: LinkCallbacks;
  /**
   * Optional injected entropy for initiator X25519 + Ed25519 private keys
   * (64 bytes). When omitted, the crypto provider supplies randomness.
   */
  readonly entropy?: Uint8Array;
}

export interface LinkRequestOptions {
  readonly response?: (receipt: LinkRequestReceipt) => void;
  readonly failed?: (receipt: LinkRequestReceipt) => void;
  readonly timeout?: number;
}

export interface LinkSendContextResult {
  readonly raw: Uint8Array;
  readonly receipt: PacketReceipt | null;
}

/** Mirrors RNS/Link.py link establishment and encrypted sessions. */
export class Link {
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
  establishmentTimeout = computeLinkEstablishmentTimeout(1, LINK_KEEPALIVE);
  teardownReason: LinkTeardownReasonValue | null = null;
  remoteIdentity: Identity | null = null;
  mode: LinkModeValue = LINK_MODE_DEFAULT;
  resourceStrategy: LinkResourceStrategyValue = LinkResourceStrategy.ACCEPT_ALL;

  private readonly outgoingResourcesList: Resource[] = [];
  private readonly incomingResourcesList: Resource[] = [];

  private readonly provider: CryptoProvider;
  private readonly transport: LeafTransport;
  private readonly clock: Clock;
  private readonly pendingRequests: LinkRequestReceipt[] = [];
  private privateKey: Uint8Array | null = null;
  private publicKeyBytes: Uint8Array | null = null;
  private peerPublicKeyBytes: Uint8Array | null = null;
  private peerSignaturePublicKeyBytes: Uint8Array | null = null;
  private derivedKey: Uint8Array | null = null;
  private token: Token | null = null;
  private channel: Channel | null = null;
  private watchdogTimer: ReturnType<Clock["setTimeout"]> | null = null;

  private constructor(
    provider: CryptoProvider,
    transport: LeafTransport,
    clock: Clock,
    options: {
      readonly initiator: boolean;
      readonly owner: RegisteredDestination | null;
      readonly destination: RegisteredDestination | null;
      readonly callbacks?: LinkCallbacks;
    }
  ) {
    this.provider = provider;
    this.transport = transport;
    this.clock = clock;
    this.initiator = options.initiator;
    this.owner = options.owner;
    this.destination = options.destination;
    this.callbacks = options.callbacks ?? {};
  }

  static request(options: InitiatorLinkOptions): Link {
    const destination = options.destination;
    if (
      !canRequestLinkDestination({
        typeSingle: destination.type === DestinationType.SINGLE,
        directionOut: destination.direction === DestinationDirection.OUT
      })
    ) {
      throw new Error("Links can only be established to OUT SINGLE destinations");
    }

    const provider = destination.cryptoProvider;
    const link = new Link(provider, options.transport, options.transport.clock, {
      initiator: true,
      owner: null,
      destination,
      ...(options.callbacks === undefined ? {} : { callbacks: options.callbacks })
    });

    const initiatorStepped = stepSplitInitiatorLinkEntropyWithActions(
      initialSplitInitiatorLinkEntropyState(),
      {
        kind: "link-keygen/split-initiator-gate",
        entropy:
          options.entropy ?? options.transport.entropy.randomBytes(LINK_INITIATOR_ENTROPY_SIZE)
      }
    );
    const initiatorKeys = initiatorLinkEntropyFieldsFromActions(initiatorStepped.actions);
    if (
      shouldRejectSplitInitiatorLinkEntropy(initiatorStepped.actions) ||
      !shouldUseSplitInitiatorLinkEntropy(initiatorStepped.actions) ||
      initiatorKeys === null
    ) {
      throw new Error(
        `Initiator link entropy must be at least ${LINK_INITIATOR_ENTROPY_SIZE} bytes`
      );
    }
    link.privateKey = initiatorKeys.privateKey;
    link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
    const signaturePublicKeyBytes = provider.ed25519PublicFromPrivate(
      initiatorKeys.signaturePrivateKey
    );
    link.expectedHops = options.transport.hopsTo(destination.hash);
    link.requestTime = options.transport.clock.now() / 1000;
    link.establishmentTimeout = computeLinkEstablishmentTimeout(
      link.expectedHops ?? 1,
      LINK_KEEPALIVE
    );

    const discoveryEnabled = options.linkMtuDiscovery !== false;
    const mtuStepped = stepLinkInitiatorMtuWithActions(initialLinkInitiatorMtuState(), {
      kind: "link/initiator-mtu-gate",
      discoveryEnabled,
      nextHopMtu: discoveryEnabled
        ? options.transport.nextHopInterfaceMtu(destination.hash)
        : null,
      defaultMtu: RETICULUM_MTU
    });
    const mtu = shouldUseLinkInitiatorMtu(mtuStepped.actions)
      ? (linkInitiatorMtuFromActions(mtuStepped.actions) ?? RETICULUM_MTU)
      : RETICULUM_MTU;

    link.mtu = mtu;
    link.mode = LINK_MODE_DEFAULT;
    link.updateMdu();
    const packStepped = stepPackLinkRequestDataWithActions(initialPackLinkRequestDataState(), {
      kind: "link-request/pack-gate",
      publicKey: link.publicKeyBytes,
      signaturePublicKey: signaturePublicKeyBytes,
      signallingBytes: Link.signallingBytes(mtu, link.mode)
    });
    const requestData =
      shouldUsePackLinkRequestData(packStepped.actions)
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
      data: requestData
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
    options?: { readonly entropy?: Uint8Array }
  ): Link | null {
    const splitStepped = stepSplitLinkRequestDataWithActions(initialSplitLinkRequestDataState(), {
      kind: "link-request/split-gate",
      data: packet.data
    });
    const request =
      shouldRejectSplitLinkRequestData(splitStepped.actions) ||
      !shouldUseSplitLinkRequestData(splitStepped.actions)
        ? null
        : linkRequestKeyFieldsFromActions(splitStepped.actions);
    const early = stepLinkValidateRequestWithActions(initialLinkValidateRequestState(), {
      kind: "validate-request/gate",
      requestPresent: request !== null,
      ownerIdentityPresent: owner.identity !== null,
      modeEnabled: true
    });
    if (
      !shouldContinueLinkValidateRequest({
        actions: early.actions,
        requestPresent: request !== null
      }) ||
      request === null
    ) {
      return null;
    }

    try {
      const provider = owner.cryptoProvider;
      const link = new Link(provider, transport, transport.clock, {
        initiator: false,
        owner,
        destination: null
      });

      const responderStepped = stepSplitResponderLinkEntropyWithActions(
        initialSplitResponderLinkEntropyState(),
        {
          kind: "link-keygen/split-responder-gate",
          entropy:
            options?.entropy ?? transport.entropy.randomBytes(LINK_RESPONDER_ENTROPY_SIZE)
        }
      );
      const responderKeys = responderLinkEntropyFieldsFromActions(responderStepped.actions);
      if (
        shouldRejectSplitResponderLinkEntropy(responderStepped.actions) ||
        !shouldUseSplitResponderLinkEntropy(responderStepped.actions) ||
        responderKeys === null
      ) {
        throw new Error(
          `Responder link entropy must be at least ${LINK_RESPONDER_ENTROPY_SIZE} bytes`
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
          defaultMtu: RETICULUM_MTU
        }
      );
      if (shouldUseLinkRequestResponderMtu(responderMtuStepped.actions)) {
        const selected = linkRequestResponderMtuFromActions(responderMtuStepped.actions);
        if (selected !== null) {
          link.mtu = selected;
        }
      }

      link.mode = Link.modeFromLrPacket(packet);
      const modeGate = stepLinkValidateRequestWithActions(initialLinkValidateRequestState(), {
        kind: "validate-request/gate",
        requestPresent: true,
        ownerIdentityPresent: true,
        modeEnabled: isLinkModeEnabled(link.mode)
      });
      if (!shouldProceedLinkValidateRequest(modeGate.actions)) {
        return null;
      }

      link.updateMdu();
      link.attachedInterface = iface;
      link.establishmentCost += packet.raw.length;
      link.handshake();
      link.requestTime = transport.clock.now() / 1000;
      link.lastInbound = link.requestTime;
      link.establishmentTimeout = computeLinkEstablishmentTimeout(packet.hops, LINK_KEEPALIVE);
      transport.registerLink(link);
      link.startWatchdog();
      void link.prove();
      return link;
    } catch {
      return null;
    }
  }

  static linkIdFromLrPacket(provider: CryptoProvider, packet: Packet): Uint8Array {
    const hashablePart = linkRequestHashablePart(packet.hashablePart(), packet.data.length);
    return Identity.truncatedHash(provider, hashablePart);
  }

  static signallingBytes(mtu: number, mode: LinkModeValue): Uint8Array {
    if (!isLinkModeEnabled(mode)) {
      throw new Error(`Requested link mode ${mode} is not enabled`);
    }

    const stepped = stepEncodeLinkSignallingBytesWithActions(
      initialEncodeLinkSignallingBytesState(),
      {
        kind: "link-proof/encode-signalling-gate",
        mtu,
        mode
      }
    );
    const raw = encodeLinkSignallingBytesRawFromActions(stepped.actions);
    if (!shouldUseEncodeLinkSignallingBytes(stepped.actions) || raw === null) {
      throw new Error("Could not encode link signalling bytes");
    }
    return raw;
  }

  static modeFromLrPacket(packet: Packet): LinkModeValue {
    return modeFromLinkRequestData(packet.data, LINK_MODE_DEFAULT) as LinkModeValue;
  }

  static modeFromLpPacket(packet: Packet): LinkModeValue {
    return modeFromLinkProofData(packet.data, LINK_MODE_DEFAULT) as LinkModeValue;
  }

  static mtuBytes(mtu: number): Uint8Array {
    const stepped = stepEncodeLinkMtuBytesWithActions(initialEncodeLinkMtuBytesState(), {
      kind: "link-proof/encode-mtu-gate",
      mtu
    });
    const raw = encodeLinkMtuBytesRawFromActions(stepped.actions);
    if (!shouldUseEncodeLinkMtuBytes(stepped.actions) || raw === null) {
      throw new Error("Could not encode link MTU bytes");
    }
    return raw;
  }

  static mtuFromLrPacket(packet: Packet): number | null {
    return mtuFromLinkRequestData(packet.data);
  }

  static mtuFromLpPacket(packet: Packet): number | null {
    return mtuFromLinkProofData(packet.data);
  }

  setLinkId(packet: Packet): void {
    this.linkId = Link.linkIdFromLrPacket(this.provider, packet);
    this.hash = this.linkId;
  }

  loadPeer(peerPublicKey: Uint8Array, peerSignaturePublicKey: Uint8Array): void {
    this.peerPublicKeyBytes = Uint8Array.from(peerPublicKey);
    this.peerSignaturePublicKeyBytes = Uint8Array.from(peerSignaturePublicKey);
  }

  handshake(): void {
    const privateKey = this.privateKey;
    const peerPublicKeyBytes = this.peerPublicKeyBytes;
    if (
      !canPerformLinkHandshake({
        status: this.status,
        privateKeyPresent: privateKey !== null,
        peerPublicKeyPresent: peerPublicKeyBytes !== null
      }) ||
      privateKey === null ||
      peerPublicKeyBytes === null
    ) {
      throw new Error("Invalid link state for handshake");
    }

    void this.applyLinkEstablishActions(
      stepLinkEstablishWithActions(
        initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
        { kind: "establish/handshake" }
      ).actions
    );
    const sharedKey = this.provider.x25519SharedSecret(privateKey, peerPublicKeyBytes);
    // ECDH at the crypto adapter edge; RNS HKDF length/salt selection is pure protocol.
    const deriveStepped = stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), {
      kind: "link-key/derive-gate",
      sharedSecret: sharedKey,
      linkId: this.linkId,
      mode: this.mode
    });
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
    if (
      !canProveLink({
        ownerPresent: owner !== null,
        publicKeyPresent: publicKeyBytes !== null,
        ownerIdentityPresent: ownerIdentity !== null
      }) ||
      owner === null ||
      publicKeyBytes === null ||
      ownerIdentity === null
    ) {
      throw new Error("Responder link is missing owner or key material");
    }

    const signallingBytes = Link.signallingBytes(this.mtu, this.mode);
    const ownerSplit = stepSplitIdentityPublicKeyWithActions(initialSplitIdentityPublicKeyState(), {
      kind: "identity-key/split-public-gate",
      publicKeyBytes: ownerIdentity.getPublicKey()
    });
    const ownerPublic = shouldUseSplitIdentityPublicKey(ownerSplit.actions)
      ? identityPublicKeyFieldsFromActions(ownerSplit.actions)
      : null;
    if (!canAcceptLinkOwnerPublicKey(ownerPublic !== null)) {
      throw new Error("Responder link owner public key is invalid");
    }
    const ownerSigPublicKey = ownerPublic!.signaturePublicKey;
    const signedData = linkProofSignedMaterial(
      this.linkId,
      publicKeyBytes,
      ownerSigPublicKey,
      signallingBytes
    );
    const signature = ownerIdentity.sign(signedData);
    const packStepped = stepPackLinkProofDataWithActions(initialPackLinkProofDataState(), {
      kind: "link-proof/pack-gate",
      signature,
      publicKey: publicKeyBytes,
      signallingBytes
    });
    const proofData =
      shouldUsePackLinkProofData(packStepped.actions)
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
      data: proofData
    });

    this.establishmentCost += proofPacket.raw.length;
    await this.transport.sendPacket(proofPacket, {
      attachedInterface: this.attachedInterface
    });
    this.hadOutbound(false);
  }

  async validateProof(packet: Packet, iface: PacketInterface): Promise<void> {
    const destination = this.destination;
    const canValidate = canValidateLinkProof({
      status: this.status,
      initiator: this.initiator,
      destinationPresent: destination !== null
    });
    if (!canValidate || destination === null) {
      return;
    }

    try {
      const mode = Link.modeFromLpPacket(packet);
      const modeMatches = isExpectedLinkMode({ expected: this.mode, received: mode });

      let proofData = packet.data;
      let signallingBytes = new Uint8Array(0);
      let confirmedMtu: number | null = null;

      const layout = classifyLinkProofPayload(proofData.length);
      const layoutValid = layout !== "invalid";
      if (layout === "body-with-mtu") {
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
      if (
        shouldAttemptLinkProofCrypto({
          modeMatches,
          layoutValid,
          bodyPresent: body !== null,
          peerPublicPresent: peerPublic !== null
        }) &&
        body !== null &&
        peerPublic !== null
      ) {
        this.loadPeer(body.peerPublicKey, peerPublic.signaturePublicKey);
        this.handshake();

        const signedData = linkProofSignedMaterial(
          this.linkId,
          this.peerPublicKeyBytes!,
          peerPublic.signaturePublicKey,
          signallingBytes
        );
        signatureValid = destination.identity!.validate(body.signature, signedData);
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
            rtt: computeLinkRttSeconds(nowSeconds, this.requestTime)
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
    const canAccept = canAcceptLinkRtt({ status: this.status, initiator: this.initiator });
    const plaintext = canAccept ? this.decrypt(packet.data) : null;
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

  private async applyLinkEstablishActions(
    actions: readonly LinkEstablishAction[],
    context?: {
      readonly prepareInitiatorActivate?: () => void;
      readonly rttPlaintext?: Uint8Array | null;
    }
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
        const measuredRtt = computeLinkRttSeconds(this.clock.now() / 1000, this.requestTime);
        const unpackRtt = stepUnpackMsgpackFloatWithActions(initialUnpackMsgpackFloatState(), {
          kind: "msgpack-float/unpack-gate",
          bytes: context?.rttPlaintext!
        });
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
            initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
            {
              kind: "establish/activated",
              atSeconds: nowSeconds,
              rtt: mergeLinkRtt(measuredRtt, remoteRtt)
            }
          ).actions
        );
      } catch {
        await this.applyLinkEstablishActions(
          stepLinkEstablishWithActions(
            initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
            { kind: "establish/rtt-failed" }
          ).actions
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
      this.transport.activateLink(this);
    }
    if (activated.sendRtt) {
      const packRtt = stepPackMsgpackFloat64WithActions(initialPackMsgpackFloat64State(), {
        kind: "msgpack-float/pack-gate",
        value: this.rtt!
      });
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
        data: this.encrypt(rttRaw)
      });
      await this.transport.sendPacket(rttPacket, { attachedInterface: this.attachedInterface });
      this.hadOutbound(false);
    }
    this.callbacks.linkEstablished?.(this);
  }

  async receive(packet: Packet, iface: PacketInterface): Promise<void> {
    if (isLinkClosed(this.status)) {
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

    if (
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: this.initiator,
        contextKeepalive: isLinkKeepaliveContext(packet.context),
        probePayload
      })
    ) {
      return;
    }

    if (
      !shouldAcceptLinkPacketInterface({
        hasAttachedInterface: this.attachedInterface !== null,
        sameInterface: iface === this.attachedInterface
      })
    ) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/inbound",
        at: this.clock.now() / 1000
      })
    );
    if (shouldUpdateLinkLastData(isLinkKeepaliveContext(packet.context))) {
      this.lastData = this.lastInbound;
    }

    if (!isLinkInboundDataPacket(packet.packetType)) {
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
      if (
        shouldReplyKeepaliveProbe({
          initiator: this.initiator,
          probePayload
        })
      ) {
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
      if (shouldDispatchLinkPlaintext(plaintext !== null) && plaintext !== null) {
        this.callbacks.packet?.(plaintext, packet);
      }
      return;
    }
    if (shouldIgnoreLinkDataContext(contextStepped.actions)) {
      return;
    }
  }

  identify(identity: Identity): void {
    if (!canIdentifyOnLink({ status: this.status, initiator: this.initiator }) || identity === null) {
      return;
    }

    const publicKey = identity.getPublicKey();
    const signature = identity.sign(linkIdentifySignedMaterial(this.linkId, publicKey));
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

  get cryptoProvider(): CryptoProvider {
    return this.provider;
  }

  get linkTransport(): LeafTransport {
    return this.transport;
  }

  get incomingResources(): readonly Resource[] {
    return this.incomingResourcesList;
  }

  get outgoingResources(): readonly Resource[] {
    return this.outgoingResourcesList;
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

  async request(
    path: string,
    data: Uint8Array | null = null,
    options: LinkRequestOptions = {}
  ): Promise<LinkRequestReceipt | false> {
    if (!canLinkRequest({ status: this.status, rtt: this.rtt })) {
      return false;
    }

    const pathEncode = stepUtf8EncodeWithActions(initialUtf8EncodeState(), {
      kind: "utf8/encode-gate",
      value: path
    });
    const pathBytes = utf8EncodeRawFromActions(pathEncode.actions);
    if (!shouldUseUtf8Encode(pathEncode.actions) || pathBytes === null) {
      throw new Error("Link.request: missing utf8 use-raw action");
    }
    const pathHash = Identity.truncatedHash(this.provider, pathBytes);
    const packStepped = stepPackLinkRequestWithActions(initialPackLinkRequestState(), {
      kind: "link-request-codec/pack-gate",
      requestedAt: this.clock.now() / 1000,
      pathHash,
      data
    });
    const packedRequest = shouldUsePackLinkRequest(packStepped.actions)
      ? packLinkRequestRawFromActions(packStepped.actions)
      : null;
    if (packedRequest === null) {
      return false;
    }
    const timeout = options.timeout ?? computeLinkRequestTimeout(this.rtt!);

    const appRequestStepped = stepLinkAppRequestWithActions(initialLinkAppRequestState(), {
      kind: "link/app-request-gate",
      status: this.status,
      rtt: this.rtt,
      packedLength: packedRequest.length,
      mdu: this.mdu
    });
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
      data: this.encrypt(packedRequest)
    });

    const pending = new LinkRequestReceipt({
      link: this,
      requestId: packet.truncatedHash(),
      timeout,
      now: () => this.clock.now() / 1000,
      requestSize: packedRequest.length,
      callbacks: {
        ...(options.response === undefined ? {} : { response: options.response }),
        ...(options.failed === undefined ? {} : { failed: options.failed })
      }
    });

    const sentReceipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: true
    });
    this.hadOutbound(false);

    const transmitStepped = stepLinkAppRequestTransmitWithActions(
      initialLinkAppRequestTransmitState(),
      {
        kind: "link/app-request-transmit-gate",
        receiptPresent: sentReceipt !== null
      }
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

  getChannel(): Channel {
    if (shouldCreateLinkChannel(this.channel !== null)) {
      this.channel = new Channel(new LinkChannelOutlet(this));
    }

    return this.channel!;
  }

  readyForNewResource(): boolean {
    return linkReadyForNewResource(this.outgoingResourcesList.length);
  }

  registerOutgoingResource(resource: Resource): void {
    if (shouldRegisterLinkResource(this.outgoingResourcesList.includes(resource))) {
      this.outgoingResourcesList.push(resource);
    }
  }

  registerIncomingResource(resource: Resource): void {
    if (shouldRegisterLinkResource(this.incomingResourcesList.includes(resource))) {
      this.incomingResourcesList.push(resource);
    }
  }

  hasIncomingResource(resource: Resource): boolean {
    return containsResourceHash({
      hashes: this.incomingResourcesList.map((incoming) => incoming.hash),
      target: resource.hash
    });
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

  setResourceStrategy(strategy: LinkResourceStrategyValue): void {
    this.resourceStrategy = strategy;
  }

  get trafficTimeoutFactor(): number {
    return LINK_TRAFFIC_TIMEOUT_FACTOR;
  }

  registerPendingRequest(receipt: LinkRequestReceipt): void {
    if (shouldRegisterPendingLinkRequest(this.pendingRequests.includes(receipt))) {
      this.pendingRequests.push(receipt);
    }
  }

  unregisterPendingRequest(receipt: LinkRequestReceipt): void {
    const stepped = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      {
        kind: "link/pending-request-unregister-gate",
        index: this.pendingRequests.indexOf(receipt)
      }
    );
    const index = pendingLinkRequestUnregisterIndex(stepped.actions);
    if (shouldRemovePendingLinkRequest(stepped.actions) && index !== null) {
      this.pendingRequests.splice(index, 1);
    }
  }

  encrypt(plaintext: Uint8Array): Uint8Array {
    return this.tokenInstance().encrypt(plaintext, { entropy: this.transport.entropy });
  }

  decrypt(ciphertext: Uint8Array): Uint8Array | null {
    try {
      return this.tokenInstance().decrypt(ciphertext);
    } catch {
      return null;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.NONE, data);
  }

  async sendContext(
    context: number,
    data: Uint8Array,
    options: { createReceipt?: boolean; encrypt?: boolean } = {}
  ): Promise<LinkSendContextResult> {
    if (!canLinkSend(this.status)) {
      throw new Error("Cannot send on inactive link");
    }

    const payload = shouldEncryptLinkPayload(options.encrypt)
      ? this.encrypt(data)
      : data;
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context,
      data: payload
    });

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false
    });
    this.hadOutbound(isLinkKeepaliveContext(context));
    return { raw: packet.raw, receipt };
  }

  async sendResourcePart(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.RESOURCE, data, { encrypt: false });
  }

  async resendPacket(raw: Uint8Array, options: { createReceipt?: boolean } = {}): Promise<LinkSendContextResult | null> {
    const packet = Packet.decode(this.provider, raw);
    if (
      !canResendLinkPacket({
        packetDecoded: packet !== null,
        attachedInterfacePresent: this.attachedInterface !== null
      }) ||
      packet === null
    ) {
      return null;
    }

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false
    });

    return { raw, receipt };
  }

  async teardown(): Promise<void> {
    await this.applyLinkTeardownActions(
      stepLinkTeardownWithActions(
        initialLinkTeardownState({ status: this.status, initiator: this.initiator }),
        { kind: "teardown/local" }
      ).actions
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
    for (const resource of [...this.incomingResourcesList, ...this.outgoingResourcesList]) {
      resource.cancel();
    }
    this.incomingResourcesList.length = 0;
    this.outgoingResourcesList.length = 0;
    this.transport.unregisterLink(this);
    this.callbacks.linkClosed?.(this);
  }

  updateMdu(): void {
    this.mdu = computeLinkMdu(this.mtu);
  }

  hadOutbound(isKeepalive = false): void {
    const now = this.clock.now() / 1000;
    this.lastOutbound = now;
    this.lastInbound = now;
    if (isKeepalive) {
      this.applyWatchdogResult(
        stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
          kind: "link/keepalive-sent",
          at: now
        })
      );
    } else {
      this.lastData = now;
    }
  }

  hopsMatch(packet: Packet): boolean {
    return linkHopsMatch({
      expectedHops: this.expectedHops,
      packetHops: packet.hops,
      pathfinderMaxHops: PATHFINDER_MAX_HOPS
    });
  }

  private async handleIdentifyPacket(packet: Packet): Promise<void> {
    const plaintext = canAcceptLinkIdentify(this.initiator)
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
    const signatureValid =
      identity !== null &&
      parts !== null &&
      identity.validate(
        parts.signature,
        linkIdentifySignedMaterial(this.linkId, parts.publicKey)
      );

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

  private applyLinkIdentifyActions(
    actions: readonly LinkIdentifyAction[],
    identity: Identity | null
  ): void {
    if (shouldRejectLinkIdentify(actions)) {
      return;
    }

    if (shouldCommitLinkIdentify(actions) && identity !== null) {
      this.remoteIdentity = identity;
      this.callbacks.remoteIdentified?.(this, identity);
    }
  }

  private async handleRequestPacket(packet: Packet): Promise<void> {
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

  private async applyLinkAppRequestInboundActions(
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

    if (shouldInvokeLinkAppRequestInbound(actions)) {
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

    if (
      shouldSendLinkAppRequestInboundResponse(actions) &&
      ctx.packedResponse !== null
    ) {
      await this.sendContext(PacketContext.RESPONSE, ctx.packedResponse);
    }
  }

  private async handleResponsePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
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
    const index = indexOfPendingLinkAppRequest({
      requestIds: pending.map((entry) => entry.requestId),
      target: fields.requestId
    });
    if (shouldDeliverPendingLinkAppResponse(index !== null)) {
      pending[index!]!.responseReceived(fields.response);
    }
  }

  private async handleChannelPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
      return;
    }

    this.getChannel().receive(plaintext!);
  }

  private async handleResourceAdvertisementPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
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

  private async applyLinkResourceAdvertisementActions(
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
      Resource.reject(this, plaintext);
      return;
    }

    if (!shouldAcceptLinkResourceAdvertisement(actions)) {
      return;
    }
    Resource.accept(this, plaintext, packet, {
      callback: (resource) => this.callbacks.resourceConcluded?.(resource)
    });
  }

  private async handleResourceRequestPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
      return;
    }

    const resourceHash = Resource.readRequestHash(plaintext!);
    for (const resource of this.outgoingResourcesList) {
      if (
        shouldHandleOutgoingResourceRequest({
          hashMatches: equalBytes(resource.hash, resourceHash),
          alreadySeen: resource.hasSeenRequest(packet)
        })
      ) {
        resource.trackRequest(packet);
        await resource.handleRequest(plaintext!);
        return;
      }
    }
  }

  private async handleResourceHashmapUpdatePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
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
    if (!shouldAcceptResourceHashmapUpdateFrame(split !== null)) {
      return;
    }
    for (const resource of this.incomingResourcesList) {
      if (shouldHandleIncomingResourceByHash(equalBytes(resource.hash, split!.resourceHash))) {
        resource.hashmapUpdatePacket(plaintext!);
        return;
      }
    }
  }

  private async handleResourceCancelPacket(packet: Packet, incoming: boolean): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
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
    if (!shouldAcceptResourceHashmapUpdateFrame(split !== null)) {
      return;
    }
    const resources = incoming ? this.incomingResourcesList : this.outgoingResourcesList;
    for (const resource of resources) {
      if (shouldHandleIncomingResourceByHash(equalBytes(resource.hash, split!.resourceHash))) {
        resource.cancel();
        return;
      }
    }
  }

  async handleResourceProof(packet: Packet): Promise<void> {
    if (!shouldAcceptResourceProofPayload(packet.data.length)) {
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
    if (split === null) {
      return;
    }
    for (const resource of this.outgoingResourcesList) {
      if (shouldHandleIncomingResourceByHash(equalBytes(resource.hash, split.resourceHash))) {
        resource.validateProof(packet.data);
        return;
      }
    }
  }

  private async handleResourcePartPacket(packet: Packet): Promise<void> {
    for (const resource of this.incomingResourcesList) {
      resource.receivePart(packet);
    }
  }

  private async handleTeardownPacket(packet: Packet): Promise<void> {
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

  private async applyLinkTeardownActions(actions: readonly LinkTeardownAction[]): Promise<void> {
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

  private async sendTeardownPacket(): Promise<void> {
    await this.sendContext(PacketContext.LINKCLOSE, this.linkId);
  }

  private async sendKeepalive(): Promise<void> {
    const packProbe = stepPackLinkKeepaliveProbeWithActions(
      initialPackLinkKeepaliveProbeState(),
      { kind: "link-keepalive/pack-probe-gate" }
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

  private async sendKeepaliveReply(): Promise<void> {
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

  private updateKeepalive(): void {
    if (!canUpdateLinkKeepalive(this.rtt !== null)) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/rtt-measured",
        rtt: this.rtt!
      })
    );
  }

  private startWatchdog(): void {
    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), { kind: "link/watchdog-start" })
    );
  }

  private stopWatchdog(): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }

  private scheduleWatchdog(delayMs: number): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.clock.setTimeout(() => {
      this.watchdogTick();
    }, delayMs);
  }

  private watchdogTick(): void {
    if (isLinkClosed(this.status)) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "timer/fired",
        id: "link-watchdog",
        at: this.clock.now()
      })
    );
  }

  private snapshotWatchdogState(): LinkWatchdogState {
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
      teardownReason: this.teardownReason
    };
  }

  private applyWatchdogResult(result: LinkWatchdogStepResult): void {
    this.status = result.state.status as LinkStatusValue;
    this.keepalive = result.state.keepalive;
    this.staleTime = result.state.staleTime;
    this.rtt = result.state.rtt;
    this.activatedAt = result.state.activatedAt;
    this.lastInbound = result.state.lastInbound;
    this.lastKeepalive = result.state.lastKeepalive;
    this.teardownReason = result.state.teardownReason as LinkTeardownReasonValue | null;

    for (const action of result.actions) {
      if (action.kind === "send-keepalive") {
        void this.sendKeepalive();
      } else if (action.kind === "send-teardown") {
        void this.sendTeardownPacket();
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

  private tokenInstance(): Token {
    const gate = stepLinkTokenAccessWithActions(initialLinkTokenAccessState(), {
      kind: "token/access-gate",
      derivedKeyPresent: this.derivedKey !== null,
      tokenPresent: this.token !== null
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
