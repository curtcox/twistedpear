import { describe, expect, it } from "vitest";
import {
  CHANNEL_MAX_TRIES,
  ChannelWindowLimits,
  applyChannelDelivery,
  applyChannelTimeout,
  channelAllowsSend,
  channelPacketTimeoutSeconds,
  channelRetryExhausted,
  countChannelTxOutstanding,
  canArmChannelPacketReceipt,
  initialChannelWindowState,
  isChannelOutletTransmitOk,
  planChannelPacketTimeout,
  planChannelSend,
  planChannelTxEnvelopeOp,
  shouldApplyChannelPacketReceiptTimeout,
  shouldExtendPacketReceiptTimeout,
  shouldReplaceChannelResentPacket,
  shouldResendChannelTimeoutPacket,
  indexOfChannelTxEnvelope,
  stepChannelWindow
} from "../src/channel-window.js";

describe("protocol channel window", () => {
  it("initializes a constrained window for slow RTT", () => {
    const slow = initialChannelWindowState(ChannelWindowLimits.RTT_SLOW + 0.1);
    expect(slow).toEqual({
      window: 1,
      windowMax: 1,
      windowMin: 1,
      windowFlexibility: 1,
      fastRateRounds: 0,
      mediumRateRounds: 0
    });

    const normal = initialChannelWindowState(0.5);
    expect(normal.window).toBe(ChannelWindowLimits.WINDOW);
    expect(normal.windowMax).toBe(ChannelWindowLimits.WINDOW_MAX_SLOW);
  });

  it("computes packet timeouts deterministically", () => {
    const a = channelPacketTimeoutSeconds({ tries: 2, rtt: 0.2, txRingLength: 1 });
    const b = channelPacketTimeoutSeconds({ tries: 2, rtt: 0.2, txRingLength: 1 });
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it("shrinks on timeout and grows on delivery", () => {
    let state = initialChannelWindowState(0.5);
    state = { ...state, window: 3, windowMax: 7 };
    state = applyChannelTimeout(state);
    expect(state.window).toBe(2);
    // windowMax shrinks only while > windowMin + flexibility (2 + 4)
    expect(state.windowMax).toBe(6);

    state = applyChannelDelivery(state, 0.5);
    expect(state.window).toBe(3);
  });

  it("promotes to medium window after enough medium-RTT deliveries", () => {
    let state = initialChannelWindowState(0.5);
    for (let i = 0; i < ChannelWindowLimits.FAST_RATE_THRESHOLD; i += 1) {
      state = applyChannelDelivery(state, 0.5);
    }
    expect(state.windowMax).toBe(ChannelWindowLimits.WINDOW_MAX_MEDIUM);
    expect(state.windowMin).toBe(ChannelWindowLimits.WINDOW_MIN_LIMIT_MEDIUM);
  });

  it("gates send readiness", () => {
    expect(channelAllowsSend({ isUsable: true, outstanding: 1, window: 2 })).toBe(true);
    expect(channelAllowsSend({ isUsable: true, outstanding: 2, window: 2 })).toBe(false);
    expect(channelAllowsSend({ isUsable: false, outstanding: 0, window: 2 })).toBe(false);
    expect(channelRetryExhausted(5, 5)).toBe(true);
    expect(channelRetryExhausted(4, 5)).toBe(false);
  });

  it("plans channel send ready / too-big / proceed", () => {
    expect(
      planChannelSend({
        ready: false,
        packedLength: null,
        mdu: 100
      })
    ).toBe("link-not-ready");
    expect(
      planChannelSend({
        ready: true,
        packedLength: null,
        mdu: 100
      })
    ).toBe("proceed");
    expect(
      planChannelSend({
        ready: true,
        packedLength: 50,
        mdu: 100
      })
    ).toBe("proceed");
    expect(
      planChannelSend({
        ready: true,
        packedLength: 200,
        mdu: 100
      })
    ).toBe("too-big");
  });

  it("gates outlet transmit results", () => {
    expect(
      isChannelOutletTransmitOk({ packetPresent: true, rawLength: 10, receiptPresent: true })
    ).toBe(true);
    expect(
      isChannelOutletTransmitOk({ packetPresent: false, rawLength: 10, receiptPresent: true })
    ).toBe(false);
    expect(
      isChannelOutletTransmitOk({ packetPresent: true, rawLength: 0, receiptPresent: true })
    ).toBe(false);
    expect(
      isChannelOutletTransmitOk({ packetPresent: true, rawLength: 10, receiptPresent: false })
    ).toBe(false);
  });

  it("counts TX outstanding from packet presence and delivery", () => {
    expect(
      countChannelTxOutstanding([
        { packetPresent: false, delivered: false },
        { packetPresent: true, delivered: false },
        { packetPresent: true, delivered: true }
      ])
    ).toBe(2);
    expect(countChannelTxOutstanding([])).toBe(0);
  });

  it("extends receipt timeout only when updated is greater", () => {
    expect(
      shouldExtendPacketReceiptTimeout({ currentTimeout: null, updatedTimeout: 1 })
    ).toBe(false);
    expect(
      shouldExtendPacketReceiptTimeout({ currentTimeout: 2, updatedTimeout: 2 })
    ).toBe(false);
    expect(
      shouldExtendPacketReceiptTimeout({ currentTimeout: 2, updatedTimeout: 3 })
    ).toBe(true);
  });

  it("arms channel packet receipts when present", () => {
    expect(canArmChannelPacketReceipt(true)).toBe(true);
    expect(canArmChannelPacketReceipt(false)).toBe(false);
  });

  it("plans TX envelope ops and receipt timeout / resent gates", () => {
    expect(
      planChannelTxEnvelopeOp({ indexOk: true, envelopePresent: true })
    ).toBe("process");
    expect(
      planChannelTxEnvelopeOp({ indexOk: false, envelopePresent: true })
    ).toBe("miss");
    expect(
      planChannelTxEnvelopeOp({ indexOk: true, envelopePresent: true, opOk: false })
    ).toBe("miss");
    expect(shouldApplyChannelPacketReceiptTimeout(true)).toBe(true);
    expect(shouldApplyChannelPacketReceiptTimeout(false)).toBe(false);
    expect(shouldReplaceChannelResentPacket(true)).toBe(true);
    expect(shouldReplaceChannelResentPacket(false)).toBe(false);
    expect(shouldResendChannelTimeoutPacket(true)).toBe(true);
    expect(shouldResendChannelTimeoutPacket(false)).toBe(false);
  });

  it("finds TX envelope index by packet id", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    expect(
      indexOfChannelTxEnvelope({
        packetIds: [null, a, b],
        targetId: new Uint8Array([3, 4])
      })
    ).toBe(2);
    expect(indexOfChannelTxEnvelope({ packetIds: [a], targetId: null })).toBeNull();
    expect(
      indexOfChannelTxEnvelope({ packetIds: [a], targetId: new Uint8Array([9, 9]) })
    ).toBeNull();
  });

  it("plans packet timeout ignore / retry / give-up", () => {
    expect(CHANNEL_MAX_TRIES).toBe(5);
    expect(planChannelPacketTimeout({ delivered: true, tries: 1 })).toEqual({ kind: "ignore" });
    expect(planChannelPacketTimeout({ delivered: false, tries: 2 })).toEqual({
      kind: "retry",
      nextTries: 3
    });
    expect(planChannelPacketTimeout({ delivered: false, tries: 5 })).toEqual({ kind: "give-up" });
  });

  it("steps window timeout and delivery events", () => {
    let state = initialChannelWindowState(0.5);
    state = { ...state, window: 3, windowMax: 7 };
    state = stepChannelWindow(state, { kind: "channel/timeout" }).state;
    expect(state.window).toBe(2);
    state = stepChannelWindow(state, { kind: "channel/delivered", rtt: 0.5 }).state;
    expect(state.window).toBe(3);
  });
});
