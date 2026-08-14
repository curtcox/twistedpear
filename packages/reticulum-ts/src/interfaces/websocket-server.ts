import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { extname, join, normalize, sep } from "node:path";
import type { Duplex } from "node:stream";
import {
  WS_OPCODE_BINARY,
  WS_OPCODE_CLOSE,
  encodeWsBinaryFrameRawFromActions,
  initialDecodeWsClientFrameState,
  initialEncodeWsBinaryFrameState,
  shouldRejectDecodeWsClientFrame,
  shouldUseDecodeWsClientFrame,
  shouldUseEncodeWsBinaryFrame,
  stepDecodeWsClientFrameWithActions,
  stepEncodeWsBinaryFrameWithActions,
  wsClientFrameFromActions,
} from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import type { Reticulum } from "../reticulum.js";
import type { Runtime } from "../runtime/runtime.js";
import type {
  PacketInterface,
  ReticulumInterfaceOptions,
} from "./interface.js";
import {
  WebSocketClientInterface,
  type WebSocketLike,
  type WebSocketMessageEvent,
} from "./websocket-client.js";

export interface WebSocketServerInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly listenHost: string;
  readonly listenPort: number;
  readonly path?: string;
  readonly sharedToken?: string;
  /** When set, non-WebSocket GET requests serve files from this directory. */
  readonly staticRoot?: string;
  /** Optional HTTP handler invoked before static/404 handling (e.g. gateway bulk fetch). */
  readonly serveHttp?: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => void | Promise<void>;
}

export type WebSocketSpawnedInterfaceHandler = (
  iface: WebSocketClientInterface,
) => void;
export type WebSocketDetachedInterfaceHandler = (
  iface: WebSocketClientInterface,
) => void;

export class WebSocketServerInterface {
  readonly name: string;
  readonly incoming: boolean;
  readonly outgoing: boolean;
  readonly mtu: number;
  readonly bitrate: number | null;
  online = false;

  private server: Server | null = null;
  private readonly spawned: WebSocketClientInterface[] = [];
  private onSpawned: WebSocketSpawnedInterfaceHandler | null = null;
  private onDetached: WebSocketDetachedInterfaceHandler | null = null;
  private listenAddress: { host: string; port: number } | null = null;
  private closed = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: WebSocketServerInterfaceOptions,
  ) {
    this.name = options.name;
    this.incoming = true;
    this.outgoing = options.outgoing ?? true;
    this.mtu = options.mtu ?? 262_144;
    this.bitrate = options.bitrate ?? null;
  }

  setSpawnHandler(handler: WebSocketSpawnedInterfaceHandler): void {
    this.onSpawned = handler;
  }

  setDetachHandler(handler: WebSocketDetachedInterfaceHandler): void {
    this.onDetached = handler;
  }

  get httpServer(): Server | null {
    return this.server;
  }

  async start(): Promise<void> {
    this.server = createServer((request, response) => {
      void this.handleHttpRequest(request, response);
    });
    this.server.on("upgrade", (request, socket, head) =>
      this.handleUpgrade(request, socket, head),
    );

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(
        this.options.listenPort,
        this.options.listenHost,
        () => {
          this.server?.off("error", reject);
          resolve();
        },
      );
    });

    const address = this.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Failed to determine WebSocket listen address");
    }

    this.listenAddress = { host: address.address, port: address.port };
    this.online = true;
  }

  get address(): { readonly host: string; readonly port: number } | null {
    return this.listenAddress;
  }

  get clients(): readonly WebSocketClientInterface[] {
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

    if (this.server !== null) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      });
      this.server = null;
    }
  }

  private async handleHttpRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }

    if (this.options.serveHttp !== undefined) {
      await this.options.serveHttp(request, response);
      if (response.headersSent) {
        return;
      }
    }

    const staticRoot = this.options.staticRoot;
    if (staticRoot === undefined) {
      response.writeHead(404);
      response.end();
      return;
    }

    serveStaticFile(
      staticRoot,
      request.url ?? "/",
      request.method === "HEAD",
      response,
    );
  }

  private handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    _head: Buffer,
  ): void {
    const pathname = new URL(request.url ?? "/", "ws://localhost").pathname;
    if (pathname === "/dht-relay") {
      return;
    }

    if (!this.acceptsRequest(request)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const acceptedProtocol = this.acceptedProtocol(request);
    socket.write(webSocketUpgradeResponse(key, acceptedProtocol));
    const connection = new NodeWebSocketConnection(socket);
    const client = WebSocketClientInterface.fromSocket(
      this.provider,
      this.runtime,
      {
        name: `${this.name}:client`,
        provider: this.provider,
        runtime: this.runtime,
        url: "ws://accepted",
        mtu: this.mtu,
        bitrate: this.bitrate,
        outgoing: this.outgoing,
      },
      connection,
      this.outgoing,
    );
    let detached = false;
    const detach = () => {
      if (detached) {
        return;
      }
      detached = true;
      const index = this.spawned.indexOf(client);
      if (index >= 0) {
        this.spawned.splice(index, 1);
      }
      this.onDetached?.(client);
    };
    connection.addEventListener("close", detach);
    connection.addEventListener("error", detach);
    this.spawned.push(client);
    this.onSpawned?.(client);
  }

  private acceptsRequest(request: IncomingMessage): boolean {
    if (this.options.path !== undefined) {
      const requestUrl = new URL(request.url ?? "/", "ws://localhost");
      if (requestUrl.pathname !== this.options.path) {
        return false;
      }
    }

    if (this.options.sharedToken === undefined) {
      return true;
    }

    return this.acceptedProtocol(request) !== undefined;
  }

  private acceptedProtocol(request: IncomingMessage): string | undefined {
    if (this.options.sharedToken === undefined) {
      return undefined;
    }

    const protocol = request.headers["sec-websocket-protocol"];
    if (typeof protocol !== "string") {
      return undefined;
    }

    const expected = `tp-token.${this.options.sharedToken}`;
    return protocol
      .split(",")
      .map((value) => value.trim())
      .find((value) => value === expected);
  }
}

class NodeWebSocketConnection implements WebSocketLike {
  binaryType = "arraybuffer";
  readyState = 1;

  private readonly listeners: {
    open: Array<() => void>;
    message: Array<(event: WebSocketMessageEvent) => void>;
    close: Array<() => void>;
    error: Array<() => void>;
  } = { open: [], message: [], close: [], error: [] };
  private buffer = Buffer.alloc(0);

  constructor(private readonly socket: Duplex) {
    socket.on("data", (chunk) => this.handleData(chunk));
    socket.on("close", () => this.closeFromSocket());
    socket.on("error", () => {
      this.readyState = 3;
      this.emit("error");
    });
  }

  send(data: Uint8Array): void {
    if (this.readyState !== 1) {
      throw new Error("WebSocket is closed");
    }

    const encodeStepped = stepEncodeWsBinaryFrameWithActions(
      initialEncodeWsBinaryFrameState(),
      {
        kind: "ws-frame/encode-gate",
        data,
      },
    );
    if (!shouldUseEncodeWsBinaryFrame(encodeStepped.actions)) {
      throw new Error("ws frame: missing use-raw action");
    }
    const raw = encodeWsBinaryFrameRawFromActions(encodeStepped.actions);
    if (raw === null) {
      throw new Error("ws frame: missing use-raw action");
    }
    this.socket.write(Buffer.from(raw));
  }

  close(): void {
    if (this.readyState === 3) {
      return;
    }

    this.readyState = 2;
    this.socket.end();
  }

  addEventListener(type: "open", listener: () => void): void;
  addEventListener(
    type: "message",
    listener: (event: WebSocketMessageEvent) => void,
  ): void;
  addEventListener(type: "close" | "error", listener: () => void): void;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (() => void) | ((event: WebSocketMessageEvent) => void),
  ): void {
    this.listeners[type].push(listener as never);
  }

  removeEventListener(type: "open", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: WebSocketMessageEvent) => void,
  ): void;
  removeEventListener(type: "close" | "error", listener: () => void): void;
  removeEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (() => void) | ((event: WebSocketMessageEvent) => void),
  ): void {
    this.listeners[type] = this.listeners[type].filter(
      (current) => current !== listener,
    ) as never;
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const decodeStepped = stepDecodeWsClientFrameWithActions(
        initialDecodeWsClientFrameState(),
        {
          kind: "ws-frame/decode-gate",
          buffer: this.buffer,
        },
      );
      if (
        shouldRejectDecodeWsClientFrame(decodeStepped.actions) ||
        !shouldUseDecodeWsClientFrame(decodeStepped.actions)
      ) {
        return;
      }
      const frame = wsClientFrameFromActions(decodeStepped.actions);
      if (frame === null) {
        return;
      }

      this.buffer = this.buffer.subarray(frame.consumed);
      if (frame.opcode === WS_OPCODE_CLOSE) {
        this.close();
        return;
      }

      if (frame.opcode === WS_OPCODE_BINARY) {
        this.emit("message", { data: Uint8Array.from(frame.payload) });
      }
    }
  }

  private closeFromSocket(): void {
    if (this.readyState === 3) {
      return;
    }

    this.readyState = 3;
    this.emit("close");
  }

  private emit(type: "open" | "close" | "error"): void;
  private emit(type: "message", event: WebSocketMessageEvent): void;
  private emit(
    type: "open" | "message" | "close" | "error",
    event?: WebSocketMessageEvent,
  ): void {
    for (const listener of this.listeners[type]) {
      if (type === "message") {
        (listener as (messageEvent: WebSocketMessageEvent) => void)(event!);
      } else {
        (listener as () => void)();
      }
    }
  }
}

function webSocketUpgradeResponse(key: string, protocol?: string): string {
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  const lines = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
  ];
  if (protocol !== undefined) {
    lines.push(`Sec-WebSocket-Protocol: ${protocol}`);
  }

  lines.push("", "");
  return lines.join("\r\n");
}

export function isWebSocketClientInterface(
  value: PacketInterface,
): value is WebSocketClientInterface {
  return value instanceof WebSocketClientInterface;
}

export function isWebSocketServerInterface(
  value: unknown,
): value is WebSocketServerInterface {
  return value instanceof WebSocketServerInterface;
}

export async function registerWebSocketServerInterface(
  reticulum: Reticulum,
  options: Omit<WebSocketServerInterfaceOptions, "provider" | "runtime">,
): Promise<WebSocketServerInterface> {
  const server = new WebSocketServerInterface(
    reticulum.provider,
    reticulum.runtime,
    {
      ...options,
      provider: reticulum.provider,
      runtime: reticulum.runtime,
    },
  );
  server.setSpawnHandler((client) => {
    reticulum.registerInterface(client);
  });
  server.setDetachHandler((client) => {
    reticulum.unregisterInterface(client);
  });
  await server.start();
  return server;
}

function serveStaticFile(
  staticRoot: string,
  requestPath: string,
  headOnly: boolean,
  response: ServerResponse,
): void {
  const pathname = new URL(requestPath, "http://localhost").pathname;
  const relativePath =
    pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolvedRoot = normalize(staticRoot);
  const resolvedPath = normalize(join(resolvedRoot, relativePath));

  if (
    !resolvedPath.startsWith(resolvedRoot + sep) &&
    resolvedPath !== resolvedRoot
  ) {
    response.writeHead(403);
    response.end();
    return;
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    response.writeHead(404);
    response.end();
    return;
  }

  const contentType = staticContentType(extname(resolvedPath));
  response.writeHead(200, { "content-type": contentType });
  if (headOnly) {
    response.end();
    return;
  }

  createReadStream(resolvedPath).pipe(response);
}

function staticContentType(extension: string): string {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".wasm":
      return "application/wasm";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
