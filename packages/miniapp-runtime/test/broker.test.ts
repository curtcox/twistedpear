import { describe, expect, it } from "vitest";
import { MiniappBroker, type BrokerContext } from "../src/index.js";

const context: BrokerContext = {
  appId: "app",
  publisherPublicKey: "publisher",
  declaredCapabilities: ["lxmf:send"],
  grantedCapabilities: ["lxmf:send"]
};

describe("mini-app broker", () => {
  it("dispatches through registered capability-checked handlers", async () => {
    const broker = new MiniappBroker();
    broker.register("lxmf", "send", "lxmf:send", (request) => request.payload);

    await expect(
      broker.dispatch({ id: "1", namespace: "lxmf", method: "send", payload: { ok: true } }, context)
    ).resolves.toEqual({ id: "1", ok: true, result: { ok: true } });
  });

  it("fails closed without a grant", async () => {
    const broker = new MiniappBroker();
    broker.register("lxmf", "send", "lxmf:send", () => "sent");

    const denied = await broker.dispatch(
      { id: "1", namespace: "lxmf", method: "send" },
      { ...context, grantedCapabilities: [] }
    );
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");
  });

  it("rate limits app messages", async () => {
    let now = 1_000;
    const broker = new MiniappBroker({ maxMessagesPerSecond: 1, now: () => now });
    broker.register("ui", "render", null, () => "ok");

    expect((await broker.dispatch({ id: "1", namespace: "ui", method: "render" }, context)).ok).toBe(true);
    const limited = await broker.dispatch({ id: "2", namespace: "ui", method: "render" }, context);
    expect(limited.error?.code).toBe("RATE_LIMITED");

    now = 2_001;
    expect((await broker.dispatch({ id: "3", namespace: "ui", method: "render" }, context)).ok).toBe(true);
  });

  it("rejects capability substitution on protected methods", async () => {
    const broker = new MiniappBroker();
    broker.register("storage.kv", "get", "storage:kv", () => "secret");

    const substituted = await broker.dispatch(
      {
        id: "1",
        namespace: "storage.kv",
        method: "get",
        capability: "identity",
        payload: { key: "x" }
      },
      {
        ...context,
        declaredCapabilities: ["identity", "storage:kv"],
        grantedCapabilities: ["identity"]
      }
    );
    expect(substituted.ok).toBe(false);
    expect(substituted.error?.code).toBe("CAPABILITY_MISMATCH");
  });

  it("enforces the registered capability even when the request omits it", async () => {
    const broker = new MiniappBroker();
    broker.register("storage.kv", "get", "storage:kv", () => "secret");

    const denied = await broker.dispatch(
      { id: "1", namespace: "storage.kv", method: "get", payload: { key: "x" } },
      {
        ...context,
        declaredCapabilities: ["storage:kv"],
        grantedCapabilities: []
      }
    );
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");
  });
});
