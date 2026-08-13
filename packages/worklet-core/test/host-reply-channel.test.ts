import { afterEach, describe, expect, it, vi } from "vitest";
import { createHostReplyChannel } from "../src/host-reply-channel.mjs";

afterEach(() => {
  vi.useRealTimers();
});

describe("createHostReplyChannel", () => {
  it("sends the request and resolves with the matching reply", async () => {
    const sent: unknown[] = [];
    const channel = createHostReplyChannel({
      send: (message: unknown) => sent.push(message),
    });

    const pending = channel.requestReply({ type: "confirm", token: "t1" });
    expect(sent).toEqual([{ type: "confirm", token: "t1" }]);
    expect(channel.pending.size).toBe(1);

    expect(channel.resolveReply({ token: "t1", allowed: true })).toBe(true);
    await expect(pending).resolves.toEqual({ token: "t1", allowed: true });
    expect(channel.pending.size).toBe(0);
  });

  it("ignores replies with no token or an unknown token", () => {
    const channel = createHostReplyChannel({ send: () => {} });

    expect(channel.resolveReply({ allowed: true })).toBe(false);
    expect(channel.resolveReply(undefined)).toBe(false);
    expect(channel.resolveReply({ token: 7 })).toBe(false);
    expect(channel.resolveReply({ token: "nobody" })).toBe(false);
  });

  it("resolves to null when the reply does not arrive in time", async () => {
    vi.useFakeTimers();
    const channel = createHostReplyChannel({ send: () => {} });

    const pending = channel.requestReply({ token: "t1" }, 50);
    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBeNull();
    expect(channel.pending.size).toBe(0);
    expect(channel.resolveReply({ token: "t1" })).toBe(false);
  });

  it("applies the default timeout when the caller gives none", async () => {
    vi.useFakeTimers();
    const channel = createHostReplyChannel({
      send: () => {},
      defaultTimeoutMs: 200,
    });

    const pending = channel.requestReply({ token: "t1" });
    await vi.advanceTimersByTimeAsync(199);
    expect(channel.pending.size).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeNull();
  });

  it("cancels the timeout once a reply lands", async () => {
    vi.useFakeTimers();
    const channel = createHostReplyChannel({ send: () => {} });

    const pending = channel.requestReply({ token: "t1" }, 50);
    channel.resolveReply({ token: "t1", allowed: false });
    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toEqual({ token: "t1", allowed: false });
  });

  it("keeps concurrent requests independent", async () => {
    const channel = createHostReplyChannel({ send: () => {} });

    const first = channel.requestReply({ token: "a" });
    const second = channel.requestReply({ token: "b" });
    expect(channel.pending.size).toBe(2);

    channel.resolveReply({ token: "b", value: 2 });
    await expect(second).resolves.toEqual({ token: "b", value: 2 });
    expect(channel.pending.size).toBe(1);

    channel.resolveReply({ token: "a", value: 1 });
    await expect(first).resolves.toEqual({ token: "a", value: 1 });
  });
});
