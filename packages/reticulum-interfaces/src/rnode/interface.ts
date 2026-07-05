import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { Packet, RawPacketInterface, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";
import type { SerialPipe } from "../pipes.js";
import {
  KISS_CMD_DATA,
  KISS_CMD_DETECT,
  KISS_CMD_FW_VERSION,
  KISS_CMD_PLATFORM,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  createKissDecodeState,
  decodeKissFrames,
  encodeDetectRequest,
  encodeKissFrame,
  encodeRadioStateAsk,
  parseFirmwareVersion
} from "./kiss.js";

export const RNODE_INTERFACE_MTU = 508;
export const RNODE_RECONNECT_WAIT_MS = 5_000;

export interface RNodeInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly pipe: SerialPipe;
  readonly frequencyHz?: number;
  readonly reconnectWaitMs?: number;
}

export interface RNodeStatus {
  readonly firmwareVersion: string | null;
  readonly platform: number | null;
  readonly radioOnline: boolean;
}

export class RNodeInterface extends RawPacketInterface {
  private decodeState = createKissDecodeState();
  private eventsBound = false;
  private readActive = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: RNodeStatus = { firmwareVersion: null, platform: null, radioOnline: false };

  constructor(
    private readonly provider: CryptoProvider,
    private readonly options: RNodeInterfaceOptions
  ) {
    super({ ...options, mtu: options.mtu ?? RNODE_INTERFACE_MTU, bitrate: options.bitrate ?? 5_000 }, true, options.outgoing ?? true);
    this.bindPipeEvents();
  }

  static async open(provider: CryptoProvider, options: RNodeInterfaceOptions): Promise<RNodeInterface> {
    const iface = new RNodeInterface(provider, options);
    await iface.start();
    return iface;
  }

  async start(): Promise<void> {
    await this.options.pipe.open();
    this.readActive = true;
    await this.detect();
    await this.queryRadioState();
    this.online = this.status.radioOnline;
  }

  get rnodeStatus(): RNodeStatus {
    return this.status;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    await this.options.pipe.write(encodeKissFrame(KISS_CMD_DATA, bytes));
  }

  protected async closeInterface(): Promise<void> {
    this.readActive = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.options.pipe.close();
  }

  private bindPipeEvents(): void {
    if (this.eventsBound) {
      return;
    }

    this.eventsBound = true;
    this.options.pipe.setEvents({
      onData: (data) => this.handleSerialData(data),
      onConnect: () => {
        void this.detect();
      },
      onDisconnect: () => {
        this.online = false;
        this.scheduleReconnect();
      }
    });
  }

  private handleSerialData(data: Uint8Array): void {
    if (!this.readActive) {
      return;
    }

    const decoded = decodeKissFrames(data, this.decodeState);
    this.decodeState = decoded.state;

    for (const frame of decoded.frames) {
      this.handleKissFrame(frame.command, frame.payload);
    }
  }

  private handleKissFrame(command: number, payload: Uint8Array): void {
    switch (command) {
      case KISS_CMD_DATA:
        this.receiveBytes(payload);
        break;
      case KISS_CMD_DETECT:
        if (payload[0] === KISS_DETECT_RESP) {
          this.online = true;
        }
        break;
      case KISS_CMD_FW_VERSION:
        this.status = { ...this.status, firmwareVersion: parseFirmwareVersion(payload) };
        break;
      case KISS_CMD_PLATFORM:
        this.status = { ...this.status, platform: payload[0] ?? null };
        break;
      case KISS_CMD_RADIO_STATE:
        this.status = { ...this.status, radioOnline: (payload[0] ?? 0) === KISS_RADIO_STATE_ON };
        this.online = this.status.radioOnline;
        break;
      default:
        break;
    }
  }

  private async detect(): Promise<void> {
    await this.options.pipe.write(encodeDetectRequest());
  }

  private async queryRadioState(): Promise<void> {
    await this.options.pipe.write(encodeRadioStateAsk());
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      return;
    }

    const waitMs = this.options.reconnectWaitMs ?? RNODE_RECONNECT_WAIT_MS;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch(() => {
        this.scheduleReconnect();
      });
    }, waitMs);
  }
}
