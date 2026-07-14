import { describe, expect, it } from "vitest";
import {
  linkReadyForNewResource,
  planLinkResourceAccept,
  planLinkResourceAcceptAppResult,
  planLinkResourceAdvertisement,
  planLinkResourceConclude,
  shouldHandleIncomingResourceByHash,
  shouldHandleOutgoingResourceRequest,
  shouldRegisterLinkResource,
  shouldRemoveLinkResourceListIndex
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

  it("plans resource advertisement with request bypass", () => {
    expect(
      planLinkResourceAdvertisement({
        isRequest: true,
        strategy: LinkResourceStrategy.ACCEPT_NONE
      })
    ).toEqual({ kind: "accept" });
    expect(
      planLinkResourceAdvertisement({
        isRequest: false,
        strategy: LinkResourceStrategy.ACCEPT_NONE
      })
    ).toEqual({ kind: "ignore" });
    expect(
      planLinkResourceAdvertisement({
        isRequest: false,
        strategy: LinkResourceStrategy.ACCEPT_APP
      })
    ).toEqual({ kind: "ask-app" });
    expect(
      planLinkResourceAdvertisement({
        isRequest: false,
        strategy: LinkResourceStrategy.ACCEPT_ALL
      })
    ).toEqual({ kind: "accept" });
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

  it("plans unique resource register and conclude membership", () => {
    expect(shouldRegisterLinkResource(false)).toBe(true);
    expect(shouldRegisterLinkResource(true)).toBe(false);
    expect(
      planLinkResourceConclude({ outgoingIndex: 1, incomingIndex: -1 })
    ).toEqual({ removeOutgoingIndex: 1, removeIncomingIndex: null });
    expect(
      planLinkResourceConclude({ outgoingIndex: -1, incomingIndex: 0 })
    ).toEqual({ removeOutgoingIndex: null, removeIncomingIndex: 0 });
    expect(shouldRemoveLinkResourceListIndex(true)).toBe(true);
    expect(shouldRemoveLinkResourceListIndex(false)).toBe(false);
  });
});
