import { describe, expect, it } from "vitest";
import {
  INTERFACE_RECONNECT_WAIT_MS,
  planInterfaceReconnect
} from "../src/interface-reconnect.js";

describe("protocol interface reconnect", () => {
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
});
