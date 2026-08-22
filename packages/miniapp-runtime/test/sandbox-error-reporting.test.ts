import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MiniappHost,
  MiniappLifecycle,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
} from "../src/index.js";

class MemoryStore implements GrantKeyValueStore {
  readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

const wall = {
  now: () => Date.now(),
  delay: (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

const manifest = {
  name: "error-app",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: [] as string[],
  publisherPublicKey: "publisher",
};

function handlerBundle(body: string): Uint8Array {
  return new TextEncoder().encode(`
sdk.ui.onEvent(async (event) => {
  ${body}
});
await sdk.ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "go", type: "button", props: { label: "Go", event: "boom" } }]
  }
});
`);
}

async function waitUntil(
  condition: () => boolean,
  timeoutMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for sandbox output");
    }
    await wall.delay(15);
  }
}

async function launchHandlerApp(body: string): Promise<MiniappHost> {
  const store = new MemoryStore();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
  });
  await host.launch(manifest, handlerBundle(body));
  await waitUntil(() => host.snapshot().widgetTree !== null);
  return host;
}

describe("sandbox error reporting", () => {
  it("reports a synchronous handler throw without leaving running", async () => {
    const host = await launchHandlerApp(`throw new Error("sync-boom");`);
    try {
      await host.handleUiEvent("go", "boom");
      await waitUntil(() => host.lastAppError()?.event === "boom");
      const error = host.lastAppError();
      expect(host.snapshot().state).toBe("running");
      expect(error?.phase).toBe("ui-event");
      expect(error?.message).toContain("sync-boom");
      expect(error?.nodeId).toBe("go");
      expect(error?.stack).toEqual(expect.any(String));
    } finally {
      await host.stop();
    }
  });

  it("reports a rejected handler without leaving running", async () => {
    const host = await launchHandlerApp(
      `return Promise.reject(new Error("reject-boom"));`,
    );
    try {
      await host.handleUiEvent("go", "boom");
      await waitUntil(() => host.lastAppError()?.message.includes("reject-boom") === true);
      expect(host.snapshot().state).toBe("running");
      expect(host.lastAppError()?.phase).toBe("ui-event");
      expect(host.lastAppError()?.event).toBe("boom");
    } finally {
      await host.stop();
    }
  });

  it("reports a throw after await without leaving running", async () => {
    const host = await launchHandlerApp(
      `await Promise.resolve(); throw new Error("async-boom");`,
    );
    try {
      await host.handleUiEvent("go", "boom");
      await waitUntil(() => host.lastAppError()?.message.includes("async-boom") === true);
      expect(host.snapshot().state).toBe("running");
      expect(host.lastAppError()?.phase).toBe("ui-event");
      expect(host.lastAppError()?.event).toBe("boom");
    } finally {
      await host.stop();
    }
  });

  it("does not change the watchdog path for a wedged app", async () => {
    const backend = new NodeWorkerSandboxBackend();
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "busy",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle: new TextEncoder().encode(`while (true) {}`),
        brokerEndpoint: { request: async () => ({ id: "0", ok: true }) },
      },
      { ...wall, watchdogMs: 200 },
    );
    await lifecycle.launch();
    await wall.delay(50);
    const snapshot = await lifecycle.watchdogPing();
    expect(snapshot.state === "crashed" || snapshot.state === "running").toBe(
      true,
    );
    await lifecycle.stop("cleanup");
  });
});
