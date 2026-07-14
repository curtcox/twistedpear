import { describe, expect, it } from "vitest";
import {
  LinkRequestReceiptStatus,
  initialLinkRequestReceiptState,
  shouldAttachLinkRequestPacketReceipt,
  shouldInvokeLinkRequestReceiptAction,
  shouldRegisterPendingLinkRequest,
  shouldUnregisterPendingLinkRequest,
  planUnregisterPendingLinkRequest,
  stepLinkRequestReceipt
} from "../src/link-request-receipt.js";

describe("protocol link request receipt", () => {
  it("steps timeout and response actions", () => {
    const timed = stepLinkRequestReceipt(initialLinkRequestReceiptState(), {
      kind: "request/timeout",
      at: 1
    });
    expect(timed.state.status).toBe(LinkRequestReceiptStatus.FAILED);
    expect(shouldInvokeLinkRequestReceiptAction(timed.actions, "failed")).toBe(true);
    expect(shouldInvokeLinkRequestReceiptAction(timed.actions, "response")).toBe(false);

    const ready = stepLinkRequestReceipt(initialLinkRequestReceiptState(), {
      kind: "request/response",
      at: 2,
      response: new Uint8Array([1])
    });
    expect(ready.state.status).toBe(LinkRequestReceiptStatus.READY);
    expect(shouldInvokeLinkRequestReceiptAction(ready.actions, "response")).toBe(true);
  });

  it("gates register and packet-receipt attach", () => {
    expect(shouldRegisterPendingLinkRequest(false)).toBe(true);
    expect(shouldRegisterPendingLinkRequest(true)).toBe(false);
    expect(shouldAttachLinkRequestPacketReceipt(true)).toBe(true);
    expect(shouldAttachLinkRequestPacketReceipt(false)).toBe(false);
    expect(planUnregisterPendingLinkRequest(2)).toBe(2);
    expect(planUnregisterPendingLinkRequest(-1)).toBeNull();
    expect(shouldUnregisterPendingLinkRequest(true)).toBe(true);
    expect(shouldUnregisterPendingLinkRequest(false)).toBe(false);
  });
});
