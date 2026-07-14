import { describe, expect, it } from "vitest";
import {
  INTERFACE_CONNECT_TIMEOUT_MS,
  INTERFACE_CONNECT_TIMER_ID,
  initialInterfaceConnectState,
  isInterfaceConnectConnected,
  isInterfaceConnectFailed,
  isInterfaceConnectTimedOut,
  shouldContinueInterfaceConnect,
  stepInterfaceConnect,
  stepInterfaceConnectWithActions
} from "../src/interface-connect.js";

describe("protocol interface connect", () => {
  it("arms with a timeout timer intent and connect action", () => {
    const result = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
      kind: "interface-connect/arm",
      timeoutMs: INTERFACE_CONNECT_TIMEOUT_MS
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.concluded).toBe(false);
    expect(result.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: INTERFACE_CONNECT_TIMER_ID, delayMs: INTERFACE_CONNECT_TIMEOUT_MS }
      }
    ]);
    expect(result.actions).toEqual([
      { kind: "connect", timeoutMs: INTERFACE_CONNECT_TIMEOUT_MS }
    ]);
    expect(
      stepInterfaceConnect(initialInterfaceConnectState(), {
        kind: "interface-connect/arm",
        timeoutMs: INTERFACE_CONNECT_TIMEOUT_MS
      }).intents
    ).toEqual(result.intents);
  });

  it("concludes connected with resolve and cancels the timer", () => {
    let state = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
      kind: "interface-connect/arm",
      timeoutMs: 1_000
    }).state;
    const result = stepInterfaceConnectWithActions(state, { kind: "interface-connect/connected" });
    expect(isInterfaceConnectConnected(result.state)).toBe(true);
    expect(isInterfaceConnectTimedOut(result.state)).toBe(false);
    expect(isInterfaceConnectFailed(result.state)).toBe(false);
    expect(shouldContinueInterfaceConnect(result.state.concluded)).toBe(false);
    expect(result.intents).toEqual([
      { kind: "timer/cancel", timer: { id: INTERFACE_CONNECT_TIMER_ID } }
    ]);
    expect(result.actions).toEqual([{ kind: "resolve" }]);
  });

  it("concludes failed with reject and cancels the timer", () => {
    let state = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
      kind: "interface-connect/arm",
      timeoutMs: 1_000
    }).state;
    const result = stepInterfaceConnectWithActions(state, { kind: "interface-connect/failed" });
    expect(isInterfaceConnectFailed(result.state)).toBe(true);
    expect(isInterfaceConnectConnected(result.state)).toBe(false);
    expect(result.intents).toEqual([
      { kind: "timer/cancel", timer: { id: INTERFACE_CONNECT_TIMER_ID } }
    ]);
    expect(result.actions).toEqual([{ kind: "reject", reason: "failed" }]);
  });

  it("concludes timed-out with reject when the timer fires", () => {
    let state = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
      kind: "interface-connect/arm",
      timeoutMs: 1_000
    }).state;
    const result = stepInterfaceConnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_CONNECT_TIMER_ID,
      at: 1_000
    });
    expect(isInterfaceConnectTimedOut(result.state)).toBe(true);
    expect(isInterfaceConnectConnected(result.state)).toBe(false);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([{ kind: "reject", reason: "timeout" }]);
  });

  it("ignores connect/fail/timer events when not armed or already concluded", () => {
    const unarmed = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
      kind: "interface-connect/connected"
    });
    expect(unarmed.state.concluded).toBe(false);
    expect(unarmed.actions).toEqual([]);

    let state = stepInterfaceConnectWithActions(initialInterfaceConnectState(), {
      kind: "interface-connect/arm",
      timeoutMs: 1_000
    }).state;
    state = stepInterfaceConnectWithActions(state, { kind: "interface-connect/connected" }).state;
    const afterFail = stepInterfaceConnectWithActions(state, { kind: "interface-connect/failed" });
    expect(isInterfaceConnectConnected(afterFail.state)).toBe(true);
    expect(afterFail.intents).toEqual([]);
    expect(afterFail.actions).toEqual([]);

    const afterTimer = stepInterfaceConnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_CONNECT_TIMER_ID,
      at: 2_000
    });
    expect(isInterfaceConnectConnected(afterTimer.state)).toBe(true);
    expect(afterTimer.intents).toEqual([]);
    expect(afterTimer.actions).toEqual([]);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialInterfaceConnectState();
      const steps = [];
      steps.push(
        stepInterfaceConnectWithActions(state, {
          kind: "interface-connect/arm",
          timeoutMs: 500
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepInterfaceConnectWithActions(state, {
          kind: "timer/fired",
          id: INTERFACE_CONNECT_TIMER_ID,
          at: 500
        })
      );
      return steps.map((step) => ({
        concluded: step.state.concluded,
        connected: step.state.connected,
        timedOut: step.state.timedOut,
        failed: step.state.failed,
        intents: step.intents,
        actions: step.actions
      }));
    };
    expect(run()).toEqual(run());
  });
});
