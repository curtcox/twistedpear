import { describe, expect, it } from "vitest";
import { MiniappBroker, MiniappLifecycle, NodeWorkerSandboxBackend } from "../src/index.js";

const busyLoopBundle = new TextEncoder().encode(`
while (true) {}
`);

const pingableBundle = new TextEncoder().encode(`
await new Promise(() => {});
`);

const wall = {
  now: () => Date.now(),
  delay: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
};

describe("mini-app lifecycle", () => {
  it("kills an unresponsive app via watchdog", async () => {
    const backend = new NodeWorkerSandboxBackend();
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "busy",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle: busyLoopBundle,
        brokerEndpoint: { request: async () => ({ id: "0", ok: true }) }
      },
      { ...wall, watchdogMs: 200 }
    );

    await lifecycle.launch();
    await wall.delay(50);
    const snapshot = await lifecycle.watchdogPing();
    expect(snapshot.state === "crashed" || snapshot.state === "running").toBe(true);
    await lifecycle.stop("cleanup");
  });

  it("rate limits broker messages", async () => {
    let now = 1_000;
    const broker = new MiniappBroker({ maxMessagesPerSecond: 2, now: () => now });
    broker.register("ui", "render", null, () => "ok");
    const context = {
      appId: "app",
      publisherPublicKey: "publisher",
      declaredCapabilities: [],
      grantedCapabilities: []
    };

    expect((await broker.dispatch({ id: "1", namespace: "ui", method: "render" }, context)).ok).toBe(true);
    expect((await broker.dispatch({ id: "2", namespace: "ui", method: "render" }, context)).ok).toBe(true);
    expect((await broker.dispatch({ id: "3", namespace: "ui", method: "render" }, context)).error?.code).toBe("RATE_LIMITED");
  });

  it("stops and relaunches without leaking state", async () => {
    const backend = new NodeWorkerSandboxBackend();
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "pingable",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle: pingableBundle,
        brokerEndpoint: { request: async () => ({ id: "0", ok: true }) }
      },
      wall
    );

    await lifecycle.launch();
    await lifecycle.stop("test");
    const relaunched = await lifecycle.launch();
    expect(relaunched.state).toBe("running");
    await lifecycle.stop("cleanup");
  });
});
