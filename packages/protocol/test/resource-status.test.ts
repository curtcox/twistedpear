import { describe, expect, it } from "vitest";
import { ResourceStatus } from "../src/resource-watchdog.js";
import {
  applyResourceStatusEvent,
  canProveResource,
  canReceiveResourcePart,
  canRequestResourceNext,
  canResourceContinueTransfer,
  canRunResourceWatchdog,
  canValidateResourceProof,
  initialResourceAssembleState,
  initialResourceProofAcceptState,
  initialResourceStatusState,
  isResourceComplete,
  isResourceTerminal,
  planResourceAdvertisePhase,
  planResourceAssembleOutcome,
  planResourceProofAccept,
  shouldAcceptIncomingResourceAdvertisement,
  shouldAdvertiseResource,
  shouldCommitResourceAssemblePayload,
  shouldCompleteResourceAssemble,
  shouldCompleteResourceProofAccept,
  shouldCorruptResourceAssemble,
  shouldIgnoreResourceProofAccept,
  stepResourceAssembleWithActions,
  stepResourceProofAcceptWithActions
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
    expect(
      canRequestResourceNext({
        status: ResourceStatus.TRANSFERRING,
        waitingForHashmap: false
      })
    ).toBe(true);
    expect(
      canRequestResourceNext({
        status: ResourceStatus.TRANSFERRING,
        waitingForHashmap: true
      })
    ).toBe(false);
    expect(
      canRequestResourceNext({
        status: ResourceStatus.FAILED,
        waitingForHashmap: false
      })
    ).toBe(false);
  });

  it("plans advertise phase, assemble outcome, and proof accept", () => {
    expect(planResourceAdvertisePhase(false)).toBe("queue");
    expect(planResourceAdvertisePhase(true)).toBe("advertise");
    expect(canProveResource(true)).toBe(true);
    expect(canProveResource(false)).toBe(false);
    expect(shouldAdvertiseResource(undefined)).toBe(true);
    expect(shouldAdvertiseResource(true)).toBe(true);
    expect(shouldAdvertiseResource(false)).toBe(false);
    expect(shouldAcceptIncomingResourceAdvertisement(false)).toBe(true);
    expect(shouldAcceptIncomingResourceAdvertisement(true)).toBe(false);
    expect(
      planResourceAssembleOutcome({
        decryptedPresent: true,
        payloadPresent: true,
        hashMatches: true
      })
    ).toBe("complete");
    expect(
      planResourceAssembleOutcome({
        decryptedPresent: false,
        payloadPresent: true,
        hashMatches: true
      })
    ).toBe("corrupt");
    expect(
      planResourceAssembleOutcome({
        decryptedPresent: true,
        payloadPresent: false,
        hashMatches: true
      })
    ).toBe("corrupt");
    expect(
      planResourceAssembleOutcome({
        decryptedPresent: true,
        payloadPresent: true,
        hashMatches: false
      })
    ).toBe("corrupt");
    expect(
      shouldCommitResourceAssemblePayload({
        outcomeComplete: true,
        payloadPresent: true
      })
    ).toBe(true);
    expect(
      shouldCommitResourceAssemblePayload({
        outcomeComplete: true,
        payloadPresent: false
      })
    ).toBe(false);
    expect(
      shouldCommitResourceAssemblePayload({
        outcomeComplete: false,
        payloadPresent: true
      })
    ).toBe(false);
    expect(
      planResourceProofAccept({
        status: ResourceStatus.AWAITING_PROOF,
        proofValid: true
      })
    ).toBe("complete");
    expect(
      planResourceProofAccept({
        status: ResourceStatus.AWAITING_PROOF,
        proofValid: false
      })
    ).toBe("ignore");
    expect(
      planResourceProofAccept({
        status: ResourceStatus.FAILED,
        proofValid: true
      })
    ).toBe("ignore");
  });

  it("emits resource assemble/proof-accept actions from WithActions steps", () => {
    const complete = stepResourceAssembleWithActions(initialResourceAssembleState(), {
      kind: "resource/assemble-gate",
      decryptedPresent: true,
      payloadPresent: true,
      hashMatches: true
    });
    expect(complete.actions).toEqual([{ kind: "complete" }]);
    expect(shouldCompleteResourceAssemble(complete.actions)).toBe(true);
    expect(
      shouldCommitResourceAssemblePayload({
        outcomeComplete: shouldCompleteResourceAssemble(complete.actions),
        payloadPresent: true
      })
    ).toBe(true);

    const corrupt = stepResourceAssembleWithActions(initialResourceAssembleState(), {
      kind: "resource/assemble-gate",
      decryptedPresent: false,
      payloadPresent: true,
      hashMatches: true
    });
    expect(shouldCorruptResourceAssemble(corrupt.actions)).toBe(true);

    const accept = stepResourceProofAcceptWithActions(initialResourceProofAcceptState(), {
      kind: "resource/proof-accept-gate",
      status: ResourceStatus.AWAITING_PROOF,
      proofValid: true
    });
    expect(accept.actions).toEqual([{ kind: "complete" }]);
    expect(shouldCompleteResourceProofAccept(accept.actions)).toBe(true);

    const ignore = stepResourceProofAcceptWithActions(initialResourceProofAcceptState(), {
      kind: "resource/proof-accept-gate",
      status: ResourceStatus.AWAITING_PROOF,
      proofValid: false
    });
    expect(shouldIgnoreResourceProofAccept(ignore.actions)).toBe(true);
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
