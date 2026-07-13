import type { CryptoProvider } from "./crypto/provider.js";
import { Identity } from "./identity.js";
import type { PacketInterface } from "./interfaces/interface.js";
import { TcpClientInterface, TcpServerInterface, type TcpClientInterfaceOptions, type TcpServerInterfaceOptions } from "./interfaces/tcp.js";
import { UdpInterface, type UdpInterfaceOptions } from "./interfaces/udp.js";
import { PipeInterface, type PipeInterfaceOptions } from "./interfaces/pipe.js";
import type { Runtime } from "./runtime/runtime.js";
import { RegisteredDestination } from "./registered-destination.js";
import {
  LeafTransport,
  type AnnounceHandler,
  type LeafTransportOptions
} from "./transport/node.js";
import { TransportNode } from "./transport/transport.js";
import { PATH_REQUEST_TIMEOUT_SECONDS } from "./transport/path.js";

/** Mirrors RNS/Reticulum.py MTU default. */
export const RETICULUM_MTU = 500;

export interface ReticulumOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly transportIdentity?: Identity;
  readonly useImplicitProof?: boolean;
  readonly transportEnabled?: boolean;
}

export class Reticulum {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly transportIdentity: Identity;
  private readonly transport: LeafTransport;
  private started = false;

  constructor(options: ReticulumOptions) {
    this.provider = options.provider;
    this.runtime = options.runtime;
    this.transportIdentity =
      options.transportIdentity ??
      new Identity(options.provider, { entropy: options.runtime.entropy });
    const transportOptions: LeafTransportOptions = {
      provider: options.provider,
      transportIdentity: this.transportIdentity,
      clock: options.runtime.clock,
      entropy: options.runtime.entropy,
      ...(options.useImplicitProof === undefined ? {} : { useImplicitProof: options.useImplicitProof })
    };
    this.transport =
      options.transportEnabled === true
        ? new TransportNode({ ...transportOptions, transportEnabled: true })
        : new LeafTransport(transportOptions);
  }

  static create(options: ReticulumOptions): Reticulum {
    return new Reticulum(options);
  }

  start(): void {
    this.started = true;
  }

  stop(): void {
    this.started = false;
  }

  get isStarted(): boolean {
    return this.started;
  }

  registerDestination(options: ConstructorParameters<typeof RegisteredDestination>[0]): RegisteredDestination {
    const destination = new RegisteredDestination(options);
    destination.attachTransport(this.transport);
    return destination;
  }

  registerAnnounceHandler(handler: AnnounceHandler): void {
    this.transport.registerAnnounceHandler(handler);
  }

  registerInterface(iface: PacketInterface): void {
    this.transport.registerInterface(iface);
  }

  unregisterInterface(iface: PacketInterface): void {
    this.transport.unregisterInterface(iface);
  }

  async addPipeInterface(options: Omit<PipeInterfaceOptions, "provider">): Promise<PipeInterface> {
    const iface = new PipeInterface(this.provider, { ...options, provider: this.provider });
    this.registerInterface(iface);
    return iface;
  }

  async addTcpClientInterface(options: Omit<TcpClientInterfaceOptions, "provider" | "runtime">): Promise<TcpClientInterface> {
    const iface = await TcpClientInterface.connect(this.provider, this.runtime, {
      ...options,
      provider: this.provider,
      runtime: this.runtime
    });
    this.registerInterface(iface);
    return iface;
  }

  async addTcpServerInterface(options: Omit<TcpServerInterfaceOptions, "provider" | "runtime">): Promise<TcpServerInterface> {
    const server = new TcpServerInterface(this.provider, this.runtime, {
      ...options,
      provider: this.provider,
      runtime: this.runtime
    });
    server.setSpawnHandler((client) => {
      this.registerInterface(client);
    });
    await server.start();
    return server;
  }

  async addUdpInterface(options: Omit<UdpInterfaceOptions, "provider" | "runtime">): Promise<UdpInterface> {
    const iface = await UdpInterface.open(this.provider, this.runtime, {
      ...options,
      provider: this.provider,
      runtime: this.runtime
    });
    this.registerInterface(iface);
    return iface;
  }

  hasPath(destinationHash: Uint8Array): boolean {
    return this.transport.hasPath(destinationHash);
  }

  get pathTableCount(): number {
    return this.transport.pathTableCount;
  }

  get activeLinkCount(): number {
    return this.transport.activeLinkCount;
  }

  get bandwidthBytesIn(): number {
    return this.transport.bandwidthBytesIn;
  }

  get bandwidthBytesOut(): number {
    return this.transport.bandwidthBytesOut;
  }

  hopsTo(destinationHash: Uint8Array): number | null {
    return this.transport.hopsTo(destinationHash);
  }

  requestPath(destinationHash: Uint8Array, onInterface?: PacketInterface | null): void {
    this.transport.requestPath(destinationHash, onInterface ?? null);
  }

  async awaitPath(destinationHash: Uint8Array, timeoutSeconds?: number): Promise<boolean> {
    return this.transport.awaitPath(
      destinationHash,
      timeoutSeconds ?? PATH_REQUEST_TIMEOUT_SECONDS
    );
  }

  get isTransportEnabled(): boolean {
    return this.transport instanceof TransportNode;
  }

  listInterfaces(): ReadonlyArray<PacketInterface> {
    return this.transport.listInterfaces();
  }

  /** Resolve a destination hash to an identity from local registrations or the announce cache. */
  resolveDestinationIdentity(destinationHash: Uint8Array): Identity | null {
    const local = this.transport.findLocalDestination(destinationHash);
    if (local?.identity !== null && local?.identity !== undefined) {
      return local.identity;
    }

    return Identity.recall(this.provider, destinationHash);
  }
}

export type { AnnounceHandler, LeafTransportOptions };
