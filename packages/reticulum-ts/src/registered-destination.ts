import type { CryptoProvider } from "./crypto/provider.js";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  type DestinationOptions
} from "./destination.js";
import type { PacketInterface } from "./interfaces/interface.js";
import { Announce } from "./announce.js";
import { Link, type LinkCallbacks } from "./link.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import type { PacketReceipt } from "./packet-receipt.js";
import {
  DestinationProofStrategy,
  type DestinationProofStrategyValue,
  type LeafTransport
} from "./transport/node.js";

export interface RegisteredDestinationOptions extends DestinationOptions {
  readonly provider: CryptoProvider;
}

export class RegisteredDestination extends Destination {
  readonly cryptoProvider: CryptoProvider;
  private packetCallback: ((data: Uint8Array, packet: Packet) => void) | null = null;
  private proofRequestedCallback: ((packet: Packet) => boolean) | null = null;
  proofStrategy: DestinationProofStrategyValue = DestinationProofStrategy.PROVE_NONE;
  acceptLinkRequests = true;
  private readonly links: Link[] = [];
  private transport: LeafTransport | null = null;

  get activeLinks(): readonly Link[] {
    return this.links;
  }

  constructor(options: RegisteredDestinationOptions) {
    super(options.provider, options);
    this.cryptoProvider = options.provider;
  }

  attachTransport(transport: LeafTransport): void {
    this.transport = transport;
    transport.registerDestination(this);
  }

  setPacketCallback(callback: (data: Uint8Array, packet: Packet) => void): void {
    this.packetCallback = callback;
  }

  setProofRequestedCallback(callback: (packet: Packet) => boolean): void {
    this.proofRequestedCallback = callback;
  }

  setProofStrategy(strategy: DestinationProofStrategyValue): void {
    this.proofStrategy = strategy;
  }

  setAcceptLinkRequests(accept: boolean): void {
    this.acceptLinkRequests = accept;
  }

  requestLink(callbacks?: LinkCallbacks): Link {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    return Link.request({
      destination: this,
      transport: this.transport,
      ...(callbacks === undefined ? {} : { callbacks })
    });
  }

  handleLinkRequest(packet: Packet, iface: PacketInterface): void {
    if (!this.acceptLinkRequests || this.direction !== DestinationDirection.IN) {
      return;
    }

    const link = Link.validateRequest(this, this.transport!, packet, iface);
    if (link !== null) {
      this.links.push(link);
    }
  }

  dispatchPacket(data: Uint8Array, packet: Packet): void {
    this.packetCallback?.(data, packet);
  }

  shouldProve(packet: Packet): boolean {
    if (this.proofRequestedCallback === null) {
      return false;
    }

    return this.proofRequestedCallback(packet);
  }

  decrypt(ciphertext: Uint8Array): Uint8Array | null {
    if (this.type === DestinationType.PLAIN) {
      return ciphertext;
    }

    if (this.identity === null) {
      return null;
    }

    return this.identity.decrypt(ciphertext).plaintext;
  }

  async announce(options: { appData?: Uint8Array; attachedInterface?: PacketInterface | null } = {}): Promise<void> {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    if (this.type !== DestinationType.SINGLE || this.direction !== DestinationDirection.IN) {
      throw new Error("Only IN SINGLE destinations can be announced");
    }

    if (this.identity === null) {
      throw new Error("Announce destination must hold an identity");
    }

    const packet = Announce.buildPacket(this.cryptoProvider, this, {
      ...(options.appData === undefined ? {} : { appData: options.appData })
    });
    await this.transport.sendPacket(packet, {
      attachedInterface: options.attachedInterface ?? null
    });
  }

  async send(
    data: Uint8Array,
    options: { createReceipt?: boolean; attachedInterface?: PacketInterface | null } = {}
  ): Promise<PacketReceipt | null> {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    if (this.direction !== DestinationDirection.OUT) {
      throw new Error("Only OUT destinations can send packets");
    }

    const ciphertext =
      this.type === DestinationType.PLAIN ? data : (this.identity?.encrypt(data) ?? null);
    if (ciphertext === null) {
      throw new Error("Destination cannot encrypt outbound data");
    }

    const packet = Packet.fromFields(this.cryptoProvider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: this.type,
      packetType: PacketType.DATA,
      destinationHash: this.hash,
      context: PacketContext.NONE,
      data: ciphertext
    });

    return this.transport.sendPacket(packet, {
      createReceipt: options.createReceipt ?? false,
      attachedInterface: options.attachedInterface ?? null
    });
  }
}

export { DestinationProofStrategy };
