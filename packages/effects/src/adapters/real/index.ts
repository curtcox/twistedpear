import type { Clock, Entropy, InstantMs } from "../../types.js";

type GlobalTimers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

type GlobalCrypto = {
  getRandomValues: (array: Uint8Array) => Uint8Array;
};

/**
 * Production clock. Lives in adapters — protocol packages must never import this.
 * The OS read happens only here.
 */
export class RealClock implements Clock {
  now(): InstantMs {
    return Date.now();
  }
}

/**
 * Production entropy backed by Web Crypto when available.
 */
export class RealEntropy implements Entropy {
  randomBytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    const c = (globalThis as { crypto?: GlobalCrypto }).crypto;
    if (c !== undefined && typeof c.getRandomValues === "function") {
      c.getRandomValues(out);
      return out;
    }
    throw new Error("RealEntropy requires globalThis.crypto.getRandomValues");
  }
}

export interface RealTimerHandle {
  cancel(): void;
}

/**
 * Real timers via setTimeout. Adapters translate timer intents to these calls;
 * protocol code only declares intents.
 */
export class RealTimers {
  private readonly handles = new Map<string, RealTimerHandle>();

  set(id: string, delayMs: number, onFire: () => void): void {
    this.cancel(id);
    const timers = globalThis as unknown as GlobalTimers;
    const handle = timers.setTimeout(() => {
      this.handles.delete(id);
      onFire();
    }, delayMs);
    this.handles.set(id, {
      cancel: () => {
        timers.clearTimeout(handle);
      }
    });
  }

  cancel(id: string): void {
    const existing = this.handles.get(id);
    if (existing !== undefined) {
      existing.cancel();
      this.handles.delete(id);
    }
  }

  cancelAll(): void {
    for (const id of [...this.handles.keys()]) {
      this.cancel(id);
    }
  }
}
