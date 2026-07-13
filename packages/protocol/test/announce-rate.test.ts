import { describe, expect, it } from "vitest";
import {
  initialAnnounceRateState,
  isAnnounceBlocked,
  recordAnnounce,
  stepAnnounceRate
} from "../src/announce-rate.js";

describe("protocol announce rate", () => {
  it("blocks destinations that announce too frequently", () => {
    let state = initialAnnounceRateState({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 });
    const key = "deadbeef";

    let result = recordAnnounce(state, key, 100);
    expect(result.blocked).toBe(false);
    state = result.state;

    result = recordAnnounce(state, key, 100.1);
    expect(result.blocked).toBe(true);
    state = result.state;

    expect(isAnnounceBlocked(state, key, 100.1)).toBe(true);
    expect(isAnnounceBlocked(state, key, 111)).toBe(false);
  });

  it("stepAnnounceRate mirrors record decisions", () => {
    let state = initialAnnounceRateState({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 });
    state = stepAnnounceRate(state, {
      kind: "announce/record",
      destinationKey: "a",
      at: 50
    } as never).state;
    expect(state.lastBlocked).toBe(false);

    state = stepAnnounceRate(state, {
      kind: "announce/record",
      destinationKey: "a",
      at: 50.05
    } as never).state;
    expect(state.lastBlocked).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialAnnounceRateState({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 });
      const times = [100, 100.05, 100.1, 110, 120];
      return times.map((at) => {
        const result = recordAnnounce(state, "dest", at);
        state = result.state;
        return { at, blocked: result.blocked, isBlocked: isAnnounceBlocked(state, "dest", at) };
      });
    };
    expect(run()).toEqual(run());
  });
});
