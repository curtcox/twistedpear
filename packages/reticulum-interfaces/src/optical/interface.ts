import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { Packet, HdlcPacketInterface, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";

export const OPTICAL_INTERFACE_MTU = 250;
export const OPTICAL_DEFAULT_BITRATE = 1_000;
export const OPTICAL_FRAME_RATE_DEFAULT = 5;

/**
 * A channel representing the camera (inbound) and screen/display (outbound) medium.
 * The host provides an implementation that drives native camera capture and display rendering.
 * PCM/pixel data never crosses into mini-apps; this is the effect boundary.
 */
export interface OpticalChannel {
  /** Start the display/camera hardware. */
  start(): Promise<void>;
  /** Stop the display/camera hardware. */
  stop(): Promise<void>;
  /** Whether the channel is currently active. */
  readonly active: boolean;
  /** Display encoded frames on screen (outbound). Each frame is a self-contained code payload. */
  display(frames: ReadonlyArray<Uint8Array>): Promise<void>;
  /** Subscribe to decoded inbound frames from the camera. */
  setReceiver(onFrame: (frame: Uint8Array) => void): void;
}

export interface OpticalInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly channel: OpticalChannel;
  /** Target frame display rate for outgoing code stream. Default 5 fps. */
  readonly frameRate?: number;
  /** Whether to prefer high-density color codes over monochrome QR. */
  readonly colorCodes?: boolean;
}

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
  private readonly frameRate: number;
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
    this.frameRate = options.frameRate ?? OPTICAL_FRAME_RATE_DEFAULT;
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

/** Maximum bytes per QR/color code payload chunk. */
export const OPTICAL_CHUNK_PAYLOAD_BYTES = 200;
/** Header: 1 byte sequence number + 1 byte total count. */
const OPTICAL_CHUNK_HEADER_BYTES = 2;

/**
 * Slice an HDLC-encoded frame into sequence-numbered chunks suitable for
 * individual QR code display. Each chunk: [seq, total, ...payload].
 */
export function sliceForDisplay(encoded: Uint8Array, chunkPayloadBytes = OPTICAL_CHUNK_PAYLOAD_BYTES): ReadonlyArray<Uint8Array> {
  const maxPayload = chunkPayloadBytes - OPTICAL_CHUNK_HEADER_BYTES;
  const totalChunks = Math.max(1, Math.ceil(encoded.length / maxPayload));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * maxPayload;
    const end = Math.min(start + maxPayload, encoded.length);
    const payload = encoded.subarray(start, end);
    const chunk = new Uint8Array(OPTICAL_CHUNK_HEADER_BYTES + payload.length);
    chunk[0] = i;
    chunk[1] = totalChunks;
    chunk.set(payload, OPTICAL_CHUNK_HEADER_BYTES);
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Reassemble chunks produced by `sliceForDisplay` back into the original payload.
 * Returns null if the assembly is incomplete.
 */
export interface OpticalReassemblyState {
  total: number | null;
  received: Map<number, Uint8Array>;
}

export function createOpticalReassemblyState(): OpticalReassemblyState {
  return { total: null, received: new Map() };
}

export function reassembleOpticalChunk(
  state: OpticalReassemblyState,
  chunk: Uint8Array
): { state: OpticalReassemblyState; payload: Uint8Array | null } {
  if (chunk.length < OPTICAL_CHUNK_HEADER_BYTES) {
    return { state, payload: null };
  }
  const seq = chunk[0]!;
  const total = chunk[1]!;
  if (total === 0) return { state, payload: null };

  // Reset state if total changes (new frame)
  if (state.total !== null && state.total !== total) {
    state = createOpticalReassemblyState();
  }
  state.total = total;
  state.received.set(seq, chunk.subarray(OPTICAL_CHUNK_HEADER_BYTES));

  if (state.received.size >= total) {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < total; i++) {
      const part = state.received.get(i);
      if (part === undefined) return { state, payload: null };
      parts.push(part);
    }
    const size = parts.reduce((sum, p) => sum + p.length, 0);
    const assembled = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      assembled.set(part, offset);
      offset += part.length;
    }
    return { state: createOpticalReassemblyState(), payload: assembled };
  }

  return { state, payload: null };
}
