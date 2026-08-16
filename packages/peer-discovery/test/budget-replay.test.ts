import { afterEach, describe, expect, it, vi } from "vitest";
import { withDiscoveryBudget } from "../src/budget.js";
import { PeerReplayCache } from "../src/replay-cache.js";

afterEach(() => vi.useRealTimers());

async function* waitingSource(): AsyncIterable<number> {
  await new Promise(() => undefined);
  yield 1;
}

describe("discovery budget", () => {
  it("times out, closes the source, and cancels the adapter", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(async () => undefined);
    const next = withDiscoveryBudget(waitingSource(), 10, undefined, cancel)
      [Symbol.asyncIterator]()
      .next();
    const rejection = expect(next).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("honours an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const cancel = vi.fn(async () => undefined);
    const next = withDiscoveryBudget(
      waitingSource(),
      1_000,
      controller.signal,
      cancel,
    )
      [Symbol.asyncIterator]()
      .next();
    await expect(next).rejects.toMatchObject({ code: "CANCELLED" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("yields source values and completes without cancellation", async () => {
    const cancel = vi.fn(async () => undefined);
    async function* values() {
      yield 1;
      yield 2;
    }
    const received: number[] = [];
    for await (const value of withDiscoveryBudget(
      values(),
      1_000,
      undefined,
      cancel,
    ))
      received.push(value);
    expect(received).toEqual([1, 2]);
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("peer replay cache", () => {
  it("rejects a replay until its entry expires", () => {
    const cache = new PeerReplayCache();
    expect(cache.acceptOnce("session", 10, 0)).toBe(true);
    expect(cache.acceptOnce("session", 10, 1)).toBe(false);
    expect(cache.acceptOnce("session", 20, 10)).toBe(true);
  });

  it("evicts the oldest entry at its bound", () => {
    const cache = new PeerReplayCache(2);
    expect(cache.acceptOnce("first", 100, 0)).toBe(true);
    expect(cache.acceptOnce("second", 100, 0)).toBe(true);
    expect(cache.acceptOnce("third", 100, 0)).toBe(true);
    expect(cache.acceptOnce("first", 100, 0)).toBe(true);
    expect(cache.acceptOnce("third", 100, 0)).toBe(false);
  });
});
