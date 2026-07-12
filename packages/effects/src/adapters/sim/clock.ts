import type { Clock, InstantMs } from "../../types.js";

/** Virtual clock owned by the simulator; protocol code only reads `now()`. */
export class SimClock implements Clock {
  private instant: InstantMs;

  constructor(startMs: InstantMs = 0) {
    this.instant = startMs;
  }

  now(): InstantMs {
    return this.instant;
  }

  /** Advance to an absolute instant. Must be monotonic. */
  set(at: InstantMs): void {
    if (at < this.instant) {
      throw new Error(`SimClock cannot go backwards: ${at} < ${this.instant}`);
    }
    this.instant = at;
  }

  advance(deltaMs: number): InstantMs {
    if (deltaMs < 0) {
      throw new Error("SimClock.advance requires non-negative delta");
    }
    this.instant += deltaMs;
    return this.instant;
  }
}
