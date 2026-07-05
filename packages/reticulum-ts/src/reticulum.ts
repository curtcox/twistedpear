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

/** Mirrors RNS/Reticulum.py MTU default. */
export const RETICULUM_MTU = 500;

export interface ReticulumOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly transportIdentity?: Identity;
  readonly useImplicitProof?: boolean;
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
    this.transportIdentity = options.transportIdentity ?? new Identity(options.provider);
    this.transport = new LeafTransport({
      provider: options.provider,
      transportIdentity: this.transportIdentity,
      clock: options.runtime.clock,
      ...(options.useImplicitProof === undefined ? {} : { useImplicitProof: options.useImplicitProof })
    });
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

  hopsTo(destinationHash: Uint8Array): number | null {
    return this.transport.hopsTo(destinationHash);
  }
}

export type { AnnounceHandler, LeafTransportOptions };
