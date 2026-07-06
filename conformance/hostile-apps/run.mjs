#!/usr/bin/env node
/**
 * Hostile mini-app conformance (Phase 4 M2).
 * Runs sandbox and broker abuse cases against the Node worker backend.
 */

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

const helloBundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

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

const escapeBundle = new TextEncoder().encode(`
const probes = [];
try { probes.push(typeof require); } catch (error) { probes.push("require-blocked"); }
try { probes.push(typeof process); } catch (error) { probes.push("process-blocked"); }
try { probes.push(typeof Bare); } catch (error) { probes.push("bare-blocked"); }
try { probes.push(typeof import); } catch (error) { probes.push("import-blocked"); }
const chain = (() => { try { return {}.constructor.constructor("return this")(); } catch { return null; } })();
if (chain !== null && typeof chain.process === "object") {
  throw new Error("constructor-chain escape");
}
`);

function deepNode(id, depth) {
  if (depth === 0) {
    return { id, type: "text", props: { value: "leaf" } };
  }

  return { id, type: "view", children: [deepNode(`${id}-child`, depth - 1)] };
}

function wideNode(index) {
  return { id: `node-${index}`, type: "text", props: { value: `n${index}` } };
}

async function main() {
  const store = new MemoryStore();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store
  });

  await host.launch(
    {
      name: "hello",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "publisher"
    },
    helloBundle
  );

  let tree = host.snapshot().widgetTree;
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
  const busySnapshot = await busyLifecycle.watchdogPing();
  if (busySnapshot.state !== "crashed") {
    throw new Error(`busy-loop app was not killed (state=${busySnapshot.state})`);
  }
  await busyLifecycle.stop("cleanup");

  const escapeLifecycle = new MiniappLifecycle(backend, {
    appId: "escape",
    version: "1.0.0",
    entryPath: "bundle.js",
    bundle: escapeBundle,
    brokerEndpoint: { request: async (request) => ({ id: request.id, ok: true }) }
  });
  await escapeLifecycle.launch();
  await new Promise((resolve) => setTimeout(resolve, 100));
  await escapeLifecycle.stop("cleanup");

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

  const uiRejections = [
    () => validateWidgetTree({ root: { id: "root", type: "evil", children: [] } }),
    () => validateWidgetTree({ root: deepNode("root", 40) }, { maxDepth: 32 }),
    () =>
      validateWidgetTree(
        { root: { id: "root", type: "view", children: Array.from({ length: 5_001 }, (_, index) => wideNode(index)) } },
        { maxNodes: 5_000 }
      ),
    () => validateWidgetTree({ root: { id: "root", type: "text", props: { html: "<b>x</b>" } } })
  ];

  for (const reject of uiRejections) {
    try {
      reject();
      throw new Error("expected widget validation failure");
    } catch (error) {
      if (!(error instanceof WidgetValidationError)) {
        throw error;
      }
    }
  }

  const cycleBackend = new NodeWorkerSandboxBackend();
  const cycleLifecycle = new MiniappLifecycle(cycleBackend, {
    appId: "cycle",
    version: "1.0.0",
    entryPath: "bundle.js",
    bundle: new TextEncoder().encode("await Promise.resolve();"),
    brokerEndpoint: { request: async (request) => ({ id: request.id, ok: true }) }
  });

  for (let cycle = 0; cycle < 100; cycle += 1) {
    await cycleLifecycle.launch();
    await cycleLifecycle.stop(`cycle-${cycle}`);
  }

  console.log("hostile-apps: sandbox, escape, broker flood, UI rejection, and launch/stop cycles passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
