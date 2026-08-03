// @ts-nocheck
import { describe, expect, it } from "vitest";
import { Channel } from "../src/channel.js";
import {
  ChannelWindowLimits,
  applyChannelDelivery,
  channelAllowsSend,
  channelPacketTimeoutFromActions,
  channelPacketTimeoutSeconds,
  channelRingSequenceIndexFromActions,
  channelTxEnvelopeIndexFromActions,
  channelTxOutstandingCountFromActions,
  countChannelTxOutstanding,
  indexOfChannelRingSequence,
  indexOfChannelTxEnvelope,
  initialChannelAllowsSendState,
  initialChannelOutletTransmitState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelWindowState,
  initialCountChannelTxOutstandingState,
  initialIndexOfChannelRingSequenceState,
  initialIndexOfChannelTxEnvelopeState,
  isChannelOutletTransmitOk,
  shouldAcceptChannelOutletTransmit,
  shouldAllowChannelSend,
  shouldDenyChannelSend,
  shouldMissChannelRingSequenceIndex,
  shouldMissChannelTxEnvelopeIndex,
  shouldRejectChannelOutletTransmit,
  shouldUseChannelPacketTimeout,
  shouldUseChannelRingSequenceIndex,
  shouldUseChannelTxEnvelopeIndex,
  shouldUseChannelTxOutstandingCount,
  stepChannelAllowsSendWithActions,
  stepChannelOutletTransmitWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepCountChannelTxOutstandingWithActions,
  stepIndexOfChannelRingSequenceWithActions,
  stepIndexOfChannelTxEnvelopeWithActions
} from "@twistedpear/protocol";

describe("Channel window adapter", () => {
  it("exposes protocol window constants", () => {
    expect(Channel.WINDOW).toBe(ChannelWindowLimits.WINDOW);
    expect(Channel.RTT_SLOW).toBe(ChannelWindowLimits.RTT_SLOW);
    expect(Channel.SEQ_MODULUS).toBe(0x10000);
  });

  it("matches protocol initial window for slow RTT outlets", () => {
    const outlet = {
      rtt: ChannelWindowLimits.RTT_SLOW + 1,
      mdu: 500,
      isUsable: true
    };
    const channel = new Channel(outlet as never);
    const expected = initialChannelWindowState(outlet.rtt);
    expect(channel.window).toBe(expected.window);
    expect(channel.windowMax).toBe(expected.windowMax);
  });

  it("keeps delivery promotion aligned with protocol leaf", () => {
    let state = initialChannelWindowState(0.5);
    for (let i = 0; i < ChannelWindowLimits.FAST_RATE_THRESHOLD; i += 1) {
      state = applyChannelDelivery(state, 0.5);
    }
    expect(state.windowMax).toBe(Channel.WINDOW_MAX_MEDIUM);
  });

  it("matches legacy packet timeout formula via use-timeout actions", () => {
    const cases = [
      { tries: 1, rtt: 0.2, txRingLength: 0 },
      { tries: 2, rtt: 0.2, txRingLength: 1 },
      { tries: 3, rtt: 0.01, txRingLength: 4 },
      { tries: 5, rtt: 1.0, txRingLength: 2 }
    ];
    for (const input of cases) {
      const legacy =
        Math.pow(1.5, input.tries - 1) *
        Math.max(input.rtt * 2.5, 0.025) *
        (input.txRingLength + 1.5);
      const stepped = stepChannelPacketTimeoutSecondsWithActions(
        initialChannelPacketTimeoutSecondsState(),
        {
          kind: "channel/packet-timeout-gate",
          ...input
        }
      );
      expect(shouldUseChannelPacketTimeout(stepped.actions)).toBe(true);
      expect(channelPacketTimeoutFromActions(stepped.actions)).toBe(legacy);
      expect(channelPacketTimeoutFromActions(stepped.actions)).toBe(
        channelPacketTimeoutSeconds(input)
      );
    }
  });

  it("matches TX outstanding count via use-count actions", () => {
    const entries = [
      { packetPresent: true, delivered: false },
      { packetPresent: true, delivered: true },
      { packetPresent: false, delivered: false }
    ];
    const stepped = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "channel/tx-outstanding-gate",
        entries
      }
    );
    expect(shouldUseChannelTxOutstandingCount(stepped.actions)).toBe(true);
    expect(channelTxOutstandingCountFromActions(stepped.actions)).toBe(
      countChannelTxOutstanding(entries)
    );
  });

  it("matches send-allow via allow/deny actions", () => {
    const cases = [
      { isUsable: true, outstanding: 1, window: 2, allow: true },
      { isUsable: true, outstanding: 2, window: 2, allow: false },
      { isUsable: false, outstanding: 0, window: 2, allow: false }
    ];
    for (const input of cases) {
      const stepped = stepChannelAllowsSendWithActions(initialChannelAllowsSendState(), {
        kind: "channel/allows-send-gate",
        isUsable: input.isUsable,
        outstanding: input.outstanding,
        window: input.window
      });
      expect(shouldAllowChannelSend(stepped.actions)).toBe(input.allow);
      expect(shouldDenyChannelSend(stepped.actions)).toBe(!input.allow);
      expect(shouldAllowChannelSend(stepped.actions)).toBe(
        channelAllowsSend({
          isUsable: input.isUsable,
          outstanding: input.outstanding,
          window: input.window
        })
      );
    }
  });

  it("matches outlet-transmit via ok/reject actions", () => {
    const cases = [
      { packetPresent: true, rawLength: 10, receiptPresent: true, ok: true },
      { packetPresent: false, rawLength: 10, receiptPresent: true, ok: false },
      { packetPresent: true, rawLength: 0, receiptPresent: true, ok: false },
      { packetPresent: true, rawLength: 10, receiptPresent: false, ok: false }
    ];
    for (const input of cases) {
      const stepped = stepChannelOutletTransmitWithActions(initialChannelOutletTransmitState(), {
        kind: "channel/outlet-transmit-gate",
        packetPresent: input.packetPresent,
        rawLength: input.rawLength,
        receiptPresent: input.receiptPresent
      });
      expect(shouldAcceptChannelOutletTransmit(stepped.actions)).toBe(input.ok);
      expect(shouldRejectChannelOutletTransmit(stepped.actions)).toBe(!input.ok);
      expect(shouldAcceptChannelOutletTransmit(stepped.actions)).toBe(
        isChannelOutletTransmitOk({
          packetPresent: input.packetPresent,
          rawLength: input.rawLength,
          receiptPresent: input.receiptPresent
        })
      );
    }
  });

  it("matches TX-envelope index via use-index/miss actions", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const hit = stepIndexOfChannelTxEnvelopeWithActions(initialIndexOfChannelTxEnvelopeState(), {
      kind: "channel/tx-envelope-index-gate",
      packetIds: [null, a, b],
      targetId: new Uint8Array([3, 4])
    });
    expect(shouldUseChannelTxEnvelopeIndex(hit.actions)).toBe(true);
    expect(channelTxEnvelopeIndexFromActions(hit.actions)).toBe(
      indexOfChannelTxEnvelope({
        packetIds: [null, a, b],
        targetId: new Uint8Array([3, 4])
      })
    );

    const miss = stepIndexOfChannelTxEnvelopeWithActions(initialIndexOfChannelTxEnvelopeState(), {
      kind: "channel/tx-envelope-index-gate",
      packetIds: [a],
      targetId: null
    });
    expect(shouldMissChannelTxEnvelopeIndex(miss.actions)).toBe(true);
    expect(channelTxEnvelopeIndexFromActions(miss.actions)).toBeNull();
  });

  it("matches ring-sequence index via use-index/miss actions", () => {
    const hit = stepIndexOfChannelRingSequenceWithActions(
      initialIndexOfChannelRingSequenceState(),
      {
        kind: "channel/ring-sequence-index-gate",
        ringSequences: [2, 3, 5],
        target: 3
      }
    );
    expect(shouldUseChannelRingSequenceIndex(hit.actions)).toBe(true);
    expect(channelRingSequenceIndexFromActions(hit.actions)).toBe(
      indexOfChannelRingSequence({ ringSequences: [2, 3, 5], target: 3 })
    );

    const miss = stepIndexOfChannelRingSequenceWithActions(
      initialIndexOfChannelRingSequenceState(),
      {
        kind: "channel/ring-sequence-index-gate",
        ringSequences: [2, 3, 5],
        target: 9
      }
    );
    expect(shouldMissChannelRingSequenceIndex(miss.actions)).toBe(true);
    expect(channelRingSequenceIndexFromActions(miss.actions)).toBeNull();
  });
});
