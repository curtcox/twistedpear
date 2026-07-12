import { describe, expect, it } from "vitest";
import { AnnounceRateLimiter } from "../src/transport/rate.js";
import { PacketReceipt, PacketReceiptStatus } from "../src/packet-receipt.js";

describe("sans-io leaf determinism", () => {
  it("AnnounceRateLimiter is identical for the same now sequence", () => {
    const run = () => {
      const limiter = new AnnounceRateLimiter({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 });
      const key = "dest";
      const events = [100, 100.05, 100.1, 110, 120];
      return events.map((now) => ({
        now,
        blocked: limiter.isBlocked(key, now),
        recorded: limiter.record(key, now)
      }));
    };
    expect(run()).toEqual(run());
  });

  it("PacketReceipt timeouts are identical under injected clock", () => {
    const run = () => {
      let t = 1_000;
      const receipt = new PacketReceipt(new Uint8Array(32), new Uint8Array(16), new Uint8Array(16), {
        sentAt: t,
        now: () => t
      });
      receipt.setTimeout(5);
      t = 1_004;
      expect(receipt.checkTimeout()).toBe(false);
      t = 1_006;
      expect(receipt.checkTimeout()).toBe(true);
      return { status: receipt.status, concludedAt: receipt.concludedAt };
    };
    expect(run()).toEqual({ status: PacketReceiptStatus.FAILED, concludedAt: 1_006 });
    expect(run()).toEqual(run());
  });
});
