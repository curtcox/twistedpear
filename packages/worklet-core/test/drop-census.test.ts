import { describe, expect, it } from "vitest";
import { createDropCensus } from "../src/drop-census.mjs";

describe("createDropCensus", () => {
  it("starts empty", () => {
    expect(createDropCensus().snapshot()).toEqual({ byReason: {}, byPeer: {} });
  });

  it("counts drops by stage and reason", () => {
    const census = createDropCensus();
    census.record({ stage: "ingress", reason: "malformed" });
    census.record({ stage: "ingress", reason: "malformed" });
    census.record({ stage: "validate", reason: "signature" });

    expect(census.snapshot().byReason).toEqual({
      "ingress:malformed": 2,
      "validate:signature": 1,
    });
  });

  it("keeps a per-destination breakdown when a destination key is present", () => {
    const census = createDropCensus();
    census.record({
      stage: "ingress",
      reason: "malformed",
      destinationKey: "aa",
    });
    census.record({
      stage: "ingress",
      reason: "malformed",
      destinationKey: "aa",
    });
    census.record({
      stage: "ingress",
      reason: "expired",
      destinationKey: "bb",
    });

    expect(census.snapshot()).toEqual({
      byReason: { "ingress:malformed": 2, "ingress:expired": 1 },
      byPeer: {
        aa: { "ingress:malformed": 2 },
        bb: { "ingress:expired": 1 },
      },
    });
  });

  it("omits drops whose destination key is not a string from the peer breakdown", () => {
    const census = createDropCensus();
    census.record({ stage: "ingress", reason: "malformed", destinationKey: 7 });

    expect(census.snapshot()).toEqual({
      byReason: { "ingress:malformed": 1 },
      byPeer: {},
    });
  });

  it("returns a detached snapshot", () => {
    const census = createDropCensus();
    census.record({
      stage: "ingress",
      reason: "malformed",
      destinationKey: "aa",
    });
    const first = census.snapshot();
    census.record({
      stage: "ingress",
      reason: "malformed",
      destinationKey: "aa",
    });

    expect(first.byReason["ingress:malformed"]).toBe(1);
    expect(first.byPeer.aa["ingress:malformed"]).toBe(1);
  });
});
