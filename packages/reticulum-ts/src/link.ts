import type { CryptoProvider } from "./crypto/provider.js";
import { rnsHkdf } from "./crypto/hkdf.js";
import { Token } from "./crypto/token.js";
import { DestinationDirection, DestinationType } from "./destination.js";
import { Identity } from "./identity.js";
import type { PacketInterface } from "./interfaces/interface.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import type { RegisteredDestination } from "./registered-destination.js";
import { RETICULUM_MTU } from "./reticulum.js";
import type { LeafTransport } from "./transport/node.js";
import { PATHFINDER_MAX_HOPS } from "./transport/node.js";

/** Mirrors RNS/Link.py constants (RNS 0.9.4). */
export const LINK_ECPUB_SIZE = 64;
export const LINK_KEY_SIZE = 32;
export const LINK_MTU_SIZE = 3;
export const LINK_SIGNATURE_SIZE = 64;
export const LINK_KEEPALIVE = 360;

export const LinkStatus = {
  PENDING: 0x00,
  HANDSHAKE: 0x01,
  ACTIVE: 0x02,
  STALE: 0x03,
  CLOSED: 0x04
} as const;

export type LinkStatusValue = (typeof LinkStatus)[keyof typeof LinkStatus];

export interface LinkCallbacks {
  linkEstablished?: (link: Link) => void;
  linkClosed?: (link: Link) => void;
  packet?: (data: Uint8Array, packet: Packet) => void;
}

export interface InitiatorLinkOptions {
  readonly destination: RegisteredDestination;
  readonly transport: LeafTransport;
  readonly linkMtuDiscovery?: boolean;
  readonly callbacks?: LinkCallbacks;
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

  private readonly provider: CryptoProvider;
  private readonly transport: LeafTransport;
  private privateKey: Uint8Array | null = null;
  private publicKeyBytes: Uint8Array | null = null;
  private peerPublicKeyBytes: Uint8Array | null = null;
  private peerSignaturePublicKeyBytes: Uint8Array | null = null;
  private derivedKey: Uint8Array | null = null;
  private token: Token | null = null;

  private constructor(
    provider: CryptoProvider,
    transport: LeafTransport,
    options: {
      readonly initiator: boolean;
      readonly owner: RegisteredDestination | null;
      readonly destination: RegisteredDestination | null;
      readonly callbacks?: LinkCallbacks;
    }
  ) {
    this.provider = provider;
    this.transport = transport;
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
    const link = new Link(provider, options.transport, {
      initiator: true,
      owner: null,
      destination,
      ...(options.callbacks === undefined ? {} : { callbacks: options.callbacks })
    });

    link.privateKey = provider.randomBytes(LINK_KEY_SIZE);
    const signaturePrivateKey = provider.randomBytes(LINK_KEY_SIZE);
    link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
    const signaturePublicKeyBytes = provider.ed25519PublicFromPrivate(signaturePrivateKey);
    link.expectedHops = options.transport.hopsTo(destination.hash);
    link.requestTime = Date.now() / 1000;

    let mtuBytes = new Uint8Array(0);
    if (options.linkMtuDiscovery !== false) {
      const nextHopMtu = options.transport.nextHopInterfaceMtu(destination.hash);
      if (nextHopMtu !== null && nextHopMtu !== RETICULUM_MTU) {
        link.mtu = nextHopMtu;
        mtuBytes = Uint8Array.from(Link.mtuBytes(nextHopMtu));
      }
    }

    link.updateMdu();
    const requestData = concatBytes(link.publicKeyBytes, signaturePublicKeyBytes, mtuBytes);
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
    void options.transport.sendPacket(packet).then(() => {
      link.hadOutbound();
    });

    return link;
  }

  static validateRequest(
    owner: RegisteredDestination,
    transport: LeafTransport,
    packet: Packet,
    iface: PacketInterface
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
      const link = new Link(provider, transport, {
        initiator: false,
        owner,
        destination: null
      });

      link.privateKey = provider.randomBytes(LINK_KEY_SIZE);
      link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
      link.loadPeer(
        data.subarray(0, LINK_ECPUB_SIZE / 2),
        data.subarray(LINK_ECPUB_SIZE / 2, LINK_ECPUB_SIZE)
      );
      link.setLinkId(packet);

      if (data.length === LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
        link.mtu = Link.mtuFromLrPacket(packet) ?? RETICULUM_MTU;
      }

      link.updateMdu();
      link.attachedInterface = iface;
      link.establishmentCost += packet.raw.length;
      link.handshake();
      link.requestTime = Date.now() / 1000;
      link.lastInbound = link.requestTime;
      transport.registerLink(link);
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

  static mtuBytes(mtu: number): Uint8Array {
    const value = mtu & 0xffffff;
    return new Uint8Array([(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
  }

  static mtuFromLrPacket(packet: Packet): number | null {
    if (packet.data.length !== LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
      return null;
    }

    const offset = LINK_ECPUB_SIZE;
    return (
      (packet.data[offset]! << 16) |
      (packet.data[offset + 1]! << 8) |
      packet.data[offset + 2]!
    );
  }

  static mtuFromLpPacket(packet: Packet): number | null {
    const base = LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2;
    if (packet.data.length !== base + LINK_MTU_SIZE) {
      return null;
    }

    const mtuBytes = packet.data.subarray(base, base + LINK_MTU_SIZE);
    return (mtuBytes[0]! << 16) | (mtuBytes[1]! << 8) | mtuBytes[2]!;
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
    if (this.status !== LinkStatus.PENDING || this.privateKey === null || this.peerPublicKeyBytes === null) {
      throw new Error("Invalid link state for handshake");
    }

    this.status = LinkStatus.HANDSHAKE;
    const sharedKey = this.provider.x25519SharedSecret(this.privateKey, this.peerPublicKeyBytes);
    this.derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.linkId, null);
  }

  async prove(): Promise<void> {
    if (this.owner === null || this.publicKeyBytes === null || this.owner.identity === null) {
      throw new Error("Responder link is missing owner or key material");
    }

    const mtuBytes = this.mtu === RETICULUM_MTU ? new Uint8Array(0) : Link.mtuBytes(this.mtu);
    const ownerSigPublicKey = this.owner.identity.getPublicKey().subarray(
      LINK_ECPUB_SIZE / 2,
      LINK_ECPUB_SIZE
    );
    const signedData = concatBytes(this.linkId, this.publicKeyBytes, ownerSigPublicKey, mtuBytes);
    const signature = this.owner.identity.sign(signedData);
    const proofData = concatBytes(signature, this.publicKeyBytes, mtuBytes);
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
    this.hadOutbound();
  }

  async validateProof(packet: Packet, iface: PacketInterface): Promise<void> {
    if (this.status !== LinkStatus.PENDING || !this.initiator || this.destination === null) {
      return;
    }

    try {
      let proofData = packet.data;
      let mtuBytes = new Uint8Array(0);
      let confirmedMtu: number | null = null;

      if (proofData.length === LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2 + LINK_MTU_SIZE) {
        confirmedMtu = Link.mtuFromLpPacket(packet);
        mtuBytes = Uint8Array.from(Link.mtuBytes(confirmedMtu ?? RETICULUM_MTU));
        proofData = proofData.subarray(0, LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2);
      }

      if (proofData.length !== LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2) {
        throw new Error("Invalid link proof size");
      }

      const peerPublicKey = proofData.subarray(LINK_SIGNATURE_SIZE, LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2);
      const peerSignaturePublicKey = this.destination.identity!.getPublicKey().subarray(
        LINK_ECPUB_SIZE / 2,
        LINK_ECPUB_SIZE
      );
      this.loadPeer(peerPublicKey, peerSignaturePublicKey);
      this.handshake();

      const signedData = concatBytes(this.linkId, this.peerPublicKeyBytes!, peerSignaturePublicKey, mtuBytes);
      const signature = proofData.subarray(0, LINK_SIGNATURE_SIZE);
      if (!this.destination.identity!.validate(signature, signedData)) {
        throw new Error("Invalid link proof signature");
      }

      this.rtt = Date.now() / 1000 - this.requestTime;
      this.attachedInterface = iface;
      this.mtu = confirmedMtu ?? RETICULUM_MTU;
      this.updateMdu();
      this.status = LinkStatus.ACTIVE;
      this.activatedAt = Date.now() / 1000;
      this.establishmentCost += packet.raw.length;
      this.transport.activateLink(this);

      const rttPacket = Packet.fromFields(this.provider, {
        headerType: PacketHeaderType.HEADER_1,
        transportType: TransportType.BROADCAST,
        destinationType: DestinationType.LINK,
        packetType: PacketType.DATA,
        destinationHash: this.linkId,
        context: PacketContext.LRRTT,
        data: this.encrypt(msgpackEncodeFloat(this.rtt))
      });
      await this.transport.sendPacket(rttPacket, { attachedInterface: this.attachedInterface });
      this.hadOutbound();
      this.callbacks.linkEstablished?.(this);
    } catch {
      this.status = LinkStatus.CLOSED;
    }
  }

  async handleRttPacket(packet: Packet): Promise<void> {
    if (this.initiator || this.status === LinkStatus.CLOSED) {
      return;
    }

    try {
      const measuredRtt = Date.now() / 1000 - this.requestTime;
      const plaintext = this.decrypt(packet.data);
      if (plaintext === null) {
        throw new Error("Could not decrypt RTT packet");
      }

      const remoteRtt = msgpackDecodeFloat(plaintext);
      this.rtt = Math.max(measuredRtt, remoteRtt);
      this.status = LinkStatus.ACTIVE;
      this.activatedAt = Date.now() / 1000;
      this.callbacks.linkEstablished?.(this);
    } catch {
      await this.teardown();
    }
  }

  async receive(packet: Packet, iface: PacketInterface): Promise<void> {
    if (this.status === LinkStatus.CLOSED) {
      return;
    }

    if (this.attachedInterface !== null && iface !== this.attachedInterface) {
      return;
    }

    this.lastInbound = Date.now() / 1000;

    if (packet.packetType === PacketType.DATA) {
      if (packet.context === PacketContext.LRRTT) {
        await this.handleRttPacket(packet);
        return;
      }

      if (packet.context === PacketContext.NONE) {
        const plaintext = this.decrypt(packet.data);
        if (plaintext !== null) {
          this.callbacks.packet?.(plaintext, packet);
        }
      }
    }
  }

  encrypt(plaintext: Uint8Array): Uint8Array {
    return this.tokenInstance().encrypt(plaintext);
  }

  decrypt(ciphertext: Uint8Array): Uint8Array | null {
    try {
      return this.tokenInstance().decrypt(ciphertext);
    } catch {
      return null;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (this.status !== LinkStatus.ACTIVE) {
      throw new Error("Cannot send on inactive link");
    }

    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context: PacketContext.NONE,
      data: this.encrypt(data)
    });

    await this.transport.sendPacket(packet, { attachedInterface: this.attachedInterface });
    this.hadOutbound();
  }

  async teardown(): Promise<void> {
    if (this.status === LinkStatus.PENDING || this.status === LinkStatus.CLOSED) {
      this.close();
      return;
    }

    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context: PacketContext.LINKCLOSE,
      data: this.encrypt(this.linkId)
    });

    await this.transport.sendPacket(packet, { attachedInterface: this.attachedInterface });
    this.close();
  }

  close(): void {
    this.status = LinkStatus.CLOSED;
    this.privateKey = null;
    this.publicKeyBytes = null;
    this.derivedKey = null;
    this.token = null;
    this.transport.unregisterLink(this);
    this.callbacks.linkClosed?.(this);
  }

  updateMdu(): void {
    const headerMax = 18;
    const ifacMin = 0;
    const blockSize = 16;
    this.mdu =
      Math.floor((this.mtu - ifacMin - headerMax - 48) / blockSize) * blockSize - 1;
  }

  hadOutbound(): void {
    this.lastInbound = Date.now() / 1000;
  }

  hopsMatch(packet: Packet): boolean {
    if (this.expectedHops === null) {
      return true;
    }

    return packet.hops === this.expectedHops || this.expectedHops === PATHFINDER_MAX_HOPS;
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
