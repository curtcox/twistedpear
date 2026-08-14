import { MemoryHistoryRecorder } from "../../effects/src/adapters/sim/recorder.js";
import { SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import type { TransportStats } from "../../effects/src/adapters/sim/transport.js";
import type { TransportClassName } from "../../effects/src/adapters/sim/transport-classes.js";
import {
  coverageFrame,
  createEscrowCampaignScenario,
  createRecoveryCampaignScenario,
  createSocialCampaignScenario,
  executedSpamEconomics,
  runCampaign,
  type QuorumAttack,
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const transports: readonly TransportClassName[] = [
  "lan",
  "internet",
  "ble",
  "lora",
  "freenet",
];
const attacks: readonly QuorumAttack[] = [
  "below-threshold",
  "drop",
  "duplicate",
  "replay",
  "delay",
  "partition",
  "expiry",
  "colluding-pair",
];
const [cell] = coverageFrame({
  capabilities: ["identity"],
  positions: ["colluding-pair"],
  verbs: ["spoof"],
});

function expectInFlightAttack(
  attack: Exclude<QuorumAttack, "below-threshold" | "replay" | "expiry">,
  stats: TransportStats,
  adversary: readonly { action: { power: string } }[],
  kernel: SimKernel<unknown>,
  create:
    typeof createEscrowCampaignScenario | typeof createRecoveryCampaignScenario,
): void {
  if (attack === "partition") expect(stats.partitioned).toBeGreaterThan(0);
  else if (attack === "drop") expect(stats.adversaryDropped).toBeGreaterThan(0);
  else if (attack === "duplicate")
    expect(stats.adversaryDuplicated).toBeGreaterThan(0);
  else if (attack === "delay")
    expect(stats.adversaryDelayed).toBeGreaterThan(0);
  else expect(stats.adversaryReordered).toBeGreaterThan(0);
  if (attack !== "partition")
    expect(adversary[0]?.action.power).toBe(
      attack === "colluding-pair" ? "reorder" : attack,
    );
  if (attack === "colluding-pair") {
    const target: any = kernel.getNodeState(
      create === createEscrowCampaignScenario ? "escrow" : "recovery",
    );
    const guardians: readonly string[] =
      target.role === "escrow"
        ? target.escrow.authorizers
        : target.recovery.shares;
    expect(
      guardians.every((guardian) => guardian.startsWith("colluder-")),
    ).toBe(true);
  }
}

describe("quorum and social campaigns", () => {
  it("runs unmodified escrow and recovery through every adversarial schedule and transport", async () => {
    for (const transport of transports)
      for (const attack of attacks) {
        for (const create of [
          createEscrowCampaignScenario,
          createRecoveryCampaignScenario,
        ]) {
          const report = await runCampaign({
            cells: [cell!],
            seeds: { from: 1, to: 1 },
            scenario: () => create({ transport, attack }),
          });
          expect(
            report.findings,
            `${create.name}:${transport}:${attack}`,
          ).toEqual([]);
        }
      }
  });

  it("records and shrinks deliberate below-quorum breaks in both machines", async () => {
    for (const create of [
      createEscrowCampaignScenario,
      createRecoveryCampaignScenario,
    ]) {
      const recorder = new MemoryHistoryRecorder<any>();
      const report = await runCampaign({
        cells: [cell!],
        seeds: { from: 7, to: 7 },
        scenario: () =>
          create({
            transport: "lan",
            attack: "below-threshold",
            brokenBelowQuorum: true,
            recorder,
          }),
      });
      expect(report.findings).toHaveLength(1);
      expect(recorder.histories.length).toBeGreaterThanOrEqual(2);
      const [full, minimized] = recorder.histories;
      expect(minimized!.trace.length).toBeLessThan(full!.trace.length);
    }
  });

  it("proves each named quorum schedule affects in-flight traffic", () => {
    for (const transport of transports)
      for (const create of [
        createEscrowCampaignScenario,
        createRecoveryCampaignScenario,
      ]) {
        for (const attack of [
          "drop",
          "duplicate",
          "delay",
          "partition",
          "colluding-pair",
        ] as const) {
          const scenario = create({ transport, attack });
          const kernel = new SimKernel(scenario.config);
          kernel.start();
          kernel.runUntilIdle(100_000);
          const adversary = kernel
            .getIntentLog()
            .filter((intent) => intent.kind === "transport/adversary");
          const stats = kernel.transport.getStats();
          expectInFlightAttack(attack, stats, adversary, kernel, create);
        }
        for (const attack of ["replay", "expiry"] as const) {
          const scenario = create({ transport, attack });
          const kernel = new SimKernel(scenario.config);
          kernel.start();
          kernel.runUntilIdle(100_000);
          const channels = kernel
            .getTrace()
            .filter(
              (entry: any) =>
                entry.t === "event" && entry.event.kind === "transport/recv",
            )
            .map((entry: any) => entry.event.channel as string);
          expect(
            attack === "replay"
              ? new Set(channels).size < channels.length
              : channels.some((channel) => channel.endsWith("ttl")),
          ).toBe(true);
        }
      }
  });

  it("runs spam, harassment, and reputation adversaries over every transport", async () => {
    for (const transport of transports)
      for (const kind of ["spam", "harassment", "reputation"] as const) {
        const report = await runCampaign({
          cells: [cell!],
          seeds: { from: 3, to: 3 },
          scenario: () => createSocialCampaignScenario(kind, transport),
        });
        expect(report.findings).toEqual([]);
        expect(report.coverage[0]?.protocolMachines).toEqual([
          `social-${kind}`,
        ]);
        expect(report.coverage[0]?.transport).toBe(transport);
        if (kind === "harassment") {
          expect(report.containment[0]?.egressAttributability).toBe(1);
          expect(report.containment[0]?.revocationPropagationMs).not.toBeNull();
          expect(report.containment[0]?.networkKillLatencyMs).not.toBeNull();
        }
      }
  });

  it("arrests harassment from executed block and sever events", () => {
    const run = (containment: boolean) => {
      const scenario = createSocialCampaignScenario("harassment", "lan", {
        containment,
      });
      const kernel = new SimKernel(scenario.config);
      kernel.start();
      kernel.runUntilIdle(1_000);
      return ["social-service", "social-peer-a", "social-peer-b"]
        .map((id) => kernel.getNodeState(id))
        .reduce((sum, state) => sum + state.delivered, 0);
    };
    expect(run(true)).toBeLessThan(run(false));
  });

  it("derives spam economics from executed sends, losses, airtime, and duty-cycle outcomes", () => {
    const run = (transport: TransportClassName) => {
      const scenario = createSocialCampaignScenario("spam", transport);
      const kernel = new SimKernel(scenario.config);
      kernel.start();
      kernel.runUntilIdle(1_000_000);
      return executedSpamEconomics(kernel, transport);
    };
    expect(run("lora").attackerCost).toBeGreaterThan(run("lan").attackerCost);
  });

  it("feeds colluding votes into a resilient ranking decision", () => {
    const scenario = createSocialCampaignScenario("reputation", "lan");
    const kernel = new SimKernel(scenario.config);
    kernel.start();
    kernel.runUntilIdle(1_000);
    expect(kernel.getNodeState("social-service").ranking[0]).toBe(
      "alternative",
    );
  });

  it("records, reruns, and shrinks defective social policies", async () => {
    for (const kind of ["spam", "harassment", "reputation"] as const) {
      const recorder = new MemoryHistoryRecorder<any>();
      const report = await runCampaign({
        cells: [cell!],
        seeds: { from: 4, to: 4 },
        scenario: () =>
          createSocialCampaignScenario(kind, "lan", {
            defectivePolicy: true,
            recorder,
          }),
      });
      expect(report.findings, kind).toHaveLength(1);
      expect(recorder.histories.length, kind).toBeGreaterThanOrEqual(2);
      const [full, minimized] = recorder.histories;
      expect(minimized!.violation?.oracle, kind).toBe(full!.violation?.oracle);
      expect(minimized!.trace.length, kind).toBeLessThan(full!.trace.length);
    }
  });
});
