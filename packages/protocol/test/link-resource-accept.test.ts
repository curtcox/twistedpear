import { describe, expect, it } from "vitest";
import {
  initialLinkResourceAcceptAppResultPlanState,
  initialLinkResourceAdvertisementPlanState,
  initialLinkResourceAdvertisementState,
  initialLinkResourceConcludeState,
  incomingLinkResourceConcludeIndex,
  linkReadyForNewResource,
  initialLinkReadyForNewResourceState,
  shouldLinkBusyForNewResource,
  shouldLinkReadyForNewResource,
  stepLinkReadyForNewResourceWithActions,
  linkResourceAcceptAppResultPlanFromActions,
  linkResourceAdvertisementPlanFromActions,
  outgoingLinkResourceConcludeIndex,
  planLinkResourceAccept,
  planLinkResourceAcceptAppResult,
  planLinkResourceAdvertisement,
  planLinkResourceConclude,
  shouldAcceptLinkResourceAcceptAppResultPlan,
  shouldAcceptLinkResourceAdvertisement,
  shouldAcceptLinkResourceAdvertisementPlan,
  shouldAskAppLinkResourceAdvertisement,
  shouldAskAppLinkResourceAdvertisementPlan,
  shouldHandleIncomingResourceByHash,
  initialHandleIncomingResourceByHashState,
  shouldHandleIncomingResourceByHashNow,
  shouldSkipHandleIncomingResourceByHash,
  stepHandleIncomingResourceByHashWithActions,
  shouldHandleOutgoingResourceRequest,
  initialHandleOutgoingResourceRequestState,
  shouldHandleOutgoingResourceRequestNow,
  shouldSkipHandleOutgoingResourceRequest,
  stepHandleOutgoingResourceRequestWithActions,
  shouldIgnoreLinkResourceAdvertisement,
  shouldIgnoreLinkResourceAdvertisementPlan,
  shouldRegisterLinkResource,
  initialRegisterLinkResourceState,
  shouldRegisterLinkResourceNow,
  shouldSkipRegisterLinkResource,
  stepRegisterLinkResourceWithActions,
  shouldRejectLinkResourceAcceptAppResultPlan,
  shouldRejectLinkResourceAdvertisement,
  shouldRemoveIncomingLinkResourceConclude,
  shouldRemoveLinkResourceListIndex,
  shouldRemoveOutgoingLinkResourceConclude,
  stepLinkResourceAcceptAppResultPlanWithActions,
  stepLinkResourceAdvertisement,
  stepLinkResourceAdvertisementPlanWithActions,
  stepLinkResourceAdvertisementWithActions,
  stepLinkResourceConcludeWithActions
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

    const acceptPlan = stepLinkResourceAdvertisementPlanWithActions(
      initialLinkResourceAdvertisementPlanState(),
      {
        kind: "resource-adv/advertisement-plan-gate",
        isRequest: true,
        strategy: LinkResourceStrategy.ACCEPT_NONE
      }
    );
    expect(shouldAcceptLinkResourceAdvertisementPlan(acceptPlan.actions)).toBe(true);
    expect(linkResourceAdvertisementPlanFromActions(acceptPlan.actions)).toEqual({
      kind: "accept"
    });

    const ignorePlan = stepLinkResourceAdvertisementPlanWithActions(
      initialLinkResourceAdvertisementPlanState(),
      {
        kind: "resource-adv/advertisement-plan-gate",
        isRequest: false,
        strategy: LinkResourceStrategy.ACCEPT_NONE
      }
    );
    expect(shouldIgnoreLinkResourceAdvertisementPlan(ignorePlan.actions)).toBe(true);
    expect(linkResourceAdvertisementPlanFromActions(ignorePlan.actions)).toEqual({
      kind: "ignore"
    });

    const askPlan = stepLinkResourceAdvertisementPlanWithActions(
      initialLinkResourceAdvertisementPlanState(),
      {
        kind: "resource-adv/advertisement-plan-gate",
        isRequest: false,
        strategy: LinkResourceStrategy.ACCEPT_APP
      }
    );
    expect(shouldAskAppLinkResourceAdvertisementPlan(askPlan.actions)).toBe(true);

    const acceptApp = stepLinkResourceAcceptAppResultPlanWithActions(
      initialLinkResourceAcceptAppResultPlanState(),
      { kind: "resource-adv/app-result-plan-gate", accepted: true }
    );
    expect(shouldAcceptLinkResourceAcceptAppResultPlan(acceptApp.actions)).toBe(true);
    expect(linkResourceAcceptAppResultPlanFromActions(acceptApp.actions)).toBe("accept");

    const rejectApp = stepLinkResourceAcceptAppResultPlanWithActions(
      initialLinkResourceAcceptAppResultPlanState(),
      { kind: "resource-adv/app-result-plan-gate", accepted: false }
    );
    expect(shouldRejectLinkResourceAcceptAppResultPlan(rejectApp.actions)).toBe(true);
    expect(linkResourceAcceptAppResultPlanFromActions(rejectApp.actions)).toBe("reject");
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

    const handleOutgoing = stepHandleOutgoingResourceRequestWithActions(
      initialHandleOutgoingResourceRequestState(),
      {
        kind: "link/handle-outgoing-resource-request-gate",
        hashMatches: true,
        alreadySeen: false
      }
    );
    expect(shouldHandleOutgoingResourceRequestNow(handleOutgoing.actions)).toBe(true);
    const skipOutgoing = stepHandleOutgoingResourceRequestWithActions(
      initialHandleOutgoingResourceRequestState(),
      {
        kind: "link/handle-outgoing-resource-request-gate",
        hashMatches: true,
        alreadySeen: true
      }
    );
    expect(shouldSkipHandleOutgoingResourceRequest(skipOutgoing.actions)).toBe(true);

    const handleIncoming = stepHandleIncomingResourceByHashWithActions(
      initialHandleIncomingResourceByHashState(),
      {
        kind: "link/handle-incoming-resource-by-hash-gate",
        hashMatches: true
      }
    );
    expect(shouldHandleIncomingResourceByHashNow(handleIncoming.actions)).toBe(true);
    const skipIncoming = stepHandleIncomingResourceByHashWithActions(
      initialHandleIncomingResourceByHashState(),
      {
        kind: "link/handle-incoming-resource-by-hash-gate",
        hashMatches: false
      }
    );
    expect(shouldSkipHandleIncomingResourceByHash(skipIncoming.actions)).toBe(true);
  });

  it("plans unique resource register and conclude membership", () => {
    expect(shouldRegisterLinkResource(false)).toBe(true);
    expect(shouldRegisterLinkResource(true)).toBe(false);
    const register = stepRegisterLinkResourceWithActions(initialRegisterLinkResourceState(), {
      kind: "link/register-resource-gate",
      alreadyPresent: false
    });
    expect(shouldRegisterLinkResourceNow(register.actions)).toBe(true);
    const skip = stepRegisterLinkResourceWithActions(initialRegisterLinkResourceState(), {
      kind: "link/register-resource-gate",
      alreadyPresent: true
    });
    expect(shouldSkipRegisterLinkResource(skip.actions)).toBe(true);
    expect(
      planLinkResourceConclude({ outgoingIndex: 1, incomingIndex: -1 })
    ).toEqual({ removeOutgoingIndex: 1, removeIncomingIndex: null });
    expect(
      planLinkResourceConclude({ outgoingIndex: -1, incomingIndex: 0 })
    ).toEqual({ removeOutgoingIndex: null, removeIncomingIndex: 0 });
    expect(shouldRemoveLinkResourceListIndex(true)).toBe(true);
    expect(shouldRemoveLinkResourceListIndex(false)).toBe(false);
  });

  it("emits link resource conclude actions from WithActions step", () => {
    const outgoing = stepLinkResourceConcludeWithActions(initialLinkResourceConcludeState(), {
      kind: "link/resource-conclude-gate",
      outgoingIndex: 1,
      incomingIndex: -1
    });
    expect(shouldRemoveOutgoingLinkResourceConclude(outgoing.actions)).toBe(true);
    expect(outgoingLinkResourceConcludeIndex(outgoing.actions)).toBe(1);
    expect(shouldRemoveIncomingLinkResourceConclude(outgoing.actions)).toBe(false);

    const incoming = stepLinkResourceConcludeWithActions(initialLinkResourceConcludeState(), {
      kind: "link/resource-conclude-gate",
      outgoingIndex: -1,
      incomingIndex: 0
    });
    expect(shouldRemoveIncomingLinkResourceConclude(incoming.actions)).toBe(true);
    expect(incomingLinkResourceConcludeIndex(incoming.actions)).toBe(0);
    expect(shouldRemoveOutgoingLinkResourceConclude(incoming.actions)).toBe(false);
  });

  it("concludes link ready for new resource via actions", () => {
    const ready = stepLinkReadyForNewResourceWithActions(initialLinkReadyForNewResourceState(), {
      kind: "link/ready-for-new-resource-gate",
      outgoingCount: 0
    });
    expect(shouldLinkReadyForNewResource(ready.actions)).toBe(true);
    const busy = stepLinkReadyForNewResourceWithActions(initialLinkReadyForNewResourceState(), {
      kind: "link/ready-for-new-resource-gate",
      outgoingCount: 1
    });
    expect(shouldLinkBusyForNewResource(busy.actions)).toBe(true);
  });

});
