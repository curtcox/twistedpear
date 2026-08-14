import { describe, expect, it } from "vitest";
import { SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import { initialEchoState, stepEcho } from "../src/echo.js";

describe("protocol echo leaf", () => {
  it("replays identically from seed", () => {
    const run = () => {
      const kernel = new SimKernel({
        seed: 7,
        nodes: [
          { id: "a", initial: initialEchoState(), step: stepEcho },
          { id: "b", initial: initialEchoState(), step: stepEcho },
        ],
        delivery: { latencyMs: 2 },
      });
      kernel.start();
      kernel.inject("a", {
        kind: "transport/recv",
        channel: "echo",
        source: "b",
        payload: new Uint8Array([72, 105]),
        at: kernel.clock.now(),
      });
      kernel.runUntilIdle(1000);
      return {
        hash: kernel.getTraceHash(),
        a: kernel.getNodeState("a"),
        b: kernel.getNodeState("b"),
      };
    };
    const x = run();
    const y = run();
    expect(x.hash).toBe(y.hash);
    expect(x.a.inbox[0]).toBe("Hi");
    expect(x.b.inbox.some((m) => m.startsWith("echo:"))).toBe(true);
    expect(y.a.inbox).toEqual(x.a.inbox);
  });

  it("leaves state unchanged for unrelated events", () => {
    const state = initialEchoState();
    expect(stepEcho(state, { kind: "tick", at: 0 })).toEqual({
      state,
      intents: [],
    });
  });
});
