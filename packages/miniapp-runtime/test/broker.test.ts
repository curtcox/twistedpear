import { describe, expect, it } from "vitest";
import {
  MiniappBroker,
  type BrokerAuditEntry,
  type BrokerContext,
} from "../src/index.js";

const context: BrokerContext = {
  appId: "app",
  publisherPublicKey: "publisher",
  declaredCapabilities: ["lxmf:send"],
  grantedCapabilities: ["lxmf:send"],
};

const clock = { now: () => 0 };

describe("mini-app broker", () => {
  it("dispatches through registered capability-checked handlers", async () => {
    const broker = new MiniappBroker(clock);
    broker.register("lxmf", "send", "lxmf:send", (request) => request.payload);

    await expect(
      broker.dispatch(
        { id: "1", namespace: "lxmf", method: "send", payload: { ok: true } },
        context,
      ),
    ).resolves.toEqual({ id: "1", ok: true, result: { ok: true } });
  });

  it("fails closed without a grant", async () => {
    const broker = new MiniappBroker(clock);
    broker.register("lxmf", "send", "lxmf:send", () => "sent");

    const denied = await broker.dispatch(
      { id: "1", namespace: "lxmf", method: "send" },
      { ...context, grantedCapabilities: [] },
    );
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");
  });

  it("rate limits app messages", async () => {
    let now = 1_000;
    const broker = new MiniappBroker({
      maxMessagesPerSecond: 1,
      now: () => now,
    });
    broker.register("ui", "render", null, () => "ok");

    expect(
      (
        await broker.dispatch(
          { id: "1", namespace: "ui", method: "render" },
          context,
        )
      ).ok,
    ).toBe(true);
    const limited = await broker.dispatch(
      { id: "2", namespace: "ui", method: "render" },
      context,
    );
    expect(limited.error?.code).toBe("RATE_LIMITED");

    now = 2_001;
    expect(
      (
        await broker.dispatch(
          { id: "3", namespace: "ui", method: "render" },
          context,
        )
      ).ok,
    ).toBe(true);
  });

  it("rejects capability substitution on protected methods", async () => {
    const broker = new MiniappBroker(clock);
    broker.register("storage.kv", "get", "storage:kv", () => "secret");

    const substituted = await broker.dispatch(
      {
        id: "1",
        namespace: "storage.kv",
        method: "get",
        capability: "identity",
        payload: { key: "x" },
      },
      {
        ...context,
        declaredCapabilities: ["identity", "storage:kv"],
        grantedCapabilities: ["identity"],
      },
    );
    expect(substituted.ok).toBe(false);
    expect(substituted.error?.code).toBe("CAPABILITY_MISMATCH");
  });

  it("enforces the registered capability even when the request omits it", async () => {
    const broker = new MiniappBroker(clock);
    broker.register("storage.kv", "get", "storage:kv", () => "secret");

    const denied = await broker.dispatch(
      {
        id: "1",
        namespace: "storage.kv",
        method: "get",
        payload: { key: "x" },
      },
      {
        ...context,
        declaredCapabilities: ["storage:kv"],
        grantedCapabilities: [],
      },
    );
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");
  });

  /**
   * A refused capability and a backend that threw are different faults. Reading
   * both as "denied" is what sent BUG-MINIAPP-IDENTITY-BACKEND looking at
   * grants for a fault that lay in the identity backend.
   */
  describe("audit outcomes", () => {
    it("records a refused capability as denied", async () => {
      const entries: BrokerAuditEntry[] = [];
      const broker = new MiniappBroker({
        ...clock,
        audit: (entry) => entries.push(entry),
      });
      broker.register("storage.kv", "get", "storage:kv", () => "secret");

      await broker.dispatch(
        { id: "1", namespace: "storage.kv", method: "get" },
        {
          ...context,
          declaredCapabilities: ["storage:kv"],
          grantedCapabilities: [],
        },
      );
      expect(entries.map((entry) => entry.outcome)).toEqual(["denied"]);
      expect(entries[0]?.allowed).toBe(false);
      expect(entries[0]?.error?.code).toBe("CAPABILITY_DENIED");
    });

    it("records a granted call whose handler threw as failed, not denied", async () => {
      const entries: BrokerAuditEntry[] = [];
      const broker = new MiniappBroker({
        ...clock,
        audit: (entry) => entries.push(entry),
      });
      broker.register("identity", "destinationHash", "identity", () => {
        throw Object.assign(new Error("start the node first"), {
          code: "IDENTITY_UNAVAILABLE",
        });
      });

      const failed = await broker.dispatch(
        { id: "1", namespace: "identity", method: "destinationHash" },
        {
          ...context,
          declaredCapabilities: ["identity"],
          grantedCapabilities: ["identity"],
        },
      );
      expect(failed.error?.code).toBe("IDENTITY_UNAVAILABLE");
      expect(entries.map((entry) => entry.outcome)).toEqual([
        "allowed",
        "failed",
      ]);
      expect(entries[1]?.error?.message).toBe("start the node first");
      // `allowed` keeps its meaning so grant-access projections are unchanged:
      // exactly one entry counts as an access.
      expect(entries.filter((entry) => entry.allowed)).toHaveLength(1);
    });
  });
});
