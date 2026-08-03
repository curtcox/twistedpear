// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  CLIENT_RATE_WINDOW_MS,
  allowClientRequest,
  initialClientRateLimitState,
  shouldAllowClientRequest,
  shouldDenyClientRequest,
  stepAllowClientRequestWithActions,
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

  it("emits allow/deny only from machine actions", () => {
    let state = initialClientRateLimitState(1);
    const allowed = stepAllowClientRequestWithActions(state, {
      kind: "rate/allow-gate",
      clientKey: "a",
      at: 0
    });
    state = allowed.state;
    expect(shouldAllowClientRequest(allowed.actions)).toBe(true);
    expect(shouldDenyClientRequest(allowed.actions)).toBe(false);

    const denied = stepAllowClientRequestWithActions(state, {
      kind: "rate/allow-gate",
      clientKey: "a",
      at: 1
    });
    expect(shouldDenyClientRequest(denied.actions)).toBe(true);
    expect(shouldAllowClientRequest(denied.actions)).toBe(false);

    const reset = stepAllowClientRequestWithActions(denied.state, {
      kind: "rate/allow-gate",
      clientKey: "a",
      at: CLIENT_RATE_WINDOW_MS
    });
    expect(shouldAllowClientRequest(reset.actions)).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialClientRateLimitState(2);
      const first = stepAllowClientRequestWithActions(state, {
        kind: "rate/allow-gate",
        clientKey: "x",
        at: 10
      });
      state = first.state;
      const second = stepAllowClientRequestWithActions(state, {
        kind: "rate/allow-gate",
        clientKey: "x",
        at: 11
      });
      state = second.state;
      return {
        firstAllowed: shouldAllowClientRequest(first.actions),
        secondAllowed: shouldAllowClientRequest(second.actions),
        lastAllowed: state.lastAllowed,
        count: state.buckets.get("x")?.count
      };
    };
    expect(run()).toEqual(run());
  });
});
