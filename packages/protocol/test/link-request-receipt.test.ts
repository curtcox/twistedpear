import { describe, expect, it } from "vitest";
import {
  LinkRequestReceiptStatus,
  initialLinkRequestReceiptState,
  shouldAttachLinkRequestPacketReceipt,
  shouldInvokeLinkRequestReceiptAction,
  shouldRegisterPendingLinkRequest,
  shouldRemovePendingLinkRequest,
  shouldUnregisterPendingLinkRequest,
  initialPendingLinkRequestUnregisterState,
  pendingLinkRequestUnregisterIndex,
  planUnregisterPendingLinkRequest,
  stepLinkRequestReceipt,
  stepPendingLinkRequestUnregisterWithActions
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

    const remove = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      { kind: "link/pending-request-unregister-gate", index: 2 }
    );
    expect(shouldRemovePendingLinkRequest(remove.actions)).toBe(true);
    expect(pendingLinkRequestUnregisterIndex(remove.actions)).toBe(2);

    const skip = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      { kind: "link/pending-request-unregister-gate", index: -1 }
    );
    expect(shouldRemovePendingLinkRequest(skip.actions)).toBe(false);
    expect(pendingLinkRequestUnregisterIndex(skip.actions)).toBeNull();
  });
});
