import { describe, expect, it } from "vitest";
import {
  PROPAGATION_LINK_TIMEOUT_MS,
  PROPAGATION_LINK_TIMER_ID,
  PropagationPeerError,
  PropagationTransferState,
  initialPropagationTransferState,
  shouldAcceptPropagationPeerResponse,
  shouldAcceptPropagationDeliveredMessage,
  shouldHandlePropagationPeerError,
  shouldRequestPropagationHavesAck,
  shouldTreatPropagationListAsEmpty,
  stepPropagationTransferWithActions
} from "../src/propagation-transfer.js";

describe("protocol propagation transfer", () => {
  it("begins by establishing a link", () => {
    const result = stepPropagationTransferWithActions(initialPropagationTransferState(), {
      kind: "xfer/begin"
    });
    expect(result.state.phase).toBe(PropagationTransferState.LINK_ESTABLISHING);
    expect(result.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: PROPAGATION_LINK_TIMER_ID, delayMs: PROPAGATION_LINK_TIMEOUT_MS }
      }
    ]);
    expect(result.actions).toEqual([
      { kind: "establish-link", timeoutMs: PROPAGATION_LINK_TIMEOUT_MS }
    ]);
  });

  it("cancels the link timer on link-ready and cancel", () => {
    let state = initialPropagationTransferState();
    state = stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state;
    const ready = stepPropagationTransferWithActions(state, { kind: "xfer/link-ready" });
    expect(ready.intents).toEqual([
      { kind: "timer/cancel", timer: { id: PROPAGATION_LINK_TIMER_ID } }
    ]);

    state = stepPropagationTransferWithActions(initialPropagationTransferState(), {
      kind: "xfer/begin"
    }).state;
    const cancelled = stepPropagationTransferWithActions(state, { kind: "xfer/cancel" });
    expect(cancelled.intents).toEqual([
      { kind: "timer/cancel", timer: { id: PROPAGATION_LINK_TIMER_ID } }
    ]);
  });

  it("maps peer errors after list response", () => {
    let state = initialPropagationTransferState();
    state = stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state;
    state = stepPropagationTransferWithActions(state, { kind: "xfer/link-ready" }).state;
    const noId = stepPropagationTransferWithActions(state, {
      kind: "xfer/list-peer-error",
      code: PropagationPeerError.NO_IDENTITY
    });
    expect(noId.state.phase).toBe(PropagationTransferState.NO_IDENTITY_RCVD);

    const noAccess = stepPropagationTransferWithActions(state, {
      kind: "xfer/list-peer-error",
      code: PropagationPeerError.NO_ACCESS
    });
    expect(noAccess.state.phase).toBe(PropagationTransferState.NO_ACCESS);
  });

  it("completes the happy path with haves ack", () => {
    let state = initialPropagationTransferState();
    state = stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state;
    state = stepPropagationTransferWithActions(state, { kind: "xfer/link-ready" }).state;
    let result = stepPropagationTransferWithActions(state, {
      kind: "xfer/list-ready",
      wantCount: 2
    });
    expect(result.state.phase).toBe(PropagationTransferState.REQUEST_SENT);
    expect(result.actions[0]?.kind).toBe("request-download");

    result = stepPropagationTransferWithActions(result.state, {
      kind: "xfer/download-ready",
      downloadedCount: 2
    });
    expect(result.state.phase).toBe(PropagationTransferState.RESPONSE_RECEIVED);
    expect(result.actions[0]?.kind).toBe("request-haves-ack");

    result = stepPropagationTransferWithActions(result.state, { kind: "xfer/haves-acked" });
    expect(result.state.phase).toBe(PropagationTransferState.COMPLETE);
  });

  it("completes immediately on empty list", () => {
    let state = initialPropagationTransferState();
    state = stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state;
    state = stepPropagationTransferWithActions(state, { kind: "xfer/link-ready" }).state;
    const result = stepPropagationTransferWithActions(state, { kind: "xfer/list-empty" });
    expect(result.state.phase).toBe(PropagationTransferState.COMPLETE);
  });

  it("gates peer response, empty list, and haves-ack", () => {
    expect(shouldAcceptPropagationPeerResponse(true)).toBe(true);
    expect(shouldAcceptPropagationPeerResponse(false)).toBe(false);
    expect(shouldHandlePropagationPeerError(true)).toBe(true);
    expect(shouldHandlePropagationPeerError(false)).toBe(false);
    expect(shouldAcceptPropagationDeliveredMessage(true)).toBe(true);
    expect(shouldAcceptPropagationDeliveredMessage(false)).toBe(false);
    expect(shouldTreatPropagationListAsEmpty(0)).toBe(true);
    expect(shouldTreatPropagationListAsEmpty(2)).toBe(false);
    expect(
      shouldRequestPropagationHavesAck({
        actionIsHavesAck: true,
        haveCount: 1
      })
    ).toBe(true);
    expect(
      shouldRequestPropagationHavesAck({
        actionIsHavesAck: true,
        haveCount: 0
      })
    ).toBe(false);
    expect(
      shouldRequestPropagationHavesAck({
        actionIsHavesAck: false,
        haveCount: 3
      })
    ).toBe(false);
  });

  it("marks link failed on timeout", () => {
    let state = initialPropagationTransferState();
    state = stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state;
    const result = stepPropagationTransferWithActions(state, {
      kind: "timer/fired",
      id: PROPAGATION_LINK_TIMER_ID,
      at: PROPAGATION_LINK_TIMEOUT_MS
    });
    expect(result.state.phase).toBe(PropagationTransferState.LINK_FAILED);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialPropagationTransferState();
      const steps = [
        stepPropagationTransferWithActions(state, { kind: "xfer/begin" }),
        stepPropagationTransferWithActions(
          stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state,
          { kind: "xfer/link-ready" }
        )
      ];
      return steps.map((step) => ({ phase: step.state.phase, actions: step.actions }));
    };
    expect(run()).toEqual(run());
  });
});
