/** Mirrors RNS/Transport.py announce rate limiting constants. */
export const MAX_RATE_TIMESTAMPS = 16;

export interface AnnounceRateEntry {
  last: number;
  rateViolations: number;
  blockedUntil: number;
  timestamps: number[];
}

export interface AnnounceRateOptions {
  readonly rateTarget?: number;
  readonly rateGrace?: number;
  readonly ratePenalty?: number;
}

const DEFAULT_RATE_TARGET = 0.2;
const DEFAULT_RATE_GRACE = 2;
const DEFAULT_RATE_PENALTY = 60;

/** Tracks announce ingress rates per destination hash. Mirrors RNS/Transport.py announce_rate_table. */
export class AnnounceRateLimiter {
  private readonly table = new Map<string, AnnounceRateEntry>();
  private readonly rateTarget: number;
  private readonly rateGrace: number;
  private readonly ratePenalty: number;

  constructor(options: AnnounceRateOptions = {}) {
    this.rateTarget = options.rateTarget ?? DEFAULT_RATE_TARGET;
    this.rateGrace = options.rateGrace ?? DEFAULT_RATE_GRACE;
    this.ratePenalty = options.ratePenalty ?? DEFAULT_RATE_PENALTY;
  }

  isBlocked(destinationKey: string, now = Date.now() / 1000): boolean {
    const entry = this.table.get(destinationKey);
    if (entry === undefined) {
      return false;
    }

    return now <= entry.blockedUntil;
  }

  record(destinationKey: string, now = Date.now() / 1000): boolean {
    let entry = this.table.get(destinationKey);
    if (entry === undefined) {
      entry = { last: now, rateViolations: 0, blockedUntil: 0, timestamps: [now] };
      this.table.set(destinationKey, entry);
      return false;
    }

    entry.timestamps.push(now);
    while (entry.timestamps.length > MAX_RATE_TIMESTAMPS) {
      entry.timestamps.shift();
    }

    if (now <= entry.blockedUntil) {
      return true;
    }

    const currentRate = now - entry.last;
    if (currentRate < this.rateTarget) {
      entry.rateViolations += 1;
    } else {
      entry.rateViolations = Math.max(0, entry.rateViolations - 1);
    }

    if (entry.rateViolations > this.rateGrace) {
      entry.blockedUntil = entry.last + this.rateTarget + this.ratePenalty;
      return true;
    }

    entry.last = now;
    return false;
  }
}
