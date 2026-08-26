#!/usr/bin/env node
/**
 * Hostile mini-app conformance (Phase 4 M2).
 * Runs sandbox and broker abuse cases against the Node worker backend.
 */

import {
  MiniappBroker,
  MiniappHost,
  MiniappLifecycle,
  MemoryKvStoreBackend,
  NodeWorkerSandboxBackend,
  GrantStore,
  validateWidgetTree,
  WidgetValidationError,
} from "../../packages/miniapp-runtime/dist/index.js";
import { runCapabilityProbes } from "./capability-probes.mjs";
import { runHandlerErrorCases } from "./handler-errors.mjs";
import { runNotifyHostileCases } from "./notify-flood.mjs";
import { runReplicaPeerCases } from "./replica-peers.mjs";

const helloBundle = new TextEncoder()
  .encode(`import { ui } from "@twistedpear/miniapp-sdk";

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
  const store = new MemoryKvStoreBackend();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
  });

  await host.launch(
    {
      name: "hello",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "publisher",
    },
    helloBundle,
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
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true }),
      },
    },
    {
      now: () => Date.now(),
      delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      watchdogMs: 300,
    },
  );
  await busyLifecycle.launch();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const busySnapshot = await busyLifecycle.watchdogPing();
  if (busySnapshot.state !== "crashed") {
    throw new Error(
      `busy-loop app was not killed (state=${busySnapshot.state})`,
    );
  }
  await busyLifecycle.stop("cleanup");

  const escapeLifecycle = new MiniappLifecycle(
    backend,
    {
      appId: "escape",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: escapeBundle,
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true }),
      },
    },
    {
      now: () => Date.now(),
      delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  );
  await escapeLifecycle.launch();
  await new Promise((resolve) => setTimeout(resolve, 100));
  await escapeLifecycle.stop("cleanup");

  const broker = new MiniappBroker({
    maxMessagesPerSecond: 1,
    now: () => 1_000,
  });
  broker.register("ui", "render", null, () => "ok");
  const context = {
    appId: "flood",
    publisherPublicKey: "publisher",
    declaredCapabilities: [],
    grantedCapabilities: [],
  };
  if (
    !(
      await broker.dispatch(
        { id: "1", namespace: "ui", method: "render" },
        context,
      )
    ).ok
  ) {
    throw new Error("first broker message should pass");
  }
  const limited = await broker.dispatch(
    { id: "2", namespace: "ui", method: "render" },
    context,
  );
  if (limited.error?.code !== "RATE_LIMITED") {
    throw new Error("broker flood was not rate limited");
  }

  const uiRejections = [
    () =>
      validateWidgetTree({ root: { id: "root", type: "evil", children: [] } }),
    () => validateWidgetTree({ root: deepNode("root", 40) }, { maxDepth: 32 }),
    () =>
      validateWidgetTree(
        {
          root: {
            id: "root",
            type: "view",
            children: Array.from({ length: 5_001 }, (_, index) =>
              wideNode(index),
            ),
          },
        },
        { maxNodes: 5_000 },
      ),
    () =>
      validateWidgetTree({
        root: { id: "root", type: "text", props: { html: "<b>x</b>" } },
      }),
    () =>
      validateWidgetTree(
        {
          root: {
            id: "root",
            type: "text",
            props: { value: "x".repeat(300_000) },
          },
        },
        { maxBytes: 256 * 1024 },
      ),
    () =>
      validateWidgetTree(
        {
          root: {
            id: "root",
            type: "view",
            children: [{ id: "sw", type: "switch", props: { value: false } }],
          },
        },
        { minHostApi: "0.21.0" },
      ),
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
  const cycleLifecycle = new MiniappLifecycle(
    cycleBackend,
    {
      appId: "cycle",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: new TextEncoder().encode("await Promise.resolve();"),
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true }),
      },
    },
    {
      now: () => Date.now(),
      delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  );

  for (let cycle = 0; cycle < 100; cycle += 1) {
    await cycleLifecycle.launch();
    await cycleLifecycle.stop(`cycle-${cycle}`);
  }

  const memoryBackend = new NodeWorkerSandboxBackend();
  const memoryLifecycle = new MiniappLifecycle(
    memoryBackend,
    {
      appId: "memory-bomb",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: new TextEncoder().encode(`
const chunks = [];
while (true) {
  chunks.push(new Uint8Array(1024 * 1024));
}
`),
      limits: { memoryBytes: 16 * 1024 * 1024 },
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true }),
      },
    },
    {
      now: () => Date.now(),
      delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      watchdogMs: 500,
    },
  );
  await memoryLifecycle.launch();
  let memoryKilled = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const snapshot = await memoryLifecycle.watchdogPing();
    if (snapshot.state === "crashed") {
      memoryKilled = true;
      break;
    }
  }
  if (!memoryKilled) {
    throw new Error("allocation bomb was not killed by memory ceiling");
  }
  await memoryLifecycle.stop("cleanup");

  const oversizedBroker = new MiniappBroker({
    maxMessageBytes: 128,
    now: () => Date.now(),
  });
  oversizedBroker.register("ui", "render", null, () => "ok");
  const oversized = await oversizedBroker.dispatch(
    {
      id: "big",
      namespace: "ui",
      method: "render",
      payload: {
        tree: {
          root: { id: "root", type: "text", props: { value: "x".repeat(512) } },
        },
      },
    },
    {
      appId: "oversized",
      publisherPublicKey: "publisher",
      declaredCapabilities: [],
      grantedCapabilities: [],
    },
  );
  if (oversized.error?.code !== "MESSAGE_TOO_LARGE") {
    throw new Error("oversized broker message was not rejected");
  }

  const forgeryHost = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
  });
  await forgeryHost.launch(
    {
      name: "forgery",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "publisher",
    },
    helloBundle,
  );
  let forgeryTree = forgeryHost.snapshot().widgetTree;
  for (let attempt = 0; attempt < 20 && forgeryTree === null; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    forgeryTree = forgeryHost.snapshot().widgetTree;
  }
  try {
    await forgeryHost.handleUiEvent("never-rendered", "tap");
    throw new Error("event forgery was not rejected");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Unknown widget node")
    ) {
      throw error;
    }
  }

  const brokerForgery = await forgeryHost.dispatchRaw(
    {
      id: "broker-forge",
      namespace: "ui",
      method: "event",
      payload: { nodeId: "never-rendered", event: "tap" },
    },
    {
      name: "forgery",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "publisher",
    },
    [],
  );
  if (brokerForgery.ok) {
    throw new Error("broker ui.event forgery was not rejected");
  }

  const capabilitySwapHost = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
  });
  await capabilitySwapHost.setGrants("swap", "publisher", ["storage:kv"], []);
  const capabilitySwap = await capabilitySwapHost.dispatchRaw(
    {
      id: "swap",
      namespace: "storage.kv",
      method: "get",
      capability: "identity",
      payload: { key: "probe" },
    },
    {
      name: "swap",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: ["storage:kv"],
      publisherPublicKey: "publisher",
    },
    ["identity"],
  );
  if (capabilitySwap.ok) {
    throw new Error("capability substitution was not rejected");
  }
  if (capabilitySwap.error?.code !== "CAPABILITY_MISMATCH") {
    throw new Error(
      `expected CAPABILITY_MISMATCH, got ${capabilitySwap.error?.code}`,
    );
  }
  await capabilitySwapHost.stop();

  await forgeryHost.stop();
}

async function run() {
  await main();
  await runCapabilityProbes();
  await runHandlerErrorCases();
  await runNotifyHostileCases();
  await runReplicaPeerCases();
  console.log(
    "hostile-apps: sandbox, escape, broker flood, UI rejection, memory bomb, oversized message, event forgery, capability substitution, launch/stop cycles, capability probes, handler errors, notify flood, and replica-peer controls passed",
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
