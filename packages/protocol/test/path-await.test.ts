import { describe, expect, it } from "vitest";
import {
  PATH_AWAIT_DEFAULT_TIMEOUT_MS,
  PATH_AWAIT_POLL_INTERVAL_MS,
  PATH_AWAIT_TIMER_ID,
  initialPathAwaitState,
  shouldContinuePathAwait,
  stepPathAwait
} from "../src/path-await.js";

describe("protocol path await", () => {
  it("arms with a deadline from timeout", () => {
    const result = stepPathAwait(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 1_000,
      timeoutMs: PATH_AWAIT_DEFAULT_TIMEOUT_MS
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.deadlineMs).toBe(1_000 + PATH_AWAIT_DEFAULT_TIMEOUT_MS);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([]);
  });

  it("concludes when a path becomes present", () => {
    let state = stepPathAwait(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 0,
      timeoutMs: 1_000
    }).state;
    const result = stepPathAwait(state, {
      kind: "path-await/path-status",
      present: true
    });
    expect(result.state.concluded).toBe(true);
    expect(result.state.found).toBe(true);
    expect(shouldContinuePathAwait(result.state.concluded)).toBe(false);
  });

  it("schedules polls until the deadline then concludes not-found", () => {
    let state = stepPathAwait(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 0,
      timeoutMs: 100
    }).state;
    state = stepPathAwait(state, {
      kind: "path-await/path-status",
      present: false
    }).state;
    expect(state.concluded).toBe(false);

    const mid = stepPathAwait(state, {
      kind: "timer/fired",
      id: PATH_AWAIT_TIMER_ID,
      at: 40
    });
    expect(mid.state.concluded).toBe(false);
    expect(mid.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: PATH_AWAIT_TIMER_ID, delayMs: PATH_AWAIT_POLL_INTERVAL_MS }
      }
    ]);

    const done = stepPathAwait(mid.state, {
      kind: "timer/fired",
      id: PATH_AWAIT_TIMER_ID,
      at: 100
    });
    expect(done.state.concluded).toBe(true);
    expect(done.state.found).toBe(false);
    expect(done.intents).toEqual([]);
  });

  it("ignores probes when not armed or already concluded", () => {
    const unarmed = stepPathAwait(initialPathAwaitState(), {
      kind: "path-await/path-status",
      present: true
    });
    expect(unarmed.state.concluded).toBe(false);

    let state = stepPathAwait(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 0,
      timeoutMs: 100
    }).state;
    state = stepPathAwait(state, {
      kind: "path-await/path-status",
      present: true
    }).state;
    const after = stepPathAwait(state, {
      kind: "path-await/path-status",
      present: false
    });
    expect(after.state.concluded).toBe(true);
    expect(after.state.found).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialPathAwaitState();
      const steps = [];
      steps.push(
        stepPathAwait(state, {
          kind: "path-await/arm",
          at: 0,
          timeoutMs: 100
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepPathAwait(state, {
          kind: "path-await/path-status",
          present: false
        })
      );
      state = steps[1]!.state;
      steps.push(
        stepPathAwait(state, {
          kind: "timer/fired",
          id: PATH_AWAIT_TIMER_ID,
          at: 40
        })
      );
      state = steps[2]!.state;
      steps.push(
        stepPathAwait(state, {
          kind: "path-await/path-status",
          present: true
        })
      );
      return steps.map((step) => ({
        concluded: step.state.concluded,
        found: step.state.found,
        intents: step.intents
      }));
    };
    expect(run()).toEqual(run());
  });
});
