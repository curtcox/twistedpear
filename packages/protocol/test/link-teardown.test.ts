import { describe, expect, it } from "vitest";
import {
  ChannelMessageState,
  channelMessageStateFromPacketReceipt
} from "../src/channel-envelope.js";
import { PacketReceiptStatus } from "../src/packet-receipt-timeout.js";
import {
  planLinkTeardown,
  planLinkTeardownReason
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
  });
});
