import { describe, expect, it } from "vitest";
import {
  ResourceStatus,
  RESOURCE_PROCESSING_GRACE,
  RESOURCE_WATCHDOG_PERIOD_MS,
  computeResourceTimeout,
  initialResourceWatchdogState,
  stepResourceWatchdogWithActions
} from "../src/resource-watchdog.js";

describe("protocol resource watchdog", () => {
  it("computes timeout from rtt and traffic factor", () => {
    expect(computeResourceTimeout(1, 6)).toBe(16);
    expect(computeResourceTimeout(0.5, 4)).toBe(12);
  });

  it("cancels advertised transfers when retries are exhausted", () => {
    let state = initialResourceWatchdogState({ initiator: true, timeout: 5, retriesLeft: 0 });
    state = stepResourceWatchdogWithActions(state, {
      kind: "resource/sync",
      status: ResourceStatus.ADVERTISED,
      advSent: 100
    }).state;

    const tick = stepResourceWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: (100 + 5 + RESOURCE_PROCESSING_GRACE + 1) * 1000
    });

    expect(tick.actions).toEqual([{ kind: "cancel" }]);
    expect(tick.state.status).toBe(ResourceStatus.FAILED);
  });

  it("retries advertise and decrements retriesLeft", () => {
    let state = initialResourceWatchdogState({ initiator: true, timeout: 5, retriesLeft: 2 });
    state = stepResourceWatchdogWithActions(state, {
      kind: "resource/sync",
      status: ResourceStatus.ADVERTISED,
      advSent: 10
    }).state;

    const tick = stepResourceWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: (10 + 5 + RESOURCE_PROCESSING_GRACE + 0.1) * 1000
    });

    expect(tick.actions).toEqual([{ kind: "advertise" }]);
    expect(tick.state.retriesLeft).toBe(1);
    expect(tick.intents[0]?.kind === "timer/set" ? tick.intents[0].timer.delayMs : 0).toBe(
      RESOURCE_WATCHDOG_PERIOD_MS
    );
  });

  it("requests next parts for receiver during transfer", () => {
    let state = initialResourceWatchdogState({ initiator: false, timeout: 5, retriesLeft: 4 });
    state = stepResourceWatchdogWithActions(state, {
      kind: "resource/sync",
      status: ResourceStatus.TRANSFERRING,
      outstandingParts: 0,
      receivedCount: 1,
      totalParts: 4
    }).state;

    const tick = stepResourceWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: 1_000
    });

    expect(tick.actions).toEqual([{ kind: "request-next" }]);
  });

  it("does not request next when parts are outstanding", () => {
    let state = initialResourceWatchdogState({ initiator: false, timeout: 5, retriesLeft: 4 });
    state = stepResourceWatchdogWithActions(state, {
      kind: "resource/sync",
      status: ResourceStatus.TRANSFERRING,
      outstandingParts: 2,
      receivedCount: 1,
      totalParts: 4
    }).state;

    const tick = stepResourceWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: 1_000
    });

    expect(tick.actions).toEqual([]);
    expect(tick.intents[0]?.kind).toBe("timer/set");
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialResourceWatchdogState({ initiator: true, timeout: 8, retriesLeft: 1 });
      state = stepResourceWatchdogWithActions(state, {
        kind: "resource/sync",
        status: ResourceStatus.ADVERTISED,
        advSent: 0
      }).state;
      return stepResourceWatchdogWithActions(state, {
        kind: "timer/fired",
        id: "resource-watchdog",
        at: (8 + RESOURCE_PROCESSING_GRACE + 1) * 1000
      });
    };
    expect(run()).toEqual(run());
  });
});
