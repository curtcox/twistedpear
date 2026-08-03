// @ts-nocheck
import type { Event, Intent } from "../src/types.js";
import { SimKernel, OracleViolation } from "../src/adapters/sim/kernel.js";
import type { Oracle } from "../src/adapters/sim/oracles.js";
import {
  FileHistoryRecorder,
  MemoryHistoryRecorder,
  parseHistory
} from "../src/adapters/sim/recorder.js";
import { ddmin, rerunHistory, shrinkHistory } from "../src/adapters/sim/shrink.js";
import { describe, expect, it } from "vitest";

interface State {
  readonly failed: boolean;
  readonly seen: number;
}

function step(state: State, event: Event): { state: State; intents: Intent[] } {
  if (event.kind === "tick") {
    return {
      state: { failed: state.failed || event.at === 777, seen: state.seen + 1 },
      intents: []
    };
  }
  return { state, intents: [] };
}

const oracle: Oracle<State> = {
  name: "canary",
  check(world) {
    const bad = [...world.nodes].find(([, state]) => state.failed);
    return bad === undefined ? null : {
      oracle: "canary",
      message: "seeded canary tripped",
      nodes: [bad[0]]
    };
  }
};

describe("oracle recording and shrinking", () => {
  it("records a self-describing history and reruns the same oracle", () => {
    const recorder = new MemoryHistoryRecorder<State>();
    const kernel = new SimKernel({
      seed: 9,
      nodes: [{ id: "host", machine: "canary", initial: { failed: false, seen: 0 }, step }],
      oracles: [oracle],
      recorder
    });
    expect(() => kernel.inject("host", { kind: "tick", at: 777 })).toThrow(OracleViolation);
    expect(recorder.histories).toHaveLength(1);
    const history = recorder.histories[0]!;
    const rerun = rerunHistory(history, {
      resolveMachine: () => step,
      oracles: [oracle]
    });
    expect(rerun.violation.violation.oracle).toBe("canary");
  });

  it("serializes bytes and writes through the portable on-disk recorder", () => {
    const written = new Map<string, string>();
    const recorder = new FileHistoryRecorder<State>("/histories", (path, contents) => {
      written.set(path, contents);
    });
    const kernel = new SimKernel({
      seed: 10,
      nodes: [{ id: "host", machine: "canary", initial: { failed: false, seen: 0 }, step }]
    });
    kernel.inject("host", { kind: "entropy", bytes: new Uint8Array([1, 2, 255]) });
    const path = recorder.record(kernel.getHistory());
    const parsed = parseHistory<State>(written.get(path)!);
    const event = parsed.trace.find((entry) => entry.t === "event");
    expect(event?.t === "event" && event.event.kind === "entropy" ? [...event.event.bytes] : []).toEqual([1, 2, 255]);
  });

  it("shrinks a thousand-event failure to the causal event", () => {
    const kernel = new SimKernel({
      seed: 11,
      nodes: [{ id: "host", machine: "canary", initial: { failed: false, seen: 0 }, step }],
      oracles: [oracle]
    });
    for (let at = 0; at < 1_000; at += 1) {
      try {
        kernel.inject("host", { kind: "tick", at });
      } catch (error) {
        if (!(error instanceof OracleViolation)) throw error;
        const minimized = shrinkHistory(error.history as import("../src/adapters/sim/recorder.js").RecordedHistory<State>, {
          resolveMachine: () => step,
          oracles: [oracle]
        });
        expect(minimized.trace).toHaveLength(1);
        expect(minimized.trace[0]).toMatchObject({ t: "event", event: { kind: "tick", at: 777 } });
        return;
      }
    }
    throw new Error("canary did not trip");
  });

  it("ddmin returns a known one-minimal set", () => {
    expect(ddmin([1, 2, 3, 4, 5], (candidate) => candidate.includes(2) && candidate.includes(5))).toEqual([2, 5]);
  });
});
