import { describe, expect, it } from "vitest";
import {
  initialLinkAppRequestAwaitState,
  shouldContinueLinkAppRequestAwait,
  stepLinkAppRequestAwait,
  stepLinkAppRequestAwaitWithActions
} from "../src/link-app-request-await.js";

describe("protocol link app-request await", () => {
  it("arms with a send-request action", () => {
    const result = stepLinkAppRequestAwaitWithActions(initialLinkAppRequestAwaitState(), {
      kind: "app-request-await/arm",
      timeoutSec: 10
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([{ kind: "send-request", timeoutSec: 10 }]);
    expect(
      stepLinkAppRequestAwait(initialLinkAppRequestAwaitState(), {
        kind: "app-request-await/arm",
        timeoutSec: 10
      }).intents
    ).toEqual(result.intents);
  });

  it("resolves with response bytes", () => {
    let state = stepLinkAppRequestAwaitWithActions(initialLinkAppRequestAwaitState(), {
      kind: "app-request-await/arm",
      timeoutSec: 5
    }).state;
    const payload = new Uint8Array([1, 2, 3]);
    const result = stepLinkAppRequestAwaitWithActions(state, {
      kind: "app-request-await/response",
      response: payload
    });
    expect(result.state.concluded).toBe(true);
    expect(result.state.response).toEqual(payload);
    expect(shouldContinueLinkAppRequestAwait(result.state.concluded)).toBe(false);
    expect(result.actions).toEqual([{ kind: "resolve", response: payload }]);
  });

  it("resolves null on failed or send-rejected", () => {
    for (const kind of ["app-request-await/failed", "app-request-await/send-rejected"] as const) {
      let state = stepLinkAppRequestAwaitWithActions(initialLinkAppRequestAwaitState(), {
        kind: "app-request-await/arm",
        timeoutSec: 5
      }).state;
      const result = stepLinkAppRequestAwaitWithActions(state, { kind });
      expect(result.state.concluded).toBe(true);
      expect(result.state.response).toBeNull();
      expect(result.actions).toEqual([{ kind: "resolve", response: null }]);
    }
  });

  it("ignores terminal events when not armed or already concluded", () => {
    const unarmed = stepLinkAppRequestAwaitWithActions(initialLinkAppRequestAwaitState(), {
      kind: "app-request-await/failed"
    });
    expect(unarmed.state.concluded).toBe(false);
    expect(unarmed.actions).toEqual([]);

    let state = stepLinkAppRequestAwaitWithActions(initialLinkAppRequestAwaitState(), {
      kind: "app-request-await/arm",
      timeoutSec: 5
    }).state;
    state = stepLinkAppRequestAwaitWithActions(state, {
      kind: "app-request-await/response",
      response: new Uint8Array([9])
    }).state;
    const after = stepLinkAppRequestAwaitWithActions(state, {
      kind: "app-request-await/failed"
    });
    expect(after.state.response).toEqual(new Uint8Array([9]));
    expect(after.actions).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialLinkAppRequestAwaitState();
      const steps = [];
      steps.push(
        stepLinkAppRequestAwaitWithActions(state, {
          kind: "app-request-await/arm",
          timeoutSec: 8
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepLinkAppRequestAwaitWithActions(state, {
          kind: "app-request-await/response",
          response: new Uint8Array([4, 5])
        })
      );
      return steps.map((step) => ({
        concluded: step.state.concluded,
        response: step.state.response === null ? null : Array.from(step.state.response),
        intents: step.intents,
        actions: step.actions.map((action) =>
          action.kind === "resolve"
            ? {
                kind: action.kind,
                response: action.response === null ? null : Array.from(action.response)
              }
            : action
        )
      }));
    };
    expect(run()).toEqual(run());
  });
});
