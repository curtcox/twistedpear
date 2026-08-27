import { describe, expect, it } from "vitest";
import {
  authoredConfig,
  compileAttackProposal,
  executeAuthoredStrategies,
  type AttackPower,
  type AttackProposal,
} from "../src/index.js";
import type { AuthoredExecutionState } from "../src/authored-execution.js";

const TRANSPORT_POWERS: readonly AttackPower[] = [
  "drop",
  "delay",
  "reorder",
  "duplicate",
  "inject",
];

const compile = (
  proposal: AttackProposal,
  powers: readonly AttackPower[] = TRANSPORT_POWERS,
) => compileAttackProposal(proposal, powers);

/** The fixture shape the sim-author replay gate pins: two duplicates a -> b. */
const duplicateProposal: AttackProposal = {
  name: "DuplicateAction",
  actions: [
    { power: "duplicate", source: "a", destination: "b" },
    { power: "duplicate", source: "a", destination: "b" },
  ],
};

describe("authoredConfig", () => {
  it("names one node per endpoint plus the model adversary", () => {
    const config = authoredConfig(compile(duplicateProposal), 44);

    expect(config.nodes.map((node) => node.id)).toEqual([
      "a",
      "b",
      "model-adversary",
    ]);
    expect(config.seed).toBe(44);
  });

  it("sorts and de-duplicates endpoints drawn from both ends of each action", () => {
    const config = authoredConfig(
      compile({
        name: "Fan",
        actions: [
          { power: "delay", source: "z", destination: "m" },
          { power: "drop", source: "m", destination: "a" },
        ],
      }),
      1,
    );

    expect(config.nodes.slice(0, -1).map((node) => node.id)).toEqual([
      "a",
      "m",
      "z",
    ]);
  });

  it("carries the strategy's initial state onto the adversary node only", () => {
    const config = authoredConfig(compile(duplicateProposal), 44);
    const adversary = config.nodes.at(-1);
    const endpoint = config.nodes[0];

    expect(adversary?.initial.role).toBe("adversary");
    expect(adversary?.initial.adversary).toBeDefined();
    expect(endpoint?.initial.role).toBe("endpoint");
    expect(endpoint?.initial.adversary).toBeUndefined();
    expect(endpoint?.initial.duplicateAccepted).toBe(false);
  });

  it("merges repeated source/destination pairs into one link holding both powers", () => {
    const config = authoredConfig(
      compile({
        name: "Merged",
        actions: [
          { power: "duplicate", source: "a", destination: "b" },
          { power: "delay", source: "a", destination: "b" },
        ],
      }),
      7,
    );

    expect(config.links).toHaveLength(1);
    expect([...config.links[0].powers].sort()).toEqual(["delay", "duplicate"]);
    expect(config.links[0].adversary).toBe("model-adversary");
  });

  it("gives author-flood actions no transport link, but still an endpoint", () => {
    const config = authoredConfig(
      compile(
        {
          name: "Flood",
          actions: [{ power: "author-flood", source: "a", destination: "b" }],
        },
        ["author-flood"],
      ),
      3,
    );

    expect(config.links).toEqual([]);
    expect(config.nodes.map((node) => node.id)).toEqual([
      "a",
      "b",
      "model-adversary",
    ]);
  });

  it("reports the duplicate-delivery oracle only once a node accepts a duplicate", () => {
    const [oracle] = authoredConfig(compile(duplicateProposal), 44).oracles;
    const state = (duplicateAccepted: boolean): AuthoredExecutionState => ({
      role: "endpoint",
      seen: [],
      duplicateAccepted,
    });

    expect(
      oracle.check({ nodes: new Map([["a", state(false)]]) as never } as never),
    ).toBeNull();
    expect(
      oracle.check({ nodes: new Map([["a", state(true)]]) as never } as never),
    ).toMatchObject({ oracle: "model-authored-duplicate-delivery" });
  });
});

describe("executeAuthoredStrategies", () => {
  it("records and shrinks a finding when the strategy duplicates delivery", () => {
    const [result] = executeAuthoredStrategies([compile(duplicateProposal)]);

    expect(result.proposal.name).toBe("DuplicateAction");
    expect(result.finding).not.toBeNull();
    expect(result.minimized).not.toBeNull();
  });

  it("reports no finding for a strategy that only drops", () => {
    const [result] = executeAuthoredStrategies([
      compile({
        name: "DropOnly",
        actions: [{ power: "drop", source: "a", destination: "b" }],
      }),
    ]);

    expect(result.finding).toBeNull();
    expect(result.minimized).toBeNull();
  });

  it("returns one result per strategy, in order", () => {
    const results = executeAuthoredStrategies([
      compile({
        name: "First",
        actions: [{ power: "drop", source: "a", destination: "b" }],
      }),
      compile(duplicateProposal),
    ]);

    expect(results.map((result) => result.proposal.name)).toEqual([
      "First",
      "DuplicateAction",
    ]);
  });

  it("accepts an empty strategy list", () => {
    expect(executeAuthoredStrategies([])).toEqual([]);
  });
});
