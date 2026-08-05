import { describe, expect, it } from "vitest";
import {
  PATH_AWAIT_DEFAULT_TIMEOUT_MS,
  PATH_AWAIT_POLL_INTERVAL_MS,
  PATH_AWAIT_TIMER_ID,
  initialPathAwaitState,
  isPathAwaitFound,
  shouldContinuePathAwait,
  stepPathAwaitWithActions
} from "../src/path-await.js";

describe("protocol path await", () => {
  it("arms with a deadline and immediate probe action", () => {
    const result = stepPathAwaitWithActions(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 1_000,
      timeoutMs: PATH_AWAIT_DEFAULT_TIMEOUT_MS
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.deadlineMs).toBe(1_000 + PATH_AWAIT_DEFAULT_TIMEOUT_MS);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([{ kind: "probe" }]);
  });

  it("concludes when a path becomes present and cancels the poll timer", () => {
    let state = stepPathAwaitWithActions(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 0,
      timeoutMs: 1_000
    }).state;
    const result = stepPathAwaitWithActions(state, {
      kind: "path-await/path-status",
      present: true,
      at: 0
    });
    expect(result.state.concluded).toBe(true);
    expect(result.state.found).toBe(true);
    expect(isPathAwaitFound(result.state)).toBe(true);
    expect(shouldContinuePathAwait(result.state.concluded)).toBe(false);
    expect(result.intents).toEqual([
      { kind: "timer/cancel", timer: { id: PATH_AWAIT_TIMER_ID } }
    ]);
    expect(result.actions).toEqual([{ kind: "resolve", found: true }]);
  });

  it("schedules polls until the deadline then concludes not-found", () => {
    let state = stepPathAwaitWithActions(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 0,
      timeoutMs: 100
    }).state;
    let step = stepPathAwaitWithActions(state, {
      kind: "path-await/path-status",
      present: false,
      at: 0
    });
    expect(step.state.concluded).toBe(false);
    expect(step.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: PATH_AWAIT_TIMER_ID, delayMs: PATH_AWAIT_POLL_INTERVAL_MS }
      }
    ]);
    state = step.state;

    step = stepPathAwaitWithActions(state, {
      kind: "timer/fired",
      id: PATH_AWAIT_TIMER_ID,
      at: 40
    });
    expect(step.state.concluded).toBe(false);
    expect(step.actions).toEqual([{ kind: "probe" }]);
    expect(step.intents).toEqual([]);
    state = step.state;

    step = stepPathAwaitWithActions(state, {
      kind: "path-await/path-status",
      present: false,
      at: 40
    });
    expect(step.state.concluded).toBe(false);
    expect(step.intents[0]?.kind).toBe("timer/set");
    state = step.state;

    step = stepPathAwaitWithActions(state, {
      kind: "timer/fired",
      id: PATH_AWAIT_TIMER_ID,
      at: 100
    });
    expect(step.actions).toEqual([{ kind: "probe" }]);
    state = step.state;

    step = stepPathAwaitWithActions(state, {
      kind: "path-await/path-status",
      present: false,
      at: 100
    });
    expect(step.state.concluded).toBe(true);
    expect(step.state.found).toBe(false);
    expect(step.actions).toEqual([{ kind: "resolve", found: false }]);
  });

  it("ignores probes when not armed or already concluded", () => {
    const unarmed = stepPathAwaitWithActions(initialPathAwaitState(), {
      kind: "path-await/path-status",
      present: true,
      at: 0
    });
    expect(unarmed.state.concluded).toBe(false);

    let state = stepPathAwaitWithActions(initialPathAwaitState(), {
      kind: "path-await/arm",
      at: 0,
      timeoutMs: 100
    }).state;
    state = stepPathAwaitWithActions(state, {
      kind: "path-await/path-status",
      present: true,
      at: 0
    }).state;
    const after = stepPathAwaitWithActions(state, {
      kind: "path-await/path-status",
      present: false,
      at: 50
    });
    expect(after.state.concluded).toBe(true);
    expect(after.state.found).toBe(true);
    expect(after.actions).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialPathAwaitState();
      const steps = [];
      steps.push(
        stepPathAwaitWithActions(state, {
          kind: "path-await/arm",
          at: 0,
          timeoutMs: 100
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepPathAwaitWithActions(state, {
          kind: "path-await/path-status",
          present: false,
          at: 0
        })
      );
      state = steps[1]!.state;
      steps.push(
        stepPathAwaitWithActions(state, {
          kind: "timer/fired",
          id: PATH_AWAIT_TIMER_ID,
          at: 40
        })
      );
      state = steps[2]!.state;
      steps.push(
        stepPathAwaitWithActions(state, {
          kind: "path-await/path-status",
          present: true,
          at: 40
        })
      );
      return steps.map((s) => ({
        concluded: s.state.concluded,
        found: s.state.found,
        intents: s.intents,
        actions: s.actions
      }));
    };
    expect(run()).toEqual(run());
  });
});
