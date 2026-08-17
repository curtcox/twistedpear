/**
 * Watchdog ping correlation for sandbox backends.
 *
 * A 1s tight loop of successful pings used to allocate a `setTimeout(1000)`
 * per round-trip. On a shared CI runner that timer churn showed up as a 2x
 * throughput regression. One coalesced timer per instance is enough: unique
 * sequence ids avoid `Date.now()` collisions, and a later ping only
 * reschedules when its deadline is sooner than the timer already armed.
 */

export type PendingBroker = Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>;

type PingRecord = {
  readonly deadline: number;
  readonly settle: (ok: boolean) => void;
};

export class SandboxPing {
  #seq = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #timerFiresAt = 0;
  #inflight = new Map<string, PingRecord>();

  request(
    postMessage: (message: unknown) => void,
    pending: PendingBroker,
    timeoutMs: number,
  ): Promise<boolean> {
    const id = `ping-${(this.#seq += 1)}`;
    return new Promise((resolve) => {
      const settle = (ok: boolean): void => {
        if (!this.#inflight.delete(id)) {
          return;
        }
        pending.delete(id);
        resolve(ok);
      };
      this.#inflight.set(id, { deadline: Date.now() + timeoutMs, settle });
      pending.set(id, {
        resolve: () => settle(true),
        reject: () => settle(false),
      });
      this.#arm();
      postMessage({ type: "ping", id });
    });
  }

  dispose(): void {
    this.#clearTimer();
    for (const record of [...this.#inflight.values()]) {
      record.settle(false);
    }
  }

  /** True while a timeout is scheduled. Used by tests to prove coalescing. */
  get armed(): boolean {
    return this.#timer !== undefined;
  }

  #soonestDeadline(): number | undefined {
    let earliest: number | undefined;
    for (const record of this.#inflight.values()) {
      if (earliest === undefined || record.deadline < earliest) {
        earliest = record.deadline;
      }
    }
    return earliest;
  }

  #clearTimer(): void {
    if (this.#timer === undefined) {
      return;
    }
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #expireDue(): void {
    const dueAt = this.#timerFiresAt;
    for (const record of [...this.#inflight.values()]) {
      if (record.deadline <= dueAt) {
        record.settle(false);
      }
    }
  }

  #arm(): void {
    const earliest = this.#soonestDeadline();
    if (earliest === undefined) {
      return;
    }
    if (this.#timer !== undefined && this.#timerFiresAt <= earliest) {
      return;
    }
    this.#clearTimer();
    this.#timerFiresAt = earliest;
    this.#timer = setTimeout(
      () => {
        this.#timer = undefined;
        this.#expireDue();
        this.#arm();
      },
      Math.max(0, earliest - Date.now()),
    );
  }
}
