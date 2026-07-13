import type { Event } from "../../src/types.js";
import { assertReplayDeterminism } from "../../src/adapters/sim/replay.js";
import { SimKernel } from "../../src/adapters/sim/kernel.js";
import { initialEchoState, stepEcho } from "../../../protocol/src/echo.js";
import {
  initialGrantHostState,
  stepGrantHost
} from "../../../protocol/src/grants.js";
import {
  initialAnnounceRateState,
  stepAnnounceRate,
  type AnnounceRateState
} from "../../../protocol/src/announce-rate.js";
import {
  PropagationTransferState,
  initialPropagationTransferState,
  stepPropagationTransfer,
  type PropagationTransferMachineState
} from "../../../protocol/src/propagation-transfer.js";
import { describe, expect, it } from "vitest";

function grantSet(at: number, declared: string[], requested: string[]): Event {
  return { kind: "grant/set", at, declared, requested } as unknown as Event;
}

describe("multi-node sim scenarios", () => {
  it("echo leaf replays identically from trace", () => {
    const config = {
      seed: 7,
      nodes: [
        { id: "a", initial: initialEchoState(), step: stepEcho },
        { id: "b", initial: initialEchoState(), step: stepEcho }
      ],
      delivery: { latencyMs: 2 }
    };
    const { liveHash, stateHash } = assertReplayDeterminism(config, (kernel) => {
      kernel.start();
      kernel.inject("a", {
        kind: "transport/recv",
        channel: "echo",
        source: "b",
        payload: new Uint8Array([72, 105]),
        at: kernel.clock.now()
      });
      kernel.runUntilIdle(1000);
    });
    expect(liveHash).toBeTruthy();
    expect(stateHash).toBeTruthy();
  });

  it("grant host replays from trace", () => {
    const config = {
      seed: 31,
      nodes: [
        {
          id: "host",
          initial: initialGrantHostState("app", "pk"),
          step: stepGrantHost
        }
      ]
    };
    const { stateHash } = assertReplayDeterminism(config, (kernel) => {
      kernel.start();
      kernel.inject("host", grantSet(100, ["read"], ["read"]));
    });
    expect(stateHash).toBeTruthy();
  });

  it("zero loss: interleave salt does not change final state", () => {
    const base = {
      seed: 99,
      nodes: [
        { id: "a", initial: initialEchoState(), step: stepEcho },
        { id: "b", initial: initialEchoState(), step: stepEcho }
      ],
      delivery: { latencyMs: 1, lossRate: 0 }
    };
    const runStateHash = (salt: number) => {
      const kernel = new SimKernel({ ...base, interleaveSalt: salt });
      kernel.start();
      kernel.inject("a", {
        kind: "transport/recv",
        channel: "echo",
        source: "b",
        payload: new Uint8Array([1]),
        at: 0
      });
      kernel.runUntilIdle(500);
      return JSON.stringify(kernel.getNodeState("a"));
    };
    expect(runStateHash(0)).toBe(runStateHash(1));
    expect(runStateHash(0)).toBe(runStateHash(999));
  });

  it("propagation transfer happy path replays identically", () => {
    const config = {
      seed: 42,
      nodes: [
        {
          id: "client",
          initial: initialPropagationTransferState(),
          step: stepPropagationTransfer
        }
      ]
    };
    const { stateHash } = assertReplayDeterminism(config, (kernel) => {
      kernel.inject("client", { kind: "xfer/begin" } as unknown as Event);
      kernel.inject("client", { kind: "xfer/link-ready" } as unknown as Event);
      kernel.inject("client", {
        kind: "xfer/list-ready",
        wantCount: 2
      } as unknown as Event);
      kernel.inject("client", {
        kind: "xfer/download-ready",
        downloadedCount: 2
      } as unknown as Event);
      kernel.inject("client", { kind: "xfer/haves-acked" } as unknown as Event);
    });
    expect(stateHash).toBeTruthy();

    const live = new SimKernel(config);
    live.inject("client", { kind: "xfer/begin" } as unknown as Event);
    live.inject("client", { kind: "xfer/link-ready" } as unknown as Event);
    live.inject("client", { kind: "xfer/list-ready", wantCount: 2 } as unknown as Event);
    live.inject("client", {
      kind: "xfer/download-ready",
      downloadedCount: 2
    } as unknown as Event);
    live.inject("client", { kind: "xfer/haves-acked" } as unknown as Event);
    const state = live.getNodeState("client") as PropagationTransferMachineState;
    expect(state.phase).toBe(PropagationTransferState.COMPLETE);
  });

  it("announce rate limiter is deterministic under interleave salt", () => {
    const base = {
      seed: 17,
      nodes: [
        {
          id: "transport",
          initial: initialAnnounceRateState({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 }),
          step: stepAnnounceRate
        }
      ]
    };
    const run = (salt: number) => {
      const kernel = new SimKernel({ ...base, interleaveSalt: salt });
      for (const at of [100, 100.05, 100.1, 111]) {
        kernel.inject("transport", {
          kind: "announce/record",
          destinationKey: "dest",
          at
        } as unknown as Event);
      }
      return kernel.getNodeState("transport") as AnnounceRateState;
    };
    const a = run(0);
    const b = run(99);
    expect(a.lastBlocked).toBe(b.lastBlocked);
    expect(a.table.get("dest")?.blockedUntil).toBe(b.table.get("dest")?.blockedUntil);
  });
});
