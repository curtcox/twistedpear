import { describe, expect, it } from "vitest";
import {
  linkReadyForNewResource,
  planLinkResourceAccept,
  planLinkResourceAcceptAppResult,
  shouldHandleIncomingResourceByHash,
  shouldHandleOutgoingResourceRequest
} from "../src/link-resource-accept.js";
import { LinkResourceStrategy } from "../src/link-watchdog.js";

describe("protocol link resource accept", () => {
  it("plans accept strategy and app result", () => {
    expect(planLinkResourceAccept(LinkResourceStrategy.ACCEPT_NONE)).toEqual({ kind: "ignore" });
    expect(planLinkResourceAccept(LinkResourceStrategy.ACCEPT_APP)).toEqual({ kind: "ask-app" });
    expect(planLinkResourceAccept(LinkResourceStrategy.ACCEPT_ALL)).toEqual({ kind: "accept" });
    expect(planLinkResourceAcceptAppResult(true)).toBe("accept");
    expect(planLinkResourceAcceptAppResult(false)).toBe("reject");
    expect(linkReadyForNewResource(0)).toBe(true);
    expect(linkReadyForNewResource(1)).toBe(false);
  });

  it("gates outgoing request and incoming hash match", () => {
    expect(
      shouldHandleOutgoingResourceRequest({
        hashMatches: true,
        alreadySeen: false
      })
    ).toBe(true);
    expect(
      shouldHandleOutgoingResourceRequest({
        hashMatches: true,
        alreadySeen: true
      })
    ).toBe(false);
    expect(
      shouldHandleOutgoingResourceRequest({
        hashMatches: false,
        alreadySeen: false
      })
    ).toBe(false);
    expect(shouldHandleIncomingResourceByHash(true)).toBe(true);
    expect(shouldHandleIncomingResourceByHash(false)).toBe(false);
  });
});
