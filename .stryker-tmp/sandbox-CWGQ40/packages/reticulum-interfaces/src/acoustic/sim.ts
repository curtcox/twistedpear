// @ts-nocheck
import type { AcousticChannel } from "./interface.js";
import { SimulatedPeerChannel, type SimulatedPeerChannelOptions } from "../sim-peer-channel.js";

export interface SimulatedAcousticChannelOptions extends SimulatedPeerChannelOptions {
  /** Additional latency per frame in ms. Default 0. */
  readonly latencyMs?: number;
  /** Link the channel to a peer for bidirectional simulation. */
  readonly peer?: SimulatedAcousticChannel | null;
}

/**
 * In-memory simulated acoustic channel with optional frame loss and latency.
 * Two channels linked via `peer` simulate a speaker↔microphone loopback.
 */
export class SimulatedAcousticChannel extends SimulatedPeerChannel implements AcousticChannel {
  private readonly latencyMs: number;

  constructor(options: SimulatedAcousticChannelOptions = {}) {
    super(options);
    this.latencyMs = options.latencyMs ?? 0;
    if (options.peer) this.linkPeer(options.peer);
  }

  async transmit(frames: ReadonlyArray<Uint8Array>): Promise<void> {
    this.deliverToPeer(frames, this.latencyMs);
  }
}
