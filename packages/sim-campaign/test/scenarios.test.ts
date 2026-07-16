import {
  containmentRegressions,
  coverageFrame,
  createProductionScenarioRegistry,
  runCampaign
} from "../src/index.js";
import { describe, expect, it } from "vitest";
import { SimKernel, MemoryHistoryRecorder } from "@twistedpear/effects/adapters/sim";

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
      new Set(["grant-host", "link-handshake", "miniapp-host/identity.sign"])
    );
    expect(new Set(report.coverage.flatMap((entry) => entry.adversaryPowers))).toEqual(
      new Set(["inject", "duplicate", "delay", "reorder", "drop"])
    );
    expect(report.findings).toEqual([]);
  });

  it("recaptures a behavior defect on every execution of its abuse path", async () => {
    const [cell] = coverageFrame({
      capabilities: ["identity"],
      positions: ["malicious-app"],
      verbs: ["exfiltrate"]
    });
    expect(cell).toBeDefined();
    const registry = createProductionScenarioRegistry({
      cells: [cell!],
      defectIds: new Set(["identity|malicious-app|exfiltrate"])
    });
    const report = await runCampaign({
      cells: [cell!],
      seeds: { from: 1, to: 5 },
      scenario: registry.create
    });
    expect(report.canaryFindings.map((finding) => finding.seed)).toEqual([1, 2, 3, 4, 5]);
    expect(report.findings).toEqual([]);
    const repaired = createProductionScenarioRegistry({ cells: [cell!] });
    const repairedReport = await runCampaign({ cells: [cell!], seeds: { from: 1, to: 5 }, scenario: repaired.create });
    expect(repairedReport.canaryFindings).toEqual([]);
  });

  it("mutating any coverage axis changes executable semantics and position powers", async () => {
    const variants = coverageFrame({ capabilities: ["identity", "storage:kv"],
      positions: ["malicious-app", "malicious-relay"], verbs: ["exfiltrate", "deny"] });
    const registry = createProductionScenarioRegistry({ cells: variants });
    const report = await runCampaign({ cells: variants, seeds: { from: 1, to: 1 }, scenario: registry.create });
    expect(new Set(report.coverage.map((entry) => entry.name)).size).toBe(variants.length);
    const app = report.coverage.find((entry) => entry.cell.includes("malicious-app"));
    const relay = report.coverage.find((entry) => entry.cell.includes("malicious-relay"));
    expect(app?.adversaryPowers).toEqual(["inject"]);
    expect(app?.adversaryPowers).not.toContain("drop");
    expect(app?.adversaryPowers).not.toContain("delay");
    expect(relay?.adversaryPowers).toContain("delay");

    const states = variants.map((variant) => {
      const scenario = registry.create(variant, 1);
      const kernel = new SimKernel(scenario.config);
      kernel.start(); kernel.runUntilIdle(20_000);
      return kernel.getNodeState("service") as any;
    });
    expect(new Set(states.map((state) => state.productionPath)).size).toBe(2);
    expect(new Set(states.map((state) => JSON.stringify(state.effects))).size).toBeGreaterThan(2);
  });

  it("records, reruns, and shrinks deliberate production projection breaks", async () => {
    const [identity] = coverageFrame({ capabilities: ["identity"], positions: ["malicious-app"], verbs: ["spoof"] });
    for (const oracleBreak of ["grant-coverage", "id-uniqueness", "revocation-monotonicity"] as const) {
      const recorder = new MemoryHistoryRecorder<any>();
      const registry = createProductionScenarioRegistry({ cells: [identity!], recorder, oracleBreak });
      const report = await runCampaign({ cells: [identity!], seeds: { from: 9, to: 9 }, scenario: registry.create });
      expect(report.findings[0]?.violation.oracle).toBe(oracleBreak);
      expect(recorder.histories.length).toBeGreaterThanOrEqual(2);
      expect(recorder.histories.at(-1)?.violation?.oracle).toBe(oracleBreak);
    }
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
