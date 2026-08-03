// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  DEVICE_STREAM_KIND,
  drainJitterBuffer,
  initialJitterBuffer,
  pushJitterFrame,
  updateClockOffset,
  type DeviceStreamFrame
} from "../src/index.js";

function frame(sequence: number, captureAtUs: number): Extract<DeviceStreamFrame, { version: 2 }> {
  return {
    version: 2,
    sampleKind: DEVICE_STREAM_KIND.pcm,
    sessionToken: 1,
    sequence,
    captureAtUs,
    clockId: 1,
    payload: new Uint8Array([sequence])
  };
}

describe("media timing", () => {
  it("estimates clock offset by halving RTT", () => {
    const estimate = updateClockOffset(null, { sentAtUs: 1_000, receivedAtUs: 1_200, remoteAtUs: 1_150 });
    expect(estimate).toEqual({ offsetUs: 50, rttUs: 200, samples: 1 });
  });

  it("orders capture timestamps and drains only presentation-ready frames", () => {
    let state = initialJitterBuffer(100);
    state = pushJitterFrame(state, { frame: frame(2, 1_100), receivedAtUs: 1_050 }, 1_050);
    state = pushJitterFrame(state, { frame: frame(1, 1_000), receivedAtUs: 1_040 }, 1_050);
    const first = drainJitterBuffer(state, 1_100);
    expect(first.ready.map((entry) => entry.frame.sequence)).toEqual([1]);
    expect(drainJitterBuffer(first.state, 1_200).ready.map((entry) => entry.frame.sequence)).toEqual([2]);
  });
});
