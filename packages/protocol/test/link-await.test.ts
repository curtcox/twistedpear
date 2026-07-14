import { describe, expect, it } from "vitest";
import {
  LINK_AWAIT_DEFAULT_TIMEOUT_MS,
  LINK_AWAIT_TIMER_ID,
  initialLinkAwaitState,
  isLinkAwaitEstablished,
  isLinkAwaitTimedOut,
  shouldContinueLinkAwait,
  stepLinkAwait
} from "../src/link-await.js";

describe("protocol link await", () => {
  it("arms with a timeout timer intent", () => {
    const result = stepLinkAwait(initialLinkAwaitState(), {
      kind: "link-await/arm",
      timeoutMs: LINK_AWAIT_DEFAULT_TIMEOUT_MS
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: LINK_AWAIT_TIMER_ID, delayMs: LINK_AWAIT_DEFAULT_TIMEOUT_MS }
      }
    ]);
  });

  it("concludes established and cancels the timer", () => {
    let state = stepLinkAwait(initialLinkAwaitState(), {
      kind: "link-await/arm",
      timeoutMs: 1_000
    }).state;
    const result = stepLinkAwait(state, { kind: "link-await/established" });
    expect(isLinkAwaitEstablished(result.state)).toBe(true);
    expect(isLinkAwaitTimedOut(result.state)).toBe(false);
    expect(shouldContinueLinkAwait(result.state.concluded)).toBe(false);
    expect(result.intents).toEqual([{ kind: "timer/cancel", timer: { id: LINK_AWAIT_TIMER_ID } }]);
  });

  it("concludes timed-out when the timer fires", () => {
    let state = stepLinkAwait(initialLinkAwaitState(), {
      kind: "link-await/arm",
      timeoutMs: 1_000
    }).state;
    const result = stepLinkAwait(state, {
      kind: "timer/fired",
      id: LINK_AWAIT_TIMER_ID,
      at: 1_000
    });
    expect(isLinkAwaitTimedOut(result.state)).toBe(true);
    expect(isLinkAwaitEstablished(result.state)).toBe(false);
    expect(result.intents).toEqual([]);
  });

  it("ignores establish and timer events when not armed or already concluded", () => {
    const unarmed = stepLinkAwait(initialLinkAwaitState(), {
      kind: "link-await/established"
    });
    expect(unarmed.state.concluded).toBe(false);

    let state = stepLinkAwait(initialLinkAwaitState(), {
      kind: "link-await/arm",
      timeoutMs: 1_000
    }).state;
    state = stepLinkAwait(state, { kind: "link-await/established" }).state;
    const after = stepLinkAwait(state, {
      kind: "timer/fired",
      id: LINK_AWAIT_TIMER_ID,
      at: 2_000
    });
    expect(isLinkAwaitEstablished(after.state)).toBe(true);
    expect(after.intents).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialLinkAwaitState();
      const steps = [];
      steps.push(
        stepLinkAwait(state, {
          kind: "link-await/arm",
          timeoutMs: 500
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepLinkAwait(state, {
          kind: "timer/fired",
          id: LINK_AWAIT_TIMER_ID,
          at: 500
        })
      );
      return steps.map((step) => ({
        concluded: step.state.concluded,
        established: step.state.established,
        timedOut: step.state.timedOut,
        intents: step.intents
      }));
    };
    expect(run()).toEqual(run());
  });
});
