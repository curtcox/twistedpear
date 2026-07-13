import { describe, expect, it } from "vitest";
import { LinkStatus } from "../src/link-watchdog.js";
import {
  initialLinkSessionState,
  stepLinkSessionWithActions
} from "../src/link-session.js";

describe("protocol link session", () => {
  it("initiator requests a link then becomes active on proof", () => {
    let state = initialLinkSessionState({ role: "initiator", peerId: "b" });
    let result = stepLinkSessionWithActions(state, { kind: "session/request-link", at: 10 });
    expect(result.actions[0]).toEqual({ kind: "send-link-request", peerId: "b" });
    expect(result.state.status).toBe(LinkStatus.PENDING);

    result = stepLinkSessionWithActions(result.state, { kind: "session/handshake", at: 10.5 });
    expect(result.state.status).toBe(LinkStatus.HANDSHAKE);
    expect(result.actions[0]).toEqual({ kind: "send-handshake", peerId: "b" });

    result = stepLinkSessionWithActions(result.state, {
      kind: "session/link-proof",
      at: 11,
      rtt: 0.5
    });
    expect(result.state.status).toBe(LinkStatus.ACTIVE);
    expect(result.state.established).toBe(true);
  });

  it("responder sends proof on establish", () => {
    const state = initialLinkSessionState({ role: "responder", peerId: "a" });
    const result = stepLinkSessionWithActions(state, {
      kind: "session/link-proof",
      at: 5,
      rtt: 0.25
    });
    expect(result.actions.some((action) => action.kind === "send-link-proof")).toBe(true);
    expect(result.state.established).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialLinkSessionState({ role: "initiator", peerId: "peer" });
      state = stepLinkSessionWithActions(state, { kind: "session/request-link", at: 1 }).state;
      return stepLinkSessionWithActions(state, {
        kind: "session/link-proof",
        at: 2,
        rtt: 1
      }).state;
    };
    expect(run()).toEqual(run());
  });
});
