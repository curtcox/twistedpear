import {
  LINK_INITIATOR_ENTROPY_SIZE,
  LINK_PROOF_BODY_SIZE,
  LINK_RESPONDER_ENTROPY_SIZE,
  applyLinkEstablishEvent,
  canAcceptLinkIdentify,
  canAcceptLinkRtt,
  canIdentifyOnLink,
  canLinkHandshake,
  canValidateLinkProof,
  classifyLinkProofPayload,
  computeKeepalive,
  computeLinkMdu,
  computeLinkRttSeconds,
  deriveRnsLinkKey,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  initialLinkEstablishState,
  linkHopsMatch,
  linkIdentifySignedMaterial,
  mergeLinkRtt,
  modeFromLinkProofData,
  modeFromLinkRequestData,
  mtuFromLinkProofData,
  mtuFromLinkRequestData,
  packLinkIdentifyPayload,
  splitInitiatorLinkEntropy,
  splitLinkIdentifyPayload,
  splitLinkProofBody,
  splitResponderLinkEntropy,
  stepLinkWatchdogWithActions,
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
import { DestinationAllowPolicy } from "./registered-destination.js";
import { RETICULUM_MTU } from "./reticulum.js";
import type { Clock } from "./runtime/runtime.js";
import type { LeafTransport } from "./transport/node.js";
import { PATHFINDER_MAX_HOPS } from "./transport/node.js";
import { Resource, ResourceAdvertisement } from "./resource.js";

/** Mirrors RNS/Link.py link mode constants (RNS 0.9.4). */
export const LinkMode = {
  MODE_AES128_CBC: 0x00,
  MODE_AES256_CBC: 0x01,
  MODE_AES256_GCM: 0x02
} as const;

export type LinkModeValue = (typeof LinkMode)[keyof typeof LinkMode];

export const LINK_MODE_DEFAULT = LinkMode.MODE_AES256_CBC;
export const LINK_ENABLED_MODES: ReadonlyArray<LinkModeValue> = [LinkMode.MODE_AES256_CBC];
export const LINK_MTU_BYTEMASK = 0x1fffff;
export const LINK_MODE_BYTEMASK = 0xe0;

/** Mirrors RNS/Link.py constants (RNS 0.9.4). */
export const LINK_ECPUB_SIZE = 64;
export const LINK_KEY_SIZE = 32;
export const LINK_MTU_SIZE = 3;
export const LINK_SIGNATURE_SIZE = 64;
export const LINK_KEEPALIVE = 360;
export const LINK_KEEPALIVE_MIN = 5;
export const LINK_KEEPALIVE_MAX_RTT = 1.75;
export const LINK_STALE_FACTOR = 2;
export const LINK_STALE_GRACE = 5;
export const LINK_TRAFFIC_TIMEOUT_FACTOR = 6;
export const LINK_KEEPALIVE_TIMEOUT_FACTOR = 4;
export const LINK_WATCHDOG_MAX_SLEEP_MS = 5000;
export const LINK_ESTABLISHMENT_TIMEOUT_PER_HOP = 6;
export const LINK_RESPONSE_MAX_GRACE_TIME = 5;

export const LinkStatus = {
  PENDING: 0x00,
  HANDSHAKE: 0x01,
  ACTIVE: 0x02,
  STALE: 0x03,
  CLOSED: 0x04
} as const;

export type LinkStatusValue = (typeof LinkStatus)[keyof typeof LinkStatus];

export const LinkTeardownReason = {
  TIMEOUT: 0x01,
  INITIATOR_CLOSED: 0x02,
  DESTINATION_CLOSED: 0x03
} as const;

export type LinkTeardownReasonValue = (typeof LinkTeardownReason)[keyof typeof LinkTeardownReason];

export const LinkResourceStrategy = {
  ACCEPT_NONE: 0x00,
  ACCEPT_ALL: 0x01,
  ACCEPT_APP: 0x02
} as const;

export type LinkResourceStrategyValue = (typeof LinkResourceStrategy)[keyof typeof LinkResourceStrategy];

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
  establishmentTimeout = LINK_ESTABLISHMENT_TIMEOUT_PER_HOP + LINK_KEEPALIVE;
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
    if (destination.direction !== DestinationDirection.OUT || destination.type !== DestinationType.SINGLE) {
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
    link.establishmentTimeout =
      LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * Math.max(1, link.expectedHops ?? 1) + LINK_KEEPALIVE;

    let mtu = RETICULUM_MTU;
    if (options.linkMtuDiscovery !== false) {
      const nextHopMtu = options.transport.nextHopInterfaceMtu(destination.hash);
      if (nextHopMtu !== null) {
        mtu = nextHopMtu;
      }
    }

    link.mtu = mtu;
    link.mode = LINK_MODE_DEFAULT;
    link.updateMdu();
    const requestData = concatBytes(
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
    const data = packet.data;
    if (data.length !== LINK_ECPUB_SIZE && data.length !== LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
      return null;
    }

    if (owner.identity === null) {
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
      link.loadPeer(
        data.subarray(0, LINK_ECPUB_SIZE / 2),
        data.subarray(LINK_ECPUB_SIZE / 2, LINK_ECPUB_SIZE)
      );
      link.setLinkId(packet);

      if (data.length === LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
        link.mtu = Link.mtuFromLrPacket(packet) ?? RETICULUM_MTU;
      }

      link.mode = Link.modeFromLrPacket(packet);
      if (!LINK_ENABLED_MODES.includes(link.mode)) {
        return null;
      }

      link.updateMdu();
      link.attachedInterface = iface;
      link.establishmentCost += packet.raw.length;
      link.handshake();
      link.requestTime = transport.clock.now() / 1000;
      link.lastInbound = link.requestTime;
      link.establishmentTimeout =
        LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * Math.max(1, packet.hops) + LINK_KEEPALIVE;
      transport.registerLink(link);
      link.startWatchdog();
      void link.prove();
      return link;
    } catch {
      return null;
    }
  }

  static linkIdFromLrPacket(provider: CryptoProvider, packet: Packet): Uint8Array {
    let hashablePart = packet.hashablePart();
    if (packet.data.length > LINK_ECPUB_SIZE) {
      const diff = packet.data.length - LINK_ECPUB_SIZE;
      hashablePart = hashablePart.subarray(0, hashablePart.length - diff);
    }

    return Identity.truncatedHash(provider, hashablePart);
  }

  static signallingBytes(mtu: number, mode: LinkModeValue): Uint8Array {
    if (!LINK_ENABLED_MODES.includes(mode)) {
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
    if (
      !canLinkHandshake(this.status) ||
      this.privateKey === null ||
      this.peerPublicKeyBytes === null
    ) {
      throw new Error("Invalid link state for handshake");
    }

    const established = applyLinkEstablishEvent(
      initialLinkEstablishState({ initiator: this.initiator, status: this.status }),
      { kind: "establish/handshake" }
    );
    this.status = established.status;
    const sharedKey = this.provider.x25519SharedSecret(this.privateKey, this.peerPublicKeyBytes);
    // ECDH at the crypto adapter edge; RNS HKDF length/salt selection is pure protocol.
    this.derivedKey = deriveRnsLinkKey(sharedKey, this.linkId, this.mode);
  }

  async prove(): Promise<void> {
    if (this.owner === null || this.publicKeyBytes === null || this.owner.identity === null) {
      throw new Error("Responder link is missing owner or key material");
    }

    const signallingBytes = Link.signallingBytes(this.mtu, this.mode);
    const ownerSigPublicKey = this.owner.identity.getPublicKey().subarray(
      LINK_ECPUB_SIZE / 2,
      LINK_ECPUB_SIZE
    );
    const signedData = concatBytes(this.linkId, this.publicKeyBytes, ownerSigPublicKey, signallingBytes);
    const signature = this.owner.identity.sign(signedData);
    const proofData = concatBytes(signature, this.publicKeyBytes, signallingBytes);
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
    if (
      !canValidateLinkProof({ status: this.status, initiator: this.initiator }) ||
      this.destination === null
    ) {
      return;
    }

    try {
      const mode = Link.modeFromLpPacket(packet);
      if (mode !== this.mode) {
        throw new Error(`Invalid link mode ${mode} in link request proof`);
      }

      let proofData = packet.data;
      let signallingBytes = new Uint8Array(0);
      let confirmedMtu: number | null = null;

      const layout = classifyLinkProofPayload(proofData.length);
      if (layout === "body-with-mtu") {
        confirmedMtu = Link.mtuFromLpPacket(packet);
        signallingBytes = Uint8Array.from(Link.signallingBytes(confirmedMtu ?? RETICULUM_MTU, mode));
        proofData = proofData.subarray(0, LINK_PROOF_BODY_SIZE);
      } else if (layout === "invalid") {
        throw new Error("Invalid link proof size");
      }

      const body = splitLinkProofBody(proofData);
      if (body === null) {
        throw new Error("Invalid link proof size");
      }

      const peerSignaturePublicKey = this.destination.identity!.getPublicKey().subarray(
        LINK_ECPUB_SIZE / 2,
        LINK_ECPUB_SIZE
      );
      this.loadPeer(body.peerPublicKey, peerSignaturePublicKey);
      this.handshake();

      const signedData = concatBytes(
        this.linkId,
        this.peerPublicKeyBytes!,
        peerSignaturePublicKey,
        signallingBytes
      );
      if (!this.destination.identity!.validate(body.signature, signedData)) {
        throw new Error("Invalid link proof signature");
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
        data: this.encrypt(msgpackEncodeFloat(this.rtt!))
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
    if (!canAcceptLinkRtt({ status: this.status, initiator: this.initiator })) {
      return;
    }

    try {
      const measuredRtt = computeLinkRttSeconds(this.clock.now() / 1000, this.requestTime);
      const plaintext = this.decrypt(packet.data);
      if (plaintext === null) {
        throw new Error("Could not decrypt RTT packet");
      }

      const remoteRtt = msgpackDecodeFloat(plaintext);
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
    if (this.status === LinkStatus.CLOSED) {
      return;
    }

    if (
      this.initiator &&
      packet.context === PacketContext.KEEPALIVE &&
      packet.data.length === 1 &&
      packet.data[0] === 0xff
    ) {
      return;
    }

    if (this.attachedInterface !== null && iface !== this.attachedInterface) {
      return;
    }

    this.lastInbound = this.clock.now() / 1000;
    if (packet.context !== PacketContext.KEEPALIVE) {
      this.lastData = this.lastInbound;
    }

    if (this.status === LinkStatus.STALE) {
      this.status = LinkStatus.ACTIVE;
    }

    if (packet.packetType !== PacketType.DATA) {
      return;
    }

    if (packet.context === PacketContext.LRRTT) {
      await this.handleRttPacket(packet);
      return;
    }

    if (packet.context === PacketContext.KEEPALIVE) {
      if (!this.initiator && packet.data.length === 1 && packet.data[0] === 0xff) {
        await this.sendKeepaliveReply();
      }
      return;
    }

    if (packet.context === PacketContext.LINKCLOSE) {
      await this.handleTeardownPacket(packet);
      return;
    }

    if (packet.context === PacketContext.LINKIDENTIFY) {
      await this.handleIdentifyPacket(packet);
      return;
    }

    if (packet.context === PacketContext.REQUEST) {
      await this.handleRequestPacket(packet);
      return;
    }

    if (packet.context === PacketContext.RESPONSE) {
      await this.handleResponsePacket(packet);
      return;
    }

    if (packet.context === PacketContext.CHANNEL) {
      await this.handleChannelPacket(packet);
      return;
    }

    if (packet.context === PacketContext.RESOURCE_ADV) {
      await this.handleResourceAdvertisementPacket(packet);
      return;
    }

    if (packet.context === PacketContext.RESOURCE_REQ) {
      await this.handleResourceRequestPacket(packet);
      return;
    }

    if (packet.context === PacketContext.RESOURCE_HMU) {
      await this.handleResourceHashmapUpdatePacket(packet);
      return;
    }

    if (packet.context === PacketContext.RESOURCE_ICL) {
      await this.handleResourceCancelPacket(packet, true);
      return;
    }

    if (packet.context === PacketContext.RESOURCE_RCL) {
      await this.handleResourceCancelPacket(packet, false);
      return;
    }

    if (packet.context === PacketContext.RESOURCE) {
      await this.handleResourcePartPacket(packet);
      return;
    }

    if (packet.context === PacketContext.NONE) {
      const plaintext = this.decrypt(packet.data);
      if (plaintext !== null) {
        this.callbacks.packet?.(plaintext, packet);
      }
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
    if (this.status !== LinkStatus.ACTIVE || this.rtt === null) {
      return false;
    }

    const pathHash = Identity.truncatedHash(this.provider, new TextEncoder().encode(path));
    const packedRequest = msgpackPackRequest(this.clock.now() / 1000, pathHash, data);
    const timeout =
      options.timeout ?? this.rtt * LINK_TRAFFIC_TIMEOUT_FACTOR + LINK_RESPONSE_MAX_GRACE_TIME * 1.125;

    if (packedRequest.length > this.mdu) {
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

    if (sentReceipt === null) {
      this.unregisterPendingRequest(pending);
      return false;
    }

    pending.attachPacketReceipt(sentReceipt);
    return pending;
  }

  getChannel(): Channel {
    if (this.channel === null) {
      this.channel = new Channel(new LinkChannelOutlet(this));
    }

    return this.channel;
  }

  readyForNewResource(): boolean {
    return this.outgoingResourcesList.length === 0;
  }

  registerOutgoingResource(resource: Resource): void {
    if (!this.outgoingResourcesList.includes(resource)) {
      this.outgoingResourcesList.push(resource);
    }
  }

  registerIncomingResource(resource: Resource): void {
    if (!this.incomingResourcesList.includes(resource)) {
      this.incomingResourcesList.push(resource);
    }
  }

  hasIncomingResource(resource: Resource): boolean {
    return this.incomingResourcesList.some((incoming) => equalBytes(incoming.hash, resource.hash));
  }

  resourceConcluded(resource: Resource): void {
    const outgoingIndex = this.outgoingResourcesList.indexOf(resource);
    if (outgoingIndex >= 0) {
      this.outgoingResourcesList.splice(outgoingIndex, 1);
    }

    const incomingIndex = this.incomingResourcesList.indexOf(resource);
    if (incomingIndex >= 0) {
      this.incomingResourcesList.splice(incomingIndex, 1);
    }
  }

  setResourceStrategy(strategy: LinkResourceStrategyValue): void {
    this.resourceStrategy = strategy;
  }

  get trafficTimeoutFactor(): number {
    return LINK_TRAFFIC_TIMEOUT_FACTOR;
  }

  registerPendingRequest(receipt: LinkRequestReceipt): void {
    if (!this.pendingRequests.includes(receipt)) {
      this.pendingRequests.push(receipt);
    }
  }

  unregisterPendingRequest(receipt: LinkRequestReceipt): void {
    const index = this.pendingRequests.indexOf(receipt);
    if (index >= 0) {
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
    if (this.status !== LinkStatus.ACTIVE) {
      throw new Error("Cannot send on inactive link");
    }

    const payload = options.encrypt === false ? data : this.encrypt(data);
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
    this.hadOutbound(context === PacketContext.KEEPALIVE);
    return { raw: packet.raw, receipt };
  }

  async sendResourcePart(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.RESOURCE, data, { encrypt: false });
  }

  async resendPacket(raw: Uint8Array, options: { createReceipt?: boolean } = {}): Promise<LinkSendContextResult | null> {
    const packet = Packet.decode(this.provider, raw);
    if (packet === null || this.attachedInterface === null) {
      return null;
    }

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false
    });

    return { raw, receipt };
  }

  async teardown(): Promise<void> {
    if (this.status === LinkStatus.PENDING || this.status === LinkStatus.CLOSED) {
      this.close();
      return;
    }

    await this.sendTeardownPacket();
    this.teardownReason = this.initiator ? LinkTeardownReason.INITIATOR_CLOSED : LinkTeardownReason.DESTINATION_CLOSED;
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
      this.lastKeepalive = now;
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
    if (!canAcceptLinkIdentify(this.initiator)) {
      return;
    }

    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    const parts = splitLinkIdentifyPayload(plaintext);
    if (parts === null) {
      return;
    }

    const identity = Identity.fromPublicKey(this.provider, parts.publicKey);
    if (identity === null) {
      return;
    }

    if (
      !identity.validate(
        parts.signature,
        linkIdentifySignedMaterial(this.linkId, parts.publicKey)
      )
    ) {
      return;
    }

    this.remoteIdentity = identity;
    this.callbacks.remoteIdentified?.(this, identity);
  }

  private async handleRequestPacket(packet: Packet): Promise<void> {
    const requestId = packet.truncatedHash();
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    try {
      const [requestedAt, pathHash, requestData] = msgpackUnpackRequest(plaintext);
      const handlerDestination = this.owner ?? this.destination;
      if (handlerDestination === null) {
        return;
      }

      const handler = handlerDestination.getRequestHandler(pathHash);
      if (handler === undefined) {
        return;
      }

      let allowed = false;
      if (handler.allow !== DestinationAllowPolicy.ALLOW_NONE) {
        if (handler.allow === DestinationAllowPolicy.ALLOW_LIST) {
          allowed =
            this.remoteIdentity !== null &&
            handler.allowedList.some((entry) => equalBytes(entry, this.remoteIdentity!.hash));
        } else if (handler.allow === DestinationAllowPolicy.ALLOW_ALL) {
          allowed = true;
        }
      }

      if (!allowed) {
        return;
      }

      const response = await handler.responseGenerator(
        handler.path,
        requestData,
        requestId,
        this.linkId,
        this.remoteIdentity,
        requestedAt
      );

      if (response === null) {
        return;
      }

      const packedResponse = msgpackPackResponse(requestId, response);
      if (packedResponse.length <= this.mdu) {
        await this.sendContext(PacketContext.RESPONSE, packedResponse);
      }
    } catch {
      // Ignore malformed requests.
    }
  }

  private async handleResponsePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    try {
      const [requestId, responseData] = msgpackUnpackResponse(plaintext);
      for (const pendingRequest of [...this.pendingRequests]) {
        if (pendingRequest.matchesRequestId(requestId)) {
          pendingRequest.responseReceived(responseData);
          return;
        }
      }
    } catch {
      // Ignore malformed responses.
    }
  }

  private async handleChannelPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    this.getChannel().receive(plaintext);
  }

  private async handleResourceAdvertisementPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    if (ResourceAdvertisement.isRequest(plaintext)) {
      Resource.accept(this, plaintext, packet, {
        callback: (resource) => this.callbacks.resourceConcluded?.(resource)
      });
      return;
    }

    if (this.resourceStrategy === LinkResourceStrategy.ACCEPT_NONE) {
      return;
    }

    if (this.resourceStrategy === LinkResourceStrategy.ACCEPT_APP) {
      try {
        const advertisement = ResourceAdvertisement.unpack(plaintext);
        if (this.callbacks.resource?.(advertisement) !== true) {
          Resource.reject(this, plaintext);
          return;
        }
      } catch {
        return;
      }
    }

    Resource.accept(this, plaintext, packet, {
      callback: (resource) => this.callbacks.resourceConcluded?.(resource)
    });
  }

  private async handleResourceRequestPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    const resourceHash = Resource.readRequestHash(plaintext);
    for (const resource of this.outgoingResourcesList) {
      if (equalBytes(resource.hash, resourceHash) && !resource.hasSeenRequest(packet)) {
        resource.trackRequest(packet);
        await resource.handleRequest(plaintext);
        return;
      }
    }
  }

  private async handleResourceHashmapUpdatePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    const resourceHash = plaintext.subarray(0, 32);
    for (const resource of this.incomingResourcesList) {
      if (equalBytes(resource.hash, resourceHash)) {
        resource.hashmapUpdatePacket(plaintext);
        return;
      }
    }
  }

  private async handleResourceCancelPacket(packet: Packet, incoming: boolean): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    const resources = incoming ? this.incomingResourcesList : this.outgoingResourcesList;
    for (const resource of resources) {
      if (equalBytes(resource.hash, plaintext.subarray(0, 32))) {
        resource.cancel();
        return;
      }
    }
  }

  async handleResourceProof(packet: Packet): Promise<void> {
    const resourceHash = packet.data.subarray(0, 32);
    for (const resource of this.outgoingResourcesList) {
      if (equalBytes(resource.hash, resourceHash)) {
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
    if (plaintext === null || !equalLinkId(plaintext, this.linkId)) {
      return;
    }

    this.teardownReason = this.initiator
      ? LinkTeardownReason.DESTINATION_CLOSED
      : LinkTeardownReason.INITIATOR_CLOSED;
    this.close();
  }

  private async sendTeardownPacket(): Promise<void> {
    await this.sendContext(PacketContext.LINKCLOSE, this.linkId);
  }

  private async sendKeepalive(): Promise<void> {
    await this.sendContext(PacketContext.KEEPALIVE, new Uint8Array([0xff]));
  }

  private async sendKeepaliveReply(): Promise<void> {
    await this.sendContext(PacketContext.KEEPALIVE, new Uint8Array([0xfe]));
  }

  private updateKeepalive(): void {
    if (this.rtt === null) {
      return;
    }

    this.keepalive = computeKeepalive(this.rtt);
    this.staleTime = this.keepalive * LINK_STALE_FACTOR;
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
    if (this.status === LinkStatus.CLOSED) {
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
    if (this.derivedKey === null) {
      throw new Error("Link has no derived key");
    }

    if (this.token === null) {
      this.token = new Token(this.provider, this.derivedKey);
    }

    return this.token;
  }
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(new Uint8Array(part), offset);
    offset += part.length;
  }

  return output;
}

function msgpackEncodeFloat(value: number): Uint8Array {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 0xcb);
  view.setFloat64(1, value, false);
  return new Uint8Array(buffer);
}

function msgpackDecodeFloat(bytes: Uint8Array): number {
  if (bytes.length >= 9 && bytes[0] === 0xcb) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(1, false);
  }

  if (bytes.length >= 5 && bytes[0] === 0xca) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat32(1, false);
  }

  throw new Error("Expected msgpack float");
}

function equalLinkId(left: Uint8Array, right: Uint8Array): boolean {
  return equalBytes(left, right);
}
