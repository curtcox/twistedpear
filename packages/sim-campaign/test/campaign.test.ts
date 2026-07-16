import type { Event, Intent } from "../../effects/src/types.js";
import type { Oracle } from "../../effects/src/adapters/sim/oracles.js";
import { CAPABILITY_DEFINITIONS } from "../../miniapp-runtime/src/capabilities.js";
import {
  CAPABILITIES,
  coverageFrame,
  runCampaign,
  serializeCampaignReport
} from "../src/index.js";
import { describe, expect, it } from "vitest";

interface State { readonly bad: boolean }

function step(state: State, event: Event): { state: State; intents: Intent[] } {
  return event.kind === "start" ? { state: { bad: true }, intents: [] } : { state, intents: [] };
}

const canary: Oracle<State> = {
  name: "campaign-canary",
  check: (world) => [...world.nodes.values()].some((state) => state.bad)
    ? { oracle: "campaign-canary", message: "expected canary" }
    : null
};

describe("coverage campaigns", () => {
  it("derives the vocabulary from production capability definitions", () => {
    expect(CAPABILITIES).toEqual(CAPABILITY_DEFINITIONS.map(({ id }) => id));
    expect(coverageFrame()).toHaveLength(CAPABILITIES.length * 5 * 5);
  });

  it("is byte-identical for a seed range and reports saturation", async () => {
    const cells = coverageFrame({
      capabilities: ["identity"],
      positions: ["malicious-app"],
      verbs: ["spoof"]
    });
    const execute = () => runCampaign({
      cells,
      seeds: { from: 1, to: 3 },
      parallelism: 2,
      scenario: (_cell, seed) => ({
        config: {
          seed,
          nodes: [{ id: "host", initial: { bad: false }, step }],
          oracles: [canary]
        }
      })
    });
    const a = await execute();
    const b = await execute();
    expect(serializeCampaignReport(a)).toBe(serializeCampaignReport(b));
    expect(a.scenariosRun).toBe(3);
    expect(a.findings).toHaveLength(3);
    expect(a.saturation.at(-1)).toEqual({ scenarios: 3, distinctFindings: 1, newFindings: 1 });
  });
});
