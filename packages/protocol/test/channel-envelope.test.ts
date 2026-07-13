import { describe, expect, it } from "vitest";
import {
  CHANNEL_ENVELOPE_HEADER_SIZE,
  CHANNEL_SEQ_MODULUS,
  ChannelMessageState,
  channelPayloadMdu,
  isChannelSystemMsgType,
  nextChannelSequence,
  packChannelEnvelope,
  unpackChannelEnvelope
} from "../src/channel-envelope.js";
import {
  channelEmplaceIndex,
  drainContiguousChannelSequences,
  insertChannelSequence,
  shouldAcceptChannelSequence
} from "../src/channel-reorder.js";

describe("protocol channel envelope", () => {
  it("exposes channel message states", () => {
    expect(ChannelMessageState.MSGSTATE_NEW).toBe(0);
    expect(ChannelMessageState.MSGSTATE_DELIVERED).toBe(2);
    expect(ChannelMessageState.MSGSTATE_FAILED).toBe(3);
  });

  it("round-trips envelope framing", () => {
    const packed = packChannelEnvelope({
      msgType: 0x0102,
      sequence: 7,
      payload: Uint8Array.from([9, 8, 7])
    });
    expect(packed).toHaveLength(CHANNEL_ENVELOPE_HEADER_SIZE + 3);
    const unpacked = unpackChannelEnvelope(packed);
    expect(unpacked).not.toBeNull();
    expect(unpacked!.msgType).toBe(0x0102);
    expect(unpacked!.sequence).toBe(7);
    expect([...unpacked!.payload]).toEqual([9, 8, 7]);
  });

  it("rejects truncated envelopes", () => {
    expect(unpackChannelEnvelope(new Uint8Array(5))).toBeNull();
    const packed = packChannelEnvelope({
      msgType: 1,
      sequence: 1,
      payload: Uint8Array.from([1, 2, 3])
    });
    expect(unpackChannelEnvelope(packed.subarray(0, packed.length - 1))).toBeNull();
  });

  it("classifies system msgtypes and payload MDU", () => {
    expect(isChannelSystemMsgType(0xf000)).toBe(true);
    expect(isChannelSystemMsgType(0x0fff)).toBe(false);
    expect(channelPayloadMdu(100)).toBe(94);
    expect(nextChannelSequence(CHANNEL_SEQ_MODULUS - 1)).toBe(0);
  });
});

describe("protocol channel reorder", () => {
  it("accepts in-window sequences and wraparound replays carefully", () => {
    expect(
      shouldAcceptChannelSequence({ sequence: 5, nextRxSequence: 5, windowMax: 48 })
    ).toBe(true);
    expect(
      shouldAcceptChannelSequence({ sequence: 4, nextRxSequence: 5, windowMax: 48 })
    ).toBe(false);

    // Wrap: nextRx near end, overflow wraps below nextRx.
    expect(
      shouldAcceptChannelSequence({
        sequence: 2,
        nextRxSequence: 0xfff0,
        windowMax: 48
      })
    ).toBe(true);
  });

  it("inserts ordered sequences and rejects duplicates", () => {
    expect(
      channelEmplaceIndex({ sequence: 3, ringSequences: [1, 4], wrapBaseSequence: 1 })
    ).toBe(1);
    expect(
      channelEmplaceIndex({ sequence: 4, ringSequences: [1, 4], wrapBaseSequence: 1 })
    ).toBeNull();

    const inserted = insertChannelSequence([1, 4], 3, 1);
    expect(inserted.inserted).toBe(true);
    expect(inserted.ring).toEqual([1, 3, 4]);
  });

  it("drains contiguous prefixes", () => {
    const drained = drainContiguousChannelSequences({
      ringSequences: [2, 3, 5],
      nextRxSequence: 2
    });
    expect(drained.contiguous).toEqual([2, 3]);
    expect(drained.remaining).toEqual([5]);
    expect(drained.nextRxSequence).toBe(4);
  });
});
