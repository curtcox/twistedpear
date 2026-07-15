/** Mirrors RNS/Transport.py announce rate limiting — thin adapter over protocol core. */
import {
  MAX_ANNOUNCE_RATE_TIMESTAMPS,
  initialAnnounceRateState,
  shouldTreatAnnounceBlocked,
  shouldTreatRecordAnnounceBlocked,
  stepAnnounceBlockedWithActions,
  stepRecordAnnounceWithActions,
  type AnnounceRateEntry as ProtocolAnnounceRateEntry,
  type AnnounceRateOptions as ProtocolAnnounceRateOptions,
  type AnnounceRateState
} from "@twistedpear/protocol";

export const MAX_RATE_TIMESTAMPS = MAX_ANNOUNCE_RATE_TIMESTAMPS;

export interface AnnounceRateEntry {
  last: number;
  rateViolations: number;
  blockedUntil: number;
  timestamps: number[];
}

export type AnnounceRateOptions = ProtocolAnnounceRateOptions;

/** Tracks announce ingress rates per destination hash. Mirrors RNS/Transport.py announce_rate_table. */
export class AnnounceRateLimiter {
  private state: AnnounceRateState;

  constructor(options: AnnounceRateOptions = {}) {
    this.state = initialAnnounceRateState(options);
  }

  isBlocked(destinationKey: string, now: number): boolean {
    return shouldTreatAnnounceBlocked(
      stepAnnounceBlockedWithActions(this.state, {
        kind: "announce/blocked-gate",
        destinationKey,
        at: now
      }).actions
    );
  }

  record(destinationKey: string, now: number): boolean {
    const stepped = stepRecordAnnounceWithActions(this.state, {
      kind: "announce/record-gate",
      destinationKey,
      at: now
    });
    this.state = stepped.state;
    return shouldTreatRecordAnnounceBlocked(stepped.actions);
  }

  /** Test/debug helper: snapshot current table entries. */
  snapshot(): ReadonlyMap<string, ProtocolAnnounceRateEntry> {
    return this.state.table;
  }
}
