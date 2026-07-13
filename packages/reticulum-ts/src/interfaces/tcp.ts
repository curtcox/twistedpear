import type { CryptoProvider } from "../crypto/provider.js";
import type { DuplexConnection, Runtime, Timer } from "../runtime/runtime.js";
import { Packet } from "../packet.js";
import { HdlcPacketInterface, type PacketInterface, type ReticulumInterfaceOptions } from "./interface.js";
import {
  INTERFACE_RECONNECT_WAIT_MS,
  planInterfaceReconnect
} from "@twistedpear/protocol";

/** Mirrors RNS/Interfaces/TCPInterface.py reconnect defaults. */
export const TCP_RECONNECT_WAIT_MS = INTERFACE_RECONNECT_WAIT_MS;
export const TCP_INITIAL_CONNECT_TIMEOUT_MS = 5_000;
export const TCP_HW_MTU = 262_144;

export interface TcpClientInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly targetHost: string;
  readonly targetPort: number;
  readonly connectTimeoutMs?: number;
  readonly reconnectWaitMs?: number;
  readonly maxReconnectTries?: number | null;
}

export interface TcpServerInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly listenHost: string;
  readonly listenPort: number;
}

export type SpawnedInterfaceHandler = (iface: TcpClientInterface) => void;

export class TcpClientInterface extends HdlcPacketInterface {
  private connection: DuplexConnection | null = null;
  private readTask: Promise<void> | null = null;
  private reconnectTimer: Timer | null = null;
  private reconnectAttempts = 0;
  private detached = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: TcpClientInterfaceOptions,
    private readonly connected: DuplexConnection | null = null
  ) {
    super(
      options,
      true,
      options.outgoing ?? (connected === null ? options.outgoing ?? true : options.outgoing ?? true)
    );
  }

  static async connect(
    provider: CryptoProvider,
    runtime: Runtime,
    options: TcpClientInterfaceOptions
  ): Promise<TcpClientInterface> {
    const iface = new TcpClientInterface(provider, runtime, options);
    await iface.initialConnect();
    return iface;
  }

  static fromConnection(
    provider: CryptoProvider,
    runtime: Runtime,
    options: Omit<TcpClientInterfaceOptions, "targetHost" | "targetPort">,
    connection: DuplexConnection,
    outgoing: boolean
  ): TcpClientInterface {
    const iface = new TcpClientInterface(
      provider,
      runtime,
      {
        ...options,
        targetHost: "0.0.0.0",
        targetPort: 0,
        outgoing
      },
      connection
    );
    iface.attachConnection(connection);
    return iface;
  }

  async initialConnect(): Promise<void> {
    if (this.connected !== null) {
      this.attachConnection(this.connected);
      return;
    }

    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
    }
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    if (this.connection === null || !this.online) {
      throw new Error(`TCP interface ${this.name} is not connected`);
    }

    await this.connection.write(bytes);
  }

  protected async closeInterface(): Promise<void> {
    this.detached = true;
    this.reconnectTimer?.cancel();
    this.reconnectTimer = null;

    if (this.connection !== null) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private attachConnection(connection: DuplexConnection): void {
    this.connection = connection;
    this.online = true;
    this.reconnectAttempts = 0;
    this.readTask = this.readLoop(connection);
  }

  private async connectOnce(): Promise<boolean> {
    try {
      const connection = await this.runtime.tcp.connect({
        host: this.options.targetHost,
        port: this.options.targetPort,
        connectTimeoutMs: this.options.connectTimeoutMs ?? TCP_INITIAL_CONNECT_TIMEOUT_MS
      });
      this.attachConnection(connection);
      return true;
    } catch {
      this.online = false;
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.detached || this.connected !== null) {
      return;
    }

    this.reconnectTimer?.cancel();
    this.reconnectTimer = this.runtime.clock.setTimeout(async () => {
      this.reconnectTimer = null;
      await this.reconnect();
    }, this.options.reconnectWaitMs ?? TCP_RECONNECT_WAIT_MS);
  }

  private async reconnect(): Promise<void> {
    if (this.detached) {
      return;
    }

    const plan = planInterfaceReconnect({
      attempts: this.reconnectAttempts,
      maxTries: this.options.maxReconnectTries ?? null,
      waitMs: this.options.reconnectWaitMs ?? TCP_RECONNECT_WAIT_MS
    });
    this.reconnectAttempts = plan.attempt;
    if (plan.kind === "give-up") {
      await this.close();
      return;
    }

    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
    }
  }

  private async readLoop(connection: DuplexConnection): Promise<void> {
    try {
      for await (const chunk of connection.readable) {
        this.receiveBytes(chunk);
      }
    } catch {
      // Connection closed or failed.
    } finally {
      this.online = false;
      if (!this.detached && this.connected === null) {
        this.scheduleReconnect();
      } else if (!this.detached) {
        await this.close();
      }
    }
  }
}

export class TcpServerInterface {
  readonly name: string;
  readonly incoming: boolean;
  readonly outgoing: boolean;
  readonly mtu: number;
  readonly bitrate: number | null;
  online = false;

  private listener: Awaited<ReturnType<Runtime["tcp"]["listen"]>> | null = null;
  private acceptTask: Promise<void> | null = null;
  private readonly spawned: TcpClientInterface[] = [];
  private onSpawned: SpawnedInterfaceHandler | null = null;
  private closed = false;
  private listenAddress: { host: string; port: number } | null = null;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: TcpServerInterfaceOptions
  ) {
    this.name = options.name;
    this.incoming = true;
    this.outgoing = options.outgoing ?? true;
    this.mtu = options.mtu ?? 500;
    this.bitrate = options.bitrate ?? null;
  }

  setSpawnHandler(handler: SpawnedInterfaceHandler): void {
    this.onSpawned = handler;
  }

  async start(): Promise<void> {
    this.listener = await this.runtime.tcp.listen({
      host: this.options.listenHost,
      port: this.options.listenPort
    });
    this.listenAddress = this.listener.address;
    this.online = true;
    this.acceptTask = this.acceptLoop();
  }

  get address(): { readonly host: string; readonly port: number } | null {
    return this.listenAddress;
  }

  get clients(): readonly TcpClientInterface[] {
    return this.spawned;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.online = false;

    for (const client of [...this.spawned]) {
      await client.close();
    }

    if (this.listener !== null) {
      await this.listener.close();
      this.listener = null;
    }
  }

  private async acceptLoop(): Promise<void> {
    if (this.listener === null) {
      return;
    }

    for await (const connection of this.listener.accept()) {
      if (this.closed) {
        await connection.close();
        continue;
      }

      const client = TcpClientInterface.fromConnection(
        this.provider,
        this.runtime,
        {
          name: `${this.name}:client`,
          provider: this.provider,
          runtime: this.runtime,
          mtu: this.mtu,
          bitrate: this.bitrate,
          outgoing: this.outgoing
        },
        connection,
        this.outgoing
      );
      this.spawned.push(client);
      this.onSpawned?.(client);
    }
  }
}

export function isTcpClientInterface(value: PacketInterface): value is TcpClientInterface {
  return value instanceof TcpClientInterface;
}

export function isTcpServerInterface(value: unknown): value is TcpServerInterface {
  return value instanceof TcpServerInterface;
}
