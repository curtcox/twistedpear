import type { Event, StepFn } from "../src/types.js";
import { SimKernel, OracleViolation } from "../src/adapters/sim/kernel.js";
import { MemoryHistoryRecorder } from "../src/adapters/sim/recorder.js";
import { rerunHistory, shrinkHistory } from "../src/adapters/sim/shrink.js";
import {
  grantCoverageOracle,
  idUniquenessOracle,
  revocationMonotonicityOracle,
  type Oracle,
} from "../src/adapters/sim/oracles.js";
import { describe, expect, it } from "vitest";

interface GrantOracleState {
  readonly stored: readonly string[];
  readonly live: readonly string[];
  readonly identities: readonly { id: string; fingerprint: string }[];
  readonly authorizations: readonly {
    id: string;
    revokedAt?: number;
    accessTimes: readonly number[];
  }[];
}

const good: GrantOracleState = {
  stored: ["blob-a"],
  live: ["blob-a"],
  identities: [{ id: "grant-a", fingerprint: "authority-a" }],
  authorizations: [{ id: "grant-a", accessTimes: [1] }],
};
const step: StepFn<GrantOracleState> = (state, event: Event) => {
  if (event.kind !== "transport/recv") return { state, intents: [] };
  if (event.channel === "break/coverage")
    return {
      state: { ...state, stored: [...state.stored, "blob-orphan"] },
      intents: [],
    };
  if (event.channel === "break/identity")
    return {
      state: {
        ...state,
        identities: [{ id: "grant-a", fingerprint: "authority-b" }],
      },
      intents: [],
    };
  if (event.channel === "break/revoke")
    return {
      state: {
        ...state,
        authorizations: [{ id: "grant-a", revokedAt: 10, accessTimes: [11] }],
      },
      intents: [],
    };
  return { state, intents: [] };
};

const coverage = grantCoverageOracle<GrantOracleState>((state) => ({
  storedBlobIds: state.stored,
  liveGrantBlobIds: state.live,
}));
const uniqueness = idUniquenessOracle<GrantOracleState>(
  (state) => state.identities,
);
const revocation = revocationMonotonicityOracle<GrantOracleState>(
  (state) => state.authorizations,
);

describe("foundational grant oracles on multi-node production projections", () => {
  it("accepts covered, unique, monotonic grant state", () => {
    const kernel = new SimKernel({
      seed: 1,
      nodes: [
        { id: "authority", machine: "grant-projection", initial: good, step },
        {
          id: "storage",
          machine: "grant-projection",
          initial: { ...good, identities: [] },
          step,
        },
      ],
      oracles: [coverage, uniqueness, revocation],
    });
    expect(() => kernel.inject("authority", recv("noise"))).not.toThrow();
  });

  for (const item of [
    { oracle: coverage, channel: "break/coverage", node: "storage" },
    { oracle: uniqueness, channel: "break/identity", node: "storage" },
    { oracle: revocation, channel: "break/revoke", node: "authority" },
  ] as const) {
    it(`records, replays, and shrinks a typed ${item.oracle.name} violation`, () => {
      const recorder = new MemoryHistoryRecorder<GrantOracleState>();
      const oracles: readonly Oracle<GrantOracleState>[] = [item.oracle];
      const config = {
        seed: 9,
        nodes: [
          { id: "authority", machine: "grant-projection", initial: good, step },
          {
            id: "storage",
            machine: "grant-projection",
            initial: { ...good, identities: [] },
            step,
          },
        ],
        oracles,
        recorder,
      };
      const kernel = new SimKernel(config);
      kernel.inject(item.node, recv("noise"));
      let violation: OracleViolation | undefined;
      try {
        kernel.inject(item.node, recv(item.channel));
      } catch (error) {
        if (error instanceof OracleViolation) violation = error;
        else throw error;
      }
      expect(violation).toBeInstanceOf(OracleViolation);
      expect(violation!.violation.oracle).toBe(item.oracle.name);
      const minimized = shrinkHistory(violation!.history as any, {
        resolveMachine: () => step,
        oracles,
      });
      expect(minimized.trace).toHaveLength(1);
      expect(
        rerunHistory(minimized, { resolveMachine: () => step, oracles })
          .violation.violation.oracle,
      ).toBe(item.oracle.name);
      expect(recorder.histories[0]?.violation?.oracle).toBe(item.oracle.name);
    });
  }
});

function recv(channel: string): Event {
  return {
    kind: "transport/recv",
    channel,
    source: "test",
    payload: new Uint8Array(),
    at: 1,
  };
}
