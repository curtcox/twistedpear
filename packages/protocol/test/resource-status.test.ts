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
  initialAcceptIncomingResourceAdvertisementState,
  initialAdvertiseResourceState,
  initialCommitResourceAssemblePayloadState,
  initialProveResourceAllowState,
  initialResourceAssembleState,
  initialResourceCompleteState,
  initialResourceContinueTransferState,
  initialResourceProofAcceptState,
  initialResourceReceivePartAllowState,
  initialResourceRequestNextAllowState,
  initialResourceStatusState,
  initialResourceWatchdogAllowState,
  isResourceComplete,
  isResourceTerminal,
  planResourceAdvertisePhase,
  planResourceAssembleOutcome,
  planResourceProofAccept,
  shouldAcceptIncomingResourceAdvertisement,
  shouldAcceptIncomingResourceAdvertisementNow,
  shouldAdvertiseResource,
  shouldAdvertiseResourceNow,
  shouldAllowProveResource,
  shouldAllowResourceReceivePart,
  shouldAllowResourceRequestNext,
  shouldAllowResourceWatchdog,
  shouldCommitResourceAssemblePayload,
  shouldCommitResourceAssemblePayloadNow,
  shouldCompleteResourceAssemble,
  shouldCompleteResourceProofAccept,
  shouldContinueResourceTransfer,
  shouldCorruptResourceAssemble,
  shouldDenyProveResource,
  shouldDenyResourceReceivePart,
  shouldDenyResourceRequestNext,
  shouldDenyResourceWatchdog,
  shouldIgnoreResourceProofAccept,
  shouldSkipAdvertiseResource,
  shouldSkipCommitResourceAssemblePayload,
  shouldSkipIncomingResourceAdvertisement,
  shouldStopResourceTransfer,
  shouldTreatResourceComplete,
  shouldTreatResourceIncomplete,
  stepAcceptIncomingResourceAdvertisementWithActions,
  stepAdvertiseResourceWithActions,
  stepCommitResourceAssemblePayloadWithActions,
  stepProveResourceAllowWithActions,
  stepResourceAssembleWithActions,
  stepResourceCompleteWithActions,
  stepResourceContinueTransferWithActions,
  stepResourceProofAcceptWithActions,
  stepResourceReceivePartAllowWithActions,
  stepResourceRequestNextAllowWithActions,
  stepResourceWatchdogAllowWithActions
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
      shouldTreatResourceComplete(
        stepResourceCompleteWithActions(initialResourceCompleteState(), {
          kind: "resource/complete-gate",
          status: ResourceStatus.COMPLETE
        }).actions
      )
    ).toBe(true);
    expect(
      shouldTreatResourceIncomplete(
        stepResourceCompleteWithActions(initialResourceCompleteState(), {
          kind: "resource/complete-gate",
          status: ResourceStatus.TRANSFERRING
        }).actions
      )
    ).toBe(true);
    expect(
      shouldTreatResourceComplete(
        stepResourceCompleteWithActions(initialResourceCompleteState(), {
          kind: "timer/fired",
          timer: { id: "x" }
        }).actions
      )
    ).toBe(false);
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
    const commit = stepCommitResourceAssemblePayloadWithActions(
      initialCommitResourceAssemblePayloadState(),
      {
        kind: "resource/commit-assemble-payload-gate",
        outcomeComplete: shouldCompleteResourceAssemble(complete.actions),
        payloadPresent: true
      }
    );
    expect(shouldCommitResourceAssemblePayloadNow(commit.actions)).toBe(true);
    expect(shouldSkipCommitResourceAssemblePayload(commit.actions)).toBe(false);
    expect(
      shouldCommitResourceAssemblePayload({
        outcomeComplete: shouldCompleteResourceAssemble(complete.actions),
        payloadPresent: true
      })
    ).toBe(true);

    const skipCommit = stepCommitResourceAssemblePayloadWithActions(
      initialCommitResourceAssemblePayloadState(),
      {
        kind: "resource/commit-assemble-payload-gate",
        outcomeComplete: true,
        payloadPresent: false
      }
    );
    expect(shouldCommitResourceAssemblePayloadNow(skipCommit.actions)).toBe(false);
    expect(shouldSkipCommitResourceAssemblePayload(skipCommit.actions)).toBe(true);

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

  it("emits transfer/status gate actions from WithActions steps", () => {
    const continueOk = stepResourceContinueTransferWithActions(
      initialResourceContinueTransferState(),
      {
        kind: "resource/continue-transfer-gate",
        status: ResourceStatus.TRANSFERRING
      }
    );
    expect(continueOk.actions).toEqual([{ kind: "continue" }]);
    expect(shouldContinueResourceTransfer(continueOk.actions)).toBe(true);

    const continueStop = stepResourceContinueTransferWithActions(
      initialResourceContinueTransferState(),
      {
        kind: "resource/continue-transfer-gate",
        status: ResourceStatus.FAILED
      }
    );
    expect(shouldStopResourceTransfer(continueStop.actions)).toBe(true);

    const receiveOk = stepResourceReceivePartAllowWithActions(
      initialResourceReceivePartAllowState(),
      {
        kind: "resource/receive-part-allow-gate",
        status: ResourceStatus.TRANSFERRING
      }
    );
    expect(shouldAllowResourceReceivePart(receiveOk.actions)).toBe(true);

    const receiveDeny = stepResourceReceivePartAllowWithActions(
      initialResourceReceivePartAllowState(),
      {
        kind: "resource/receive-part-allow-gate",
        status: ResourceStatus.COMPLETE
      }
    );
    expect(shouldDenyResourceReceivePart(receiveDeny.actions)).toBe(true);

    const requestOk = stepResourceRequestNextAllowWithActions(
      initialResourceRequestNextAllowState(),
      {
        kind: "resource/request-next-allow-gate",
        status: ResourceStatus.TRANSFERRING,
        waitingForHashmap: false
      }
    );
    expect(shouldAllowResourceRequestNext(requestOk.actions)).toBe(true);

    const requestDeny = stepResourceRequestNextAllowWithActions(
      initialResourceRequestNextAllowState(),
      {
        kind: "resource/request-next-allow-gate",
        status: ResourceStatus.TRANSFERRING,
        waitingForHashmap: true
      }
    );
    expect(shouldDenyResourceRequestNext(requestDeny.actions)).toBe(true);

    const watchdogOk = stepResourceWatchdogAllowWithActions(initialResourceWatchdogAllowState(), {
      kind: "resource/watchdog-allow-gate",
      status: ResourceStatus.ADVERTISED
    });
    expect(shouldAllowResourceWatchdog(watchdogOk.actions)).toBe(true);

    const watchdogDeny = stepResourceWatchdogAllowWithActions(initialResourceWatchdogAllowState(), {
      kind: "resource/watchdog-allow-gate",
      status: ResourceStatus.FAILED
    });
    expect(shouldDenyResourceWatchdog(watchdogDeny.actions)).toBe(true);

    const proveOk = stepProveResourceAllowWithActions(initialProveResourceAllowState(), {
      kind: "resource/prove-allow-gate",
      dataPresent: true
    });
    expect(shouldAllowProveResource(proveOk.actions)).toBe(true);

    const proveDeny = stepProveResourceAllowWithActions(initialProveResourceAllowState(), {
      kind: "resource/prove-allow-gate",
      dataPresent: false
    });
    expect(shouldDenyProveResource(proveDeny.actions)).toBe(true);

    const advertiseOk = stepAdvertiseResourceWithActions(initialAdvertiseResourceState(), {
      kind: "resource/advertise-option-gate",
      advertiseOption: undefined
    });
    expect(shouldAdvertiseResourceNow(advertiseOk.actions)).toBe(true);

    const advertiseSkip = stepAdvertiseResourceWithActions(initialAdvertiseResourceState(), {
      kind: "resource/advertise-option-gate",
      advertiseOption: false
    });
    expect(shouldSkipAdvertiseResource(advertiseSkip.actions)).toBe(true);

    const incomingOk = stepAcceptIncomingResourceAdvertisementWithActions(
      initialAcceptIncomingResourceAdvertisementState(),
      {
        kind: "resource/accept-incoming-adv-gate",
        alreadyIncoming: false
      }
    );
    expect(shouldAcceptIncomingResourceAdvertisementNow(incomingOk.actions)).toBe(true);

    const incomingSkip = stepAcceptIncomingResourceAdvertisementWithActions(
      initialAcceptIncomingResourceAdvertisementState(),
      {
        kind: "resource/accept-incoming-adv-gate",
        alreadyIncoming: true
      }
    );
    expect(shouldSkipIncomingResourceAdvertisement(incomingSkip.actions)).toBe(true);
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
