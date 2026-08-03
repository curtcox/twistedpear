// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  RESOURCE_ADVERTISE_WAIT_MS,
  RESOURCE_ADVERTISE_WAIT_TIMER_ID,
  initialResourceAdvertiseWaitState,
  shouldContinueResourceAdvertiseWait,
  stepResourceAdvertiseWaitWithActions
} from "../src/resource-advertise-wait.js";

describe("protocol resource advertise wait", () => {
  it("arms with an immediate probe action", () => {
    const result = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([{ kind: "probe" }]);
  });

  it("concludes when the link is ready and cancels the wait timer", () => {
    let state = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    }).state;
    const result = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: true
    });
    expect(result.state.concluded).toBe(true);
    expect(shouldContinueResourceAdvertiseWait(result.state.concluded)).toBe(false);
    expect(result.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RESOURCE_ADVERTISE_WAIT_TIMER_ID } }
    ]);
    expect(result.actions).toEqual([{ kind: "resolve" }]);
  });

  it("queues and schedules waits until timer/fired re-probes readiness", () => {
    let state = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    }).state;
    let step = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: false
    });
    expect(step.state.concluded).toBe(false);
    expect(shouldContinueResourceAdvertiseWait(step.state.concluded)).toBe(true);
    expect(step.actions).toEqual([{ kind: "queue" }]);
    expect(step.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: RESOURCE_ADVERTISE_WAIT_TIMER_ID, delayMs: RESOURCE_ADVERTISE_WAIT_MS }
      }
    ]);
    state = step.state;

    step = stepResourceAdvertiseWaitWithActions(state, {
      kind: "timer/fired",
      id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
      at: RESOURCE_ADVERTISE_WAIT_MS
    });
    expect(step.state.concluded).toBe(false);
    expect(step.actions).toEqual([{ kind: "probe" }]);
    expect(step.intents).toEqual([]);
    state = step.state;

    step = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: true
    });
    expect(step.state.concluded).toBe(true);
    expect(step.actions).toEqual([{ kind: "resolve" }]);
    expect(step.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RESOURCE_ADVERTISE_WAIT_TIMER_ID } }
    ]);
  });

  it("ignores probes when not armed or already concluded", () => {
    const unarmed = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/link-ready",
      ready: true
    });
    expect(unarmed.state.concluded).toBe(false);

    let state = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    }).state;
    state = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: true
    }).state;
    const after = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: false
    });
    expect(after.state.concluded).toBe(true);
    expect(after.actions).toEqual([]);
    expect(after.intents).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialResourceAdvertiseWaitState();
      const steps = [];
      steps.push(stepResourceAdvertiseWaitWithActions(state, { kind: "advertise-wait/arm" }));
      state = steps[0]!.state;
      steps.push(
        stepResourceAdvertiseWaitWithActions(state, {
          kind: "advertise-wait/link-ready",
          ready: false
        })
      );
      state = steps[1]!.state;
      steps.push(
        stepResourceAdvertiseWaitWithActions(state, {
          kind: "timer/fired",
          id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
          at: RESOURCE_ADVERTISE_WAIT_MS
        })
      );
      state = steps[2]!.state;
      steps.push(
        stepResourceAdvertiseWaitWithActions(state, {
          kind: "advertise-wait/link-ready",
          ready: true
        })
      );
      return steps.map((step) => ({
        concluded: step.state.concluded,
        intents: step.intents,
        actions: step.actions
      }));
    };
    expect(run()).toEqual(run());
  });
});
