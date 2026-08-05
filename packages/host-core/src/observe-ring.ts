/**
 * Bounded in-memory ring of SPEC-EVENTS-shaped entries for live capture (O4).
 * Capture stays off until a subscriber attaches; the ring is fixed-capacity.
 */
import type { Intent } from "@twistedpear/effects";

export interface ObserveRingEntry {
  readonly t: "intent";
  readonly at: number;
  readonly intent: Intent;
}

export interface ObserveRing {
  readonly push: (intent: Intent, at?: number) => void;
  readonly snapshot: () => readonly ObserveRingEntry[];
  readonly subscribe: (
    listener: (entry: ObserveRingEntry) => void,
  ) => () => void;
  readonly size: () => number;
}

export function createObserveRing(capacity = 256): ObserveRing {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error("observe ring capacity must be a positive integer");
  }
  const buffer: ObserveRingEntry[] = [];
  const listeners = new Set<(entry: ObserveRingEntry) => void>();

  return {
    push(intent, at = Date.now()) {
      const entry: ObserveRingEntry = { t: "intent", at, intent };
      if (buffer.length >= capacity) {
        buffer.shift();
      }
      buffer.push(entry);
      for (const listener of listeners) {
        listener(entry);
      }
    },
    snapshot() {
      return [...buffer];
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    size() {
      return buffer.length;
    },
  };
}

/** Convert a ring snapshot into a SPEC-TRACE-shaped recorded-history tape. */
export function ringToRecordedHistory(
  entries: readonly ObserveRingEntry[],
  node = "local",
): {
  readonly schema: "recorded-history";
  readonly version: 1;
  readonly entries: ReadonlyArray<{
    readonly t: "intent";
    readonly node: string;
    readonly intent: Intent;
  }>;
} {
  return {
    schema: "recorded-history",
    version: 1,
    entries: entries.map((entry) => ({
      t: "intent" as const,
      node,
      intent: entry.intent,
    })),
  };
}
