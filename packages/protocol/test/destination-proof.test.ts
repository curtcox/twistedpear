import { describe, expect, it } from "vitest";
import {
  DestinationProofStrategyCode,
  planDestinationProof
} from "../src/destination-proof.js";
import {
  linkReadyForNewResource,
  planLinkResourceAccept,
  planLinkResourceAcceptAppResult
} from "../src/link-resource-accept.js";
import { LinkResourceStrategy } from "../src/link-watchdog.js";
import {
  LinkRequestReceiptStatus,
  initialLinkRequestReceiptState,
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
});
