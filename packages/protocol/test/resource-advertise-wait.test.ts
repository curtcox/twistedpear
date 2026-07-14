import { describe, expect, it } from "vitest";
import {
  RESOURCE_ADVERTISE_WAIT_MS,
  RESOURCE_ADVERTISE_WAIT_TIMER_ID,
  initialResourceAdvertiseWaitState,
  shouldContinueResourceAdvertiseWait,
  stepResourceAdvertiseWaitWithActions
} from "../src/resource-advertise-wait.js";

describe("protocol resource advertise wait", () => {
  it("arms without probing until link readiness arrives", () => {
    const result = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it("concludes immediately when the link is ready", () => {
    let state = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    }).state;
    const result = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: true
    });
    expect(result.state.concluded).toBe(true);
    expect(shouldContinueResourceAdvertiseWait(result.state.concluded)).toBe(false);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it("queues and schedules a wait when the link is not ready", () => {
    let state = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
      kind: "advertise-wait/arm"
    }).state;
    const waiting = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: false
    });
    expect(waiting.state.concluded).toBe(false);
    expect(shouldContinueResourceAdvertiseWait(waiting.state.concluded)).toBe(true);
    expect(waiting.actions).toEqual([{ kind: "queue" }]);
    expect(waiting.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: RESOURCE_ADVERTISE_WAIT_TIMER_ID, delayMs: RESOURCE_ADVERTISE_WAIT_MS }
      }
    ]);

    state = waiting.state;
    const ready = stepResourceAdvertiseWaitWithActions(state, {
      kind: "advertise-wait/link-ready",
      ready: true
    });
    expect(ready.state.concluded).toBe(true);
    expect(ready.actions).toEqual([]);
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
