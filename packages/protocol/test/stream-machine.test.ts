import { describe, expect, it } from "vitest";
import { initialStreamState, stepStream } from "../src/index.js";

describe("stream machine", () => {
  it("admits, degrades, restores, and closes", () => {
    let state = initialStreamState();
    expect(state).toEqual({ phase: "requested", rung: 0 });
    state = stepStream(state, { kind: "stream/admit" }).state;
    expect(state.phase).toBe("active");
    state = stepStream(state, { kind: "stream/degrade", rung: 2 }).state;
    expect(state).toEqual({ phase: "degraded", rung: 2 });
    state = stepStream(state, { kind: "stream/restore", rung: 0 }).state;
    expect(state.phase).toBe("active");
    state = stepStream(state, { kind: "stream/close" }).state;
    expect(state.phase).toBe("closed");
  });

  it("defers and rejects from requested, then admits from deferred", () => {
    const deferred = stepStream(initialStreamState(), {
      kind: "stream/defer",
    }).state;
    expect(deferred.phase).toBe("deferred");
    expect(stepStream(deferred, { kind: "stream/admit" }).state.phase).toBe(
      "active",
    );
    expect(
      stepStream(initialStreamState(), { kind: "stream/reject" }).state.phase,
    ).toBe("rejected");
    expect(stepStream(deferred, { kind: "stream/reject" }).state.phase).toBe(
      "rejected",
    );
    expect(
      stepStream(deferred, { kind: "stream/degrade", rung: 1 }).state,
    ).toEqual({ phase: "degraded", rung: 1 });
  });
});
