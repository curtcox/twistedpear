import { describe, expect, it } from "vitest";
import {
  CLIENT_RATE_WINDOW_MS,
  allowClientRequest,
  initialClientRateLimitState,
  stepClientRateLimit
} from "../src/client-rate-limit.js";

describe("protocol client rate limit", () => {
  it("allows requests under the limit", () => {
    let state = initialClientRateLimitState(3);
    state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "a", at: 0 }).state;
    expect(state.lastAllowed).toBe(true);
    state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "a", at: 1 }).state;
    expect(state.lastAllowed).toBe(true);
    state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "a", at: 2 }).state;
    expect(state.lastAllowed).toBe(true);
    state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "a", at: 3 }).state;
    expect(state.lastAllowed).toBe(false);
  });

  it("resets after the window", () => {
    let state = initialClientRateLimitState(1);
    state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "a", at: 0 }).state;
    expect(state.lastAllowed).toBe(true);
    state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "a", at: 1 }).state;
    expect(state.lastAllowed).toBe(false);
    state = stepClientRateLimit(state, {
      kind: "rate/check",
      clientKey: "a",
      at: CLIENT_RATE_WINDOW_MS
    }).state;
    expect(state.lastAllowed).toBe(true);
  });

  it("mutates adapter buckets via allowClientRequest", () => {
    const buckets = new Map();
    expect(allowClientRequest(buckets, "c", 0, 1)).toBe(true);
    expect(allowClientRequest(buckets, "c", 1, 1)).toBe(false);
    expect(allowClientRequest(buckets, "c", CLIENT_RATE_WINDOW_MS, 1)).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialClientRateLimitState(2);
      state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "x", at: 10 }).state;
      state = stepClientRateLimit(state, { kind: "rate/check", clientKey: "x", at: 11 }).state;
      return { lastAllowed: state.lastAllowed, count: state.buckets.get("x")?.count };
    };
    expect(run()).toEqual(run());
  });
});
