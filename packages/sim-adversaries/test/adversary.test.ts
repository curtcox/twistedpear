import type { Event, Intent, StepFn } from "../../effects/src/types.js";
import { doubleRunHashes, SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import { UnauthorizedAdversaryPowerError } from "../../effects/src/adapters/sim/transport.js";
import { rerunHistory } from "../../effects/src/adapters/sim/shrink.js";
import { parseHistory, type RecordedHistory } from "../../effects/src/adapters/sim/recorder.js";
import duplicateFixture from "../../../conformance/sim-regressions/llm-duplicate-delivery.json";
import {
  decodeGrantRecord,
  encodeGrantRecord,
  InvalidGrantRecordError,
  type GrantRecord
} from "../../protocol/src/grants.js";
import {
  compileAttackProposal,
  authorAttackStrategies,
  createFuzzAdversary,
  grantRecordMutationCorpus,
  HISTORICAL_REPLAY_FIXTURES,
  UnlowerableAttackProposalError,
  type AdversaryState
} from "../src/index.js";
import { describe, expect, it } from "vitest";

interface State extends AdversaryState { readonly received: number }
const initial: State = { acted: false, entropyRequested: false, received: 0 };

const sender: StepFn<State> = (state, event) => event.kind === "start"
  ? { state, intents: [{ kind: "transport/send", send: { channel: "x", destination: "b", payload: new Uint8Array([1]) } }] }
  : { state, intents: [] };
const receiver: StepFn<State> = (state, event) => event.kind === "transport/recv"
  ? { state: { ...state, received: state.received + 1 }, intents: [] }
  : { state, intents: [] };
const duplicateOracle = {
  name: "duplicate-delivery",
  check: (world: import("../../effects/src/adapters/sim/oracles.js").WorldView<State>) =>
    [...world.nodes].some(([, state]) => state.received > 1)
      ? { oracle: "duplicate-delivery", message: "receiver accepted duplicate delivery" }
      : null
};

function widen(step: StepFn<AdversaryState>): StepFn<State> {
  return (state, event) => {
    const result = step(state, event);
    return { state: { ...state, ...result.state }, intents: result.intents as Intent[] };
  };
}

const cleanLink = {
  source: "a",
  destination: "b",
  class: "lan" as const,
  adversary: "z",
  powers: ["drop", "delay", "reorder", "duplicate", "inject"] as const,
  params: {
    lossRate: 0,
    latency: { kind: "fixed" as const, ms: 1 },
    burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 }
  }
};

describe("Dolev-Yao adversaries", () => {
  it("mediates an LLM-authored strategy as ordinary node intents", () => {
    const compiled = compileAttackProposal({
      name: "duplicate victim traffic",
      actions: [{ power: "duplicate", source: "a", destination: "b" }]
    }, ["duplicate"]);
    const config = {
      seed: 4,
      nodes: [
        { id: "a", initial, step: sender },
        { id: "b", initial, step: receiver },
        { id: "z", initial, step: widen(compiled.step) }
      ],
      links: [cleanLink]
    };
    const kernel = new SimKernel(config);
    kernel.start();
    kernel.runUntilIdle(100);
    expect(kernel.getNodeState("b").received).toBe(2);
    expect(doubleRunHashes(config).a).toBe(doubleRunHashes(config).b);
  });

  it("rejects powers outside the modeled position", () => {
    expect(() => compileAttackProposal({
      name: "magic injection",
      actions: [{ power: "inject", source: "a", destination: "b", channel: "x", payload: new Uint8Array() }]
    }, ["drop"])).toThrow(UnlowerableAttackProposalError);

    const kernel = new SimKernel({
      seed: 1,
      nodes: [{ id: "rogue", initial, step: (state: State, event: Event) => event.kind === "start"
        ? { state, intents: [{ kind: "transport/adversary", action: { power: "drop", source: "a", destination: "b" } }] }
        : { state, intents: [] } }],
      links: [cleanLink]
    });
    expect(() => kernel.start()).toThrow(UnauthorizedAdversaryPowerError);
  });

  it("makes fuzz choices from replayable kernel entropy", () => {
    const fuzz = createFuzzAdversary({
      source: "a",
      destination: "b",
      channel: "fuzz",
      payloads: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])]
    });
    const config = {
      seed: 99,
      nodes: [
        { id: "b", initial, step: receiver },
        { id: "z", initial, step: widen(fuzz.step) }
      ],
      links: [cleanLink]
    };
    expect(doubleRunHashes(config).a).toBe(doubleRunHashes(config).b);
  });

  it("provides deterministic grant-boundary mutations to the fuzz tier", () => {
    const record: GrantRecord = {
      appId: "a",
      publisherPublicKey: "p",
      granted: [],
      updatedAt: 1
    };
    const canonical = encodeGrantRecord(record);
    const first = grantRecordMutationCorpus(canonical);
    const second = grantRecordMutationCorpus(canonical);
    expect(first.length).toBeGreaterThanOrEqual(5);
    expect(first.map((entry) => Array.from(entry))).toEqual(second.map((entry) => Array.from(entry)));
    expect(first.every((entry) => entry.some((byte, index) => byte !== canonical[index]) || entry.length !== canonical.length)).toBe(true);
    for (const mutation of first) {
      expect(() => decodeGrantRecord(mutation)).toThrow(InvalidGrantRecordError);
    }
    const decoded = decodeGrantRecord(canonical);
    expect(decoded).toEqual(record);
    expect(encodeGrantRecord(decoded)).toEqual(canonical);
  });

  it("classifies every hostile-app fixture as lifted or out of model", () => {
    expect(HISTORICAL_REPLAY_FIXTURES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(HISTORICAL_REPLAY_FIXTURES.map((fixture) => fixture.source)).size).toBeGreaterThanOrEqual(5);
    for (const fixture of HISTORICAL_REPLAY_FIXTURES) {
      expect(fixture.expressible ? fixture.proposal : fixture.reason).toBeTruthy();
      if (fixture.proposal !== undefined) expect(() => compileAttackProposal(
        fixture.proposal, ["drop", "delay", "reorder", "duplicate", "inject"]
      )).not.toThrow();
    }
  });

  it("puts a model in the authoring loop but compiles only in-model output", async () => {
    let calls = 0;
    const result = await authorAttackStrategies(async (prompt) => {
      calls += 1;
      expect(prompt).toContain("allowedPowers");
      return JSON.stringify([
        { name: "duplicate", actions: [{ power: "duplicate", source: "a", destination: "b" }] },
        { name: "forbidden", actions: [{ power: "inject", source: "a", destination: "b", channel: "x", payloadHex: "00" }] }
      ]);
    }, { objective: "find replay bugs", allowedPowers: ["duplicate"], nodes: ["a", "b"], channels: ["x"] });
    expect(calls).toBe(1);
    expect(result.accepted.map((entry) => entry.proposal.name)).toEqual(["duplicate"]);
    expect(result.rejected).toHaveLength(1);
  });

  it("replays the model-authored finding without a model", () => {
    const history = parseHistory<State>(JSON.stringify(duplicateFixture)) as RecordedHistory<State>;
    const replay = rerunHistory(history, {
      resolveMachine: () => receiver,
      oracles: [duplicateOracle]
    });
    expect(replay.violation.violation.oracle).toBe("duplicate-delivery");
  });
});
