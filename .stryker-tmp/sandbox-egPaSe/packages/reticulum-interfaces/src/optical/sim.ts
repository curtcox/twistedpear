// @ts-nocheck
import type { OpticalChannel } from "./channel.js";
import { SimulatedPeerChannel, type SimulatedPeerChannelOptions } from "../sim-peer-channel.js";

export interface SimulatedOpticalChannelOptions extends SimulatedPeerChannelOptions {
  /** Link the channel to a peer for bidirectional simulation. */
  readonly peer?: SimulatedOpticalChannel | null;
}

/**
 * In-memory simulated optical channel with optional frame loss.
 * Two channels linked via `peer` simulate a camera↔screen loopback.
 */
export class SimulatedOpticalChannel extends SimulatedPeerChannel implements OpticalChannel {
  constructor(options: SimulatedOpticalChannelOptions = {}) {
    super(options);
    if (options.peer) this.linkPeer(options.peer);
  }

  async display(frames: ReadonlyArray<Uint8Array>): Promise<void> {
    this.deliverToPeer(frames);
  }
}
