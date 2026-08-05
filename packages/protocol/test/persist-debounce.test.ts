import { describe, expect, it } from "vitest";
import {
  PERSIST_DEBOUNCE_MS,
  initialPersistDebounceState,
  stepPersistDebounceWithActions
} from "../src/persist-debounce.js";

describe("protocol persist debounce", () => {
  it("reschedules on each request", () => {
    let state = initialPersistDebounceState();
    let result = stepPersistDebounceWithActions(state, { kind: "persist/request" });
    expect(result.state.pending).toBe(true);
    expect(result.intents).toEqual([
      { kind: "timer/cancel", timer: { id: "persist-debounce" } },
      { kind: "timer/set", timer: { id: "persist-debounce", delayMs: PERSIST_DEBOUNCE_MS } }
    ]);

    state = result.state;
    result = stepPersistDebounceWithActions(state, { kind: "persist/request" });
    expect(result.intents.filter((intent) => intent.kind === "timer/set")).toHaveLength(1);
  });

  it("flushes on timer fire", () => {
    let state = initialPersistDebounceState();
    state = stepPersistDebounceWithActions(state, { kind: "persist/request" }).state;
    const result = stepPersistDebounceWithActions(state, {
      kind: "timer/fired",
      id: "persist-debounce",
      at: PERSIST_DEBOUNCE_MS
    });
    expect(result.actions).toEqual([{ kind: "flush" }]);
    expect(result.state.pending).toBe(false);
  });

  it("cancel clears pending without flush", () => {
    let state = initialPersistDebounceState();
    state = stepPersistDebounceWithActions(state, { kind: "persist/request" }).state;
    const result = stepPersistDebounceWithActions(state, { kind: "persist/cancel" });
    expect(result.state.pending).toBe(false);
    expect(result.actions).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialPersistDebounceState();
      state = stepPersistDebounceWithActions(state, { kind: "persist/request" }).state;
      return stepPersistDebounceWithActions(state, {
        kind: "timer/fired",
        id: "persist-debounce",
        at: 250
      });
    };
    expect(run()).toEqual(run());
  });
});
