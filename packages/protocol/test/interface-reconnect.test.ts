import { describe, expect, it } from "vitest";
import {
  INTERFACE_RECONNECT_TIMER_ID,
  INTERFACE_RECONNECT_WAIT_MS,
  initialInterfaceReconnectState,
  isValidInterfaceName,
  planInterfaceReconnect,
  stepInterfaceReconnectWithActions
} from "../src/interface-reconnect.js";

describe("protocol interface reconnect", () => {
  it("rejects empty interface names", () => {
    expect(isValidInterfaceName("")).toBe(false);
    expect(isValidInterfaceName("wlan0")).toBe(true);
  });

  it("schedules reconnects with default wait", () => {
    expect(planInterfaceReconnect({ attempts: 0 })).toEqual({
      kind: "reconnect",
      delayMs: INTERFACE_RECONNECT_WAIT_MS,
      attempt: 1
    });
  });

  it("gives up after max tries", () => {
    expect(planInterfaceReconnect({ attempts: 2, maxTries: 2 })).toEqual({
      kind: "give-up",
      attempt: 3
    });
    expect(
      planInterfaceReconnect({ attempts: 1, maxTries: 3, waitMs: 1000 })
    ).toEqual({ kind: "reconnect", delayMs: 1000, attempt: 2 });
  });

  it("arms a reconnect timer on disconnect and connects on fire", () => {
    let state = initialInterfaceReconnectState({ maxTries: 2, waitMs: 1000 });
    const scheduled = stepInterfaceReconnectWithActions(state, { kind: "iface/disconnected" });
    expect(scheduled.state.waiting).toBe(true);
    expect(scheduled.intents).toEqual([
      { kind: "timer/cancel", timer: { id: INTERFACE_RECONNECT_TIMER_ID } },
      { kind: "timer/set", timer: { id: INTERFACE_RECONNECT_TIMER_ID, delayMs: 1000 } }
    ]);

    state = scheduled.state;
    const fired = stepInterfaceReconnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_RECONNECT_TIMER_ID,
      at: 0
    });
    expect(fired.actions).toEqual([{ kind: "connect", attempt: 1 }]);
    expect(fired.state.attempts).toBe(1);
  });

  it("gives up when max tries is exceeded", () => {
    let state = initialInterfaceReconnectState({ maxTries: 1, waitMs: 500 });
    state = stepInterfaceReconnectWithActions(state, { kind: "iface/disconnected" }).state;
    state = stepInterfaceReconnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_RECONNECT_TIMER_ID,
      at: 0
    }).state;
    state = stepInterfaceReconnectWithActions(state, { kind: "iface/connect-failed" }).state;
    const giveUp = stepInterfaceReconnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_RECONNECT_TIMER_ID,
      at: 500
    });
    expect(giveUp.actions).toEqual([{ kind: "give-up", attempt: 2 }]);
  });
});
