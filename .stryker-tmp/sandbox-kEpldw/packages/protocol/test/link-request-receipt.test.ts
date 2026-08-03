// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  LinkRequestReceiptStatus,
  initialAttachLinkRequestPacketReceiptState,
  initialLinkRequestReceiptState,
  shouldAttachLinkRequestPacketReceipt,
  shouldAttachLinkRequestPacketReceiptNow,
  shouldInvokeLinkRequestReceiptAction,
  shouldRegisterPendingLinkRequest,
  shouldRegisterPendingLinkRequestNow,
  shouldRemovePendingLinkRequest,
  shouldRemovePendingLinkRequestUnregisterPlan,
  shouldSkipLinkRequestPacketReceiptAttach,
  shouldSkipPendingLinkRequestRegister,
  shouldUnregisterPendingLinkRequest,
  initialPendingLinkRequestRegisterState,
  initialPendingLinkRequestUnregisterPlanState,
  initialPendingLinkRequestUnregisterState,
  pendingLinkRequestUnregisterIndex,
  pendingLinkRequestUnregisterPlanIndex,
  planUnregisterPendingLinkRequest,
  stepAttachLinkRequestPacketReceiptWithActions,
  stepLinkRequestReceipt,
  stepPendingLinkRequestRegisterWithActions,
  stepPendingLinkRequestUnregisterPlanWithActions,
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

    const register = stepPendingLinkRequestRegisterWithActions(
      initialPendingLinkRequestRegisterState(),
      {
        kind: "link/pending-request-register-gate",
        alreadyPresent: false
      }
    );
    expect(shouldRegisterPendingLinkRequestNow(register.actions)).toBe(true);
    expect(shouldSkipPendingLinkRequestRegister(register.actions)).toBe(false);

    const skipRegister = stepPendingLinkRequestRegisterWithActions(
      initialPendingLinkRequestRegisterState(),
      {
        kind: "link/pending-request-register-gate",
        alreadyPresent: true
      }
    );
    expect(shouldRegisterPendingLinkRequestNow(skipRegister.actions)).toBe(false);
    expect(shouldSkipPendingLinkRequestRegister(skipRegister.actions)).toBe(true);

    const attach = stepAttachLinkRequestPacketReceiptWithActions(
      initialAttachLinkRequestPacketReceiptState(),
      {
        kind: "link/attach-request-packet-receipt-gate",
        packetReceiptPresent: true
      }
    );
    expect(shouldAttachLinkRequestPacketReceiptNow(attach.actions)).toBe(true);
    expect(shouldSkipLinkRequestPacketReceiptAttach(attach.actions)).toBe(false);

    const skipAttach = stepAttachLinkRequestPacketReceiptWithActions(
      initialAttachLinkRequestPacketReceiptState(),
      {
        kind: "link/attach-request-packet-receipt-gate",
        packetReceiptPresent: false
      }
    );
    expect(shouldAttachLinkRequestPacketReceiptNow(skipAttach.actions)).toBe(false);
    expect(shouldSkipLinkRequestPacketReceiptAttach(skipAttach.actions)).toBe(true);

    const removePlan = stepPendingLinkRequestUnregisterPlanWithActions(
      initialPendingLinkRequestUnregisterPlanState(),
      { kind: "link/pending-request-unregister-plan-gate", index: 2 }
    );
    expect(shouldRemovePendingLinkRequestUnregisterPlan(removePlan.actions)).toBe(true);
    expect(pendingLinkRequestUnregisterPlanIndex(removePlan.actions)).toBe(2);

    const remove = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      { kind: "link/pending-request-unregister-gate", index: 2 }
    );
    expect(shouldRemovePendingLinkRequest(remove.actions)).toBe(true);
    expect(pendingLinkRequestUnregisterIndex(remove.actions)).toBe(2);

    const skipPlan = stepPendingLinkRequestUnregisterPlanWithActions(
      initialPendingLinkRequestUnregisterPlanState(),
      { kind: "link/pending-request-unregister-plan-gate", index: -1 }
    );
    expect(shouldRemovePendingLinkRequestUnregisterPlan(skipPlan.actions)).toBe(false);
    expect(pendingLinkRequestUnregisterPlanIndex(skipPlan.actions)).toBeNull();

    const skip = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      { kind: "link/pending-request-unregister-gate", index: -1 }
    );
    expect(shouldRemovePendingLinkRequest(skip.actions)).toBe(false);
    expect(pendingLinkRequestUnregisterIndex(skip.actions)).toBeNull();
  });
});
