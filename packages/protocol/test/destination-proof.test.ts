import { describe, expect, it } from "vitest";
import {
  DestinationProofStrategyCode,
  canEmitDestinationProof,
  initialDestinationProofState,
  planDestinationProof,
  shouldProveDestination,
  stepDestinationProofWithActions
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
  initialIndexOfPendingLinkAppRequestState,
  initialLinkRequestReceiptState,
  pendingLinkAppRequestIndexFromActions,
  planUnregisterPendingLinkRequest,
  shouldDeliverPendingLinkAppResponse,
  shouldMissPendingLinkAppRequestIndex,
  shouldRegisterPendingLinkRequest,
  shouldUsePendingLinkAppRequestIndex,
  stepIndexOfPendingLinkAppRequestWithActions,
  stepLinkRequestReceipt
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
    const proveAll = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: DestinationProofStrategyCode.PROVE_ALL
    });
    expect(shouldProveDestination(proveAll.actions)).toBe(true);

    const skipNone = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: DestinationProofStrategyCode.PROVE_NONE
    });
    expect(shouldProveDestination(skipNone.actions)).toBe(false);

    const proveApp = stepDestinationProofWithActions(initialDestinationProofState(), {
      kind: "destination/proof-gate",
      strategy: DestinationProofStrategyCode.PROVE_APP,
      appWantsProof: true
    });
    expect(shouldProveDestination(proveApp.actions)).toBe(true);
  });

  it("gates destination proof emission on identity presence", () => {
    expect(canEmitDestinationProof(true)).toBe(true);
    expect(canEmitDestinationProof(false)).toBe(false);
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
  });
});
