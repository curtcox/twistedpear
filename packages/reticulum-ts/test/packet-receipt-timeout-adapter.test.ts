import { describe, expect, it } from "vitest";
import { PacketReceipt, PacketReceiptStatus } from "../src/packet-receipt.js";
import type { Clock, Timer } from "../src/runtime/runtime.js";

function createFakeClock(startMs = 0): Clock & {
  readonly pending: Array<{ delayMs: number; callback: () => void }>;
  advance(ms: number): void;
} {
  let now = startMs;
  const pending: Array<{ delayMs: number; callback: () => void; cancelled: boolean }> = [];
  return {
    pending,
    now: () => now,
    setTimeout(callback: () => void, milliseconds: number): Timer {
      const entry = { delayMs: milliseconds, callback, cancelled: false };
      pending.push(entry);
      return {
        cancel() {
          entry.cancelled = true;
        }
      };
    },
    advance(ms: number) {
      now += ms;
      for (const entry of [...pending]) {
        if (entry.cancelled) {
          continue;
        }
        entry.delayMs -= ms;
        if (entry.delayMs <= 0) {
          entry.cancelled = true;
          entry.callback();
        }
      }
    }
  };
}

describe("packet receipt timeout adapter", () => {
  it("schedules and fires timeout from protocol timer intents", () => {
    const clock = createFakeClock(1_000_000);
    let timedOut = false;
    const receipt = new PacketReceipt(new Uint8Array(32), new Uint8Array(16), new Uint8Array(16), {
      sentAt: clock.now() / 1000,
      now: () => clock.now() / 1000,
      clock
    });
    receipt.setTimeoutCallback(() => {
      timedOut = true;
    });
    receipt.setTimeout(2);
    expect(clock.pending.filter((entry) => !entry.cancelled)).toHaveLength(1);
    expect(clock.pending[0]!.delayMs).toBe(2_000);

    clock.advance(1_999);
    expect(timedOut).toBe(false);
    expect(receipt.status).toBe(PacketReceiptStatus.SENT);

    clock.advance(1);
    expect(timedOut).toBe(true);
    expect(receipt.status).toBe(PacketReceiptStatus.FAILED);
  });

  it("cancels the armed timer on markFailed", () => {
    const clock = createFakeClock();
    const receipt = new PacketReceipt(new Uint8Array(32), new Uint8Array(16), new Uint8Array(16), {
      sentAt: 0,
      now: () => clock.now() / 1000,
      clock
    });
    receipt.setTimeout(5);
    expect(clock.pending.filter((entry) => !entry.cancelled)).toHaveLength(1);
    receipt.markFailed();
    expect(clock.pending.every((entry) => entry.cancelled)).toBe(true);
    expect(receipt.status).toBe(PacketReceiptStatus.FAILED);
  });

  it("invokes timeout callback only via machine timeout action", () => {
    const clock = createFakeClock(0);
    let timeoutCount = 0;
    const receipt = new PacketReceipt(new Uint8Array(32), new Uint8Array(16), new Uint8Array(16), {
      sentAt: 0,
      now: () => clock.now() / 1000,
      clock
    });
    receipt.setTimeoutCallback(() => {
      timeoutCount += 1;
    });
    receipt.setTimeout(1);
    expect(receipt.checkTimeout(0.5)).toBe(false);
    expect(timeoutCount).toBe(0);
    expect(receipt.checkTimeout(1)).toBe(true);
    expect(timeoutCount).toBe(1);
    expect(receipt.checkTimeout(2)).toBe(false);
    expect(timeoutCount).toBe(1);
  });
});
