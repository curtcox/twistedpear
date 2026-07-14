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
  type InterfaceReconnectState
} from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import { Packet } from "../packet.js";
import type { Runtime, Timer } from "../runtime/runtime.js";
import { RawPacketInterface, type ReticulumInterfaceOptions } from "./interface.js";

export const WEBSOCKET_RECONNECT_WAIT_MS = INTERFACE_RECONNECT_WAIT_MS;
export const WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS = INTERFACE_CONNECT_TIMEOUT_MS;
export const WEBSOCKET_HW_MTU = 262_144;

export interface WebSocketClientInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly url: string;
  readonly protocols?: string | readonly string[];
  readonly sharedToken?: string;
  readonly connectTimeoutMs?: number;
  readonly reconnectWaitMs?: number;
  readonly maxReconnectTries?: number | null;
  readonly webSocketFactory?: WebSocketFactory;
}

export type WebSocketFactory = (url: string, protocols?: string | readonly string[]) => WebSocketLike;

export interface WebSocketLike {
  binaryType: string;
  readonly readyState: number;
  send(data: Uint8Array): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "message", listener: (event: WebSocketMessageEvent) => void): void;
  addEventListener(type: "close" | "error", listener: () => void): void;
  removeEventListener(type: "open", listener: () => void): void;
  removeEventListener(type: "message", listener: (event: WebSocketMessageEvent) => void): void;
  removeEventListener(type: "close" | "error", listener: () => void): void;
}

export interface WebSocketMessageEvent {
  readonly data: unknown;
}

export class WebSocketClientInterface extends RawPacketInterface {
  private socket: WebSocketLike | null = null;
  private reconnectTimer: Timer | null = null;
  private reconnectState: InterfaceReconnectState;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: WebSocketClientInterfaceOptions,
    connected: WebSocketLike | null = null
  ) {
    super({ ...options, mtu: options.mtu ?? WEBSOCKET_HW_MTU }, true, options.outgoing ?? true);
    this.reconnectState = initialInterfaceReconnectState({
      maxTries: options.maxReconnectTries ?? null,
      waitMs: options.reconnectWaitMs ?? WEBSOCKET_RECONNECT_WAIT_MS,
      suppressReconnect: connected !== null
    });
    if (connected !== null) {
      this.attachSocket(connected);
    }
  }

  static async connect(
    provider: CryptoProvider,
    runtime: Runtime,
    options: WebSocketClientInterfaceOptions
  ): Promise<WebSocketClientInterface> {
    const iface = new WebSocketClientInterface(provider, runtime, options);
    await iface.initialConnect();
    return iface;
  }

  static fromSocket(
    provider: CryptoProvider,
    runtime: Runtime,
    options: WebSocketClientInterfaceOptions,
    socket: WebSocketLike,
    outgoing: boolean
  ): WebSocketClientInterface {
    return new WebSocketClientInterface(provider, runtime, { ...options, outgoing }, socket);
  }

  async initialConnect(): Promise<void> {
    const connected = await this.connectOnce();
    if (!connected) {
      this.applyReconnect({ kind: "iface/disconnected" });
    }
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    if (this.socket === null || !this.online || this.socket.readyState !== 1) {
      throw new Error(`WebSocket interface ${this.name} is not connected`);
    }

    this.socket.send(bytes);
  }

  protected async closeInterface(): Promise<void> {
    this.applyReconnect({ kind: "iface/detach" });

    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
  }

  private async connectOnce(): Promise<boolean> {
    try {
      const socket = await this.openSocket();
      this.attachSocket(socket);
      return true;
    } catch {
      this.online = false;
      return false;
    }
  }

  private async openSocket(): Promise<WebSocketLike> {
    const socket = this.createSocket();
    socket.binaryType = "arraybuffer";

    return new Promise((resolve, reject) => {
      const armed = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
        kind: "interface-connect/arm",
        timeoutMs: this.connectTimeoutMs()
      });
      let state = armed.state;
      let timer: Timer | null = null;
      let settled = false;

      const cleanupListeners = () => {
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("close", onFailure);
        socket.removeEventListener("error", onFailure);
      };

      const finish = (result: { ok: true } | { ok: false; error: Error }): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanupListeners();
        if (result.ok) {
          resolve(socket);
          return;
        }
        reject(result.error);
      };

      const applyIntents = (
        intents: ReturnType<typeof stepInterfaceConnectWithActions>["intents"]
      ): void => {
        for (const intent of intents) {
          if (intent.kind === "timer/set" && intent.timer.id === INTERFACE_CONNECT_TIMER_ID) {
            timer?.cancel();
            timer = this.runtime.clock.setTimeout(() => {
              timer = null;
              const tick = stepInterfaceConnectWithActions(state, {
                kind: "timer/fired",
                id: INTERFACE_CONNECT_TIMER_ID,
                at: this.runtime.clock.now()
              });
              state = tick.state;
              applyIntents(tick.intents);
              applyActions(tick.actions);
            }, intent.timer.delayMs);
          }
          if (intent.kind === "timer/cancel" && intent.timer.id === INTERFACE_CONNECT_TIMER_ID) {
            timer?.cancel();
            timer = null;
          }
        }
      };

      const applyActions = (
        actions: ReturnType<typeof stepInterfaceConnectWithActions>["actions"]
      ): void => {
        for (const action of actions) {
          if (action.kind === "connect") {
            socket.addEventListener("open", onOpen);
            socket.addEventListener("close", onFailure);
            socket.addEventListener("error", onFailure);
          }
          if (action.kind === "resolve") {
            finish({ ok: true });
          }
          if (action.kind === "reject") {
            if (action.reason === "timeout") {
              socket.close();
              finish({
                ok: false,
                error: new Error(`WebSocket connect timed out after ${this.connectTimeoutMs()}ms`)
              });
              return;
            }
            finish({
              ok: false,
              error: new Error(`WebSocket connect failed for ${this.options.url}`)
            });
          }
        }
      };

      const onOpen = () => {
        const result = stepInterfaceConnectWithActions(state, {
          kind: "interface-connect/connected"
        });
        state = result.state;
        applyIntents(result.intents);
        applyActions(result.actions);
      };
      const onFailure = () => {
        const result = stepInterfaceConnectWithActions(state, {
          kind: "interface-connect/failed"
        });
        state = result.state;
        applyIntents(result.intents);
        applyActions(result.actions);
      };

      applyIntents(armed.intents);
      applyActions(armed.actions);
    });
  }

  private createSocket(): WebSocketLike {
    const factory = this.options.webSocketFactory ?? defaultWebSocketFactory;
    return factory(this.options.url, this.protocols());
  }

  private protocols(): string | readonly string[] | undefined {
    if (this.options.sharedToken === undefined) {
      return this.options.protocols;
    }

    const tokenProtocol = `tp-token.${this.options.sharedToken}`;
    if (this.options.protocols === undefined) {
      return tokenProtocol;
    }

    return typeof this.options.protocols === "string"
      ? [this.options.protocols, tokenProtocol]
      : [...this.options.protocols, tokenProtocol];
  }

  private connectTimeoutMs(): number {
    return this.options.connectTimeoutMs ?? WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS;
  }

  private attachSocket(socket: WebSocketLike): void {
    this.socket = socket;
    this.online = true;
    this.applyReconnect({ kind: "iface/connected" });
    socket.binaryType = "arraybuffer";
    socket.addEventListener("message", (event) => {
      void toUint8Array(event.data).then((bytes) => {
        if (bytes !== null) {
          this.receiveBytes(bytes);
        }
      });
    });
    socket.addEventListener("close", () => this.handleDisconnect());
    socket.addEventListener("error", () => this.handleDisconnect());
  }

  private handleDisconnect(): void {
    if (this.reconnectState.detached) {
      return;
    }

    if (this.socket === null && !this.online) {
      return;
    }

    this.socket = null;
    this.online = false;
    this.applyReconnect({ kind: "iface/disconnected" });
  }

  private applyReconnect(event: InterfaceReconnectEvent): void {
    const result = stepInterfaceReconnectWithActions(this.reconnectState, event);
    this.reconnectState = result.state;

    for (const intent of result.intents) {
      if (intent.kind === "timer/cancel" && intent.timer.id === INTERFACE_RECONNECT_TIMER_ID) {
        this.reconnectTimer?.cancel();
        this.reconnectTimer = null;
      }
      if (intent.kind === "timer/set" && intent.timer.id === INTERFACE_RECONNECT_TIMER_ID) {
        this.reconnectTimer?.cancel();
        this.reconnectTimer = this.runtime.clock.setTimeout(() => {
          this.reconnectTimer = null;
          this.applyReconnect({
            kind: "timer/fired",
            id: INTERFACE_RECONNECT_TIMER_ID,
            at: this.runtime.clock.now()
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
}

function defaultWebSocketFactory(url: string, protocols?: string | readonly string[]): WebSocketLike {
  if (globalThis.WebSocket === undefined) {
    throw new Error("No global WebSocket implementation is available");
  }

  return new globalThis.WebSocket(url, protocols as string | string[] | undefined) as WebSocketLike;
}

async function toUint8Array(data: unknown): Promise<Uint8Array | null> {
  if (data instanceof Uint8Array) {
    return Uint8Array.from(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }

  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  return null;
}
