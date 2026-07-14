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
  applyLinkEstablishEvent,
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
  deriveRnsLinkKey,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  indexOfPendingLinkAppRequest,
  initialLinkEstablishState,
  isLinkClosed,
  isLinkKeepaliveProbe,
  isExpectedLinkMode,
  isLinkModeEnabled,
  linkHopsMatch,
  linkIdentifySignedMaterial,
  linkProofSignedMaterial,
  linkReadyForNewResource,
  linkRequestHashablePart,
  mergeLinkRtt,
  modeFromLinkProofData,
  modeFromLinkRequestData,
  msgpackPackFloat64,
  msgpackUnpackFloat,
  mtuFromLinkProofData,
  mtuFromLinkRequestData,
  packLinkIdentifyPayload,
  packLinkKeepaliveProbe,
  packLinkKeepaliveReply,
  packLinkProofData,
  packLinkRequestData,
  planLinkAppRequest,
  planLinkAppRequestDispatch,
  planLinkAppRequestResponse,
  planLinkAppRequestTransmitOutcome,
  planLinkDataContext,
  planLinkIdentifyOutcome,
  planLinkInitiatorMtu,
  planLinkProofValidateOutcome,
  planLinkRequestResponderMtu,
  planLinkResourceAcceptAppResult,
  planLinkResourceAdvertisement,
  planLinkResourceConclude,
  planLinkRttOutcome,
  planLinkTeardown,
  planLinkTeardownReason,
  planLinkTokenAccess,
  planLinkValidateRequest,
  planUnregisterPendingLinkRequest,
  shouldAcceptLinkPacketInterface,
  shouldAcceptLinkTeardown,
  shouldAcceptResourceHashmapUpdateFrame,
  shouldAcceptResourceProofPayload,
  shouldAcceptResourceProofSplit,
  shouldAttemptLinkProofCrypto,
  shouldCreateLinkChannel,
  shouldDispatchLinkPlaintext,
  shouldEncryptLinkPayload,
  shouldHandleIncomingResourceByHash,
  shouldHandleOutgoingResourceRequest,
  shouldIgnoreInitiatorKeepaliveProbe,
  shouldRegisterLinkResource,
  shouldRegisterPendingLinkRequest,
  shouldReplyKeepaliveProbe,
  shouldUpdateLinkLastData,
  isLinkInboundDataPacket,
  isLinkKeepaliveContext,
  splitIdentityPublicKey,
  splitInitiatorLinkEntropy,
  splitLinkIdentifyPayload,
  splitLinkProofBody,
  splitLinkRequestData,
  splitResourceHashmapUpdatePacket,
  splitResourceProof,
  splitResponderLinkEntropy,
  stepLinkWatchdogWithActions,
  utf8Encode,
  type LinkModeValue,
  type LinkResourceStrategyValue,
  type LinkStatusValue,
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
  msgpackPackRequest,
  msgpackPackResponse,
  msgpackUnpackRequest,
  msgpackUnpackResponse
} from "./msgpack.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import type { PacketReceipt } from "./packet-receipt.js";
import type { RegisteredDestination } from "./registered-destination.js";
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

    const initiatorKeys = splitInitiatorLinkEntropy(
      options.entropy ?? options.transport.entropy.randomBytes(LINK_INITIATOR_ENTROPY_SIZE)
    );
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
    const mtu = planLinkInitiatorMtu({
      discoveryEnabled,
      nextHopMtu: discoveryEnabled
        ? options.transport.nextHopInterfaceMtu(destination.hash)
        : null,
      defaultMtu: RETICULUM_MTU
    });

    link.mtu = mtu;
    link.mode = LINK_MODE_DEFAULT;
    link.updateMdu();
    const requestData = packLinkRequestData(
      link.publicKeyBytes,
      signaturePublicKeyBytes,
      Link.signallingBytes(mtu, link.mode)
    );
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
    const request = splitLinkRequestData(packet.data);
    const early = planLinkValidateRequest({
      requestPresent: request !== null,
      ownerIdentityPresent: owner.identity !== null,
      modeEnabled: true
    });
    if (early !== "ok" || request === null) {
      return null;
    }

    try {
      const provider = owner.cryptoProvider;
      const link = new Link(provider, transport, transport.clock, {
        initiator: false,
        owner,
        destination: null
      });

      const responderKeys = splitResponderLinkEntropy(
        options?.entropy ?? transport.entropy.randomBytes(LINK_RESPONDER_ENTROPY_SIZE)
      );
      link.privateKey = responderKeys.privateKey;
      link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
      link.loadPeer(request.publicKey, request.signaturePublicKey);
      link.setLinkId(packet);

      link.mtu = planLinkRequestResponderMtu({
        signallingPresent: request.signallingBytes.length > 0,
        signallingMtu: Link.mtuFromLrPacket(packet),
        currentMtu: link.mtu,
        defaultMtu: RETICULUM_MTU
      });

      link.mode = Link.modeFromLrPacket(packet);
      if (
        planLinkValidateRequest({
          requestPresent: true,
          ownerIdentityPresent: true,
          modeEnabled: isLinkModeEnabled(link.mode)
        }) !== "ok"
      ) {
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

    return encodeLinkSignallingBytes(mtu, mode);
  }

  static modeFromLrPacket(packet: Packet): LinkModeValue {
    return modeFromLinkRequestData(packet.data, LINK_MODE_DEFAULT) as LinkModeValue;
  }

  static modeFromLpPacket(packet: Packet): LinkModeValue {
    return modeFromLinkProofData(packet.data, LINK_MODE_DEFAULT) as LinkModeValue;
  }

  static mtuBytes(mtu: number): Uint8Array {
    return encodeLinkMtuBytes(mtu);
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

    const established = applyLinkEstablishEvent(
      initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
      { kind: "establish/handshake" }
    );
    this.status = established.status;
    const sharedKey = this.provider.x25519SharedSecret(privateKey, peerPublicKeyBytes);
    // ECDH at the crypto adapter edge; RNS HKDF length/salt selection is pure protocol.
    this.derivedKey = deriveRnsLinkKey(sharedKey, this.linkId, this.mode);
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
    const ownerPublic = splitIdentityPublicKey(ownerIdentity.getPublicKey());
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
    const proofData = packLinkProofData(signature, publicKeyBytes, signallingBytes);
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

      const body = splitLinkProofBody(proofData);
      const peerPublic =
        body !== null ? splitIdentityPublicKey(destination.identity!.getPublicKey()) : null;

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

      if (
        planLinkProofValidateOutcome({
          canValidate: true,
          modeMatches,
          layoutValid,
          bodyPresent: body !== null,
          peerPublicPresent: peerPublic !== null,
          signatureValid
        }) === "reject"
      ) {
        throw new Error("Invalid link request proof");
      }

      const nowSeconds = this.clock.now() / 1000;
      const activated = applyLinkEstablishEvent(
        initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
        {
          kind: "establish/activated",
          atSeconds: nowSeconds,
          rtt: computeLinkRttSeconds(nowSeconds, this.requestTime)
        }
      );
      this.rtt = activated.rtt;
      this.attachedInterface = iface;
      this.mtu = confirmedMtu ?? RETICULUM_MTU;
      this.updateMdu();
      this.updateKeepalive();
      this.status = activated.status;
      this.activatedAt = activated.activatedAt;
      this.establishmentCost += packet.raw.length;
      this.transport.activateLink(this);

      const rttPacket = Packet.fromFields(this.provider, {
        headerType: PacketHeaderType.HEADER_1,
        transportType: TransportType.BROADCAST,
        destinationType: DestinationType.LINK,
        packetType: PacketType.DATA,
        destinationHash: this.linkId,
        context: PacketContext.LRRTT,
        data: this.encrypt(msgpackPackFloat64(this.rtt!))
      });
      await this.transport.sendPacket(rttPacket, { attachedInterface: this.attachedInterface });
      this.hadOutbound(false);
      this.callbacks.linkEstablished?.(this);
    } catch {
      const failed = applyLinkEstablishEvent(
        initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
        { kind: "establish/failed" }
      );
      this.status = failed.status;
    }
  }

  async handleRttPacket(packet: Packet): Promise<void> {
    const canAccept = canAcceptLinkRtt({ status: this.status, initiator: this.initiator });
    const plaintext = canAccept ? this.decrypt(packet.data) : null;
    const outcome = planLinkRttOutcome({
      canAccept,
      plaintextPresent: plaintext !== null
    });
    if (outcome === "ignore") {
      return;
    }
    if (outcome === "teardown" || plaintext === null) {
      await this.teardown();
      return;
    }

    try {
      const measuredRtt = computeLinkRttSeconds(this.clock.now() / 1000, this.requestTime);
      const remoteRtt = msgpackUnpackFloat(plaintext);
      const nowSeconds = this.clock.now() / 1000;
      const activated = applyLinkEstablishEvent(
        initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
        {
          kind: "establish/activated",
          atSeconds: nowSeconds,
          rtt: mergeLinkRtt(measuredRtt, remoteRtt)
        }
      );
      this.rtt = activated.rtt;
      this.updateKeepalive();
      this.status = activated.status;
      this.activatedAt = activated.activatedAt;
      this.callbacks.linkEstablished?.(this);
    } catch {
      await this.teardown();
    }
  }

  async receive(packet: Packet, iface: PacketInterface): Promise<void> {
    if (isLinkClosed(this.status)) {
      return;
    }

    if (
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: this.initiator,
        contextKeepalive: isLinkKeepaliveContext(packet.context),
        probePayload: isLinkKeepaliveProbe(packet.data)
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

    switch (planLinkDataContext(packet.context)) {
      case "rtt":
        await this.handleRttPacket(packet);
        return;
      case "keepalive":
        if (
          shouldReplyKeepaliveProbe({
            initiator: this.initiator,
            probePayload: isLinkKeepaliveProbe(packet.data)
          })
        ) {
          await this.sendKeepaliveReply();
        }
        return;
      case "close":
        await this.handleTeardownPacket(packet);
        return;
      case "identify":
        await this.handleIdentifyPacket(packet);
        return;
      case "request":
        await this.handleRequestPacket(packet);
        return;
      case "response":
        await this.handleResponsePacket(packet);
        return;
      case "channel":
        await this.handleChannelPacket(packet);
        return;
      case "resource-adv":
        await this.handleResourceAdvertisementPacket(packet);
        return;
      case "resource-req":
        await this.handleResourceRequestPacket(packet);
        return;
      case "resource-hmu":
        await this.handleResourceHashmapUpdatePacket(packet);
        return;
      case "resource-icl":
        await this.handleResourceCancelPacket(packet, true);
        return;
      case "resource-rcl":
        await this.handleResourceCancelPacket(packet, false);
        return;
      case "resource":
        await this.handleResourcePartPacket(packet);
        return;
      case "plaintext": {
        const plaintext = this.decrypt(packet.data);
        if (shouldDispatchLinkPlaintext(plaintext !== null) && plaintext !== null) {
          this.callbacks.packet?.(plaintext, packet);
        }
        return;
      }
      case "ignore":
        return;
    }
  }

  identify(identity: Identity): void {
    if (!canIdentifyOnLink({ status: this.status, initiator: this.initiator }) || identity === null) {
      return;
    }

    const publicKey = identity.getPublicKey();
    const signature = identity.sign(linkIdentifySignedMaterial(this.linkId, publicKey));
    void this.sendContext(PacketContext.LINKIDENTIFY, packLinkIdentifyPayload(publicKey, signature));
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

    const pathHash = Identity.truncatedHash(this.provider, utf8Encode(path));
    const packedRequest = msgpackPackRequest(this.clock.now() / 1000, pathHash, data);
    const timeout = options.timeout ?? computeLinkRequestTimeout(this.rtt!);

    if (
      planLinkAppRequest({
        status: this.status,
        rtt: this.rtt,
        packedLength: packedRequest.length,
        mdu: this.mdu
      }) === "reject"
    ) {
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

    if (planLinkAppRequestTransmitOutcome(sentReceipt !== null) === "unregister") {
      this.unregisterPendingRequest(pending);
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
    const plan = planLinkResourceConclude({
      outgoingIndex: this.outgoingResourcesList.indexOf(resource),
      incomingIndex: this.incomingResourcesList.indexOf(resource)
    });
    if (plan.removeOutgoingIndex !== null) {
      this.outgoingResourcesList.splice(plan.removeOutgoingIndex, 1);
    }
    if (plan.removeIncomingIndex !== null) {
      this.incomingResourcesList.splice(plan.removeIncomingIndex, 1);
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
    const index = planUnregisterPendingLinkRequest(this.pendingRequests.indexOf(receipt));
    if (index !== null) {
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
    const plan = planLinkTeardown(this.status);
    if (plan.kind === "close-only") {
      this.close();
      return;
    }

    await this.sendTeardownPacket();
    this.teardownReason = planLinkTeardownReason({
      initiator: this.initiator,
      remote: false
    });
    this.close();
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
    const canAccept = canAcceptLinkIdentify(this.initiator);
    const plaintext = canAccept ? this.decrypt(packet.data) : null;
    const parts = plaintext !== null ? splitLinkIdentifyPayload(plaintext) : null;
    const identity =
      parts !== null ? Identity.fromPublicKey(this.provider, parts.publicKey) : null;
    const signatureValid =
      identity !== null &&
      parts !== null &&
      identity.validate(
        parts.signature,
        linkIdentifySignedMaterial(this.linkId, parts.publicKey)
      );

    if (
      planLinkIdentifyOutcome({
        canAccept,
        plaintextPresent: plaintext !== null,
        partsPresent: parts !== null,
        identityPresent: identity !== null,
        signatureValid
      }) === "reject" ||
      identity === null
    ) {
      return;
    }

    this.remoteIdentity = identity;
    this.callbacks.remoteIdentified?.(this, identity);
  }

  private async handleRequestPacket(packet: Packet): Promise<void> {
    const requestId = packet.truncatedHash();
    const plaintext = this.decrypt(packet.data);

    try {
      const unpacked =
        plaintext !== null ? msgpackUnpackRequest(plaintext) : null;
      const handlerDestination = this.owner ?? this.destination;
      const pathHash = unpacked?.[1] ?? null;
      const handler =
        handlerDestination !== null && pathHash !== null
          ? handlerDestination.getRequestHandler(pathHash)
          : undefined;

      const dispatch = planLinkAppRequestDispatch({
        plaintextPresent: plaintext !== null,
        handlerDestinationPresent: handlerDestination !== null,
        handlerPresent: handler !== undefined,
        allow: handler?.allow ?? 0,
        allowedList: handler?.allowedList ?? [],
        remoteIdentityHash: this.remoteIdentity?.hash ?? null
      });
      if (dispatch !== "invoke-handler" || unpacked === null || handler === undefined) {
        return;
      }

      const [requestedAt, , requestData] = unpacked;
      const response = await handler.responseGenerator(
        handler.path,
        requestData,
        requestId,
        this.linkId,
        this.remoteIdentity,
        requestedAt
      );

      const packedResponse =
        response !== null ? msgpackPackResponse(requestId, response) : null;
      if (
        planLinkAppRequestResponse({
          responsePresent: packedResponse !== null,
          packedLength: packedResponse?.length ?? 0,
          mdu: this.mdu
        }) === "send-response" &&
        packedResponse !== null
      ) {
        await this.sendContext(PacketContext.RESPONSE, packedResponse);
      }
    } catch {
      // Ignore malformed requests.
    }
  }

  private async handleResponsePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (!shouldDispatchLinkPlaintext(plaintext !== null)) {
      return;
    }

    try {
      const [requestId, responseData] = msgpackUnpackResponse(plaintext!);
      const pending = [...this.pendingRequests];
      const index = indexOfPendingLinkAppRequest({
        requestIds: pending.map((entry) => entry.requestId),
        target: requestId
      });
      if (index !== null) {
        pending[index]!.responseReceived(responseData);
      }
    } catch {
      // Ignore malformed responses.
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

    const plan = planLinkResourceAdvertisement({
      isRequest: ResourceAdvertisement.isRequest(plaintext!),
      strategy: this.resourceStrategy
    });
    if (plan.kind === "ignore") {
      return;
    }

    if (plan.kind === "ask-app") {
      try {
        const advertisement = ResourceAdvertisement.unpack(plaintext!);
        if (planLinkResourceAcceptAppResult(this.callbacks.resource?.(advertisement) === true) === "reject") {
          Resource.reject(this, plaintext!);
          return;
        }
      } catch {
        return;
      }
    }

    Resource.accept(this, plaintext!, packet, {
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

    const split = splitResourceHashmapUpdatePacket(plaintext!);
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

    const split = splitResourceHashmapUpdatePacket(plaintext!);
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
    const split = splitResourceProof(packet.data);
    if (!shouldAcceptResourceProofSplit(split !== null)) {
      return;
    }
    for (const resource of this.outgoingResourcesList) {
      if (shouldHandleIncomingResourceByHash(equalBytes(resource.hash, split!.resourceHash))) {
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
    if (
      !shouldAcceptLinkTeardown({
        plaintextPresent: plaintext !== null,
        linkIdMatches: plaintext !== null && equalBytes(plaintext, this.linkId)
      })
    ) {
      return;
    }

    this.teardownReason = planLinkTeardownReason({
      initiator: this.initiator,
      remote: true
    });
    this.close();
  }

  private async sendTeardownPacket(): Promise<void> {
    await this.sendContext(PacketContext.LINKCLOSE, this.linkId);
  }

  private async sendKeepalive(): Promise<void> {
    await this.sendContext(PacketContext.KEEPALIVE, packLinkKeepaliveProbe());
  }

  private async sendKeepaliveReply(): Promise<void> {
    await this.sendContext(PacketContext.KEEPALIVE, packLinkKeepaliveReply());
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
    const plan = planLinkTokenAccess({
      derivedKeyPresent: this.derivedKey !== null,
      tokenPresent: this.token !== null
    });
    if (plan === "reject-no-key") {
      throw new Error("Link has no derived key");
    }
    if (plan === "create") {
      this.token = new Token(this.provider, this.derivedKey!);
    }

    return this.token!;
  }
}
