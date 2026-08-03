// @ts-nocheck
import { describe, expect, it } from "vitest";
import type { Clock, Timer } from "../src/runtime/runtime.js";
import { BandwidthLimiter } from "../src/transport/bandwidth.js";

class ManualClock implements Clock {
  private nowMs = 0;
  private timers: Array<{ at: number; callback: () => void; cancelled: boolean }> = [];

  now(): number {
    return this.nowMs;
  }

  setTimeout(callback: () => void, milliseconds: number): Timer {
    const timer = { at: this.nowMs + milliseconds, callback, cancelled: false };
    this.timers.push(timer);
    return { cancel: () => { timer.cancelled = true; } };
  }

  advance(milliseconds: number): void {
    this.nowMs += milliseconds;
    const ready = this.timers.filter((timer) => !timer.cancelled && timer.at <= this.nowMs);
    this.timers = this.timers.filter((timer) => timer.cancelled || timer.at > this.nowMs);
    for (const timer of ready.sort((left, right) => left.at - right.at)) timer.callback();
  }
}

describe("BandwidthLimiter", () => {
  it("delays bytes until their full rate budget has elapsed", async () => {
    const clock = new ManualClock();
    const limiter = new BandwidthLimiter(clock, 100);
    let completed = false;
    const pending = limiter.consume(100).then(() => { completed = true; });
    expect(limiter.queueDepthBytes()).toBe(100);

    clock.advance(999);
    await Promise.resolve();
    expect(completed).toBe(false);
    clock.advance(1);
    await pending;
    expect(completed).toBe(true);
    expect(limiter.queueDepthBytes()).toBe(0);
  });

  it("serializes concurrent reservations through one aggregate allowance", async () => {
    const clock = new ManualClock();
    const limiter = new BandwidthLimiter(clock, 100);
    let first = false;
    let second = false;
    const one = limiter.consume(50).then(() => { first = true; });
    const two = limiter.consume(50).then(() => { second = true; });

    clock.advance(500);
    await one;
    expect(first).toBe(true);
    expect(second).toBe(false);
    clock.advance(500);
    await two;
    expect(second).toBe(true);
  });

  it("rejects disabled and fractional limits", () => {
    const clock = new ManualClock();
    expect(() => new BandwidthLimiter(clock, 0)).toThrow(/positive safe integer/);
    expect(() => new BandwidthLimiter(clock, 1.5)).toThrow(/positive safe integer/);
  });

  it("caps realtime reservations and releases them", () => {
    const limiter = new BandwidthLimiter(new ManualClock(), 100);
    const realtime = limiter.reserve("realtime", 60);
    expect(realtime).not.toBeNull();
    expect(limiter.reserve("realtime", 1)).toBeNull();
    expect(limiter.reservationSnapshot()).toMatchObject([{ class: "realtime", bytesPerSecond: 60 }]);
    realtime?.release();
    expect(limiter.reserve("realtime", 60)).not.toBeNull();
  });

  it("keeps all reservation classes within the aggregate limit", () => {
    const limiter = new BandwidthLimiter(new ManualClock(), 100);
    expect(limiter.reserve("control", 20)).not.toBeNull();
    expect(limiter.reserve("bulk", 30)).not.toBeNull();
    expect(limiter.reserve("realtime", 50)).not.toBeNull();
    expect(limiter.reserve("bulk", 1)).toBeNull();
  });
});
