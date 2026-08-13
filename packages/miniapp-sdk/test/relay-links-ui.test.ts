import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrokerRequest } from "@twistedpear/miniapp-runtime";
import { setMiniappHostTransport } from "../src/rpc.js";
import * as links from "../src/links.js";
import * as relay from "../src/relay.js";
import * as ui from "../src/ui.js";

const calls: BrokerRequest[] = [];
let respond: (request: BrokerRequest) => {
  ok: boolean;
  result?: unknown;
} = () => ({ ok: true, result: null });

beforeEach(() => {
  calls.length = 0;
  respond = () => ({ ok: true, result: null });
  setMiniappHostTransport({
    request(request) {
      calls.push(request);
      return Promise.resolve({ id: request.id, ...respond(request) } as never);
    },
  });
});

describe("relay surface", () => {
  it("separates configuring calls from read-only calls", async () => {
    respond = () => ({ ok: true, result: [] });

    await relay.setMode("bridge");
    await relay.enable("tcp", { port: 4242 });
    await relay.disable("tcp");
    await relay.setDirection("tcp", "both");
    await relay.configure("tcp", { port: 4243 });
    await relay.setPolicy({ allow: { tcp: { rnode: true } } });
    await relay.list();
    await relay.status();
    await relay.diagnostics();

    expect(calls.map((call) => [call.method, call.capability])).toEqual([
      ["setMode", "relay:configure"],
      ["enable", "relay:configure"],
      ["disable", "relay:configure"],
      ["setDirection", "relay:configure"],
      ["configure", "relay:configure"],
      ["setPolicy", "relay:configure"],
      ["list", "relay:read"],
      ["status", "relay:read"],
      ["diagnostics", "relay:read"],
    ]);
    expect(calls[1]?.payload).toEqual({ kind: "tcp", options: { port: 4242 } });
    expect(calls[5]?.payload).toEqual({
      policy: { allow: { tcp: { rnode: true } } },
    });
  });

  it("re-labels broker failures as relay errors", async () => {
    respond = () => ({
      ok: false,
      error: { code: "POLICY_DISABLED", message: "relay is off" },
    });

    const error = await relay.setMode("off").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(relay.RelayError);
    expect(error).toMatchObject({
      code: "POLICY_DISABLED",
      name: "RelayError",
    });
  });

  it("passes through failures that are not broker errors", async () => {
    setMiniappHostTransport({
      request() {
        return Promise.reject(new Error("transport closed"));
      },
    });

    const error = await relay.list().catch((thrown: unknown) => thrown);

    expect(error).not.toBeInstanceOf(relay.RelayError);
    expect(error).toMatchObject({ message: "transport closed" });
  });
});

describe("links surface", () => {
  it("yields events across successive watch batches", async () => {
    const batches = [
      { cursor: "c1", events: [{ kind: "up" }] },
      { cursor: "c2", events: [{ kind: "quality" }, { kind: "down" }] },
    ];
    let index = 0;
    respond = () => ({ ok: true, result: batches[index++] ?? batches[1] });

    const seen: string[] = [];
    for await (const event of links.watch()) {
      seen.push((event as { kind: string }).kind);
      if (seen.length === 3) break;
    }

    expect(seen).toEqual(["up", "quality", "down"]);
    expect(calls[0]?.payload).toEqual({ cursor: undefined });
    expect(calls[1]?.payload).toEqual({ cursor: "c1" });
    expect(calls[0]?.capability).toBe("link:observe");
  });

  it("re-labels broker failures as link errors", async () => {
    respond = () => ({
      ok: false,
      error: { code: "NO_LINK", message: "peer is not connected" },
    });

    const error = await links.peers().catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(links.LinkError);
    expect(error).toMatchObject({ code: "NO_LINK", name: "LinkError" });
  });

  it("passes through failures that are not broker errors", async () => {
    setMiniappHostTransport({
      request() {
        return Promise.reject(new Error("transport closed"));
      },
    });

    const error = await links.peers().catch((thrown: unknown) => thrown);

    expect(error).not.toBeInstanceOf(links.LinkError);
    expect(error).toMatchObject({ message: "transport closed" });
  });
});

describe("ui surface", () => {
  afterEach(() => {
    delete (globalThis as { sdk?: unknown }).sdk;
  });

  it("renders trees and subscribes handlers without a capability", async () => {
    await ui.render([{ type: "text", id: "a" }] as never);
    await ui.subscribeEvents("handler-1");

    expect(calls.map((call) => [call.namespace, call.method])).toEqual([
      ["ui", "render"],
      ["ui", "subscribe"],
    ]);
    expect(calls[0]?.capability).toBeUndefined();
    expect(calls[1]?.payload).toEqual({ handlerId: "handler-1" });
  });

  it("forwards event handlers to the sandbox-injected hook", () => {
    const onEvent = vi.fn();
    (globalThis as { sdk?: unknown }).sdk = { ui: { onEvent } };
    const handler = () => {};

    ui.onEvent(handler);

    expect(onEvent).toHaveBeenCalledWith(handler);
  });

  it("refuses to register a handler outside a host sandbox", () => {
    expect(() => ui.onEvent(() => {})).toThrow(
      "ui.onEvent is only available inside a host sandbox",
    );
  });
});
