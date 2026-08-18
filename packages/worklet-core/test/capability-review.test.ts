import { describe, expect, it } from "vitest";
import {
  orderCapabilitiesForReview,
  presentCapabilityReview,
  riskClassForCapabilityId,
} from "../src/capability-review.mjs";

describe("capability review presentation", () => {
  it("orders high risk before benign and states the app tier", () => {
    const presented = presentCapabilityReview([
      {
        id: "storage:kv",
        riskClass: riskClassForCapabilityId("storage:kv"),
      },
      {
        id: "relay:configure",
        riskClass: riskClassForCapabilityId("relay:configure"),
      },
      {
        id: "lxmf:send",
        riskClass: riskClassForCapabilityId("lxmf:send"),
      },
      {
        id: "presence",
        riskClass: riskClassForCapabilityId("presence"),
      },
    ]);

    expect(presented.capabilities.map((entry) => entry.id)).toEqual([
      "relay:configure",
      "lxmf:send",
      "presence",
      "storage:kv",
    ]);
    expect(presented.riskTier).toBe("critical");
    expect(presented.restricted.map((entry) => entry.id)).toEqual([
      "relay:configure",
      "lxmf:send",
    ]);
    expect(presented.benign.map((entry) => entry.id)).toEqual([
      "presence",
      "storage:kv",
    ]);
  });

  it("keeps a benign-only review at the benign tier", () => {
    const presented = presentCapabilityReview([
      { id: "storage:kv", riskClass: "benign" },
      { id: "presence", riskClass: "benign" },
    ]);
    expect(presented.riskTier).toBe("benign");
    expect(presented.restricted).toEqual([]);
    expect(
      orderCapabilitiesForReview(presented.capabilities).map((e) => e.id),
    ).toEqual(["presence", "storage:kv"]);
  });
});
