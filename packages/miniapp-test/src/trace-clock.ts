/**
 * The clock a recordable session runs on.
 *
 * A trace only replays if the sandbox is handed the same `clockMs` seed it had
 * at record time, because the worker's entropy LCG is derived from it
 * (`timeShimsFragment` in `packages/miniapp-runtime/src/sandbox/time-shims.ts`).
 * Wall-clock hosts cannot offer that. Record and replay therefore share one
 * monotonic virtual clock: every `now()` advances by a fixed step, so the same
 * sequence of host calls yields the same timestamps in both runs.
 */
export interface TraceClockOptions {
  /** First value `now()` returns. Also the sandbox entropy seed at launch. */
  readonly startMs?: number;
  /** Milliseconds added per `now()` call. Must be a positive integer. */
  readonly stepMs?: number;
}

const DEFAULT_TRACE_CLOCK_START_MS = 1_767_225_600_000;
const DEFAULT_TRACE_CLOCK_STEP_MS = 1;

export interface TraceClock {
  readonly now: () => number;
  /** Value the next `now()` would return, without consuming a tick. */
  peek(): number;
  /** How many times `now()` has been called. */
  ticks(): number;
}

export function createTraceClock(options: TraceClockOptions = {}): TraceClock {
  const startMs = options.startMs ?? DEFAULT_TRACE_CLOCK_START_MS;
  const stepMs = options.stepMs ?? DEFAULT_TRACE_CLOCK_STEP_MS;
  if (!Number.isInteger(startMs) || startMs < 0) {
    throw new RangeError("startMs must be a non-negative integer");
  }
  if (!Number.isInteger(stepMs) || stepMs < 1) {
    throw new RangeError("stepMs must be a positive integer");
  }
  let calls = 0;
  return {
    now: () => startMs + stepMs * calls++,
    peek: () => startMs + stepMs * calls,
    ticks: () => calls,
  };
}
