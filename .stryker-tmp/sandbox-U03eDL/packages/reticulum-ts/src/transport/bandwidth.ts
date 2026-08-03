// @ts-nocheck
import type { Clock } from "../runtime/runtime.js";

export interface ByteRateLimiter {
  consume(bytes: number): Promise<void>;
}

export type BandwidthReservationClass = "realtime" | "bulk" | "control";

export interface BandwidthReservation {
  readonly id: string;
  readonly class: BandwidthReservationClass;
  readonly bytesPerSecond: number;
  consume(bytes: number): Promise<void>;
  release(): void;
}

/**
 * A zero-burst leaky-bucket limiter. Every reservation completes only after
 * enough wall-clock budget has elapsed, so concurrent interfaces share one
 * hard byte rate instead of each receiving a separate allowance.
 */
export class BandwidthLimiter implements ByteRateLimiter {
  private availableAtMs = 0;
  private nextReservationId = 0;
  private readonly reservations = new Map<string, { class: BandwidthReservationClass; bytesPerSecond: number }>();

  constructor(
    private readonly clock: Clock,
    readonly bytesPerSecond: number
  ) {
    if (!Number.isSafeInteger(bytesPerSecond) || bytesPerSecond <= 0) {
      throw new Error("Bandwidth limit must be a positive safe integer");
    }
  }

  async consume(bytes: number): Promise<void> {
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new Error("Bandwidth byte count must be a non-negative safe integer");
    }
    if (bytes === 0) return;

    const now = this.clock.now();
    const startsAt = Math.max(now, this.availableAtMs);
    const durationMs = Math.ceil((bytes * 1_000) / this.bytesPerSecond);
    this.availableAtMs = startsAt + durationMs;
    const delayMs = this.availableAtMs - now;
    await new Promise<void>((resolve) => {
      this.clock.setTimeout(resolve, delayMs);
    });
  }

  /**
   * Admit a named share of the aggregate limiter. Realtime is capped so control
   * and mesh forwarding always retain capacity; reservations do not add a
   * second limiter or increase the aggregate byte rate.
   */
  reserve(reservationClass: BandwidthReservationClass, bytesPerSecond: number): BandwidthReservation | null {
    if (!Number.isSafeInteger(bytesPerSecond) || bytesPerSecond <= 0) {
      throw new Error("Reservation rate must be a positive safe integer");
    }
    const classCap = reservationClass === "realtime"
      ? Math.floor(this.bytesPerSecond * 0.6)
      : this.bytesPerSecond;
    const classCommitted = [...this.reservations.values()]
      .filter((entry) => entry.class === reservationClass)
      .reduce((sum, entry) => sum + entry.bytesPerSecond, 0);
    const totalCommitted = [...this.reservations.values()]
      .reduce((sum, entry) => sum + entry.bytesPerSecond, 0);
    if (classCommitted + bytesPerSecond > classCap || totalCommitted + bytesPerSecond > this.bytesPerSecond) {
      return null;
    }

    const id = `bandwidth-${this.nextReservationId++}`;
    this.reservations.set(id, { class: reservationClass, bytesPerSecond });
    let released = false;
    return {
      id,
      class: reservationClass,
      bytesPerSecond,
      consume: (bytes) => {
        if (released) return Promise.reject(new Error("Bandwidth reservation has been released"));
        return this.consume(bytes);
      },
      release: () => {
        if (released) return;
        released = true;
        this.reservations.delete(id);
      }
    };
  }

  reservationSnapshot(): ReadonlyArray<{
    readonly id: string;
    readonly class: BandwidthReservationClass;
    readonly bytesPerSecond: number;
  }> {
    return [...this.reservations].map(([id, reservation]) => ({ id, ...reservation }));
  }

  /** Approximate bytes already scheduled ahead of the current clock. */
  queueDepthBytes(): number {
    const queuedMs = Math.max(0, this.availableAtMs - this.clock.now());
    return Math.ceil((queuedMs * this.bytesPerSecond) / 1_000);
  }
}
