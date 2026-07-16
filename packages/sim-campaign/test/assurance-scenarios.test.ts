import { MemoryHistoryRecorder } from "../../effects/src/adapters/sim/recorder.js";
import { SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import type { TransportClassName } from "../../effects/src/adapters/sim/transport-classes.js";
import {
  coverageFrame,
  createEscrowCampaignScenario,
  createRecoveryCampaignScenario,
  createSocialCampaignScenario,
  runCampaign,
  type QuorumAttack
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const transports: readonly TransportClassName[] = ["lan", "internet", "ble", "lora"];
const attacks: readonly QuorumAttack[] = ["below-threshold", "duplicate", "replay", "delay", "partition", "expiry", "colluding-pair"];
const [cell] = coverageFrame({ capabilities: ["identity"], positions: ["colluding-pair"], verbs: ["spoof"] });

describe("quorum and social campaigns", () => {
  it("runs unmodified escrow and recovery through every adversarial schedule and transport", async () => {
    for (const transport of transports) for (const attack of attacks) {
      for (const create of [createEscrowCampaignScenario, createRecoveryCampaignScenario]) {
        const report = await runCampaign({ cells: [cell!], seeds: { from: 1, to: 1 },
          scenario: () => create({ transport, attack }) });
        expect(report.findings, `${create.name}:${transport}:${attack}`).toEqual([]);
      }
    }
  });

  it("records and shrinks deliberate below-quorum breaks in both machines", async () => {
    for (const create of [createEscrowCampaignScenario, createRecoveryCampaignScenario]) {
      const recorder = new MemoryHistoryRecorder<any>();
      const report = await runCampaign({ cells: [cell!], seeds: { from: 7, to: 7 }, scenario: () =>
        create({ transport: "lan", attack: "below-threshold", brokenBelowQuorum: true, recorder }) });
      expect(report.findings).toHaveLength(1);
      expect(recorder.histories.length).toBeGreaterThanOrEqual(2);
      const [full, minimized] = recorder.histories;
      expect(minimized!.trace.length).toBeLessThan(full!.trace.length);
    }
  });

  it("runs spam, harassment, and reputation adversaries over every transport", async () => {
    for (const transport of transports) for (const kind of ["spam", "harassment", "reputation"] as const) {
      const report = await runCampaign({ cells: [cell!], seeds: { from: 3, to: 3 },
        scenario: () => createSocialCampaignScenario(kind, transport) });
      expect(report.findings).toEqual([]);
      expect(report.coverage[0]?.protocolMachines).toEqual([`social-${kind}`]);
      expect(report.coverage[0]?.transport).toBe(transport);
    }
  });

  it("arrests harassment from executed block and sever events", () => {
    const run = (containment: boolean) => {
      const scenario = createSocialCampaignScenario("harassment", "lan", { containment });
      const kernel = new SimKernel(scenario.config);
      kernel.start(); kernel.runUntilIdle(1_000);
      return kernel.getNodeState("social-service");
    };
    expect(run(true).delivered).toBeLessThan(run(false).delivered);
    expect(run(true).blocked).toBe(true);
    expect(run(true).severed).toBe(true);
  });
});
