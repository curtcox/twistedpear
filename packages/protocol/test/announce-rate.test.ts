import { describe, expect, it } from "vitest";
import {
  initialAnnounceRateState,
  isAnnounceBlocked,
  recordAnnounce,
  shouldTreatAnnounceBlocked,
  shouldTreatAnnounceLive,
  shouldTreatRecordAnnounceBlocked,
  shouldTreatRecordAnnounceClear,
  stepAnnounceBlockedWithActions,
  stepAnnounceRate,
  stepRecordAnnounceWithActions
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

  it("emits announce blocked/live only from machine actions", () => {
    let state = initialAnnounceRateState({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 });
    const key = "deadbeef";

    state = stepRecordAnnounceWithActions(state, {
      kind: "announce/record-gate",
      destinationKey: key,
      at: 100
    }).state;
    const recordBlocked = stepRecordAnnounceWithActions(state, {
      kind: "announce/record-gate",
      destinationKey: key,
      at: 100.1
    });
    state = recordBlocked.state;
    expect(shouldTreatRecordAnnounceBlocked(recordBlocked.actions)).toBe(true);
    expect(shouldTreatRecordAnnounceClear(recordBlocked.actions)).toBe(false);

    expect(
      shouldTreatAnnounceBlocked(
        stepAnnounceBlockedWithActions(state, {
          kind: "announce/blocked-gate",
          destinationKey: key,
          at: 100.1
        }).actions
      )
    ).toBe(true);
    expect(
      shouldTreatAnnounceLive(
        stepAnnounceBlockedWithActions(state, {
          kind: "announce/blocked-gate",
          destinationKey: key,
          at: 111
        }).actions
      )
    ).toBe(true);
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
        const stepped = stepRecordAnnounceWithActions(state, {
          kind: "announce/record-gate",
          destinationKey: "dest",
          at
        });
        state = stepped.state;
        return {
          at,
          blocked: shouldTreatRecordAnnounceBlocked(stepped.actions),
          isBlocked: shouldTreatAnnounceBlocked(
            stepAnnounceBlockedWithActions(state, {
              kind: "announce/blocked-gate",
              destinationKey: "dest",
              at
            }).actions
          )
        };
      });
    };
    expect(run()).toEqual(run());
  });
});
