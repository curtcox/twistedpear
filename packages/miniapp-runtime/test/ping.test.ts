import { afterEach, describe, expect, it, vi } from "vitest";
import { SandboxPing, type PendingBroker } from "../src/sandbox/ping.js";

function echoPong(): {
  pending: PendingBroker;
  post: (message: unknown) => void;
} {
  const pending: PendingBroker = new Map();
  return {
    pending,
    post: (message) => {
      const typed = message as { id: string };
      queueMicrotask(() => pending.get(typed.id)?.resolve("pong"));
    },
  };
}

describe("sandbox ping", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("correlates sequential pongs with unique ids", async () => {
    const pings = new SandboxPing();
    const { pending, post } = echoPong();
    const seen: string[] = [];
    const recordingPost = (message: unknown) => {
      seen.push((message as { id: string }).id);
      post(message);
    };

    expect(await pings.request(recordingPost, pending, 1_000)).toBe(true);
    expect(await pings.request(recordingPost, pending, 1_000)).toBe(true);
    expect(seen).toEqual(["ping-1", "ping-2"]);
    pings.dispose();
  });

  it("reuses one timeout across a burst of successful pings", async () => {
    const pings = new SandboxPing();
    const { pending, post } = echoPong();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    for (let index = 0; index < 20; index += 1) {
      expect(await pings.request(post, pending, 1_000)).toBe(true);
    }

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(pings.armed).toBe(true);
    pings.dispose();
    expect(pings.armed).toBe(false);
  });

  it("times out a missing pong and ignores a late reply", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const pings = new SandboxPing();
    const pending: PendingBroker = new Map();
    const post = vi.fn();
    const result = pings.request(post, pending, 200);
    const id = (post.mock.calls[0]?.[0] as { id: string }).id;
    const waiter = pending.get(id);

    await vi.advanceTimersByTimeAsync(200);
    expect(await result).toBe(false);
    expect(pending.has(id)).toBe(false);

    waiter?.resolve("pong");
    pings.dispose();
  });

  it("reschedules when a shorter timeout arrives while a longer one is armed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const pings = new SandboxPing();
    const pending: PendingBroker = new Map();
    const post = vi.fn();
    const slow = pings.request(post, pending, 1_000);
    const fast = pings.request(post, pending, 50);
    let slowSettled = false;
    void slow.then(() => {
      slowSettled = true;
    });

    await vi.advanceTimersByTimeAsync(50);
    expect(await fast).toBe(false);
    expect(slowSettled).toBe(false);

    await vi.advanceTimersByTimeAsync(950);
    expect(await slow).toBe(false);
    pings.dispose();
  });

  it("fails in-flight pings on dispose", async () => {
    const pings = new SandboxPing();
    const pending: PendingBroker = new Map();
    const result = pings.request(vi.fn(), pending, 1_000);
    pings.dispose();
    expect(await result).toBe(false);
    expect(pending.size).toBe(0);
  });

  it("treats a broker reject as a failed ping", async () => {
    const pings = new SandboxPing();
    const pending: PendingBroker = new Map();
    const post = (message: unknown) => {
      queueMicrotask(() =>
        pending.get((message as { id: string }).id)?.reject(new Error("no")),
      );
    };
    expect(await pings.request(post, pending, 1_000)).toBe(false);
    pings.dispose();
  });
});
