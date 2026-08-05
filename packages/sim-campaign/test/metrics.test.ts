import { ContainmentTracker, containmentRegressions, summarizeContainment } from "../src/metrics.js";
import { describe, expect, it } from "vitest";

describe("response containment metrics", () => {
  it("measures propagation, attribution, kill latency, and damage per transport", () => {
    const lora = new ContainmentTracker("lora");
    const revoke = lora.revoked(100, ["a", "b"]);
    lora.nodeStoppedUsingGrant(revoke, "a", 200);
    lora.nodeStoppedUsingGrant(revoke, "b", 350);
    lora.exfiltration({ appId: "app", grantId: "grant", peerId: "peer" });
    lora.exfiltration({ appId: "app" });
    const kill = lora.killRequested(400);
    lora.damage(kill, 3);
    lora.severed(kill, 900);

    expect(lora.snapshot()).toEqual({
      transport: "lora",
      revocationPropagationMs: 250,
      egressAttributability: 2 / 3,
      networkKillLatencyMs: 500,
      damageWindow: 3
    });
    expect(summarizeContainment([lora.snapshot()])).toMatchObject([{ transport: "lora", scenarios: 1 }]);
  });

  it("gates containment deltas against reviewed limits", () => {
    const actual = [{ transport: "lan" as const, scenarios: 1, revocationPropagationMs: 11,
      egressAttributability: 0.9, networkKillLatencyMs: 9, damageWindow: 0 }];
    expect(containmentRegressions(actual, [{ transport: "lan", revocationPropagationMsMax: 10,
      egressAttributabilityMin: 0.8, networkKillLatencyMsMax: 10 }])).toEqual([
      "lan: revocation propagation 11 exceeds 10"
    ]);
  });
});
