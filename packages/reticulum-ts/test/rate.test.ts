import { describe, expect, it } from "vitest";
import { AnnounceRateLimiter } from "../src/transport/rate.js";

describe("AnnounceRateLimiter", () => {
  it("blocks destinations that announce too frequently", () => {
    const limiter = new AnnounceRateLimiter({
      rateTarget: 0.2,
      rateGrace: 0,
      ratePenalty: 10,
    });
    const key = "deadbeef";

    expect(limiter.record(key, 100)).toBe(false);
    expect(limiter.record(key, 100.1)).toBe(true);
    expect(limiter.isBlocked(key, 100.1)).toBe(true);
    expect(limiter.isBlocked(key, 111)).toBe(false);
  });
});
