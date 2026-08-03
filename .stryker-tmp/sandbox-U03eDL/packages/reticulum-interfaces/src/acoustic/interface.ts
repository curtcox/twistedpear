// @ts-nocheck
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { Packet, HdlcPacketInterface, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";

export const ACOUSTIC_INTERFACE_MTU = 128;
export const ACOUSTIC_DEFAULT_BITRATE = 500;

/**
 * A channel representing the microphone (inbound) and speaker (outbound) medium.
 * The host provides an implementation backed by platform audio APIs.
 * PCM never crosses into mini-apps; this is the effect boundary.
 */
export interface AcousticChannel {
  /** Start audio I/O. */
  start(): Promise<void>;
  /** Stop audio I/O. */
  stop(): Promise<void>;
  /** Whether the channel is currently active. */
  readonly active: boolean;
  /** Transmit modulated audio frames through the speaker. */
  transmit(frames: ReadonlyArray<Uint8Array>): Promise<void>;
  /** Subscribe to demodulated inbound frames from the microphone. */
  setReceiver(onFrame: (frame: Uint8Array) => void): void;
}

export type AcousticBand = "audible" | "ultrasonic";

export interface AcousticInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly channel: AcousticChannel;
  /** Frequency band selection. Default "audible". */
  readonly band?: AcousticBand;
}

/**
 * Acoustic PacketInterface: relays Reticulum packets via speaker (outgoing)
 * and microphone (incoming) using FSK/AFSK modulation over an AcousticChannel.
 *
 * Framing: HDLC. The channel implementation handles modulation/demodulation;
 * this adapter bridges the HDLC byte stream to/from the channel.
 */
export class AcousticInterface extends HdlcPacketInterface {
  private readonly provider: CryptoProvider;
  private readonly channel: AcousticChannel;
  private readActive = false;

  constructor(provider: CryptoProvider, options: AcousticInterfaceOptions) {
    super(
      {
        ...options,
        mtu: options.mtu ?? ACOUSTIC_INTERFACE_MTU,
        bitrate: options.bitrate ?? ACOUSTIC_DEFAULT_BITRATE
      },
      options.incoming ?? true,
      options.outgoing ?? true
    );
    this.provider = provider;
    this.channel = options.channel;
    this.channel.setReceiver((frame) => {
      if (this.readActive) {
        this.receiveBytes(frame);
      }
    });
  }

  static async open(provider: CryptoProvider, options: AcousticInterfaceOptions): Promise<AcousticInterface> {
    const iface = new AcousticInterface(provider, options);
    await iface.start();
    return iface;
  }

  async start(): Promise<void> {
    await this.channel.start();
    this.online = true;
    this.readActive = true;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected override async writeBytes(bytes: Uint8Array): Promise<void> {
    await this.channel.transmit([bytes]);
  }

  protected async closeInterface(): Promise<void> {
    this.readActive = false;
    this.online = false;
    await this.channel.stop();
  }
}
