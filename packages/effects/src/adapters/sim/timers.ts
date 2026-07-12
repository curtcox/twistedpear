import type { InstantMs, Intent, TimerId } from "../../types.js";
import type { SimClock } from "./clock.js";

interface PendingTimer {
  readonly id: TimerId;
  readonly fireAt: InstantMs;
}

/**
 * Timer table driven by declared intents. Expiry is delivered as events by the
 * sim kernel — never via setTimeout.
 */
export class SimTimers {
  private readonly pending = new Map<TimerId, PendingTimer>();

  constructor(private readonly clock: SimClock) {}

  applyIntent(intent: Intent): void {
    if (intent.kind === "timer/set") {
      this.pending.set(intent.timer.id, {
        id: intent.timer.id,
        fireAt: this.clock.now() + intent.timer.delayMs
      });
      return;
    }
    if (intent.kind === "timer/cancel") {
      this.pending.delete(intent.timer.id);
    }
  }

  /** Next fire time, or undefined if idle. */
  nextFireAt(): InstantMs | undefined {
    let soonest: InstantMs | undefined;
    for (const timer of this.pending.values()) {
      if (soonest === undefined || timer.fireAt < soonest) {
        soonest = timer.fireAt;
      }
    }
    return soonest;
  }

  /** Timers due at or before `at`, removed from the pending set. */
  dueAt(at: InstantMs): TimerId[] {
    const due: TimerId[] = [];
    for (const [id, timer] of this.pending) {
      if (timer.fireAt <= at) {
        due.push(id);
        this.pending.delete(id);
      }
    }
    due.sort();
    return due;
  }
}
