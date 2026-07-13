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
import {
  initialPathTableState,
  stepPathTable,
  type PathTableState
} from "../../../protocol/src/path-table.js";
import { LinkStatus } from "../../../protocol/src/link-watchdog.js";
import {
  initialLinkSessionState,
  stepLinkSession,
  type LinkSessionState
} from "../../../protocol/src/link-session.js";
import { describe, expect, it } from "vitest";

function grantSet(at: number, declared: string[], requested: string[]): Event {
  return { kind: "grant/set", at, declared, requested } as unknown as Event;
}

function blobWithEmitted(emitted: number): Uint8Array {
  const blob = new Uint8Array(10);
  blob[9] = emitted & 0xff;
  blob[8] = (emitted >>> 8) & 0xff;
  return blob;
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

  it("path table updates replay identically across nodes", () => {
    const blob = blobWithEmitted(42);
    const config = {
      seed: 5,
      nodes: [
        { id: "a", initial: initialPathTableState(), step: stepPathTable },
        { id: "b", initial: initialPathTableState(), step: stepPathTable }
      ]
    };
    const { stateHash } = assertReplayDeterminism(config, (kernel) => {
      for (const node of ["a", "b"] as const) {
        kernel.inject(node, {
          kind: "path/announce",
          destinationKey: "dest",
          hops: 1,
          randomBlob: blob,
          at: 10
        } as unknown as Event);
      }
    });
    expect(stateHash).toBeTruthy();
    const live = new SimKernel(config);
    live.inject("a", {
      kind: "path/announce",
      destinationKey: "dest",
      hops: 1,
      randomBlob: blob,
      at: 10
    } as unknown as Event);
    expect((live.getNodeState("a") as PathTableState).entries.get("dest")?.hops).toBe(1);
  });

  it("two-node link session establishes deterministically", () => {
    const config = {
      seed: 11,
      nodes: [
        {
          id: "a",
          initial: initialLinkSessionState({ role: "initiator", peerId: "b" }),
          step: stepLinkSession
        },
        {
          id: "b",
          initial: initialLinkSessionState({ role: "responder", peerId: "a" }),
          step: stepLinkSession
        }
      ]
    };
    const { stateHash } = assertReplayDeterminism(config, (kernel) => {
      kernel.inject("a", { kind: "session/request-link", at: 1 } as unknown as Event);
      kernel.inject("b", { kind: "session/handshake", at: 1.5 } as unknown as Event);
      kernel.inject("a", { kind: "session/handshake", at: 1.6 } as unknown as Event);
      kernel.inject("b", { kind: "session/link-proof", at: 2, rtt: 0.4 } as unknown as Event);
      kernel.inject("a", { kind: "session/link-proof", at: 2.1, rtt: 0.4 } as unknown as Event);
      kernel.inject("a", { kind: "session/inbound", at: 3 } as unknown as Event);
      kernel.inject("b", { kind: "session/inbound", at: 3 } as unknown as Event);
    });
    expect(stateHash).toBeTruthy();

    const live = new SimKernel(config);
    live.inject("a", { kind: "session/request-link", at: 1 } as unknown as Event);
    live.inject("b", { kind: "session/handshake", at: 1.5 } as unknown as Event);
    live.inject("a", { kind: "session/handshake", at: 1.6 } as unknown as Event);
    live.inject("b", { kind: "session/link-proof", at: 2, rtt: 0.4 } as unknown as Event);
    live.inject("a", { kind: "session/link-proof", at: 2.1, rtt: 0.4 } as unknown as Event);
    expect((live.getNodeState("a") as LinkSessionState).status).toBe(LinkStatus.ACTIVE);
    expect((live.getNodeState("b") as LinkSessionState).established).toBe(true);
  });
});
