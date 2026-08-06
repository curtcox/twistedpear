import { describe, expect, it } from "vitest";
import {
  initialLinkQuality,
  linkQualityFromRoute,
  observeLinkDelivery,
  openLinkObservation,
  updateLinkQuality,
} from "../src/index.js";

const DECLARED = { kind: "declared", effectiveBps: 64_000, mtu: 500 } as const;

describe("link quality estimator", () => {
  it("starts from a low-confidence declared interface rate", () => {
    expect(
      initialLinkQuality({ kind: "declared", effectiveBps: 5_000, mtu: 500 }),
    ).toEqual({
      goodputBps: 5_000,
      rttMs: 0,
      jitterMs: 0,
      lossRatio: 0,
      mtu: 500,
      source: "declared",
      samples: 0,
      confidence: "low",
    });
  });

  it("replaces a declared nameplate with the first real measurement", () => {
    const declared = initialLinkQuality({
      kind: "declared",
      effectiveBps: 10_000,
      mtu: 1_000,
    });
    const observed = updateLinkQuality(declared, {
      kind: "observed",
      deliveredBytes: 1_000,
      durationMs: 1_000,
      rttMs: 100,
      jitterMs: 12,
      deliveredPackets: 9,
      lostPackets: 1,
      mtu: 900,
    });
    expect(observed).toMatchObject({
      goodputBps: 8_000,
      rttMs: 100,
      jitterMs: 12,
      lossRatio: 0.1,
      source: "observed",
      samples: 1,
      confidence: "low",
    });
  });

  it("applies an EWMA once there is a measured prior", () => {
    const declared = initialLinkQuality({
      kind: "declared",
      effectiveBps: 10_000,
      mtu: 1_000,
    });
    const sample = {
      kind: "observed",
      durationMs: 1_000,
      rttMs: 100,
      mtu: 900,
    } as const;
    const first = updateLinkQuality(declared, {
      ...sample,
      deliveredBytes: 1_000,
    });
    const second = updateLinkQuality(first, {
      ...sample,
      deliveredBytes: 2_000,
    });
    // 8_000 + 0.25 × (16_000 − 8_000)
    expect(second.goodputBps).toBe(10_000);
    expect(second.samples).toBe(2);
  });

  it("gives probes confidence faster without accepting invalid numbers", () => {
    let quality = initialLinkQuality({
      kind: "declared",
      effectiveBps: Number.POSITIVE_INFINITY,
      mtu: 0,
    });
    for (let index = 0; index < 3; index += 1) {
      quality = updateLinkQuality(quality, {
        kind: "probed",
        deliveredBytes: 512,
        durationMs: 100,
        rttMs: 50,
        mtu: 256,
      });
    }
    expect(quality.goodputBps).toBeGreaterThan(0);
    expect(quality.confidence).toBe("high");
    expect(quality.lossRatio).toBeGreaterThanOrEqual(0);
    expect(quality.lossRatio).toBeLessThanOrEqual(1);
  });
});

describe("route telemetry mapping", () => {
  it("treats an unqualified transport number as declared, not measured", () => {
    expect(
      linkQualityFromRoute(DECLARED, {
        goodputBps: 2_000_000,
        rttMs: 12,
        mtu: 1_200,
      }),
    ).toEqual({
      goodputBps: 2_000_000,
      rttMs: 12,
      jitterMs: 0,
      lossRatio: 0,
      mtu: 1_200,
      source: "declared",
      samples: 0,
      confidence: "low",
    });
  });

  it("keeps a transport's own source and confidence when it reports one", () => {
    expect(
      linkQualityFromRoute(DECLARED, {
        goodputBps: 41_000,
        rttMs: 90,
        mtu: 500,
        jitterMs: 4,
        lossRatio: 0.02,
        source: "observed",
        samples: 9,
        confidence: "high",
      }),
    ).toMatchObject({
      goodputBps: 41_000,
      source: "observed",
      samples: 9,
      confidence: "high",
    });
  });

  it("falls back to the declared interface rate when no transport reports", () => {
    expect(linkQualityFromRoute(DECLARED)).toEqual(
      initialLinkQuality(DECLARED),
    );
  });
});

describe("passive route observation window", () => {
  it("stays declared until a window carries a credible number of bytes", () => {
    let window = openLinkObservation(DECLARED, 1_000);
    window = observeLinkDelivery(window, {
      bytes: 100,
      atMs: 1_100,
      rttMs: 40,
      mtu: 500,
    });
    expect(window.quality.source).toBe("declared");
    expect(window.windowBytes).toBe(100);
  });

  it("closes a filled window into an observed sample", () => {
    let window = openLinkObservation(DECLARED, 1_000);
    window = observeLinkDelivery(window, {
      bytes: 1_024,
      atMs: 1_100,
      rttMs: 40,
      mtu: 500,
    });
    window = observeLinkDelivery(window, {
      bytes: 1_024,
      atMs: 1_500,
      rttMs: 40,
      mtu: 500,
    });
    expect(window.quality.source).toBe("observed");
    // 2048 bytes across a 500 ms span, and the declared 64 kbps seed is gone.
    expect(window.quality.goodputBps).toBe(32_768);
    expect(window.windowBytes).toBe(0);
  });

  it("discards an idle under-filled window instead of decaying towards zero", () => {
    let window = openLinkObservation(DECLARED, 0);
    window = observeLinkDelivery(window, { bytes: 2_048, atMs: 100, mtu: 500 });
    const measured = window.quality;
    window = observeLinkDelivery(window, { bytes: 8, atMs: 200, mtu: 500 });
    window = observeLinkDelivery(window, { bytes: 8, atMs: 60_000, mtu: 500 });
    expect(window.quality).toEqual(measured);
    expect(window.windowBytes).toBe(0);
    expect(window.windowStartMs).toBe(60_000);
  });

  it("restarts rather than inventing a span when the clock moves backwards", () => {
    let window = openLinkObservation(DECLARED, 10_000);
    window = observeLinkDelivery(window, {
      bytes: 4_096,
      atMs: 9_000,
      mtu: 500,
    });
    expect(window.quality.goodputBps).toBeGreaterThan(0);
    expect(Number.isFinite(window.quality.goodputBps)).toBe(true);
  });
});
