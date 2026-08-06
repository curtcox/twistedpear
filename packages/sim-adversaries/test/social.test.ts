import {
  propagateHarassment,
  reputationUnderCollusion,
  spamEconomics,
} from "../src/social.js";
import { describe, expect, it } from "vitest";

describe("social and economic adversaries", () => {
  it("makes LoRa spam materially more expensive than LAN spam", () => {
    const options = {
      payloadBytes: 200,
      messages: 100,
      payoffPerDelivery: 0.001,
    };
    const lan = spamEconomics({ ...options, transport: "lan" });
    const lora = spamEconomics({ ...options, transport: "lora" });
    expect(lora.attackerCost).toBeGreaterThan(lan.attackerCost * 1_000);
    expect(lora.profitable).toBe(false);
  });

  it("measures how severing arrests harassment propagation", () => {
    const graph = { a: ["b", "c"], b: ["d"], c: ["e"], d: [], e: [] };
    expect(
      propagateHarassment({
        graph,
        origin: "a",
        blocked: new Set(),
        severAtHop: 1,
      }),
    ).toEqual({
      reached: ["a"],
      arrestedAtHop: 1,
    });
  });

  it("discounts a coordinated reputation ring", () => {
    const votes = [
      { from: "c1", to: "target", value: 1 as const },
      { from: "c2", to: "target", value: 1 as const },
      { from: "honest", to: "target", value: -1 as const },
    ];
    expect(
      reputationUnderCollusion(votes, new Set(["c1", "c2"])).target,
    ).toBeCloseTo(-0.8);
  });
});
