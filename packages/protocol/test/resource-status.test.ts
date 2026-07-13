import { describe, expect, it } from "vitest";
import { ResourceStatus } from "../src/resource-watchdog.js";
import {
  applyResourceStatusEvent,
  canReceiveResourcePart,
  canResourceContinueTransfer,
  canRunResourceWatchdog,
  canValidateResourceProof,
  initialResourceStatusState,
  isResourceComplete,
  isResourceTerminal
} from "../src/resource-status.js";

describe("protocol resource status", () => {
  it("gates transfer, receive, proof, and watchdog", () => {
    expect(canResourceContinueTransfer(ResourceStatus.TRANSFERRING)).toBe(true);
    expect(canResourceContinueTransfer(ResourceStatus.FAILED)).toBe(false);
    expect(canReceiveResourcePart(ResourceStatus.TRANSFERRING)).toBe(true);
    expect(canReceiveResourcePart(ResourceStatus.COMPLETE)).toBe(false);
    expect(canReceiveResourcePart(ResourceStatus.FAILED)).toBe(false);
    expect(canValidateResourceProof(ResourceStatus.AWAITING_PROOF)).toBe(true);
    expect(canValidateResourceProof(ResourceStatus.FAILED)).toBe(false);
    expect(canRunResourceWatchdog(ResourceStatus.ADVERTISED)).toBe(true);
    expect(canRunResourceWatchdog(ResourceStatus.COMPLETE)).toBe(false);
    expect(isResourceTerminal(ResourceStatus.FAILED)).toBe(true);
    expect(isResourceComplete(ResourceStatus.COMPLETE)).toBe(true);
  });

  it("steps through advertise → transferring → awaiting-proof → complete", () => {
    let state = initialResourceStatusState();
    state = applyResourceStatusEvent(state, { kind: "resource/queue" });
    expect(state.status).toBe(ResourceStatus.QUEUED);
    state = applyResourceStatusEvent(state, { kind: "resource/advertise" });
    expect(state.status).toBe(ResourceStatus.ADVERTISED);
    state = applyResourceStatusEvent(state, { kind: "resource/transferring" });
    expect(state.status).toBe(ResourceStatus.TRANSFERRING);
    state = applyResourceStatusEvent(state, { kind: "resource/awaiting-proof" });
    expect(state.status).toBe(ResourceStatus.AWAITING_PROOF);
    state = applyResourceStatusEvent(state, { kind: "resource/complete" });
    expect(state.status).toBe(ResourceStatus.COMPLETE);
  });

  it("steps assemble → corrupt / fail", () => {
    let state = applyResourceStatusEvent(initialResourceStatusState(ResourceStatus.TRANSFERRING), {
      kind: "resource/assemble"
    });
    expect(state.status).toBe(ResourceStatus.ASSEMBLING);
    state = applyResourceStatusEvent(state, { kind: "resource/corrupt" });
    expect(state.status).toBe(ResourceStatus.CORRUPT);
    state = applyResourceStatusEvent(state, { kind: "resource/fail" });
    expect(state.status).toBe(ResourceStatus.FAILED);
  });
});
