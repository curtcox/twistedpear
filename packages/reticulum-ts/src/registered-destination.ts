import type { CryptoProvider } from "./crypto/provider.js";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  type DestinationOptions
} from "./destination.js";
import type { PacketInterface } from "./interfaces/interface.js";
import { Announce } from "./announce.js";
import { bytesToHex } from "./crypto/bytes.js";
import { Identity } from "./identity.js";
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
import { utf8Encode } from "@twistedpear/protocol";

export interface RegisteredDestinationOptions extends DestinationOptions {
  readonly provider: CryptoProvider;
}

export { DestinationProofStrategy };

export const DestinationAllowPolicy = {
  ALLOW_NONE: 0x00,
  ALLOW_ALL: 0x01,
  ALLOW_LIST: 0x02
} as const;

export type DestinationAllowPolicyValue = (typeof DestinationAllowPolicy)[keyof typeof DestinationAllowPolicy];

export interface RequestHandler {
  readonly path: string;
  readonly pathHash: Uint8Array;
  readonly responseGenerator: (
    path: string,
    data: Uint8Array | null,
    requestId: Uint8Array,
    linkId: Uint8Array,
    remoteIdentity: Identity | null,
    requestedAt: number
  ) => Uint8Array | null | Promise<Uint8Array | null>;
  readonly allow: DestinationAllowPolicyValue;
  readonly allowedList: ReadonlyArray<Uint8Array>;
}

export class RegisteredDestination extends Destination {
  readonly cryptoProvider: CryptoProvider;
  private packetCallback: ((data: Uint8Array, packet: Packet) => void) | null = null;
  private linkEstablishedCallback: ((link: Link) => void) | null = null;
  private proofRequestedCallback: ((packet: Packet) => boolean) | null = null;
  proofStrategy: DestinationProofStrategyValue = DestinationProofStrategy.PROVE_NONE;
  acceptLinkRequests = true;
  private readonly links: Link[] = [];
  private readonly requestHandlers = new Map<string, RequestHandler>();
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

  setLinkEstablishedCallback(callback: (link: Link) => void): void {
    this.linkEstablishedCallback = callback;
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

  registerRequestHandler(
    path: string,
    responseGenerator: RequestHandler["responseGenerator"],
    allow: DestinationAllowPolicyValue = DestinationAllowPolicy.ALLOW_NONE,
    allowedList: ReadonlyArray<Uint8Array> = []
  ): void {
    if (path.length === 0) {
      throw new Error("Invalid path specified");
    }

    const pathHash = Identity.truncatedHash(this.cryptoProvider, utf8Encode(path));
    this.requestHandlers.set(bytesToHex(pathHash), {
      path,
      pathHash,
      responseGenerator,
      allow,
      allowedList
    });
  }

  deregisterRequestHandler(path: string): boolean {
    const pathHash = Identity.truncatedHash(this.cryptoProvider, utf8Encode(path));
    return this.requestHandlers.delete(bytesToHex(pathHash));
  }

  getRequestHandler(pathHash: Uint8Array): RequestHandler | undefined {
    return this.requestHandlers.get(bytesToHex(pathHash));
  }

  requestLink(
    callbacks?: LinkCallbacks,
    options?: { readonly entropy?: Uint8Array }
  ): Link {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    return Link.request({
      destination: this,
      transport: this.transport,
      ...(callbacks === undefined ? {} : { callbacks }),
      ...(options?.entropy === undefined ? {} : { entropy: options.entropy })
    });
  }

  handleLinkRequest(packet: Packet, iface: PacketInterface): void {
    if (!this.acceptLinkRequests || this.direction !== DestinationDirection.IN) {
      return;
    }

    const link = Link.validateRequest(this, this.transport!, packet, iface);
    if (link !== null) {
      if (this.linkEstablishedCallback !== null) {
        const callback = this.linkEstablishedCallback;
        const existing = link.callbacks.linkEstablished;
        link.callbacks.linkEstablished = (establishedLink) => {
          existing?.(establishedLink);
          callback(establishedLink);
        };
      }

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

  async announce(
    options: {
      appData?: Uint8Array;
      attachedInterface?: PacketInterface | null;
      pathResponse?: boolean;
      randomHash?: Uint8Array;
    } = {}
  ): Promise<void> {
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
      entropy: this.transport.entropy,
      ...(options.appData === undefined ? {} : { appData: options.appData }),
      ...(options.pathResponse === true ? { pathResponse: true } : {}),
      ...(options.randomHash === undefined ? {} : { randomHash: options.randomHash })
    });
    await this.transport.sendPacket(packet, {
      attachedInterface: options.attachedInterface ?? null
    });
  }

  async answerPathRequest(iface: PacketInterface): Promise<void> {
    await this.announce({ pathResponse: true, attachedInterface: iface });
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
      this.type === DestinationType.PLAIN
        ? data
        : (this.identity?.encrypt(data, { entropy: this.transport.entropy }) ?? null);
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
