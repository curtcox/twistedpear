import { describe, expect, it } from "vitest";
import { Channel } from "../src/channel.js";
import {
  ChannelWindowLimits,
  applyChannelDelivery,
  channelAllowsSend,
  channelPacketTimeoutFromActions,
  channelPacketTimeoutSeconds,
  channelTxOutstandingCountFromActions,
  countChannelTxOutstanding,
  initialChannelAllowsSendState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelWindowState,
  initialCountChannelTxOutstandingState,
  shouldAllowChannelSend,
  shouldDenyChannelSend,
  shouldUseChannelPacketTimeout,
  shouldUseChannelTxOutstandingCount,
  stepChannelAllowsSendWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepCountChannelTxOutstandingWithActions
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
});
