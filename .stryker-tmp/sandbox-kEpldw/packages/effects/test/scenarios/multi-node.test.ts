// @ts-nocheck
import type { Event } from "../../src/types.js";
import { assertReplayDeterminism } from "../../src/adapters/sim/replay.js";
import { SimKernel } from "../../src/adapters/sim/kernel.js";
import { Xoshiro128StarStar } from "../../src/adapters/sim/entropy.js";
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
import {
  LINK_HANDSHAKE_KEY_SIZE,
  LinkHandshakePhase,
  initialLinkHandshakeState,
  stepLinkHandshake,
  type LinkHandshakeState
} from "../../../protocol/src/link-handshake.js";
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

  it("entropy-driven link handshake yields identical session keys", () => {
    const linkId = new Uint8Array([1, 2, 3, 4]);
    const config = {
      seed: 77,
      nodes: [
        {
          id: "a",
          initial: initialLinkHandshakeState({ role: "initiator", peerId: "b" }),
          step: stepLinkHandshake
        },
        {
          id: "b",
          initial: initialLinkHandshakeState({ role: "responder", peerId: "a" }),
          step: stepLinkHandshake
        }
      ]
    };

    const run = () => {
      const entropy = new Xoshiro128StarStar(77);
      const ea = entropy.randomBytes(LINK_HANDSHAKE_KEY_SIZE);
      const eb = entropy.randomBytes(LINK_HANDSHAKE_KEY_SIZE);
      const kernel = new SimKernel(config);
      kernel.inject("a", {
        kind: "handshake/begin",
        at: 0,
        entropy: ea,
        linkId
      } as unknown as Event);
      kernel.inject("b", {
        kind: "handshake/begin",
        at: 0,
        entropy: eb,
        linkId
      } as unknown as Event);
      const materialA = (kernel.getNodeState("a") as LinkHandshakeState).localMaterial!;
      const materialB = (kernel.getNodeState("b") as LinkHandshakeState).localMaterial!;
      kernel.inject("a", {
        kind: "handshake/peer-material",
        material: materialB,
        linkId
      } as unknown as Event);
      kernel.inject("b", {
        kind: "handshake/peer-material",
        material: materialA,
        linkId
      } as unknown as Event);
      const a = kernel.getNodeState("a") as LinkHandshakeState;
      const b = kernel.getNodeState("b") as LinkHandshakeState;
      return {
        phaseA: a.phase,
        phaseB: b.phase,
        key: a.sessionKey === null ? null : [...a.sessionKey],
        keyB: b.sessionKey === null ? null : [...b.sessionKey]
      };
    };

    const x = run();
    const y = run();
    expect(x).toEqual(y);
    expect(x.phaseA).toBe(LinkHandshakePhase.ESTABLISHED);
    expect(x.key).toEqual(x.keyB);
  });
});
