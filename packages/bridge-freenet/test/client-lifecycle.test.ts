import { describe, expect, it } from "vitest";
import {
  DEFAULT_FREENET_REQUEST_TIMEOUT_MS,
  DEFAULT_FREENET_URL,
  FreenetClient,
} from "../src/index.js";

/**
 * Construction and teardown without ever opening a socket.
 *
 * `FreenetClient` is 34 functions of which the suite reached three, all of them
 * pure helpers, because everything else wants a live node. Two do not: the
 * constructor, and `close()` on a client that never connected — and `close()`
 * not being safe there is exactly the kind of failure that surfaces during
 * shutdown, where it is hardest to see.
 */
describe("FreenetClient lifecycle without a connection", () => {
  it("constructs against the default node with default options", () => {
    expect(() => new FreenetClient()).not.toThrow();
    expect(DEFAULT_FREENET_URL).toMatch(/^wss?:\/\//);
    expect(DEFAULT_FREENET_REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("accepts an explicit url, token and timeout", () => {
    expect(
      () =>
        new FreenetClient({
          url: "ws://127.0.0.1:50509/v1/contract/command",
          authToken: "token",
          requestTimeoutMs: 1_000,
        }),
    ).not.toThrow();
  });

  it("rejects a url that is not a url", () => {
    expect(() => new FreenetClient({ url: "not a url" })).toThrow();
  });

  it("closes cleanly when it never connected, and stays closable", async () => {
    const client = new FreenetClient({
      url: "ws://127.0.0.1:50509/v1/contract/command",
    });
    await expect(client.close()).resolves.toBeUndefined();
    await expect(client.close()).resolves.toBeUndefined();
  });
});
