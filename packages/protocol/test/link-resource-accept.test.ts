import { describe, expect, it } from "vitest";
import {
  initialLinkResourceAdvertisementState,
  linkReadyForNewResource,
  planLinkResourceAccept,
  planLinkResourceAcceptAppResult,
  planLinkResourceAdvertisement,
  planLinkResourceConclude,
  shouldAcceptLinkResourceAdvertisement,
  shouldAskAppLinkResourceAdvertisement,
  shouldHandleIncomingResourceByHash,
  shouldHandleOutgoingResourceRequest,
  shouldIgnoreLinkResourceAdvertisement,
  shouldRegisterLinkResource,
  shouldRejectLinkResourceAdvertisement,
  shouldRemoveLinkResourceListIndex,
  stepLinkResourceAdvertisement,
  stepLinkResourceAdvertisementWithActions
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

  it("emits resource-adv actions for ignore / ask-app / accept / reject", () => {
    const none = initialLinkResourceAdvertisementState({
      strategy: LinkResourceStrategy.ACCEPT_NONE
    });
    const ignored = stepLinkResourceAdvertisementWithActions(none, {
      kind: "resource-adv/received",
      isRequest: false
    });
    expect(ignored.actions).toEqual([{ kind: "ignore" }]);
    expect(shouldIgnoreLinkResourceAdvertisement(ignored.actions)).toBe(true);

    const request = stepLinkResourceAdvertisementWithActions(none, {
      kind: "resource-adv/received",
      isRequest: true
    });
    expect(request.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptLinkResourceAdvertisement(request.actions)).toBe(true);

    const app = initialLinkResourceAdvertisementState({
      strategy: LinkResourceStrategy.ACCEPT_APP
    });
    const ask = stepLinkResourceAdvertisementWithActions(app, {
      kind: "resource-adv/received",
      isRequest: false
    });
    expect(ask.actions).toEqual([{ kind: "ask-app" }]);
    expect(shouldAskAppLinkResourceAdvertisement(ask.actions)).toBe(true);
    expect(ask.state.waitingApp).toBe(true);

    const rejected = stepLinkResourceAdvertisementWithActions(ask.state, {
      kind: "resource-adv/app-result",
      accepted: false
    });
    expect(rejected.actions).toEqual([{ kind: "reject" }]);
    expect(shouldRejectLinkResourceAdvertisement(rejected.actions)).toBe(true);
    expect(rejected.state.waitingApp).toBe(false);

    const accepted = stepLinkResourceAdvertisementWithActions(ask.state, {
      kind: "resource-adv/app-result",
      accepted: true
    });
    expect(accepted.actions).toEqual([{ kind: "accept" }]);

    const stray = stepLinkResourceAdvertisementWithActions(app, {
      kind: "resource-adv/app-result",
      accepted: true
    });
    expect(stray.actions).toEqual([]);

    const stripped = stepLinkResourceAdvertisement(none, {
      kind: "resource-adv/received",
      isRequest: false
    });
    expect(stripped).toEqual({
      state: ignored.state,
      intents: ignored.intents
    });
  });

  it("resource-adv actions double-run identically", () => {
    const run = () => {
      const steps = [];
      const none = initialLinkResourceAdvertisementState({
        strategy: LinkResourceStrategy.ACCEPT_NONE
      });
      steps.push(
        stepLinkResourceAdvertisementWithActions(none, {
          kind: "resource-adv/received",
          isRequest: false
        })
      );
      const app = initialLinkResourceAdvertisementState({
        strategy: LinkResourceStrategy.ACCEPT_APP
      });
      const ask = stepLinkResourceAdvertisementWithActions(app, {
        kind: "resource-adv/received",
        isRequest: false
      });
      steps.push(ask);
      steps.push(
        stepLinkResourceAdvertisementWithActions(ask.state, {
          kind: "resource-adv/app-result",
          accepted: false
        })
      );
      return steps.map((s) => ({
        waitingApp: s.state.waitingApp,
        actions: s.actions,
        intents: s.intents
      }));
    };
    expect(run()).toEqual(run());
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
