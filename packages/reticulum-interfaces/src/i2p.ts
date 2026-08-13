import type {
  CryptoProvider,
  DuplexConnection,
  Runtime,
} from "@twistedpear/reticulum-ts";
import {
  Packet,
  HdlcPacketInterface,
  type ReticulumInterfaceOptions,
} from "@twistedpear/reticulum-ts";

/** Mirrors RNS/Interfaces/I2PInterface.py SAM defaults. */
export const I2P_DEFAULT_SAM_HOST = "127.0.0.1";
export const I2P_DEFAULT_SAM_PORT = 7_656;
export const I2P_RECONNECT_WAIT_MS = 5_000;
let nextSamSessionId = 0;

export interface SamSessionInfo {
  readonly destination: string;
  readonly privateKey: string;
}

export interface SamClientOptions {
  readonly host?: string;
  readonly port?: number;
  readonly runtime: Runtime;
  readonly sessionName?: string;
  readonly sessionId?: string;
}

export class SamClient {
  private readonly host: string;
  private readonly port: number;
  private readonly runtime: Runtime;
  private readonly sessionName: string;
  private sessionId: string | null;
  private destination: string | null = null;
  private sessionConnection: DuplexConnection | null = null;

  constructor(options: SamClientOptions) {
    this.host = options.host ?? I2P_DEFAULT_SAM_HOST;
    this.port = options.port ?? I2P_DEFAULT_SAM_PORT;
    this.runtime = options.runtime;
    this.sessionName = options.sessionName ?? "reticulum-ts";
    this.sessionId = options.sessionId ?? null;
  }

  get samDestination(): string | null {
    return this.destination;
  }

  async ensureSession(): Promise<SamSessionInfo> {
    if (this.destination !== null && this.sessionId !== null) {
      return { destination: this.destination, privateKey: this.sessionId };
    }

    const connection = await this.openSamConnection();
    await connection.write(
      new TextEncoder().encode(
        `SESSION CREATE STYLE=STREAM ID=${this.sessionName} DESTINATION=TRANSIENT\n`,
      ),
    );
    const { response } = await readSamLine(connection);
    const destination = parseSamValue(response, "DESTINATION");
    const privateKey = parseSamValue(response, "PRIVATE_KEY");
    if (destination === null) {
      throw new Error(`SAM session create failed: ${response}`);
    }

    this.destination = destination;
    this.sessionId = privateKey ?? this.sessionName;
    this.sessionConnection = connection;
    return { destination, privateKey: this.sessionId };
  }

  async connectStream(destination: string): Promise<DuplexConnection> {
    const connection = await this.openSamConnection();
    await connection.write(
      new TextEncoder().encode(
        `STREAM CONNECT ID=${this.sessionName} DESTINATION=${destination} SILENT=false\n`,
      ),
    );
    const { response, remainder, iterator } = await readSamLine(connection);
    if (!response.startsWith("STREAM STATUS RESULT=OK")) {
      await connection.close();
      throw new Error(`SAM stream connect failed: ${response}`);
    }

    return withBufferedReadable(connection, iterator, remainder);
  }

  async closeSession(): Promise<void> {
    if (this.sessionConnection !== null) {
      await this.sessionConnection.close();
      this.sessionConnection = null;
    }

    this.sessionId = null;
    this.destination = null;
  }

  private async openSamConnection(): Promise<DuplexConnection> {
    const connection = await this.runtime.tcp.connect({
      host: this.host,
      port: this.port,
      connectTimeoutMs: 10_000,
    });

    await connection.write(
      new TextEncoder().encode("HELLO VERSION MIN=3.0 MAX=3.3\n"),
    );
    const { response } = await readSamLine(connection);
    if (!response.startsWith("HELLO REPLY RESULT=OK")) {
      await connection.close();
      throw new Error(`SAM handshake failed: ${response}`);
    }

    return connection;
  }
}

export interface I2PInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly samHost?: string;
  readonly samPort?: number;
  readonly peerDestination: string;
  readonly reconnectWaitMs?: number;
  readonly sessionName?: string;
}

export class I2PInterface extends HdlcPacketInterface {
  private connection: DuplexConnection | null = null;
  private lastConnectionError: Error | null = null;
  private readTask: Promise<void> | null = null;
  private readonly sam: SamClient;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private detached = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly options: I2PInterfaceOptions,
  ) {
    super(
      { ...options, mtu: options.mtu ?? 1_000 },
      options.incoming ?? true,
      options.outgoing ?? true,
    );
    this.sam = new SamClient({
      runtime: options.runtime,
      sessionName: options.sessionName ?? `reticulum-ts-${nextSamSessionId++}`,
      ...(options.samHost === undefined ? {} : { host: options.samHost }),
      ...(options.samPort === undefined ? {} : { port: options.samPort }),
    });
  }

  static async connect(
    provider: CryptoProvider,
    options: I2PInterfaceOptions,
  ): Promise<I2PInterface> {
    const iface = new I2PInterface(provider, options);
    await iface.initialConnect();
    return iface;
  }

  get connectionError(): Error | null {
    return this.lastConnectionError;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    if (this.connection === null) {
      throw new Error(`I2P interface ${this.name} is not connected`);
    }

    await this.connection.write(bytes);
  }

  protected async closeInterface(): Promise<void> {
    this.detached = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connection !== null) {
      await this.connection.close();
      this.connection = null;
    }

    await this.sam.closeSession();
  }

  private async initialConnect(): Promise<void> {
    if (this.detached) {
      return;
    }

    try {
      await this.sam.ensureSession();
      this.connection = await this.sam.connectStream(
        this.options.peerDestination,
      );
      this.lastConnectionError = null;
      this.online = true;
      this.readTask = this.readLoop();
    } catch (error) {
      this.lastConnectionError =
        error instanceof Error ? error : new Error(String(error));
      this.online = false;
      this.scheduleReconnect();
    }
  }

  private async readLoop(): Promise<void> {
    if (this.connection === null) {
      return;
    }

    try {
      for await (const chunk of this.connection.readable) {
        this.receiveBytes(chunk);
      }
    } catch (error) {
      this.lastConnectionError =
        error instanceof Error ? error : new Error(String(error));
      this.online = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.detached || this.reconnectTimer !== null) {
      return;
    }

    const waitMs = this.options.reconnectWaitMs ?? I2P_RECONNECT_WAIT_MS;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.initialConnect();
    }, waitMs);
  }
}

async function readSamLine(connection: DuplexConnection): Promise<{
  readonly response: string;
  readonly remainder: Uint8Array;
  readonly iterator: AsyncIterator<Uint8Array>;
}> {
  const chunks: Uint8Array[] = [];
  const iterator = connection.readable[Symbol.asyncIterator]();
  for (;;) {
    const next = await iterator.next();
    if (next.done) {
      return {
        response: new TextDecoder().decode(concatBytes(...chunks)).trim(),
        remainder: new Uint8Array(),
        iterator,
      };
    }

    const chunk = next.value;
    chunks.push(chunk);
    const merged = concatBytes(...chunks);
    const newline = merged.indexOf(0x0a);
    if (newline >= 0) {
      return {
        response: new TextDecoder().decode(merged.subarray(0, newline)).trim(),
        remainder: merged.subarray(newline + 1),
        iterator,
      };
    }
  }
}

function withBufferedReadable(
  connection: DuplexConnection,
  iterator: AsyncIterator<Uint8Array>,
  remainder: Uint8Array,
): DuplexConnection {
  return {
    write: (data) => connection.write(data),
    close: () => connection.close(),
    readable: (async function* () {
      if (remainder.length > 0) {
        yield remainder;
      }

      for (;;) {
        const next = await iterator.next();
        if (next.done) {
          return;
        }
        yield next.value;
      }
    })(),
  };
}

function parseSamValue(response: string, key: string): string | null {
  const pattern = new RegExp(`${key}=([^\\s]+)`);
  const match = response.match(pattern);
  return match?.[1] ?? null;
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}
