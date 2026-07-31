import { describe, expect, it } from "vitest";
import { SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import { MemoryHistoryRecorder } from "../../effects/src/adapters/sim/recorder.js";
import type { TransportClassName } from "../../effects/src/adapters/sim/transport-classes.js";
import {
  coverageFrame,
  createMediaLadderScenario,
  mediaLadderHistory,
  runCampaign,
  type MediaLadderState,
  type MediaLinkProfile
} from "../src/index.js";

const profiles: readonly MediaLinkProfile[] = ["collapse-recover", "asymmetric", "bufferbloat", "flapping"];
const transports: readonly TransportClassName[] = ["lan", "internet", "ble", "lora"];
const [cell] = coverageFrame({ capabilities: ["device:stream"], positions: ["malicious-peer"], verbs: ["deny"] });

function runHistory(profile: MediaLinkProfile, transport: TransportClassName = "internet") {
  const scenario = createMediaLadderScenario({ transport, profile });
  const kernel = new SimKernel(scenario.config);
  kernel.start();
  kernel.runUntilIdle(1_000_000);
  return mediaLadderHistory(kernel.getNodeState("caller"));
}

describe("media ladder campaign", () => {
  it("holds ladder safety across every adversarial link profile and transport", async () => {
    for (const transport of transports) {
      for (const profile of profiles) {
        const report = await runCampaign({
          cells: [cell!],
          seeds: { from: 1, to: 1 },
          scenario: () => createMediaLadderScenario({ transport, profile })
        });
        expect(report.findings, `${transport}:${profile}`).toEqual([]);
      }
    }
  });

  it("collapses to a lower rung and climbs back when the link recovers", () => {
    const history = runHistory("collapse-recover");
    expect(history.length).toBeGreaterThan(30);
    const start = history[0]!;
    const worst = history.reduce((left, right) => (right.rungIndex > left.rungIndex ? right : left));
    const end = history[history.length - 1]!;
    expect(worst.rungIndex).toBeGreaterThan(start.rungIndex);
    // Recovery is liveness: after the link comes back the call must climb, not
    // stay pinned at the rung the collapse pushed it to.
    expect(end.rungIndex).toBeLessThan(worst.rungIndex);
  });

  it("settles instead of hunting on a permanently thin link", () => {
    const history = runHistory("asymmetric");
    const tail = history.slice(-8);
    expect(new Set(tail.map((sample) => sample.rungIndex)).size).toBe(1);
  });

  it("never upshifts inside the hysteresis window while the link flaps", () => {
    const history = runHistory("flapping");
    let upshifts = 0;
    for (let index = 1; index < history.length; index += 1) {
      if (history[index]!.rungIndex < history[index - 1]!.rungIndex) upshifts += 1;
    }
    // Four alternating good samples never accumulate, so no upshift is earned.
    expect(upshifts).toBe(0);
  });

  it("degrades under a growing queue even while nominal goodput holds", () => {
    const history = runHistory("bufferbloat");
    expect(history[history.length - 1]!.rungIndex).toBeGreaterThan(history[0]!.rungIndex);
  });

  it("records and shrinks a deliberate two-rung jump", async () => {
    const recorder = new MemoryHistoryRecorder<MediaLadderState>();
    const report = await runCampaign({
      cells: [cell!],
      seeds: { from: 3, to: 3 },
      scenario: () =>
        createMediaLadderScenario({ transport: "lan", profile: "collapse-recover", brokenLadderStep: true, recorder })
    });
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]!.violation.message).toMatch(/in one step/);
    const [full, minimized] = recorder.histories;
    expect(minimized!.trace.length).toBeLessThan(full!.trace.length);
  });
});
