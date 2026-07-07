import type { CryptoProvider } from "../crypto/provider.js";
import { Packet } from "../packet.js";
import type { Runtime, Timer } from "../runtime/runtime.js";
import { RawPacketInterface, type ReticulumInterfaceOptions } from "./interface.js";

export const WEBSOCKET_RECONNECT_WAIT_MS = 5_000;
export const WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS = 5_000;
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
  private reconnectAttempts = 0;
  private detached = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: WebSocketClientInterfaceOptions,
    connected: WebSocketLike | null = null
  ) {
    super({ ...options, mtu: options.mtu ?? WEBSOCKET_HW_MTU }, true, options.outgoing ?? true);
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
      this.scheduleReconnect();
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
    this.detached = true;
    this.reconnectTimer?.cancel();
    this.reconnectTimer = null;

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
      let settled = false;
      const timer = this.runtime.clock.setTimeout(() => {
        settle(() => {
          socket.close();
          reject(new Error(`WebSocket connect timed out after ${this.connectTimeoutMs()}ms`));
        });
      }, this.connectTimeoutMs());

      const cleanup = () => {
        timer.cancel();
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("close", onFailure);
        socket.removeEventListener("error", onFailure);
      };
      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        callback();
      };
      const onOpen = () => settle(() => resolve(socket));
      const onFailure = () => settle(() => reject(new Error(`WebSocket connect failed for ${this.options.url}`)));

      socket.addEventListener("open", onOpen);
      socket.addEventListener("close", onFailure);
      socket.addEventListener("error", onFailure);
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
    this.reconnectAttempts = 0;
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
    if (this.detached) {
      return;
    }

    if (this.socket === null && !this.online) {
      return;
    }

    this.socket = null;
    this.online = false;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.detached) {
      return;
    }

    this.reconnectTimer?.cancel();
    this.reconnectTimer = this.runtime.clock.setTimeout(async () => {
      this.reconnectTimer = null;
      await this.reconnect();
    }, this.options.reconnectWaitMs ?? WEBSOCKET_RECONNECT_WAIT_MS);
  }

  private async reconnect(): Promise<void> {
    if (this.detached) {
      return;
    }

    this.reconnectAttempts += 1;
    const maxTries = this.options.maxReconnectTries ?? null;
    if (maxTries !== null && this.reconnectAttempts > maxTries) {
      await this.close();
      return;
    }

    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
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
