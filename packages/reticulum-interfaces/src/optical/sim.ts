import type { OpticalChannel } from "./interface.js";

export interface SimulatedOpticalChannelOptions {
  /** Probability of dropping a frame (0–1). Default 0. */
  readonly lossRate?: number;
  /** Link the channel to a peer for bidirectional simulation. */
  readonly peer?: SimulatedOpticalChannel | null;
  /** Custom random source. */
  readonly random?: () => number;
}

/**
 * In-memory simulated optical channel with optional frame loss.
 * Two channels linked via `peer` simulate a camera↔screen loopback.
 */
export class SimulatedOpticalChannel implements OpticalChannel {
  active = false;
  private receiver: ((frame: Uint8Array) => void) | null = null;
  private readonly lossRate: number;
  private readonly random: () => number;
  private peer: SimulatedOpticalChannel | null;

  constructor(options: SimulatedOpticalChannelOptions = {}) {
    this.lossRate = options.lossRate ?? 0;
    this.random = options.random ?? Math.random;
    this.peer = options.peer ?? null;
  }

  linkPeer(peer: SimulatedOpticalChannel): void {
    this.peer = peer;
    peer.peer = this;
  }

  async start(): Promise<void> {
    this.active = true;
  }

  async stop(): Promise<void> {
    this.active = false;
  }

  setReceiver(onFrame: (frame: Uint8Array) => void): void {
    this.receiver = onFrame;
  }

  async display(frames: ReadonlyArray<Uint8Array>): Promise<void> {
    if (!this.active) throw new Error("SimulatedOpticalChannel is not active");
    if (this.peer === null) return;
    for (const frame of frames) {
      if (this.random() < this.lossRate) continue;
      queueMicrotask(() => {
        if (this.peer?.active) {
          this.peer.deliver(frame);
        }
      });
    }
  }

  /** Inject a frame as if received from the camera. Used for testing. */
  inject(frame: Uint8Array): void {
    this.deliver(frame);
  }

  private deliver(frame: Uint8Array): void {
    if (!this.active) return;
    this.receiver?.(frame);
  }
}
