import { describe, expect, it } from "vitest";
import { initialLinkQuality, updateLinkQuality } from "../src/index.js";

describe("link quality estimator", () => {
  it("starts from a low-confidence declared interface rate", () => {
    expect(initialLinkQuality({ kind: "declared", effectiveBps: 5_000, mtu: 500 })).toEqual({
      goodputBps: 5_000,
      rttMs: 0,
      jitterMs: 0,
      lossRatio: 0,
      mtu: 500,
      source: "declared",
      samples: 0,
      confidence: "low"
    });
  });

  it("normalizes delivered bytes and applies an EWMA", () => {
    const declared = initialLinkQuality({ kind: "declared", effectiveBps: 10_000, mtu: 1_000 });
    const observed = updateLinkQuality(declared, {
      kind: "observed",
      deliveredBytes: 1_000,
      durationMs: 1_000,
      rttMs: 100,
      jitterMs: 12,
      deliveredPackets: 9,
      lostPackets: 1,
      mtu: 900
    });
    expect(observed).toMatchObject({
      goodputBps: 9_500,
      rttMs: 100,
      jitterMs: 12,
      lossRatio: 0.1,
      source: "observed",
      samples: 1,
      confidence: "low"
    });
  });

  it("gives probes confidence faster without accepting invalid numbers", () => {
    let quality = initialLinkQuality({ kind: "declared", effectiveBps: Number.POSITIVE_INFINITY, mtu: 0 });
    for (let index = 0; index < 3; index += 1) {
      quality = updateLinkQuality(quality, {
        kind: "probed",
        deliveredBytes: 512,
        durationMs: 100,
        rttMs: 50,
        mtu: 256
      });
    }
    expect(quality.goodputBps).toBeGreaterThan(0);
    expect(quality.confidence).toBe("high");
    expect(quality.lossRatio).toBeGreaterThanOrEqual(0);
    expect(quality.lossRatio).toBeLessThanOrEqual(1);
  });
});
