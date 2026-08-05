import type { CryptoProvider } from "../crypto/provider.js";
import type { DuplexConnection, Runtime, Timer } from "../runtime/runtime.js";
import { Packet } from "../packet.js";
import {
  HdlcPacketInterface,
  type PacketInterface,
  type ReticulumInterfaceOptions,
} from "./interface.js";
import {
  INTERFACE_CONNECT_TIMEOUT_MS,
  INTERFACE_CONNECT_TIMER_ID,
  INTERFACE_RECONNECT_TIMER_ID,
  INTERFACE_RECONNECT_WAIT_MS,
  initialInterfaceConnectState,
  initialInterfaceReconnectState,
  stepInterfaceConnectWithActions,
  stepInterfaceReconnectWithActions,
  type InterfaceReconnectEvent,
  type InterfaceReconnectState,
} from "@twistedpear/protocol";

/** Mirrors RNS/Interfaces/TCPInterface.py reconnect defaults. */
export const TCP_RECONNECT_WAIT_MS = INTERFACE_RECONNECT_WAIT_MS;
export const TCP_INITIAL_CONNECT_TIMEOUT_MS = INTERFACE_CONNECT_TIMEOUT_MS;
export const TCP_HW_MTU = 262_144;

function isTransientSocketDisconnect(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? error.code : undefined;
  return (
    code === "EPIPE" ||
    code === "ECONNRESET" ||
    code === "ECONNABORTED" ||
    code === "ERR_STREAM_DESTROYED"
  );
}

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
export type DetachedInterfaceHandler = (iface: TcpClientInterface) => void;

export class TcpClientInterface extends HdlcPacketInterface {
  private connection: DuplexConnection | null = null;
  private lastConnectionError: Error | null = null;
  private onClosed: DetachedInterfaceHandler | null = null;
  private readTask: Promise<void> | null = null;
  private reconnectTimer: Timer | null = null;
  private reconnectState: InterfaceReconnectState;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: TcpClientInterfaceOptions,
    private readonly connected: DuplexConnection | null = null,
  ) {
    super(options, options.incoming ?? true, options.outgoing ?? true);
    this.reconnectState = initialInterfaceReconnectState({
      maxTries: options.maxReconnectTries ?? null,
      waitMs: options.reconnectWaitMs ?? TCP_RECONNECT_WAIT_MS,
      suppressReconnect: connected !== null,
    });
  }

  static async connect(
    provider: CryptoProvider,
    runtime: Runtime,
    options: TcpClientInterfaceOptions,
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
    outgoing: boolean,
  ): TcpClientInterface {
    const iface = new TcpClientInterface(
      provider,
      runtime,
      {
        ...options,
        targetHost: "0.0.0.0",
        targetPort: 0,
        outgoing,
      },
      connection,
    );
    iface.attachConnection(connection);
    return iface;
  }

  get connectionError(): Error | null {
    return this.lastConnectionError;
  }

  setCloseHandler(handler: DetachedInterfaceHandler): void {
    this.onClosed = handler;
  }

  async initialConnect(): Promise<void> {
    if (this.connected !== null) {
      this.attachConnection(this.connected);
      return;
    }

    const connected = await this.connectOnce();
    if (!connected) {
      this.applyReconnect({ kind: "iface/disconnected" });
    }
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    if (this.connection === null || !this.online) {
      throw new Error(`TCP interface ${this.name} is not connected`);
    }

    try {
      await this.connection.write(bytes);
    } catch (error) {
      // Peer reset during announce/path-request races must not become an
      // unhandled rejection from fire-and-forget transmits (`void sendPacket`).
      if (isTransientSocketDisconnect(error)) {
        this.online = false;
        this.lastConnectionError =
          error instanceof Error ? error : new Error(String(error));
        return;
      }
      throw error;
    }
  }

  protected async closeInterface(): Promise<void> {
    this.applyReconnect({ kind: "iface/detach" });

    if (this.connection !== null) {
      await this.connection.close();
      this.connection = null;
    }
    this.onClosed?.(this);
    this.onClosed = null;
  }

  private attachConnection(connection: DuplexConnection): void {
    this.connection = connection;
    this.lastConnectionError = null;
    this.online = true;
    this.applyReconnect({ kind: "iface/connected" });
    this.readTask = this.readLoop(connection);
  }

  private async connectOnce(): Promise<boolean> {
    try {
      const connection = await this.openConnection();
      this.attachConnection(connection);
      return true;
    } catch (error) {
      this.lastConnectionError =
        error instanceof Error ? error : new Error(String(error));
      this.online = false;
      return false;
    }
  }

  private openConnection(): Promise<DuplexConnection> {
    return new Promise((resolve, reject) => {
      const armed = stepInterfaceConnectWithActions(
        initialInterfaceConnectState(),
        {
          kind: "interface-connect/arm",
          timeoutMs: this.connectTimeoutMs(),
        },
      );
      let state = armed.state;
      let timer: Timer | null = null;
      let settled = false;
      let pendingConnection: DuplexConnection | null = null;
      let pendingError: unknown = null;

      const finish = (
        result:
          | { ok: true; connection: DuplexConnection }
          | { ok: false; error: Error },
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (result.ok) {
          resolve(result.connection);
          return;
        }
        reject(result.error);
      };

      const applyIntents = (
        intents: ReturnType<typeof stepInterfaceConnectWithActions>["intents"],
      ): void => {
        for (const intent of intents) {
          if (
            intent.kind === "timer/set" &&
            intent.timer.id === INTERFACE_CONNECT_TIMER_ID
          ) {
            timer?.cancel();
            timer = this.runtime.clock.setTimeout(() => {
              timer = null;
              const tick = stepInterfaceConnectWithActions(state, {
                kind: "timer/fired",
                id: INTERFACE_CONNECT_TIMER_ID,
                at: this.runtime.clock.now(),
              });
              state = tick.state;
              applyIntents(tick.intents);
              applyActions(tick.actions);
            }, intent.timer.delayMs);
          }
          if (
            intent.kind === "timer/cancel" &&
            intent.timer.id === INTERFACE_CONNECT_TIMER_ID
          ) {
            timer?.cancel();
            timer = null;
          }
        }
      };

      const applyActions = (
        actions: ReturnType<typeof stepInterfaceConnectWithActions>["actions"],
      ): void => {
        for (const action of actions) {
          if (action.kind === "connect") {
            // Timeout is owned by stepInterfaceConnect; factory must not arm a second timer.
            void this.runtime.tcp
              .connect({
                host: this.options.targetHost,
                port: this.options.targetPort,
                connectTimeoutMs: 0,
              })
              .then((connection) => {
                pendingConnection = connection;
                const result = stepInterfaceConnectWithActions(state, {
                  kind: "interface-connect/connected",
                });
                state = result.state;
                applyIntents(result.intents);
                applyActions(result.actions);
                if (pendingConnection === connection) {
                  void connection.close();
                  pendingConnection = null;
                }
              })
              .catch((error: unknown) => {
                pendingError = error;
                const result = stepInterfaceConnectWithActions(state, {
                  kind: "interface-connect/failed",
                });
                state = result.state;
                applyIntents(result.intents);
                applyActions(result.actions);
              });
          }
          if (action.kind === "resolve") {
            const connection = pendingConnection;
            if (connection !== null) {
              pendingConnection = null;
              finish({ ok: true, connection });
            }
          }
          if (action.kind === "reject") {
            if (action.reason === "timeout") {
              finish({
                ok: false,
                error: new Error(
                  `TCP connect timed out after ${this.connectTimeoutMs()}ms`,
                ),
              });
              return;
            }
            const error = pendingError;
            pendingError = null;
            finish({
              ok: false,
              error:
                error instanceof Error
                  ? error
                  : new Error(String(error ?? "connect failed")),
            });
          }
        }
      };

      applyIntents(armed.intents);
      applyActions(armed.actions);
    });
  }

  private connectTimeoutMs(): number {
    return this.options.connectTimeoutMs ?? TCP_INITIAL_CONNECT_TIMEOUT_MS;
  }

  private applyReconnect(event: InterfaceReconnectEvent): void {
    const result = stepInterfaceReconnectWithActions(
      this.reconnectState,
      event,
    );
    this.reconnectState = result.state;

    for (const intent of result.intents) {
      if (
        intent.kind === "timer/cancel" &&
        intent.timer.id === INTERFACE_RECONNECT_TIMER_ID
      ) {
        this.reconnectTimer?.cancel();
        this.reconnectTimer = null;
      }
      if (
        intent.kind === "timer/set" &&
        intent.timer.id === INTERFACE_RECONNECT_TIMER_ID
      ) {
        this.reconnectTimer?.cancel();
        this.reconnectTimer = this.runtime.clock.setTimeout(() => {
          this.reconnectTimer = null;
          this.applyReconnect({
            kind: "timer/fired",
            id: INTERFACE_RECONNECT_TIMER_ID,
            at: this.runtime.clock.now(),
          });
        }, intent.timer.delayMs);
      }
    }

    for (const action of result.actions) {
      if (action.kind === "give-up") {
        void this.close();
      } else if (action.kind === "connect") {
        void this.attemptReconnect();
      }
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectState.detached) {
      return;
    }

    const connected = await this.connectOnce();
    if (!connected) {
      this.applyReconnect({ kind: "iface/connect-failed" });
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
      if (!this.reconnectState.detached && this.connected === null) {
        this.applyReconnect({ kind: "iface/disconnected" });
      } else if (!this.reconnectState.detached) {
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
  private onDetached: DetachedInterfaceHandler | null = null;
  private closed = false;
  private listenAddress: { host: string; port: number } | null = null;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: TcpServerInterfaceOptions,
  ) {
    this.name = options.name;
    this.incoming = options.incoming ?? true;
    this.outgoing = options.outgoing ?? true;
    this.mtu = options.mtu ?? 500;
    this.bitrate = options.bitrate ?? null;
  }

  setSpawnHandler(handler: SpawnedInterfaceHandler): void {
    this.onSpawned = handler;
  }

  setDetachHandler(handler: DetachedInterfaceHandler): void {
    this.onDetached = handler;
  }

  async start(): Promise<void> {
    this.listener = await this.runtime.tcp.listen({
      host: this.options.listenHost,
      port: this.options.listenPort,
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
          incoming: this.incoming,
          outgoing: this.outgoing,
        },
        connection,
        this.outgoing,
      );
      client.setCloseHandler((closed) => {
        const index = this.spawned.indexOf(closed);
        if (index >= 0) this.spawned.splice(index, 1);
        this.onDetached?.(closed);
      });
      this.spawned.push(client);
      this.onSpawned?.(client);
    }
  }
}

export function isTcpClientInterface(
  value: PacketInterface,
): value is TcpClientInterface {
  return value instanceof TcpClientInterface;
}

export function isTcpServerInterface(
  value: unknown,
): value is TcpServerInterface {
  return value instanceof TcpServerInterface;
}
