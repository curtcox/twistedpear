import { ConfirmationError, type ConfirmationEffects } from "../confirm.js";

const DEFAULT_CONFIRMATION_RATE_MAX = 3;
const DEFAULT_CONFIRMATION_RATE_WINDOW_MS = 10_000;

class ConfirmationRateLimiter {
  private readonly stamps = new Map<string, number[]>();

  constructor(
    readonly max: number = DEFAULT_CONFIRMATION_RATE_MAX,
    readonly windowMs: number = DEFAULT_CONFIRMATION_RATE_WINDOW_MS,
  ) {}

  assert(appId: string, now: number): void {
    const cutoff = now - this.windowMs;
    const kept = (this.stamps.get(appId) ?? []).filter(
      (stamp) => stamp > cutoff,
    );
    if (kept.length >= this.max) {
      throw new ConfirmationError(
        "CONFIRMATION_RATE_LIMITED",
        `Confirmation rate for "${appId}" exceeds ${this.max} per ${this.windowMs}ms.`,
      );
    }
    kept.push(now);
    this.stamps.set(appId, kept);
  }
}

/**
 * Node adapter: entropy, timers, and the confirmation rate limiter.
 *
 * The limiter is per-instance, so a host that builds its own gets a window that
 * is not shared with any other host in the process, and `now` lets a host on a
 * virtual clock rate-limit on that clock rather than on wall time.
 */
export function createNodeConfirmationEffects(
  now: () => number = () => Date.now(),
): ConfirmationEffects {
  return {
    randomBytes(length: number): Uint8Array {
      const bytes = new Uint8Array(length);
      const cryptoApi = globalThis.crypto as Crypto | undefined;
      if (typeof cryptoApi?.getRandomValues !== "function") {
        throw new Error(
          "crypto.getRandomValues is required for confirmation tokens",
        );
      }
      cryptoApi.getRandomValues(bytes);
      return bytes;
    },
    delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    now,
    limiter: new ConfirmationRateLimiter(),
  };
}
