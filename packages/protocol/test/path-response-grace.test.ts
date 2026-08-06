import { describe, expect, it } from "vitest";
import {
  PATH_REQUEST_GRACE_MS,
  PATH_RESPONSE_GRACE_TIMER_ID,
  initialPathResponseGraceState,
  shouldTransmitPathResponse,
  stepPathResponseGraceWithActions,
} from "../src/path-response-grace.js";

describe("protocol path-response grace", () => {
  it("arms with the default grace timer intent", () => {
    const result = stepPathResponseGraceWithActions(
      initialPathResponseGraceState(),
      {
        kind: "path-response-grace/arm",
      },
    );
    expect(result.state.armed).toBe(true);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([
      {
        kind: "timer/set",
        timer: {
          id: PATH_RESPONSE_GRACE_TIMER_ID,
          delayMs: PATH_REQUEST_GRACE_MS,
        },
      },
    ]);
    expect(result.actions).toEqual([]);
  });

  it("emits transmit and resolve when the grace timer fires", () => {
    let state = stepPathResponseGraceWithActions(
      initialPathResponseGraceState(),
      {
        kind: "path-response-grace/arm",
      },
    ).state;
    const result = stepPathResponseGraceWithActions(state, {
      kind: "timer/fired",
      id: PATH_RESPONSE_GRACE_TIMER_ID,
      at: PATH_REQUEST_GRACE_MS,
    });
    expect(shouldTransmitPathResponse(result.state)).toBe(true);
    expect(result.actions).toEqual([{ kind: "transmit" }, { kind: "resolve" }]);
    expect(result.intents).toEqual([]);
  });

  it("ignores timer fire when not armed or already concluded", () => {
    const unarmed = stepPathResponseGraceWithActions(
      initialPathResponseGraceState(),
      {
        kind: "timer/fired",
        id: PATH_RESPONSE_GRACE_TIMER_ID,
        at: 0,
      },
    );
    expect(unarmed.state.concluded).toBe(false);
    expect(unarmed.actions).toEqual([]);

    let state = stepPathResponseGraceWithActions(
      initialPathResponseGraceState(),
      {
        kind: "path-response-grace/arm",
        delayMs: 100,
      },
    ).state;
    state = stepPathResponseGraceWithActions(state, {
      kind: "timer/fired",
      id: PATH_RESPONSE_GRACE_TIMER_ID,
      at: 100,
    }).state;
    const after = stepPathResponseGraceWithActions(state, {
      kind: "timer/fired",
      id: PATH_RESPONSE_GRACE_TIMER_ID,
      at: 200,
    });
    expect(shouldTransmitPathResponse(after.state)).toBe(true);
    expect(after.actions).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialPathResponseGraceState();
      const steps = [];
      steps.push(
        stepPathResponseGraceWithActions(state, {
          kind: "path-response-grace/arm",
          delayMs: 50,
        }),
      );
      state = steps[0]!.state;
      steps.push(
        stepPathResponseGraceWithActions(state, {
          kind: "timer/fired",
          id: PATH_RESPONSE_GRACE_TIMER_ID,
          at: 50,
        }),
      );
      return steps.map((step) => ({
        concluded: step.state.concluded,
        ready: step.state.ready,
        intents: step.intents,
        actions: step.actions,
      }));
    };
    expect(run()).toEqual(run());
  });
});
