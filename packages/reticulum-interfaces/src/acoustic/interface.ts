import {
  Packet,
  HdlcPacketInterface,
  framePeerAudioPayload,
  decodePeerAudioFrame,
  initialPeerAudioAssemblyState,
  stepPeerAudioAssembly,
  type CryptoProvider,
  type ReticulumInterfaceOptions,
  type PeerAudioAssemblyState,
} from "@twistedpear/reticulum-ts";

/** Three-way bit-majority repetition code for the noisy acoustic carrier. */
export function encodeAcousticFec(bytes: Uint8Array): Uint8Array {
  const encoded = new Uint8Array(bytes.length * 3);
  for (let index = 0; index < bytes.length; index += 1) {
    encoded[index * 3] = bytes[index]!;
    encoded[index * 3 + 1] = bytes[index]!;
    encoded[index * 3 + 2] = bytes[index]!;
  }
  return encoded;
}

export function decodeAcousticFec(encoded: Uint8Array): Uint8Array | null {
  if (encoded.length === 0 || encoded.length % 3 !== 0) return null;
  const decoded = new Uint8Array(encoded.length / 3);
  for (let index = 0; index < decoded.length; index += 1) {
    const a = encoded[index * 3]!;
    const b = encoded[index * 3 + 1]!;
    const c = encoded[index * 3 + 2]!;
    decoded[index] = (a & b) | (a & c) | (b & c);
  }
  return decoded;
}

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
  private assembly: PeerAudioAssemblyState = initialPeerAudioAssemblyState(
    Date.now() + 30_000,
  );
  private completedSessionId: Uint8Array | null = null;

  constructor(provider: CryptoProvider, options: AcousticInterfaceOptions) {
    super(
      {
        ...options,
        mtu: options.mtu ?? ACOUSTIC_INTERFACE_MTU,
        bitrate: options.bitrate ?? ACOUSTIC_DEFAULT_BITRATE,
      },
      options.incoming ?? true,
      options.outgoing ?? true,
    );
    this.provider = provider;
    this.channel = options.channel;
    this.channel.setReceiver((frame) => this.receiveAcousticFrame(frame));
  }

  static async open(
    provider: CryptoProvider,
    options: AcousticInterfaceOptions,
  ): Promise<AcousticInterface> {
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

  private receiveAcousticFrame(frame: Uint8Array): void {
    if (!this.readActive) return;
    const decoded = decodeAcousticFec(frame);
    if (decoded === null) return;
    let sessionId: Uint8Array;
    try {
      sessionId = decodePeerAudioFrame(decoded).sessionId;
    } catch {
      return;
    }
    if (this.sameCompletedSession(sessionId)) return;
    if (!this.stepAssembly(decoded, sessionId)) {
      this.assembly = initialPeerAudioAssemblyState(Date.now() + 30_000);
      this.stepAssembly(decoded, sessionId);
    }
  }

  private sameCompletedSession(sessionId: Uint8Array): boolean {
    return (
      this.completedSessionId !== null &&
      this.completedSessionId.length === sessionId.length &&
      this.completedSessionId.every((byte, index) => byte === sessionId[index])
    );
  }

  private stepAssembly(decoded: Uint8Array, sessionId: Uint8Array): boolean {
    try {
      const result = stepPeerAudioAssembly(this.assembly, decoded, Date.now());
      this.assembly =
        result.payload === null
          ? result.state
          : initialPeerAudioAssemblyState(Date.now() + 30_000);
      if (result.payload !== null) {
        this.completedSessionId = sessionId;
        this.receiveBytes(result.payload);
      }
      return true;
    } catch {
      return false;
    }
  }

  protected override async writeBytes(bytes: Uint8Array): Promise<void> {
    const frames = framePeerAudioPayload(
      this.provider.randomBytes(16),
      bytes,
      96,
    ).map(encodeAcousticFec);
    await this.channel.transmit(frames);
  }

  protected async closeInterface(): Promise<void> {
    this.readActive = false;
    this.online = false;
    await this.channel.stop();
  }
}
