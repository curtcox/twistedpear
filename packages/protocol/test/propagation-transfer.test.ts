import { describe, expect, it } from "vitest";
import {
  PROPAGATION_LINK_TIMEOUT_MS,
  PropagationPeerError,
  PropagationTransferState,
  initialPropagationTransferState,
  stepPropagationTransferWithActions
} from "../src/propagation-transfer.js";

describe("protocol propagation transfer", () => {
  it("begins by establishing a link", () => {
    const result = stepPropagationTransferWithActions(initialPropagationTransferState(), {
      kind: "xfer/begin"
    });
    expect(result.state.phase).toBe(PropagationTransferState.LINK_ESTABLISHING);
    expect(result.actions).toEqual([
      { kind: "establish-link", timeoutMs: PROPAGATION_LINK_TIMEOUT_MS }
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

  it("marks link failed on timeout", () => {
    let state = initialPropagationTransferState();
    state = stepPropagationTransferWithActions(state, { kind: "xfer/begin" }).state;
    const result = stepPropagationTransferWithActions(state, {
      kind: "timer/fired",
      id: "propagation-link",
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
