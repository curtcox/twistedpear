#!/usr/bin/env node
/**
 * Hostile mini-app conformance (Phase 4 M2).
 * Runs sandbox and broker abuse cases against the Node worker backend.
 */

import { readFileSync } from "node:fs";
import {
  MiniappBroker,
  MiniappHost,
  MiniappLifecycle,
  NodeWorkerSandboxBackend,
  GrantStore,
  validateWidgetTree,
  WidgetValidationError
} from "../../packages/miniapp-runtime/dist/index.js";

class MemoryStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

const bundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [
      { id: "title", type: "text", props: { value: "Hello" } }
    ]
  }
});
`);

async function main() {
  const store = new MemoryStore();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store
  });

  const launched = await host.launch(
    {
      name: "hello",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "publisher"
    },
    bundle
  );

  let tree = launched.widgetTree;
  for (let attempt = 0; attempt < 20 && tree === null; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    tree = host.snapshot().widgetTree;
  }

  if (tree === null) {
    throw new Error("hello bundle did not render a widget tree");
  }

  await host.stop();

  const backend = new NodeWorkerSandboxBackend();
  const busyLifecycle = new MiniappLifecycle(
    backend,
    {
      appId: "busy",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: new TextEncoder().encode("while (true) {}"),
      brokerEndpoint: { request: async (request) => ({ id: request.id, ok: true }) }
    },
    { watchdogMs: 300 }
  );
  await busyLifecycle.launch();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await busyLifecycle.watchdogPing();
  await busyLifecycle.stop("cleanup");

  const broker = new MiniappBroker({ maxMessagesPerSecond: 1, now: () => 1_000 });
  broker.register("ui", "render", null, () => "ok");
  const context = {
    appId: "flood",
    publisherPublicKey: "publisher",
    declaredCapabilities: [],
    grantedCapabilities: []
  };
  if (!(await broker.dispatch({ id: "1", namespace: "ui", method: "render" }, context)).ok) {
    throw new Error("first broker message should pass");
  }
  const limited = await broker.dispatch({ id: "2", namespace: "ui", method: "render" }, context);
  if (limited.error?.code !== "RATE_LIMITED") {
    throw new Error("broker flood was not rate limited");
  }

  try {
    validateWidgetTree({
      root: {
        id: "root",
        type: "evil",
        children: []
      }
    });
    throw new Error("unknown widget type should be rejected");
  } catch (error) {
    if (!(error instanceof WidgetValidationError)) {
      throw error;
    }
  }

  console.log("hostile-apps: sandbox, broker flood, and UI rejection checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
