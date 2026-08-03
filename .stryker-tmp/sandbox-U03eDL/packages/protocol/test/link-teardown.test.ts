// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  ChannelMessageState,
  channelMessageStateFromPacketReceipt
} from "../src/channel-envelope.js";
import { PacketReceiptStatus } from "../src/packet-receipt-timeout.js";
import {
  initialAcceptLinkTeardownState,
  initialLinkTeardownPlanState,
  initialLinkTeardownReasonPlanState,
  initialLinkTeardownReasonState,
  initialLinkTeardownState,
  linkTeardownPlanFromActions,
  linkTeardownReasonFromActions,
  linkTeardownReasonPlanFromActions,
  linkTeardownRemoteCloseAction,
  linkTeardownSendThenCloseAction,
  planLinkTeardown,
  planLinkTeardownReason,
  shouldAcceptLinkTeardown,
  shouldAcceptLinkTeardownNow,
  shouldAcceptRemoteLinkTeardown,
  shouldCloseOnlyLinkTeardown,
  shouldCloseOnlyLinkTeardownPlan,
  shouldSendLinkTeardownThenClose,
  shouldSendLinkTeardownThenClosePlan,
  shouldSkipLinkTeardownAccept,
  shouldUseLinkTeardownReason,
  shouldUseLinkTeardownReasonPlan,
  stepAcceptLinkTeardownWithActions,
  stepLinkTeardown,
  stepLinkTeardownPlanWithActions,
  stepLinkTeardownReasonPlanWithActions,
  stepLinkTeardownReasonWithActions,
  stepLinkTeardownWithActions
} from "../src/link-teardown.js";
import { LinkStatus, LinkTeardownReason } from "../src/link-watchdog.js";

describe("channelMessageStateFromPacketReceipt", () => {
  it("maps receipt statuses to channel message states", () => {
    expect(channelMessageStateFromPacketReceipt(null)).toBe(ChannelMessageState.MSGSTATE_FAILED);
    expect(channelMessageStateFromPacketReceipt(PacketReceiptStatus.SENT)).toBe(
      ChannelMessageState.MSGSTATE_SENT
    );
    expect(channelMessageStateFromPacketReceipt(PacketReceiptStatus.DELIVERED)).toBe(
      ChannelMessageState.MSGSTATE_DELIVERED
    );
    expect(channelMessageStateFromPacketReceipt(PacketReceiptStatus.FAILED)).toBe(
      ChannelMessageState.MSGSTATE_FAILED
    );
  });
});

describe("link teardown planning", () => {
  it("closes only for pending/closed, otherwise sends teardown", () => {
    expect(planLinkTeardown(LinkStatus.PENDING)).toEqual({ kind: "close-only" });
    expect(planLinkTeardown(LinkStatus.CLOSED)).toEqual({ kind: "close-only" });
    expect(planLinkTeardown(LinkStatus.ACTIVE)).toEqual({ kind: "send-teardown-then-close" });

    const pending = stepLinkTeardownPlanWithActions(initialLinkTeardownPlanState(), {
      kind: "link/teardown-plan-gate",
      status: LinkStatus.PENDING
    });
    expect(pending.actions).toEqual([{ kind: "close-only" }]);
    expect(shouldCloseOnlyLinkTeardownPlan(pending.actions)).toBe(true);
    expect(shouldSendLinkTeardownThenClosePlan(pending.actions)).toBe(false);
    expect(linkTeardownPlanFromActions(pending.actions)).toEqual({ kind: "close-only" });

    const active = stepLinkTeardownPlanWithActions(initialLinkTeardownPlanState(), {
      kind: "link/teardown-plan-gate",
      status: LinkStatus.ACTIVE
    });
    expect(active.actions).toEqual([{ kind: "send-teardown-then-close" }]);
    expect(shouldCloseOnlyLinkTeardownPlan(active.actions)).toBe(false);
    expect(shouldSendLinkTeardownThenClosePlan(active.actions)).toBe(true);
    expect(linkTeardownPlanFromActions(active.actions)).toEqual({
      kind: "send-teardown-then-close"
    });
    expect(linkTeardownPlanFromActions([])).toBeNull();
  });

  it("plans local and remote teardown reasons", () => {
    expect(planLinkTeardownReason({ initiator: true, remote: false })).toBe(
      LinkTeardownReason.INITIATOR_CLOSED
    );
    expect(planLinkTeardownReason({ initiator: false, remote: false })).toBe(
      LinkTeardownReason.DESTINATION_CLOSED
    );
    expect(planLinkTeardownReason({ initiator: true, remote: true })).toBe(
      LinkTeardownReason.DESTINATION_CLOSED
    );
    expect(planLinkTeardownReason({ initiator: false, remote: true })).toBe(
      LinkTeardownReason.INITIATOR_CLOSED
    );

    const localInitiatorPlan = stepLinkTeardownReasonPlanWithActions(
      initialLinkTeardownReasonPlanState(),
      {
        kind: "link/teardown-reason-plan-gate",
        initiator: true,
        remote: false
      }
    );
    expect(linkTeardownReasonPlanFromActions(localInitiatorPlan.actions)).toBe(
      LinkTeardownReason.INITIATOR_CLOSED
    );
    expect(shouldUseLinkTeardownReasonPlan(localInitiatorPlan.actions)).toBe(true);

    const localInitiator = stepLinkTeardownReasonWithActions(initialLinkTeardownReasonState(), {
      kind: "link/teardown-reason-gate",
      initiator: true,
      remote: false
    });
    expect(localInitiator.actions).toEqual([
      { kind: "use-reason", reason: LinkTeardownReason.INITIATOR_CLOSED }
    ]);
    expect(shouldUseLinkTeardownReason(localInitiator.actions)).toBe(true);
    expect(linkTeardownReasonFromActions(localInitiator.actions)).toBe(
      LinkTeardownReason.INITIATOR_CLOSED
    );

    const remoteInitiator = stepLinkTeardownReasonWithActions(initialLinkTeardownReasonState(), {
      kind: "link/teardown-reason-gate",
      initiator: true,
      remote: true
    });
    expect(linkTeardownReasonFromActions(remoteInitiator.actions)).toBe(
      LinkTeardownReason.DESTINATION_CLOSED
    );
    expect(linkTeardownReasonFromActions([])).toBeNull();
    expect(linkTeardownReasonPlanFromActions([])).toBeNull();
  });

  it("accepts teardown only with present matching link-id plaintext", () => {
    expect(
      shouldAcceptLinkTeardown({
        plaintextPresent: true,
        linkIdMatches: true
      })
    ).toBe(true);
    expect(
      shouldAcceptLinkTeardown({
        plaintextPresent: false,
        linkIdMatches: false
      })
    ).toBe(false);
    expect(
      shouldAcceptLinkTeardown({
        plaintextPresent: true,
        linkIdMatches: false
      })
    ).toBe(false);

    const accept = stepAcceptLinkTeardownWithActions(initialAcceptLinkTeardownState(), {
      kind: "link/accept-teardown-gate",
      plaintextPresent: true,
      linkIdMatches: true
    });
    expect(accept.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptLinkTeardownNow(accept.actions)).toBe(true);
    expect(shouldSkipLinkTeardownAccept(accept.actions)).toBe(false);

    const skip = stepAcceptLinkTeardownWithActions(initialAcceptLinkTeardownState(), {
      kind: "link/accept-teardown-gate",
      plaintextPresent: true,
      linkIdMatches: false
    });
    expect(skip.actions).toEqual([{ kind: "skip" }]);
    expect(shouldAcceptLinkTeardownNow(skip.actions)).toBe(false);
    expect(shouldSkipLinkTeardownAccept(skip.actions)).toBe(true);
  });

  it("emits teardown actions for local close-only / send / remote accept", () => {
    const pending = initialLinkTeardownState({
      status: LinkStatus.PENDING,
      initiator: true
    });
    const closeOnly = stepLinkTeardownWithActions(pending, { kind: "teardown/local" });
    expect(closeOnly.actions).toEqual([{ kind: "close-only" }]);
    expect(shouldCloseOnlyLinkTeardown(closeOnly.actions)).toBe(true);
    expect(closeOnly.state.status).toBe(LinkStatus.CLOSED);

    const active = initialLinkTeardownState({
      status: LinkStatus.ACTIVE,
      initiator: true
    });
    const send = stepLinkTeardownWithActions(active, { kind: "teardown/local" });
    expect(send.actions).toEqual([
      {
        kind: "send-teardown-then-close",
        reason: LinkTeardownReason.INITIATOR_CLOSED
      }
    ]);
    expect(shouldSendLinkTeardownThenClose(send.actions)).toBe(true);
    expect(linkTeardownSendThenCloseAction(send.actions)).toEqual(send.actions[0]);

    const responder = stepLinkTeardownWithActions(
      initialLinkTeardownState({ status: LinkStatus.HANDSHAKE, initiator: false }),
      { kind: "teardown/local" }
    );
    expect(responder.actions).toEqual([
      {
        kind: "send-teardown-then-close",
        reason: LinkTeardownReason.DESTINATION_CLOSED
      }
    ]);

    const ignored = stepLinkTeardownWithActions(active, {
      kind: "teardown/remote",
      plaintextPresent: true,
      linkIdMatches: false
    });
    expect(ignored.actions).toEqual([]);
    expect(shouldAcceptRemoteLinkTeardown(ignored.actions)).toBe(false);

    const remote = stepLinkTeardownWithActions(active, {
      kind: "teardown/remote",
      plaintextPresent: true,
      linkIdMatches: true
    });
    expect(remote.actions).toEqual([
      {
        kind: "accept-remote-close",
        reason: LinkTeardownReason.DESTINATION_CLOSED
      }
    ]);
    expect(shouldAcceptRemoteLinkTeardown(remote.actions)).toBe(true);
    expect(linkTeardownRemoteCloseAction(remote.actions)).toEqual(remote.actions[0]);

    const stripped = stepLinkTeardown(pending, { kind: "teardown/local" });
    expect(stripped).toEqual({
      state: closeOnly.state,
      intents: closeOnly.intents
    });
  });

  it("teardown actions double-run identically", () => {
    const run = () => {
      const steps = [];
      steps.push(
        stepLinkTeardownWithActions(
          initialLinkTeardownState({ status: LinkStatus.PENDING, initiator: true }),
          { kind: "teardown/local" }
        )
      );
      steps.push(
        stepLinkTeardownWithActions(
          initialLinkTeardownState({ status: LinkStatus.ACTIVE, initiator: false }),
          { kind: "teardown/local" }
        )
      );
      steps.push(
        stepLinkTeardownWithActions(
          initialLinkTeardownState({ status: LinkStatus.ACTIVE, initiator: true }),
          {
            kind: "teardown/remote",
            plaintextPresent: true,
            linkIdMatches: true
          }
        )
      );
      return steps.map((s) => ({
        status: s.state.status,
        actions: s.actions,
        intents: s.intents
      }));
    };
    expect(run()).toEqual(run());
  });
});
