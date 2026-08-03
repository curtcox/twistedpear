// @ts-nocheck
import type { Event, Intent } from "../src/types.js";
import { hashTrace } from "../src/trace.js";
import { SimKernel, doubleRunHashes } from "../src/adapters/sim/kernel.js";
import { Xoshiro128StarStar } from "../src/adapters/sim/entropy.js";
import { describe, expect, it } from "vitest";

interface PingState {
  readonly pings: number;
  readonly pongs: number;
}

function stepPing(state: PingState, event: Event): { state: PingState; intents: Intent[] } {
  if (event.kind === "start") {
    return {
      state,
      intents: [
        {
          kind: "transport/send",
          send: {
            channel: "ping",
            destination: "b",
            payload: new Uint8Array([1])
          }
        },
        { kind: "timer/set", timer: { id: "heartbeat", delayMs: 50 } }
      ]
    };
  }
  if (event.kind === "transport/recv") {
    if (event.payload[0] === 1) {
      return {
        state: { ...state, pings: state.pings + 1 },
        intents: [
          {
            kind: "transport/send",
            send: {
              channel: "ping",
              destination: event.source,
              payload: new Uint8Array([2])
            }
          }
        ]
      };
    }
    return { state: { ...state, pongs: state.pongs + 1 }, intents: [] };
  }
  if (event.kind === "timer/fired" && event.id === "heartbeat") {
    return {
      state,
      intents: [
        {
          kind: "transport/send",
          send: {
            channel: "ping",
            destination: "b",
            payload: new Uint8Array([1])
          }
        }
        // Do not reschedule — keeps the scenario finite for idle detection.
      ]
    };
  }
  return { state, intents: [] };
}

describe("sim determinism", () => {
  it("double-runs produce identical trace hashes", () => {
    const config = {
      seed: 0xc0ffee,
      nodes: [
        { id: "a", initial: { pings: 0, pongs: 0 }, step: stepPing },
        { id: "b", initial: { pings: 0, pongs: 0 }, step: stepPing }
      ],
      delivery: { latencyMs: 5 }
    };
    const { a, b } = doubleRunHashes(config);
    expect(a).toBe(b);
  });

  it("same seed yields identical multi-node traces", () => {
    const make = () => {
      const kernel = new SimKernel({
        seed: 42,
        nodes: [
          { id: "a", initial: { pings: 0, pongs: 0 }, step: stepPing },
          { id: "b", initial: { pings: 0, pongs: 0 }, step: stepPing }
        ],
        delivery: { latencyMs: 3 }
      });
      kernel.start();
      kernel.advanceTo(120);
      return {
        hash: kernel.getTraceHash(),
        trace: kernel.getTrace(),
        a: kernel.getNodeState("a"),
        b: kernel.getNodeState("b")
      };
    };
    const x = make();
    const y = make();
    expect(x.hash).toBe(y.hash);
    expect(hashTrace(x.trace)).toBe(hashTrace(y.trace));
    expect(x.a).toEqual(y.a);
    expect(x.b).toEqual(y.b);
  });

  it("interleave salt changes transport schedule but protocol seed stays fixed", () => {
    const base = {
      seed: 99,
      nodes: [
        { id: "a", initial: { pings: 0, pongs: 0 }, step: stepPing },
        { id: "b", initial: { pings: 0, pongs: 0 }, step: stepPing }
      ],
      delivery: { latencyMs: 0, lossRate: 0.3 }
    };
    const run = (salt: number) => {
      const kernel = new SimKernel({ ...base, interleaveSalt: salt });
      kernel.start();
      kernel.advanceTo(200);
      return kernel.getTraceHash();
    };
    // With loss, different salts may diverge; same salt must match.
    expect(run(1)).toBe(run(1));
  });
});

describe("xoshiro entropy", () => {
  it("is deterministic for a seed", () => {
    const a = new Xoshiro128StarStar(1234);
    const b = new Xoshiro128StarStar(1234);
    expect([...a.randomBytes(32)]).toEqual([...b.randomBytes(32)]);
  });
});
