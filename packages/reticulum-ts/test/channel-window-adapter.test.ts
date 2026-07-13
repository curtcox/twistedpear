import { describe, expect, it } from "vitest";
import { Channel } from "../src/channel.js";
import {
  ChannelWindowLimits,
  applyChannelDelivery,
  initialChannelWindowState
} from "@twistedpear/protocol";

describe("Channel window adapter", () => {
  it("exposes protocol window constants", () => {
    expect(Channel.WINDOW).toBe(ChannelWindowLimits.WINDOW);
    expect(Channel.RTT_SLOW).toBe(ChannelWindowLimits.RTT_SLOW);
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
});
