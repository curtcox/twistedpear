import type { AcousticChannel } from "./interface.js";

export interface SimulatedAcousticChannelOptions {
  /** Probability of dropping a frame (0–1). Default 0. */
  readonly lossRate?: number;
  /** Additional latency per frame in ms. Default 0. */
  readonly latencyMs?: number;
  /** Link the channel to a peer for bidirectional simulation. */
  readonly peer?: SimulatedAcousticChannel | null;
  /** Custom random source. */
  readonly random?: () => number;
}

/**
 * In-memory simulated acoustic channel with optional frame loss and latency.
 * Two channels linked via `peer` simulate a speaker↔microphone loopback.
 */
export class SimulatedAcousticChannel implements AcousticChannel {
  active = false;
  private receiver: ((frame: Uint8Array) => void) | null = null;
  private readonly lossRate: number;
  private readonly latencyMs: number;
  private readonly random: () => number;
  private peer: SimulatedAcousticChannel | null;

  constructor(options: SimulatedAcousticChannelOptions = {}) {
    this.lossRate = options.lossRate ?? 0;
    this.latencyMs = options.latencyMs ?? 0;
    this.random = options.random ?? Math.random;
    this.peer = options.peer ?? null;
  }

  linkPeer(peer: SimulatedAcousticChannel): void {
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

  async transmit(frames: ReadonlyArray<Uint8Array>): Promise<void> {
    if (!this.active) throw new Error("SimulatedAcousticChannel is not active");
    if (this.peer === null) return;
    for (const frame of frames) {
      if (this.random() < this.lossRate) continue;
      if (this.latencyMs > 0) {
        setTimeout(() => {
          if (this.peer?.active) {
            this.peer.deliver(frame);
          }
        }, this.latencyMs);
      } else {
        queueMicrotask(() => {
          if (this.peer?.active) {
            this.peer.deliver(frame);
          }
        });
      }
    }
  }

  /** Inject a frame as if received from the microphone. Used for testing. */
  inject(frame: Uint8Array): void {
    this.deliver(frame);
  }

  private deliver(frame: Uint8Array): void {
    if (!this.active) return;
    this.receiver?.(frame);
  }
}
