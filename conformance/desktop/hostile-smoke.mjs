#!/usr/bin/env node
/**
 * Hostile mini-app smoke for the desktop worklet host path (Phase 6 M4).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  MiniappBroker,
  MiniappLifecycle,
  MemoryKvStoreBackend,
  NodeWorkerSandboxBackend,
  validateWidgetTree,
  WidgetValidationError,
} from "../../packages/miniapp-runtime/dist/index.js";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { createWorkletMiniappHost } from "../../apps/host-desktop/worklet/miniapp-host.mjs";

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

export async function runDesktopHostileSmoke() {
  const beeDir = mkdtempSync(join(tmpdir(), "tp-desktop-hostile-bee-"));
  const store = new MemoryKvStoreBackend();
  const provider = new NodeCryptoProvider();
  const outbound = [];

  const miniappHost = createWorkletMiniappHost({
    provider,
    kvStore: store,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: beeDir,
    send: (message) => outbound.push(message),
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({
      autoPeers: 0,
      onlineInterfaces: 0,
      preferredInterface: null,
    }),
  });

  try {
    await miniappHost.devSideLoad(
      {
        name: "blocked",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: [],
        publisherPublicKey: "dev",
      },
      helloBundle,
    );
    throw new Error(
      "dev side-load succeeded while developer mode was disabled",
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Developer mode is disabled")
    ) {
      throw error;
    }
  }

  miniappHost.setDeveloperMode(true);
  await miniappHost.devSideLoad(
    {
      name: "hello",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "dev",
    },
    helloBundle,
  );

  let runtime = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    runtime = outbound.findLast(
      (message) => message.type === "miniapp-runtime",
    );
    if (
      runtime?.runtime?.widgetTree !== null &&
      runtime?.runtime?.widgetTree !== undefined
    ) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (
    runtime?.runtime?.widgetTree?.root?.children?.[0]?.props?.value !== "Hello"
  ) {
    throw new Error("hostile-smoke hello bundle did not render");
  }

  await miniappHost.stop();

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
    () =>
      validateWidgetTree({
        root: { id: "root", type: "text", props: { html: "<b>x</b>" } },
      }),
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

  console.log(
    "desktop-hostile-smoke: dev gate, broker flood, UI rejection, and watchdog kill passed",
  );
  rmSync(beeDir, { recursive: true, force: true });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesktopHostileSmoke().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
