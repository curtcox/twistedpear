import type { BlePipe, BlePipeEvents } from "../pipes.js";
import { encodeBleFrame, BLE_FLAG_KEEPALIVE } from "./spec-framing.js";

export interface SimulatedBlePipeOptions {
  readonly mtu?: number;
  readonly lossRate?: number;
  readonly disconnectAfterBytes?: number | null;
  readonly peer?: SimulatedBlePipe | null;
  readonly random?: () => number;
}

/**
 * In-memory BLE pipe with optional loss, MTU limits, and mid-transfer disconnects.
 * Two pipes linked via `peer` simulate a phone-to-phone link for CI.
 */
export class SimulatedBlePipe implements BlePipe {
  readonly mtu: number;
  private isConnected = false;
  private bytesIn = 0;
  private bytesOut = 0;
  private events: BlePipeEvents = {};
  private readonly lossRate: number;
  private readonly disconnectAfterBytes: number | null;
  private readonly random: () => number;
  private peer: SimulatedBlePipe | null;

  constructor(options: SimulatedBlePipeOptions = {}) {
    this.mtu = options.mtu ?? 247;
    this.lossRate = options.lossRate ?? 0;
    this.disconnectAfterBytes = options.disconnectAfterBytes ?? null;
    this.random = options.random ?? Math.random;
    this.peer = options.peer ?? null;
  }

  linkPeer(peer: SimulatedBlePipe): void {
    this.peer = peer;
    peer.peer = this;
  }

  get stats() {
    return {
      bytesIn: this.bytesIn,
      bytesOut: this.bytesOut,
      connected: this.isConnected,
    };
  }

  get connected(): boolean {
    return this.isConnected;
  }

  setEvents(events: BlePipeEvents): void {
    this.events = events;
  }

  async start(): Promise<void> {
    this.isConnected = true;
    this.events.onConnect?.();
  }

  async stop(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    this.isConnected = false;
    this.events.onDisconnect?.();
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error("SimulatedBlePipe is not connected");
    }

    this.bytesOut += data.length;
    if (
      this.disconnectAfterBytes !== null &&
      this.bytesOut >= this.disconnectAfterBytes
    ) {
      await this.stop();
      return;
    }

    if (this.peer === null) {
      return;
    }

    if (this.random() < this.lossRate) {
      return;
    }

    queueMicrotask(() => {
      if (this.peer?.isConnected) {
        this.peer.deliver(data);
      }
    });
  }

  async sendKeepalive(): Promise<void> {
    await this.write(encodeBleFrame(0, BLE_FLAG_KEEPALIVE, new Uint8Array(0)));
  }

  private deliver(data: Uint8Array): void {
    if (!this.isConnected) {
      return;
    }

    this.bytesIn += data.length;
    this.events.onData?.(data);
  }
}
