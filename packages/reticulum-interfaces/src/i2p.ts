import type { CryptoProvider, DuplexConnection, Runtime } from "@twistedpear/reticulum-ts";
import { Packet, HdlcPacketInterface, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";

/** Mirrors RNS/Interfaces/I2PInterface.py SAM defaults. */
export const I2P_DEFAULT_SAM_HOST = "127.0.0.1";
export const I2P_DEFAULT_SAM_PORT = 7_656;
export const I2P_RECONNECT_WAIT_MS = 5_000;

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

    const response = await this.sendCommand(
      `SESSION CREATE STYLE=STREAM ID=${this.sessionName} DESTINATION=TRANSIENT`
    );
    const destination = parseSamValue(response, "DESTINATION");
    const privateKey = parseSamValue(response, "PRIVATE_KEY");
    if (destination === null) {
      throw new Error(`SAM session create failed: ${response}`);
    }

    this.destination = destination;
    this.sessionId = privateKey ?? this.sessionName;
    return { destination, privateKey: this.sessionId };
  }

  async connectStream(destination: string): Promise<DuplexConnection> {
    const response = await this.sendCommand(`STREAM CONNECT ID=${this.sessionName} DESTINATION=${destination} SILENT=false`);
    if (!response.startsWith("STREAM STATUS RESULT=OK")) {
      throw new Error(`SAM stream connect failed: ${response}`);
    }

    const port = Number.parseInt(parseSamValue(response, "PORT") ?? "", 10);
    if (!Number.isFinite(port)) {
      throw new Error(`SAM stream connect missing PORT: ${response}`);
    }

    return this.runtime.tcp.connect({ host: this.host, port, connectTimeoutMs: 120_000 });
  }

  async closeSession(): Promise<void> {
    if (this.sessionId === null) {
      return;
    }

    await this.sendCommand(`SESSION STATUS ID=${this.sessionName}`);
    this.sessionId = null;
    this.destination = null;
  }

  private async sendCommand(command: string): Promise<string> {
    const connection = await this.runtime.tcp.connect({
      host: this.host,
      port: this.port,
      connectTimeoutMs: 10_000
    });

    await connection.write(new TextEncoder().encode(`${command}\n`));
    const response = await readSamResponse(connection);
    await connection.close();
    return response;
  }
}

export interface I2PInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly samHost?: string;
  readonly samPort?: number;
  readonly peerDestination: string;
  readonly reconnectWaitMs?: number;
}

export class I2PInterface extends HdlcPacketInterface {
  private connection: DuplexConnection | null = null;
  private readTask: Promise<void> | null = null;
  private readonly sam: SamClient;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly options: I2PInterfaceOptions
  ) {
    super({ ...options, mtu: options.mtu ?? 1_000 }, true, options.outgoing ?? true);
    this.sam = new SamClient({
      runtime: options.runtime,
      ...(options.samHost === undefined ? {} : { host: options.samHost }),
      ...(options.samPort === undefined ? {} : { port: options.samPort })
    });
  }

  static async connect(provider: CryptoProvider, options: I2PInterfaceOptions): Promise<I2PInterface> {
    const iface = new I2PInterface(provider, options);
    await iface.initialConnect();
    return iface;
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
    try {
      await this.sam.ensureSession();
      this.connection = await this.sam.connectStream(this.options.peerDestination);
      this.online = true;
      this.readTask = this.readLoop();
    } catch {
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
    } catch {
      this.online = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      return;
    }

    const waitMs = this.options.reconnectWaitMs ?? I2P_RECONNECT_WAIT_MS;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.initialConnect();
    }, waitMs);
  }
}

async function readSamResponse(connection: DuplexConnection): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of connection.readable) {
    chunks.push(chunk);
    const text = new TextDecoder().decode(concatBytes(...chunks));
    if (text.includes("\n")) {
      return text.trim();
    }
  }

  return new TextDecoder().decode(concatBytes(...chunks)).trim();
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
