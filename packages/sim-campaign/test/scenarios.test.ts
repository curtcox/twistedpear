import {
  containmentRegressions,
  coverageFrame,
  createProductionScenarioRegistry,
  runCampaign
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const cells = coverageFrame({ capabilities: ["identity"] });

describe("production abuse scenario registry", () => {
  it("documents and executes every scheduled position and abuse class", async () => {
    const registry = createProductionScenarioRegistry({ cells });
    const report = await runCampaign({
      cells,
      seeds: { from: 1, to: 1 },
      scenario: registry.create,
      parallelism: 5
    });
    expect(registry.supportedCells).toHaveLength(25);
    expect(report.coverage).toHaveLength(25);
    expect(new Set(report.coverage.flatMap((entry) => entry.protocolMachines))).toEqual(
      new Set(["grant-host", "link-handshake"])
    );
    expect(new Set(report.coverage.flatMap((entry) => entry.adversaryPowers))).toEqual(
      new Set(["inject", "duplicate", "delay", "reorder", "drop"])
    );
    expect(report.findings).toEqual([]);
  });

  it("recaptures a canary only when the seeded attack path is explored", async () => {
    const [cell] = coverageFrame({
      capabilities: ["identity"],
      positions: ["malicious-app"],
      verbs: ["exfiltrate"]
    });
    expect(cell).toBeDefined();
    const registry = createProductionScenarioRegistry({
      cells: [cell!],
      canaryIds: new Set(["identity|malicious-app|exfiltrate"])
    });
    const report = await runCampaign({
      cells: [cell!],
      seeds: { from: 1, to: 5 },
      scenario: registry.create
    });
    expect(report.canaryFindings.map((finding) => finding.seed)).toEqual([1, 2, 3, 4]);
    expect(report.findings).toEqual([]);
  });

  it("measures transport-driven containment and rejects deliberate slowdowns", async () => {
    const [cell] = coverageFrame({
      capabilities: ["identity"],
      positions: ["malicious-app"],
      verbs: ["spoof"]
    });
    expect(cell).toBeDefined();
    const run = async (latencyMultiplier: number) => {
      const registry = createProductionScenarioRegistry({ cells: [cell!], latencyMultiplier });
      return runCampaign({ cells: [cell!], seeds: { from: 1, to: 4 }, scenario: registry.create });
    };
    const normal = await run(1);
    const slow = await run(4);
    const baseline = normal.containment.map((entry) => ({
      transport: entry.transport,
      revocationPropagationMsMax: entry.revocationPropagationMs!,
      egressAttributabilityMin: entry.egressAttributability!,
      networkKillLatencyMsMax: entry.networkKillLatencyMs!
    }));
    expect(containmentRegressions(normal.containment, baseline)).toEqual([]);
    expect(containmentRegressions(slow.containment, baseline)).not.toEqual([]);
  });
});
