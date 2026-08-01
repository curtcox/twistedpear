import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { Packet, HdlcPacketInterface } from "@twistedpear/reticulum-ts";
import type { OpticalChannel, OpticalInterfaceOptions } from "./channel.js";
import { sliceForDisplay, OPTICAL_CHUNK_PAYLOAD_BYTES } from "./framing.js";

export const OPTICAL_INTERFACE_MTU = 250;
export const OPTICAL_DEFAULT_BITRATE = 1_000;

/**
 * Optical PacketInterface: relays Reticulum packets via camera (incoming) and
 * screen/display (outgoing) using sequenced/fountain-coded QR or color codes.
 *
 * Framing: HDLC over the optical channel. Each HDLC frame is sliced into
 * sequence-numbered chunks that fit a single QR code payload. The receiver
 * reassembles from the sequence stream.
 */
export class OpticalInterface extends HdlcPacketInterface {
  private readonly provider: CryptoProvider;
  private readonly channel: OpticalChannel;
  private readActive = false;

  constructor(provider: CryptoProvider, options: OpticalInterfaceOptions) {
    super(
      {
        ...options,
        mtu: options.mtu ?? OPTICAL_INTERFACE_MTU,
        bitrate: options.bitrate ?? OPTICAL_DEFAULT_BITRATE
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

  static async open(provider: CryptoProvider, options: OpticalInterfaceOptions): Promise<OpticalInterface> {
    const iface = new OpticalInterface(provider, options);
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
    const chunks = sliceForDisplay(bytes, OPTICAL_CHUNK_PAYLOAD_BYTES);
    await this.channel.display(chunks);
  }

  protected async closeInterface(): Promise<void> {
    this.readActive = false;
    this.online = false;
    await this.channel.stop();
  }
}
