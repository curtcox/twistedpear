// @ts-nocheck
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import {
  Packet,
  HdlcPacketInterface,
  type ReticulumInterfaceOptions
} from "@twistedpear/reticulum-ts";

/**
 * S2 local-executor p95 for 1 KiB was ~89 ms → ~92 kbps one-way.
 * Policy uses a rounded-down 90 kbps continuous bitrate for RNS-sized frames.
 */
export const FREENET_DEFAULT_BITRATE = 90_000;
/** HDLC frame payload budget; packet-log entries cap payloads at 65535. */
export const FREENET_INTERFACE_MTU = 1000;

/**
 * Injected Freenet packet-log effect boundary. Implementations own the
 * WebSocket client, contract put/update/subscribe, and direction indexing.
 */
export interface FreenetPacketLogBackend {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly active: boolean;
  publishFrame(hdlcFrame: Uint8Array): Promise<void>;
  setReceiver(onFrame: (hdlcFrame: Uint8Array) => void): void;
}

export interface FreenetInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly backend: FreenetPacketLogBackend;
}

/**
 * Reticulum PacketInterface over a Freenet convergent packet-log contract.
 * Framing is HDLC; movement of bytes is encoded as indexed log mutations.
 */
export class FreenetInterface extends HdlcPacketInterface {
  private readonly provider: CryptoProvider;
  private readonly backend: FreenetPacketLogBackend;
  private readActive = false;

  constructor(provider: CryptoProvider, options: FreenetInterfaceOptions) {
    super(
      {
        ...options,
        name: options.name ?? "host-freenet",
        mtu: options.mtu ?? FREENET_INTERFACE_MTU,
        bitrate: options.bitrate ?? FREENET_DEFAULT_BITRATE
      },
      options.incoming ?? true,
      options.outgoing ?? true
    );
    this.provider = provider;
    this.backend = options.backend;
    this.backend.setReceiver((frame) => {
      if (this.readActive) {
        this.receiveBytes(frame);
      }
    });
  }

  static async open(
    provider: CryptoProvider,
    options: FreenetInterfaceOptions
  ): Promise<FreenetInterface> {
    const iface = new FreenetInterface(provider, options);
    await iface.start();
    return iface;
  }

  async start(): Promise<void> {
    await this.backend.start();
    this.online = this.backend.active;
    this.readActive = true;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected override async writeBytes(bytes: Uint8Array): Promise<void> {
    await this.backend.publishFrame(bytes);
  }

  protected async closeInterface(): Promise<void> {
    this.readActive = false;
    this.online = false;
    await this.backend.stop();
  }
}
