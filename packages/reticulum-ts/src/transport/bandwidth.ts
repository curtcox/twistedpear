import type { Clock } from "../runtime/runtime.js";

export interface ByteRateLimiter {
  consume(bytes: number): Promise<void>;
}

/**
 * A zero-burst leaky-bucket limiter. Every reservation completes only after
 * enough wall-clock budget has elapsed, so concurrent interfaces share one
 * hard byte rate instead of each receiving a separate allowance.
 */
export class BandwidthLimiter implements ByteRateLimiter {
  private availableAtMs = 0;

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
}
