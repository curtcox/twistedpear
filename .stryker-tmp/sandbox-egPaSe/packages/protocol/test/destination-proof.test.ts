// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  DestinationProofStrategyCode,
  canEmitDestinationProof,
  destinationProofPlanFromActions,
  initialDestinationProofPlanState,
  initialDestinationProofState,
  initialEmitDestinationProofState,
  planDestinationProof,
  shouldEmitDestinationProofNow,
  shouldProveDestination,
  shouldProveDestinationPlan,
  shouldSkipDestinationProof,
  shouldSkipDestinationProofPlan,
  shouldSkipEmitDestinationProof,
  stepDestinationProofPlanWithActions,
  stepDestinationProofWithActions,
  stepEmitDestinationProofWithActions
} from "../src/destination-proof.js";
import {
  linkReadyForNewResource,
  planLinkResourceAccept,
  planLinkResourceAcceptAppResult
} from "../src/link-resource-accept.js";
import { LinkResourceStrategy } from "../src/link-watchdog.js";
import {
  LinkRequestReceiptStatus,
  indexOfPendingLinkAppRequest,
  initialDeliverPendingLinkAppResponseState,
  initialIndexOfPendingLinkAppRequestState,
  initialLinkRequestReceiptState,
  initialPendingLinkRequestRegisterState,
  pendingLinkAppRequestIndexFromActions,
  planUnregisterPendingLinkRequest,
  shouldDeliverPendingLinkAppResponse,
  shouldDeliverPendingLinkAppResponseNow,
  shouldMissPendingLinkAppRequestIndex,
  shouldRegisterPendingLinkRequest,
  shouldRegisterPendingLinkRequestNow,
  shouldSkipPendingLinkAppResponseDeliver,
  shouldSkipPendingLinkRequestRegister,
  shouldUsePendingLinkAppRequestIndex,
  stepDeliverPendingLinkAppResponseWithActions,
  stepIndexOfPendingLinkAppRequestWithActions,
  stepLinkRequestReceipt,
  stepPendingLinkRequestRegisterWithActions
} from "../src/link-request-receipt.js";

describe("destination proof planning", () => {
  it("plans prove-all / prove-app / prove-none", () => {
    expect(planDestinationProof({ strategy: DestinationProofStrategyCode.PROVE_ALL })).toBe(true);
    expect(
      planDestinationProof({
        strategy: DestinationProofStrategyCode.PROVE_APP,
        appWantsProof: true
      })
    ).toBe(true);
    expect(
      planDestinationProof({
        strategy: DestinationProofStrategyCode.PROVE_APP,
        appWantsProof: false
      })
    ).toBe(false);
    expect(planDestinationProof({ strategy: DestinationProofStrategyCode.PROVE_NONE })).toBe(false);
  });

  it("emits prove / skip actions from destination/proof-gate", () => {
    const proveAllPlan = stepDestinationProofPlanWithActions(initialDestinationProofPlanState(), {
      kind: "destination/proof-plan-gate",
      strategy: DestinationProofStrategyCode.PROVE_ALL
    });
    expect(destinationProofPlanFromActions(proveAllPlan.actions)).toBe("prove");
    expect(shouldProveDestinationPlan(proveAllPlan.actions)).toBe(true);
    expect(shouldSkipDestinationProofPlan(proveAllPlan.actions)).toBe(false);

    const proveAll = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: DestinationProofStrategyCode.PROVE_ALL
    });
    expect(shouldProveDestination(proveAll.actions)).toBe(true);
    expect(shouldSkipDestinationProof(proveAll.actions)).toBe(false);

    const skipNonePlan = stepDestinationProofPlanWithActions(initialDestinationProofPlanState(), {
      kind: "destination/proof-plan-gate",
      strategy: DestinationProofStrategyCode.PROVE_NONE
    });
    expect(destinationProofPlanFromActions(skipNonePlan.actions)).toBe("skip");
    expect(shouldSkipDestinationProofPlan(skipNonePlan.actions)).toBe(true);

    const skipNone = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: DestinationProofStrategyCode.PROVE_NONE
    });
    expect(shouldProveDestination(skipNone.actions)).toBe(false);
    expect(shouldSkipDestinationProof(skipNone.actions)).toBe(true);

    const proveApp = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: DestinationProofStrategyCode.PROVE_APP,
      appWantsProof: true
    });
    expect(shouldProveDestination(proveApp.actions)).toBe(true);
    expect(destinationProofPlanFromActions([])).toBeNull();
  });

  it("gates destination proof emission on identity presence", () => {
    expect(canEmitDestinationProof(true)).toBe(true);
    expect(canEmitDestinationProof(false)).toBe(false);

    const emit = stepEmitDestinationProofWithActions(initialEmitDestinationProofState(), {
      kind: "destination/emit-proof-gate",
      identityPresent: true
    });
    expect(shouldEmitDestinationProofNow(emit.actions)).toBe(true);
    expect(shouldSkipEmitDestinationProof(emit.actions)).toBe(false);

    const skip = stepEmitDestinationProofWithActions(initialEmitDestinationProofState(), {
      kind: "destination/emit-proof-gate",
      identityPresent: false
    });
    expect(shouldEmitDestinationProofNow(skip.actions)).toBe(false);
    expect(shouldSkipEmitDestinationProof(skip.actions)).toBe(true);
  });
});

describe("link resource accept planning", () => {
  it("plans ignore / ask-app / accept", () => {
    expect(planLinkResourceAccept(LinkResourceStrategy.ACCEPT_NONE)).toEqual({ kind: "ignore" });
    expect(planLinkResourceAccept(LinkResourceStrategy.ACCEPT_APP)).toEqual({ kind: "ask-app" });
    expect(planLinkResourceAccept(LinkResourceStrategy.ACCEPT_ALL)).toEqual({ kind: "accept" });
    expect(planLinkResourceAcceptAppResult(true)).toBe("accept");
    expect(planLinkResourceAcceptAppResult(false)).toBe("reject");
  });

  it("gates new outbound resources on empty outgoing count", () => {
    expect(linkReadyForNewResource(0)).toBe(true);
    expect(linkReadyForNewResource(1)).toBe(false);
    expect(linkReadyForNewResource(3)).toBe(false);
  });
});

describe("link request receipt step", () => {
  it("fails on timeout from sent/delivered", () => {
    const timedOut = stepLinkRequestReceipt(initialLinkRequestReceiptState(), {
      kind: "request/timeout",
      at: 10
    });
    expect(timedOut.state.status).toBe(LinkRequestReceiptStatus.FAILED);
    expect(timedOut.actions).toEqual([{ kind: "failed" }]);

    const ignored = stepLinkRequestReceipt(
      { ...initialLinkRequestReceiptState(), status: LinkRequestReceiptStatus.READY },
      { kind: "request/timeout", at: 11 }
    );
    expect(ignored.actions).toEqual([]);
  });

  it("marks ready on response", () => {
    const response = new Uint8Array([1, 2]);
    const ready = stepLinkRequestReceipt(initialLinkRequestReceiptState(), {
      kind: "request/response",
      at: 12,
      response
    });
    expect(ready.state.status).toBe(LinkRequestReceiptStatus.READY);
    expect([...ready.state.response!]).toEqual([1, 2]);
    expect(ready.actions).toEqual([{ kind: "response" }]);
  });

  it("indexes pending link app-requests by request-id", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    expect(
      indexOfPendingLinkAppRequest({
        requestIds: [a, b],
        target: new Uint8Array([4, 5, 6])
      })
    ).toBe(1);
    expect(
      indexOfPendingLinkAppRequest({
        requestIds: [a, b],
        target: new Uint8Array([9, 9, 9])
      })
    ).toBeNull();
    expect(shouldDeliverPendingLinkAppResponse(true)).toBe(true);
    expect(shouldDeliverPendingLinkAppResponse(false)).toBe(false);

    const deliver = stepDeliverPendingLinkAppResponseWithActions(
      initialDeliverPendingLinkAppResponseState(),
      {
        kind: "link/pending-app-response-deliver-gate",
        indexPresent: true
      }
    );
    expect(shouldDeliverPendingLinkAppResponseNow(deliver.actions)).toBe(true);
    expect(shouldSkipPendingLinkAppResponseDeliver(deliver.actions)).toBe(false);

    const skip = stepDeliverPendingLinkAppResponseWithActions(
      initialDeliverPendingLinkAppResponseState(),
      {
        kind: "link/pending-app-response-deliver-gate",
        indexPresent: false
      }
    );
    expect(shouldDeliverPendingLinkAppResponseNow(skip.actions)).toBe(false);
    expect(shouldSkipPendingLinkAppResponseDeliver(skip.actions)).toBe(true);
  });

  it("emits pending link app-request index only from use-index/miss actions", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    const hit = stepIndexOfPendingLinkAppRequestWithActions(
      initialIndexOfPendingLinkAppRequestState(),
      {
        kind: "link/pending-app-request-index-gate",
        requestIds: [a, b],
        target: new Uint8Array([4, 5, 6])
      }
    );
    expect(shouldUsePendingLinkAppRequestIndex(hit.actions)).toBe(true);
    expect(shouldMissPendingLinkAppRequestIndex(hit.actions)).toBe(false);
    expect(pendingLinkAppRequestIndexFromActions(hit.actions)).toBe(1);

    const miss = stepIndexOfPendingLinkAppRequestWithActions(
      initialIndexOfPendingLinkAppRequestState(),
      {
        kind: "link/pending-app-request-index-gate",
        requestIds: [a, b],
        target: new Uint8Array([9, 9, 9])
      }
    );
    expect(shouldUsePendingLinkAppRequestIndex(miss.actions)).toBe(false);
    expect(shouldMissPendingLinkAppRequestIndex(miss.actions)).toBe(true);
    expect(pendingLinkAppRequestIndexFromActions(miss.actions)).toBeNull();

    const empty = stepIndexOfPendingLinkAppRequestWithActions(
      initialIndexOfPendingLinkAppRequestState(),
      {
        kind: "noop"
      } as never
    );
    expect(shouldUsePendingLinkAppRequestIndex(empty.actions)).toBe(false);
    expect(shouldMissPendingLinkAppRequestIndex(empty.actions)).toBe(false);
    expect(pendingLinkAppRequestIndexFromActions(empty.actions)).toBeNull();
  });

  it("plans pending link-request register and unregister", () => {
    expect(shouldRegisterPendingLinkRequest(false)).toBe(true);
    expect(shouldRegisterPendingLinkRequest(true)).toBe(false);
    expect(planUnregisterPendingLinkRequest(2)).toBe(2);
    expect(planUnregisterPendingLinkRequest(-1)).toBeNull();

    const register = stepPendingLinkRequestRegisterWithActions(
      initialPendingLinkRequestRegisterState(),
      {
        kind: "link/pending-request-register-gate",
        alreadyPresent: false
      }
    );
    expect(shouldRegisterPendingLinkRequestNow(register.actions)).toBe(true);
    expect(shouldSkipPendingLinkRequestRegister(register.actions)).toBe(false);

    const skip = stepPendingLinkRequestRegisterWithActions(
      initialPendingLinkRequestRegisterState(),
      {
        kind: "link/pending-request-register-gate",
        alreadyPresent: true
      }
    );
    expect(shouldRegisterPendingLinkRequestNow(skip.actions)).toBe(false);
    expect(shouldSkipPendingLinkRequestRegister(skip.actions)).toBe(true);
  });
});
