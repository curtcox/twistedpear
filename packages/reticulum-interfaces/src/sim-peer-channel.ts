/**
 * Shared base class for in-memory simulated peer-to-peer channels.
 * Encapsulates the common loss-rate, peer-linking, and frame-delivery logic
 * used by {@link SimulatedOpticalChannel} and {@link SimulatedAcousticChannel}.
 */
export interface SimulatedPeerChannelOptions {
  /** Probability of dropping a frame (0–1). Default 0. */
  readonly lossRate?: number;
  /** Custom random source. */
  readonly random?: () => number;
}

export abstract class SimulatedPeerChannel {
  active = false;
  protected receiver: ((frame: Uint8Array) => void) | null = null;
  protected readonly lossRate: number;
  protected readonly random: () => number;
  protected peer: SimulatedPeerChannel | null = null;

  constructor(options: SimulatedPeerChannelOptions = {}) {
    this.lossRate = options.lossRate ?? 0;
    this.random = options.random ?? Math.random;
  }

  linkPeer(peer: SimulatedPeerChannel): void {
    this.peer = peer;
    peer.peer = this;
  }

  start(): Promise<void> {
    this.active = true;
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.active = false;
    return Promise.resolve();
  }

  setReceiver(onFrame: (frame: Uint8Array) => void): void {
    this.receiver = onFrame;
  }

  /** Inject a frame as if received from the peer. Used for testing. */
  inject(frame: Uint8Array): void {
    this.deliver(frame);
  }

  protected deliver(frame: Uint8Array): void {
    if (!this.active) return;
    this.receiver?.(frame);
  }

  /**
   * Deliver frames to the linked peer, applying loss-rate and optional latency.
   * Called by subclass `display`/`transmit` implementations.
   */
  protected deliverToPeer(
    frames: ReadonlyArray<Uint8Array>,
    latencyMs = 0,
  ): void {
    if (!this.active) throw new Error(`${this.constructor.name} is not active`);
    if (this.peer === null) return;
    for (const frame of frames) {
      if (this.random() < this.lossRate) continue;
      if (latencyMs > 0) {
        setTimeout(() => {
          if (this.peer?.active) {
            this.peer.deliver(frame);
          }
        }, latencyMs);
      } else {
        queueMicrotask(() => {
          if (this.peer?.active) {
            this.peer.deliver(frame);
          }
        });
      }
    }
  }
}
