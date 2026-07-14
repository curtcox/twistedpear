import { describe, expect, it } from "vitest";
import {
  LxmfMessageState,
  applyLxmfSendEvent,
  initialLxmfReceiptSendState,
  initialLxmfSendState,
  lxmfReceiptSendApplyEvent,
  planLxmfReceiptSendOutcome,
  shouldApplyLxmfReceiptSend,
  shouldApplyLxmfReceiptSendState,
  shouldSkipLxmfReceiptSend,
  stepLxmfReceiptSendWithActions,
  stepLxmfSend
} from "../src/lxmf-send-state.js";

describe("protocol LXMF send-state", () => {
  it("enqueues then begins sending", () => {
    let state = initialLxmfSendState();
    state = applyLxmfSendEvent(state, { kind: "lxmf/enqueue" });
    expect(state.state).toBe(LxmfMessageState.OUTBOUND);
    state = applyLxmfSendEvent(state, { kind: "lxmf/begin-sending" });
    expect(state.state).toBe(LxmfMessageState.SENDING);
  });

  it("marks opportunistic receipt delivery", () => {
    let state = applyLxmfSendEvent(initialLxmfSendState(), { kind: "lxmf/enqueue" });
    state = applyLxmfSendEvent(state, { kind: "lxmf/mark-sent", progress: 0.5 });
    expect(state).toEqual({ state: LxmfMessageState.SENT, progress: 0.5 });
    state = applyLxmfSendEvent(state, {
      kind: "lxmf/receipt-result",
      delivered: true,
      onDelivered: "delivered"
    });
    expect(state).toEqual({ state: LxmfMessageState.DELIVERED, progress: 1 });
  });

  it("marks propagated receipt as SENT on success and FAILED otherwise", () => {
    const sent = applyLxmfSendEvent(initialLxmfSendState(LxmfMessageState.SENDING, 0.5), {
      kind: "lxmf/receipt-result",
      delivered: true,
      onDelivered: "sent"
    });
    expect(sent).toEqual({ state: LxmfMessageState.SENT, progress: 1 });

    const failed = applyLxmfSendEvent(initialLxmfSendState(LxmfMessageState.SENDING, 0.5), {
      kind: "lxmf/receipt-result",
      delivered: false,
      onDelivered: "sent"
    });
    expect(failed.state).toBe(LxmfMessageState.FAILED);
    expect(failed.progress).toBe(0.5);
  });

  it("plans opportunistic receipt send outcomes", () => {
    expect(
      planLxmfReceiptSendOutcome({
        mode: "opportunistic",
        phase: "after-send",
        receiptPresent: false,
        delivered: false
      })
    ).toEqual({ kind: "lxmf/mark-failed" });
    expect(
      planLxmfReceiptSendOutcome({
        mode: "opportunistic",
        phase: "after-send",
        receiptPresent: true,
        delivered: false
      })
    ).toEqual({ kind: "lxmf/mark-sent", progress: 0.5 });
    expect(
      planLxmfReceiptSendOutcome({
        mode: "opportunistic",
        phase: "after-poll",
        receiptPresent: true,
        delivered: true
      })
    ).toEqual({
      kind: "lxmf/receipt-result",
      delivered: true,
      onDelivered: "delivered"
    });
    expect(
      planLxmfReceiptSendOutcome({
        mode: "opportunistic",
        phase: "after-poll",
        receiptPresent: true,
        delivered: false
      })
    ).toBeNull();
  });

  it("plans propagated receipt send outcomes", () => {
    expect(
      planLxmfReceiptSendOutcome({
        mode: "propagated",
        phase: "after-send",
        receiptPresent: true,
        delivered: false
      })
    ).toEqual({ kind: "lxmf/progress", progress: 0.5 });
    expect(
      planLxmfReceiptSendOutcome({
        mode: "propagated",
        phase: "after-poll",
        receiptPresent: true,
        delivered: true
      })
    ).toEqual({
      kind: "lxmf/receipt-result",
      delivered: true,
      onDelivered: "sent"
    });
    expect(
      planLxmfReceiptSendOutcome({
        mode: "propagated",
        phase: "after-poll",
        receiptPresent: false,
        delivered: false
      })
    ).toEqual({
      kind: "lxmf/receipt-result",
      delivered: false,
      onDelivered: "sent"
    });
    expect(shouldApplyLxmfReceiptSendState(true)).toBe(true);
    expect(shouldApplyLxmfReceiptSendState(false)).toBe(false);
  });

  it("emits receipt-send map actions from stepLxmfReceiptSendWithActions", () => {
    const afterSend = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "opportunistic",
      phase: "after-send",
      receiptPresent: true,
      delivered: false
    });
    expect(shouldApplyLxmfReceiptSend(afterSend.actions)).toBe(true);
    expect(lxmfReceiptSendApplyEvent(afterSend.actions)).toEqual({
      kind: "lxmf/mark-sent",
      progress: 0.5
    });

    const skip = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "opportunistic",
      phase: "after-poll",
      receiptPresent: true,
      delivered: false
    });
    expect(shouldSkipLxmfReceiptSend(skip.actions)).toBe(true);
    expect(lxmfReceiptSendApplyEvent(skip.actions)).toBeNull();

    const propagated = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "propagated",
      phase: "after-poll",
      receiptPresent: true,
      delivered: true
    });
    expect(lxmfReceiptSendApplyEvent(propagated.actions)).toEqual({
      kind: "lxmf/receipt-result",
      delivered: true,
      onDelivered: "sent"
    });

    expect(
      stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for receipt-send/map events", () => {
    const state = initialLxmfReceiptSendState();
    const event = {
      kind: "receipt-send/map" as const,
      mode: "opportunistic" as const,
      phase: "after-send" as const,
      receiptPresent: true,
      delivered: false
    };
    const a = stepLxmfReceiptSendWithActions(state, event);
    const b = stepLxmfReceiptSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("is deterministic under double-run", () => {
    const run = () => {
      let state = initialLxmfSendState();
      for (const event of [
        { kind: "lxmf/enqueue" as const },
        { kind: "lxmf/begin-sending" as const },
        { kind: "lxmf/mark-delivered" as const }
      ]) {
        state = stepLxmfSend(state, event).state;
      }
      return state;
    };
    expect(run()).toEqual(run());
  });
});
